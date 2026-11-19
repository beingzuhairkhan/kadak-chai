import { parseAiResponse } from './parse';
import {
  callProvider,
  ProviderConfig,
  ProviderFailureKind,
  ProviderLabel,
  ProviderResult,
} from './provider';
import { AiResponse } from './ai-response.schema';

// Retry transient failures and schema failures once; never retry provider 4xx configuration errors.
export type RunnerSettings = {
  timeoutMs: number;
  maxRetries: number;
  retryBaseDelayMs: number;
  retryMaxDelayMs: number;
  totalBudgetMs: number;
};

export type RunnerResult =
  | {
      ok: true;
      data: AiResponse;
      provider: ProviderLabel | 'mock';
      attempts: number;
      latencyMs: number;
      raw: string;
    }
  | {
      ok: false;
      attempts: number;
      latencyMs: number;
      errors: {
        provider: ProviderLabel;
        kind: ProviderFailureKind;
        status?: number;
        detail?: string;
      }[];
      summary: string;
    };

export type CallProvider = (
  config: ProviderConfig,
  story: string,
  signal: AbortSignal,
) => Promise<ProviderResult>;

const retryableKinds: ProviderFailureKind[] = [
  'timeout',
  'network',
  'rate_limit',
  'server_error',
  'empty_output',
  'bad_output',
];

function sleep(ms: number, signal: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve(false);
      return;
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve(true);
    }, ms);
    const abort = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      resolve(false);
    };
    signal.addEventListener('abort', abort, { once: true });
  });
}

function jitterDelay(
  settings: RunnerSettings,
  attempt: number,
  random: () => number,
) {
  return Math.floor(
    random() *
      Math.min(
        settings.retryMaxDelayMs,
        settings.retryBaseDelayMs * 2 ** attempt,
      ),
  );
}

function shouldRetry(kind: ProviderFailureKind, status?: number) {
  if (status === 400 || status === 401 || status === 403 || status === 404)
    return false;
  return retryableKinds.includes(kind);
}

export async function runAi(
  story: string,
  primary: ProviderConfig,
  secondary: ProviderConfig | null,
  settings: RunnerSettings,
  providerCall: CallProvider = callProvider,
  random: () => number = Math.random,
  logAttempt: (
    provider: ProviderLabel,
    attempt: number,
    kind: ProviderFailureKind | 'success',
    status: number | undefined,
    latencyMs: number,
    detail?: string,
  ) => void = () => undefined,
): Promise<RunnerResult> {
  const started = Date.now();
  const deadline = started + settings.totalBudgetMs;
  const budgetController = new AbortController();
  const budgetTimer = setTimeout(
    () => budgetController.abort(),
    settings.totalBudgetMs,
  );
  const errors: {
    provider: ProviderLabel;
    kind: ProviderFailureKind;
    status?: number;
    detail?: string;
  }[] = [];
  let attempts = 0;

  try {
    for (const config of [primary, secondary].filter(
      (value): value is ProviderConfig => value !== null,
    )) {
      let parseFailures = 0;
      for (let attempt = 0; attempt <= settings.maxRetries; attempt += 1) {
        const remaining = deadline - Date.now();
        if (remaining < 1000) break;
        const timeoutMs = Math.min(settings.timeoutMs, remaining);
        const controller = new AbortController();
        const abortForBudget = () => controller.abort();
        budgetController.signal.addEventListener('abort', abortForBudget, {
          once: true,
        });
        const attemptTimer = setTimeout(() => controller.abort(), timeoutMs);
        const callStarted = Date.now();
        attempts += 1;
        let result: ProviderResult;
        try {
          result = await providerCall(config, story, controller.signal);
        } catch {
          result = {
            ok: false,
            kind: 'network',
            message: 'Provider call failed.',
          };
        } finally {
          clearTimeout(attemptTimer);
          budgetController.signal.removeEventListener('abort', abortForBudget);
        }
        const attemptLatency = Date.now() - callStarted;

        if (result.ok) {
          const parsed = parseAiResponse(result.raw);
          if (parsed.ok) {
            logAttempt(
              config.label,
              attempt + 1,
              'success',
              undefined,
              attemptLatency,
            );
            return {
              ok: true,
              data: parsed.data,
              provider: config.label,
              attempts,
              latencyMs: Date.now() - started,
              raw: result.raw.slice(0, 2000),
            };
          }
          parseFailures += 1;
          errors.push({
            provider: config.label,
            kind: 'bad_output',
            detail: parsed.error,
          });
          logAttempt(
            config.label,
            attempt + 1,
            'bad_output',
            undefined,
            attemptLatency,
            parsed.error,
          );
          if (parseFailures > 1 || attempt >= settings.maxRetries) break;
        } else {
          errors.push({
            provider: config.label,
            kind: result.kind,
            ...(result.status ? { status: result.status } : {}),
          });
          logAttempt(
            config.label,
            attempt + 1,
            result.kind,
            result.status,
            attemptLatency,
          );
          if (
            !shouldRetry(result.kind, result.status) ||
            attempt >= settings.maxRetries
          )
            break;
        }

        const left = deadline - Date.now();
        if (left < 1000) break;
        const retryAfter =
          !result.ok && (result.status === 429 || result.status === 503)
            ? result.retryAfterMs
            : undefined;
        const delay = Math.min(
          retryAfter === undefined
            ? jitterDelay(settings, attempt, random)
            : Math.min(retryAfter, settings.retryMaxDelayMs),
          Math.max(0, left - 1000),
        );
        if (!(await sleep(delay, budgetController.signal))) break;
      }
    }
  } catch {
    errors.push({ provider: 'primary', kind: 'network' });
  } finally {
    clearTimeout(budgetTimer);
  }

  const summary = errors.length
    ? errors
        .map(
          (error) =>
            `${error.provider}: ${error.kind}${error.status ? ` ${error.status}` : ''}${error.detail ? ` (${error.detail})` : ''}`,
        )
        .join('; ')
        .slice(0, 500)
    : 'AI time budget exhausted; no provider completed.';
  return {
    ok: false,
    attempts,
    latencyMs: Date.now() - started,
    errors,
    summary,
  };
}
