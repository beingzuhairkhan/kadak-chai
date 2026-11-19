import { z } from 'zod';

const optionalText = z.string().trim().optional().or(z.literal(''));
const positiveInt = (fallback: number, min: number, max: number) =>
  z.coerce.number().int().min(min).max(max).default(fallback);

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: positiveInt(4000, 1, 65535),
  FRONTEND_URL: z.string().url(),
  MONGODB_URI: optionalText,
  MONGODB_DB: optionalText,
  REDIS_URL: optionalText,
  REDIS_HOST: optionalText,
  REDIS_PORT: positiveInt(6379, 1, 65535),
  MODERATION_CONCURRENCY: positiveInt(5, 1, 50),
  MODERATION_RATE_LIMIT_MAX: positiveInt(10, 1, 1000),
  MODERATION_RATE_LIMIT_DURATION_MS: positiveInt(1000, 100, 60000),
  ADMIN_USERNAME: z.string().trim().min(1, 'ADMIN_USERNAME is required'),
  ADMIN_PASSWORD: z.string().min(1, 'ADMIN_PASSWORD is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  IP_HASH_SALT: z
    .string()
    .min(32, 'IP_HASH_SALT must be at least 32 characters'),
  TRUST_PROXY: z.enum(['true', 'false']).default('false'),
  AI_PROVIDER: z.enum(['mock', 'groq', 'sarvam']).default('mock'),
  AI_BASE_URL: optionalText,
  AI_API_KEY: optionalText,
  AI_MODEL: optionalText,
  AI_FALLBACK_BASE_URL: optionalText,
  AI_FALLBACK_API_KEY: optionalText,
  AI_FALLBACK_MODEL: optionalText,
  SARVAM_BASE_URL: optionalText,
  SARVAM_API_KEY: optionalText,
  SARVAM_MODEL: optionalText,
  AI_TIMEOUT_MS: positiveInt(10000, 1000, 60000),
  AI_MAX_RETRIES: positiveInt(2, 0, 5),
  AI_RETRY_BASE_DELAY_MS: positiveInt(500, 0, 10000),
  AI_RETRY_MAX_DELAY_MS: positiveInt(4000, 0, 30000),
  AI_TOTAL_BUDGET_MS: positiveInt(25000, 1000, 120000),
  RATE_LIMIT_TTL: positiveInt(60, 1, 86400),
  RATE_LIMIT_MAX: positiveInt(30, 1, 10000),
  RATE_LIMIT_WINDOW_SECONDS: positiveInt(60, 1, 86400),
});

export function validateEnvironment(config: Record<string, unknown>) {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const errors = parsed.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`,
    );
    throw new Error(`Invalid environment configuration:\n${errors.join('\n')}`);
  }

  const env = parsed.data;
  const fallbackValues = [
    env.AI_FALLBACK_BASE_URL,
    env.AI_FALLBACK_API_KEY,
    env.AI_FALLBACK_MODEL,
  ];
  if (fallbackValues.some(Boolean) && !fallbackValues.every(Boolean)) {
    throw new Error(
      'AI_FALLBACK_BASE_URL, AI_FALLBACK_API_KEY and AI_FALLBACK_MODEL must be set together.',
    );
  }

  if (
    env.AI_PROVIDER === 'groq' &&
    (!env.AI_BASE_URL || !env.AI_API_KEY || !env.AI_MODEL)
  ) {
    throw new Error(
      'AI_BASE_URL, AI_API_KEY and AI_MODEL are required when AI_PROVIDER=groq.',
    );
  }

  if (
    env.AI_PROVIDER === 'sarvam' &&
    (!env.SARVAM_BASE_URL || !env.SARVAM_API_KEY || !env.SARVAM_MODEL)
  ) {
    throw new Error(
      'SARVAM_BASE_URL, SARVAM_API_KEY and SARVAM_MODEL are required when AI_PROVIDER=sarvam.',
    );
  }

  const groqValues = [env.AI_BASE_URL, env.AI_API_KEY, env.AI_MODEL];
  if (
    env.AI_PROVIDER === 'sarvam' &&
    groqValues.some(Boolean) &&
    !groqValues.every(Boolean)
  ) {
    throw new Error(
      'AI_BASE_URL, AI_API_KEY and AI_MODEL must be set together.',
    );
  }

  const sarvamValues = [
    env.SARVAM_BASE_URL,
    env.SARVAM_API_KEY,
    env.SARVAM_MODEL,
  ];
  if (
    env.AI_PROVIDER === 'groq' &&
    sarvamValues.some(Boolean) &&
    !sarvamValues.every(Boolean)
  ) {
    throw new Error(
      'SARVAM_BASE_URL, SARVAM_API_KEY and SARVAM_MODEL must be set together.',
    );
  }

  return parsed.data;
}
