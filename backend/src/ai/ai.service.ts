import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RunnerResult, runAi, RunnerSettings } from './runner';
import type { ProviderConfig } from './provider';
import { GroqAIProvider } from './providers/groq.provider';
import { MockAIProvider } from './providers/mock.provider';
import { SarvamAIProvider } from './providers/sarvam.provider';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly groqProvider: GroqAIProvider,
    private readonly sarvamProvider: SarvamAIProvider,
    private readonly mockProvider: MockAIProvider,
  ) {}

  async analyzeStory(story: string): Promise<RunnerResult> {
    const started = Date.now();
    if (this.config.get('AI_PROVIDER') === 'mock') {
      if (story.trim() === 'FORCE_AI_ERROR') {
        return {
          ok: false,
          attempts: 0,
          latencyMs: Date.now() - started,
          errors: [{ provider: 'primary', kind: 'network' }],
          summary: 'mock: simulated AI failure',
        };
      }

      const fallbackDemo = story.trim() === 'FORCE_AI_PRIMARY_FAIL';
      const output = fallbackDemo
        ? {
            decision: 'approved' as const,
            reason: null,
            category: 'other' as const,
            caption: 'A chai break brings us together.',
          }
        : await this.mockProvider.analyzeStory(story);
      return {
        ok: true,
        data: output,
        provider: fallbackDemo ? 'secondary' : 'mock',
        attempts: fallbackDemo ? 2 : 1,
        latencyMs: Date.now() - started,
        raw: JSON.stringify(output).slice(0, 2000),
      };
    }

    const sarvamIsPrimary = this.config.get('AI_PROVIDER') === 'sarvam';
    const primary = sarvamIsPrimary
      ? this.sarvamProvider.getPrimaryConfig()
      : this.groqProvider.getConfig();
    const fallbackBaseUrl = this.config.get<string>('AI_FALLBACK_BASE_URL');
    const fallbackApiKey = this.config.get<string>('AI_FALLBACK_API_KEY');
    const fallbackModel = this.config.get<string>('AI_FALLBACK_MODEL');
    const fallbackCandidates: ProviderConfig[] = [];
    if (fallbackBaseUrl && fallbackApiKey && fallbackModel) {
      fallbackCandidates.push({
        label: 'secondary' as const,
        baseUrl: fallbackBaseUrl,
        apiKey: fallbackApiKey,
        model: fallbackModel,
      });
    }
    const providerFallback = sarvamIsPrimary
      ? this.groqProvider.getFallbackConfig()
      : this.sarvamProvider.getFallbackConfig();
    if (providerFallback) fallbackCandidates.push(providerFallback);
    const secondary =
      fallbackCandidates.find(
        (candidate) =>
          candidate.baseUrl !== primary.baseUrl ||
          candidate.model !== primary.model,
      ) || null;
    if (!secondary)
      this.logger.warn('Secondary AI provider is not configured.');

    const settings: RunnerSettings = {
      timeoutMs: this.config.getOrThrow<number>('AI_TIMEOUT_MS'),
      maxRetries: this.config.getOrThrow<number>('AI_MAX_RETRIES'),
      retryBaseDelayMs: this.config.getOrThrow<number>(
        'AI_RETRY_BASE_DELAY_MS',
      ),
      retryMaxDelayMs: this.config.getOrThrow<number>('AI_RETRY_MAX_DELAY_MS'),
      totalBudgetMs: this.config.getOrThrow<number>('AI_TOTAL_BUDGET_MS'),
    };

    return runAi(
      story,
      primary,
      secondary,
      settings,
      undefined,
      undefined,
      (provider, attempt, kind, status, latencyMs, detail) => {
        this.logger.log(
          JSON.stringify({
            provider,
            attempt,
            kind,
            status,
            latencyMs,
            detail,
          }),
        );
      },
    );
  }
}
