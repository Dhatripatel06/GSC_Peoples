import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

// Repo-level .env is the single source of configuration. Real env vars win.
loadEnv({ path: path.resolve(import.meta.dirname, '../../../../.env'), quiet: true });

const emptyToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const optionalString = z.preprocess(emptyToUndefined, z.string().optional());
const optionalUrl = z.preprocess(emptyToUndefined, z.url().optional());

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    CORS_ORIGINS: z
      .string()
      .default('http://localhost:3000')
      .transform((v) =>
        v
          .split(',')
          .map((o) => o.trim())
          .filter(Boolean),
      ),
    /** Internal: true when CORS_ORIGINS was provided (the localhost default must not leak into production). */
    CORS_ORIGINS_EXPLICIT: z.boolean().default(false),
    DATABASE_URL: optionalString,
    REDIS_URL: optionalUrl,
    /**
     * development: local dev bearer adapter (never production).
     * session:     first-party email/password with httpOnly cookie sessions (bearer tokens are rejected).
     * sso:         Central Authentication bearer tokens (JWKS) in addition to cookie sessions.
     */
    AUTH_MODE: z.enum(['development', 'session', 'sso']).default('development'),
    CENTRAL_AUTH_BASE_URL: optionalUrl,
    CENTRAL_AUTH_JWKS_URL: optionalUrl,
    CENTRAL_AUTH_ISSUER: optionalString,
    CENTRAL_AUTH_AUDIENCE: optionalString,
    DEV_AUTH_COMPANY_ID: z.string().min(1).default('dev-company'),
    /** Explicit opt-in for the local development token adapter. Never allowed in production. */
    DEV_AUTH_ENABLED: z.preprocess(emptyToUndefined, z.enum(['true', 'false']).default('false')).transform((v) => v === 'true'),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && env.DEV_AUTH_ENABLED) {
      ctx.addIssue({
        code: 'custom',
        path: ['DEV_AUTH_ENABLED'],
        message: 'DEV_AUTH_ENABLED is not allowed when NODE_ENV=production',
      });
    }
    if (env.AUTH_MODE === 'sso' && (!env.CENTRAL_AUTH_JWKS_URL || !env.CENTRAL_AUTH_ISSUER || !env.CENTRAL_AUTH_AUDIENCE)) {
      ctx.addIssue({
        code: 'custom',
        path: ['CENTRAL_AUTH_JWKS_URL'],
        message: 'SSO mode requires CENTRAL_AUTH_JWKS_URL, CENTRAL_AUTH_ISSUER and CENTRAL_AUTH_AUDIENCE',
      });
    }
    if (env.NODE_ENV === 'production' && env.AUTH_MODE === 'development') {
      ctx.addIssue({
        code: 'custom',
        path: ['AUTH_MODE'],
        message: 'AUTH_MODE=development is not allowed when NODE_ENV=production; use session or sso',
      });
    }
    if (env.NODE_ENV === 'production' && !env.CORS_ORIGINS_EXPLICIT) {
      ctx.addIssue({
        code: 'custom',
        path: ['CORS_ORIGINS'],
        message: 'CORS_ORIGINS must be set explicitly when NODE_ENV=production',
      });
    }
    if (env.NODE_ENV !== 'test' && !env.DATABASE_URL) {
      ctx.addIssue({
        code: 'custom',
        path: ['DATABASE_URL'],
        message: 'DATABASE_URL is required (dedicated HR database)',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse({
    ...source,
    CORS_ORIGINS_EXPLICIT: typeof source.CORS_ORIGINS === 'string' && source.CORS_ORIGINS.trim() !== '',
  });
  if (!result.success) {
    const lines = result.error.issues.map(
      (i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`,
    );
    throw new Error(`Invalid environment configuration:\n${lines.join('\n')}`);
  }
  return result.data;
}

export const env: Env = parseEnv();
