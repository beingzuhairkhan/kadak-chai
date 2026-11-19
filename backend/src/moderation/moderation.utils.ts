import { getHeapStatistics } from 'node:v8';

const MAX_HEAP_USAGE_RATIO = 0.85;

export type RedisFailureKind = 'oom' | 'unavailable' | 'timeout' | 'other';

export function isHeapPressure(
  heapUsed = process.memoryUsage().heapUsed,
  heapLimit = getHeapStatistics().heap_size_limit,
) {
  return heapLimit > 0 && heapUsed / heapLimit >= MAX_HEAP_USAGE_RATIO;
}

export function classifyRedisFailure(error: unknown): RedisFailureKind {
  const candidate =
    typeof error === 'object' && error !== null
      ? (error as { code?: unknown; message?: unknown })
      : {};
  const code = typeof candidate.code === 'string' ? candidate.code : '';
  const message =
    typeof candidate.message === 'string' ? candidate.message : String(error);

  if (/oom|maxmemory|out of memory/i.test(message)) return 'oom';
  if (/timeout|timed out|etimedout/i.test(`${code} ${message}`))
    return 'timeout';
  if (
    /econnrefused|econnreset|ehostunreach|enotfound|closed|offline|connection/i.test(
      `${code} ${message}`,
    )
  )
    return 'unavailable';
  return 'other';
}
