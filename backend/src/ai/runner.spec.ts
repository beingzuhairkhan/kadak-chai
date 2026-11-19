import { CallProvider, runAi, RunnerSettings } from './runner';
import { ProviderConfig, ProviderResult } from './provider';

const primary: ProviderConfig = {
  label: 'primary',
  baseUrl: 'https://primary.example/v1',
  apiKey: 'secret-primary-key',
  model: 'primary-model',
};
const secondary: ProviderConfig = {
  label: 'secondary',
  baseUrl: 'https://secondary.example/v1',
  apiKey: 'secret-secondary-key',
  model: 'secondary-model',
};
const settings: RunnerSettings = {
  timeoutMs: 2000,
  maxRetries: 2,
  retryBaseDelayMs: 0,
  retryMaxDelayMs: 100,
  totalBudgetMs: 10000,
};
const valid = JSON.stringify({
  decision: 'approved',
  reason: null,
  category: 'other',
  caption: 'Chai makes a brighter break.',
});
const ok = (raw = valid): ProviderResult => ({ ok: true, raw });
const failed = (
  kind: 'server_error' | 'auth_or_config' | 'rate_limit',
  status?: number,
  retryAfterMs?: number,
): ProviderResult => ({
  ok: false,
  kind,
  status,
  retryAfterMs,
  message: 'A secret key must never be shown.',
});

async function execute(
  call: CallProvider,
  fallback: ProviderConfig | null = secondary,
  config = settings,
) {
  const resultPromise = runAi(
    'A warm chai break with my friends and rain.',
    primary,
    fallback,
    config,
    call,
    () => 0.5,
  );
  await jest.runAllTimersAsync();
  return resultPromise;
}

describe('runAi', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(10000);
  });

  afterEach(() => jest.useRealTimers());

  it('uses the primary provider when its first response is valid', async () => {
    const call: CallProvider = jest.fn(() => Promise.resolve(ok()));
    const result = await execute(call);
    expect(result).toMatchObject({
      ok: true,
      provider: 'primary',
      attempts: 1,
    });
  });

  it('retries transient and malformed responses once before succeeding', async () => {
    const call: CallProvider = jest
      .fn()
      .mockResolvedValueOnce(failed('server_error', 503))
      .mockResolvedValueOnce(ok('{bad'))
      .mockResolvedValueOnce(ok());
    const result = await execute(call);
    expect(result).toMatchObject({
      ok: true,
      provider: 'primary',
      attempts: 3,
    });
  });

  it('falls back after primary exhaustion and skips retry for a 401', async () => {
    const call: CallProvider = jest
      .fn()
      .mockResolvedValueOnce(failed('server_error', 503))
      .mockResolvedValueOnce(failed('server_error', 503))
      .mockResolvedValueOnce(failed('server_error', 503))
      .mockResolvedValueOnce(ok());
    const result = await execute(call);
    expect(result).toMatchObject({
      ok: true,
      provider: 'secondary',
      attempts: 4,
    });

    const unauthorizedCall: CallProvider = jest
      .fn()
      .mockResolvedValueOnce(failed('auth_or_config', 401))
      .mockResolvedValueOnce(ok());
    expect(await execute(unauthorizedCall)).toMatchObject({
      ok: true,
      provider: 'secondary',
      attempts: 2,
    });
  });

  it('caps Retry-After and returns safe summaries when providers fail', async () => {
    const retryCall: CallProvider = jest
      .fn()
      .mockResolvedValueOnce(failed('rate_limit', 429, 5000))
      .mockResolvedValueOnce(ok());
    const started = Date.now();
    expect(await execute(retryCall)).toMatchObject({ ok: true });
    expect(Date.now() - started).toBe(100);

    const failCall: CallProvider = jest
      .fn()
      .mockResolvedValue(failed('server_error', 503));
    const result = await execute(failCall);
    expect(result).toMatchObject({ ok: false, attempts: 6 });
    expect(JSON.stringify(result)).not.toContain('secret-');
    expect(JSON.stringify(result)).not.toContain('A secret key');
  });

  it('handles a missing secondary provider without throwing', async () => {
    const call: CallProvider = jest
      .fn()
      .mockResolvedValue(failed('auth_or_config', 401));
    expect(await execute(call, null)).toMatchObject({ ok: false, attempts: 1 });
  });
});
