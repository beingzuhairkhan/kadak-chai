import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Job, Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { Model } from 'mongoose';
import { AiService } from '../ai/ai.service';
import { RunnerResult } from '../ai/runner';
import { Entry, EntryDocument } from '../entries/entry.schema';
import { classifyRedisFailure, isHeapPressure } from './moderation.utils';

const QUEUE_NAME = 'story-moderation';
const ENQUEUE_TIMEOUT_MS = 1500;
const SHUTDOWN_TIMEOUT_MS = 5000;
const LOG_THROTTLE_MS = 30000;
const TRANSIENT_AI_FAILURES = new Set([
  'timeout',
  'network',
  'rate_limit',
  'server_error',
  'empty_output',
  'bad_output',
]);

type ModerationJobData = { entryId: string };
type ModerationProvider = Extract<RunnerResult, { ok: true }>['provider'];

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timeout = setTimeout(
        () => reject(new Error('Queue enqueue timed out.')),
        timeoutMs,
      );
    }),
  ]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
}

@Injectable()
export class ModerationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ModerationService.name);
  private readonly lastLogAt = new Map<string, number>();
  private queue: Queue<ModerationJobData> | null = null;
  private worker: Worker<ModerationJobData> | null = null;
  private producerRedis: Redis | null = null;
  private workerRedis: Redis | null = null;
  private shuttingDown = false;

  constructor(
    @InjectModel(Entry.name) private readonly entryModel: Model<EntryDocument>,
    private readonly aiService: AiService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    try {
      this.producerRedis = this.createRedisClient('producer');
      this.workerRedis = this.createRedisClient('worker');
      this.queue = new Queue<ModerationJobData>(QUEUE_NAME, {
        connection: this.producerRedis,
        defaultJobOptions: {
          attempts: 4,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: 250,
          removeOnFail: 250,
        },
      });
      this.queue.on('error', () =>
        this.logThrottled('queue-error', 'Moderation queue error.'),
      );

      const concurrency = this.config.get<number>('MODERATION_CONCURRENCY', 5);
      const rateLimit = this.config.get<number>(
        'MODERATION_RATE_LIMIT_MAX',
        10,
      );
      const rateWindow = this.config.get<number>(
        'MODERATION_RATE_LIMIT_DURATION_MS',
        1000,
      );
      this.worker = new Worker<ModerationJobData>(
        QUEUE_NAME,
        (job) => this.processJob(job),
        {
          connection: this.workerRedis,
          concurrency,
          limiter: { max: rateLimit, duration: rateWindow },
        },
      );
      this.worker.on('error', () =>
        this.logThrottled('worker-error', 'Moderation worker error.'),
      );
      this.worker.on('closing', () =>
        this.logThrottled('worker-closing', 'Moderation worker is closing.'),
      );
      this.worker.on('closed', () =>
        this.logThrottled('worker-closed', 'Moderation worker closed.'),
      );
      this.worker.on('failed', (job, error) => {
        if (job) void this.recordFinalFailure(job, error);
      });
    } catch (error) {
      this.logThrottled(
        'queue-init',
        `Moderation queue could not initialize (${classifyRedisFailure(error)}); entries will remain pending review.`,
      );
      this.producerRedis?.disconnect();
      this.workerRedis?.disconnect();
    }
  }

  async enqueue(entryId: string): Promise<boolean> {
    if (this.shuttingDown) {
      this.logThrottled(
        'enqueue-shutdown',
        'Moderation enqueue skipped during shutdown; entry remains pending review.',
      );
      return false;
    }
    if (isHeapPressure()) {
      this.logThrottled(
        'enqueue-memory',
        'Moderation enqueue skipped under Node.js heap pressure; entry remains pending review.',
      );
      return false;
    }
    if (!this.queue || this.producerRedis?.status !== 'ready') {
      this.logThrottled(
        'enqueue-unavailable',
        'Redis is not ready; moderation enqueue skipped and entry remains pending review.',
      );
      return false;
    }

    try {
      await withTimeout(
        this.queue.add('moderate-story', { entryId }, { jobId: entryId }),
        ENQUEUE_TIMEOUT_MS,
      );
      return true;
    } catch (error) {
      this.logThrottled(
        `enqueue-${classifyRedisFailure(error)}`,
        `Moderation enqueue failed (${classifyRedisFailure(error)}); entry remains pending review.`,
      );
      return false;
    }
  }

  private createRedisClient(role: 'producer' | 'worker') {
    const sharedOptions = {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      enableOfflineQueue: false,
      connectTimeout: 1000,
      retryStrategy: (times: number) => Math.min(times * 500, 5000),
      connectionName: `kadak-chai-moderation-${role}`,
    };
    const url = this.config.get<string>('REDIS_URL');
    const client = url
      ? new Redis(url, sharedOptions)
      : new Redis({
          ...sharedOptions,
          host: this.config.get<string>('REDIS_HOST') || '127.0.0.1',
          port: this.config.get<number>('REDIS_PORT') || 6379,
        });

    client.on('ready', () => {
      this.logger.log(`Redis ${role} connected and ready.`);
    });

    client.on('error', () =>
      this.logThrottled(
        `redis-${role}-error`,
        `Redis ${role} connection error.`,
      ),
    );
    client.on('close', () =>
      this.logThrottled(
        `redis-${role}-close`,
        `Redis ${role} connection closed.`,
      ),
    );
    client.on('reconnecting', () =>
      this.logThrottled(
        `redis-${role}-reconnecting`,
        `Redis ${role} reconnecting with bounded backoff.`,
      ),
    );
    client.on('end', () =>
      this.logThrottled(`redis-${role}-end`, `Redis ${role} connection ended.`),
    );
    return client;
  }

  private async processJob(job: Job<ModerationJobData>) {
    if (isHeapPressure()) {
      throw new Error('Worker deferred moderation due to heap pressure.');
    }

    const entry = await this.entryModel.findById(job.data.entryId).exec();
    if (!entry) return { skipped: 'entry_missing' };
    if (
      (entry.status === 'approved' || entry.status === 'rejected') &&
      entry.aiProcessedAt
    )
      return { skipped: 'already_finalized' };
    if (entry.status !== 'pending_review') {
      return { skipped: 'entry_not_pending' };
    }

    const pendingFilter = {
      _id: entry._id,
      status: 'pending_review' as const,
      aiProcessedAt: null,
    };
    const claimResult = await this.entryModel
      .updateOne(
        { ...pendingFilter, aiAttempts: entry.aiAttempts },
        { $inc: { aiAttempts: 1 } },
      )
      .exec();
    if (!claimResult.modifiedCount) return { skipped: 'entry_changed' };

    let result: RunnerResult;
    try {
      result = await this.aiService.analyzeStory(entry.story);
    } catch {
      throw new Error('AI moderation attempt failed.');
    }

    if (!result.ok) {
      if (
        result.errors.some((failure) => TRANSIENT_AI_FAILURES.has(failure.kind))
      )
        throw new Error('AI moderation provider is temporarily unavailable.');
      await this.entryModel.updateOne(pendingFilter, {
        $set: { aiError: result.summary.slice(0, 500) },
      });
      return { status: 'pending_review' };
    }

    await this.entryModel.updateOne(pendingFilter, {
      $set: {
        status: result.data.decision,
        category: result.data.category,
        caption: result.data.caption,
        rejectionReason:
          result.data.decision === 'rejected' ? result.data.reason : null,
        aiDecision: result.data.decision,
        aiReason: result.data.reason,
        aiCategory: result.data.category,
        aiCaption: result.data.caption,
        aiProvider: result.provider,
        aiModel: this.getModelName(result.provider),
        aiRaw: result.raw.slice(0, 2000),
        aiLatencyMs: result.latencyMs,
        aiProcessedAt: new Date(),
        aiError: null,
      },
    });
    return { status: result.data.decision };
  }

  private getModelName(provider: ModerationProvider) {
    if (provider === 'mock') return 'mock';
    if (provider === 'secondary') {
      return (
        this.config.get<string>('AI_FALLBACK_MODEL') ||
        (this.config.get<string>('AI_PROVIDER') === 'sarvam'
          ? this.config.get<string>('AI_MODEL')
          : this.config.get<string>('SARVAM_MODEL')) ||
        null
      );
    }
    return (
      (this.config.get<string>('AI_PROVIDER') === 'sarvam'
        ? this.config.get<string>('SARVAM_MODEL')
        : this.config.get<string>('AI_MODEL')) || null
    );
  }

  private async recordFinalFailure(job: Job<ModerationJobData>, error: Error) {
    if (job.attemptsMade < (job.opts.attempts ?? 1)) return;
    try {
      await this.entryModel.updateOne(
        {
          _id: job.data.entryId,
          status: 'pending_review',
          aiProcessedAt: null,
        },
        {
          $set: {
            aiError:
              'AI moderation could not complete; admin review is required.',
          },
        },
      );
    } catch {
      this.logThrottled(
        'record-final-failure',
        'Could not record final moderation failure; entry remains pending review.',
      );
    }
    this.logThrottled(
      'job-exhausted',
      `Moderation job exhausted retries (${classifyRedisFailure(error)}); entry remains pending review.`,
    );
  }

  private logThrottled(key: string, message: string) {
    const now = Date.now();
    const lastLog = this.lastLogAt.get(key) ?? 0;
    if (now - lastLog < LOG_THROTTLE_MS) return;
    this.lastLogAt.set(key, now);
    this.logger.warn(message);
  }

  private async closeWithTimeout(
    name: string,
    close: () => Promise<unknown>,
    forceClose: () => void,
  ) {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const outcome = await Promise.race([
      close()
        .then(() => 'closed' as const)
        .catch(() => {
          this.logThrottled(`shutdown-${name}`, `${name} shutdown failed.`);
          return 'failed' as const;
        }),
      new Promise<'timeout'>((resolve) => {
        timeout = setTimeout(() => resolve('timeout'), SHUTDOWN_TIMEOUT_MS);
      }),
    ]);
    if (timeout) clearTimeout(timeout);
    if (outcome === 'timeout') {
      this.logThrottled(
        `shutdown-timeout-${name}`,
        `${name} shutdown timed out; forcing its Redis connection closed.`,
      );
      forceClose();
    }
  }

  async onModuleDestroy() {
    this.shuttingDown = true;
    if (this.worker) {
      await this.closeWithTimeout(
        'worker',
        () => this.worker!.close(),
        () => {
          this.workerRedis?.disconnect();
          void this.worker!.close(true).catch(() =>
            this.logThrottled(
              'shutdown-worker-force',
              'Forced worker shutdown encountered an error.',
            ),
          );
        },
      );
    }
    if (this.queue) {
      await this.closeWithTimeout(
        'queue',
        () => this.queue!.close(),
        () => this.producerRedis?.disconnect(),
      );
    }
    this.workerRedis?.disconnect();
    this.producerRedis?.disconnect();
  }
}
