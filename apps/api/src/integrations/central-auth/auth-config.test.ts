import { describe, expect, it } from 'vitest';
import { parseEnv } from '../../config/env';
import { DevAuthProvider, DisabledAuthProvider } from './dev.provider';
import { createAuthProvider } from './index';
import { SsoProvider } from './sso.provider';

const base = { AUTH_MODE: 'development', DEV_AUTH_COMPANY_ID: 'c1' } as const;
const url = 'postgresql://u:p@localhost:5432/hr_db?schema=hr';

describe('development auth gating (production safety)', () => {
  it('production refuses development adapter in the factory', () => {
    expect(() =>
      createAuthProvider({ ...base, NODE_ENV: 'production', DEV_AUTH_ENABLED: true }),
    ).toThrow(/never run in production/);
    expect(() =>
      createAuthProvider({ ...base, NODE_ENV: 'production', DEV_AUTH_ENABLED: false }),
    ).toThrow(/never run in production/);
  });

  it('production config validation rejects DEV_AUTH_ENABLED and AUTH_MODE=development', () => {
    expect(() =>
      parseEnv({ NODE_ENV: 'production', AUTH_MODE: 'sso', DATABASE_URL: url, DEV_AUTH_ENABLED: 'true' }),
    ).toThrow(/DEV_AUTH_ENABLED/);
    expect(() =>
      parseEnv({ NODE_ENV: 'production', AUTH_MODE: 'development', DATABASE_URL: url }),
    ).toThrow(/AUTH_MODE/);
  });

  it('development without the explicit flag fails closed', async () => {
    const p = createAuthProvider({ ...base, NODE_ENV: 'development', DEV_AUTH_ENABLED: false });
    expect(p).toBeInstanceOf(DisabledAuthProvider);
    await expect(p.verifyToken('dev:dev-hr-admin')).rejects.toThrow();
  });

  it('only NODE_ENV=development enables it (test does not)', () => {
    expect(createAuthProvider({ ...base, NODE_ENV: 'test', DEV_AUTH_ENABLED: true })).toBeInstanceOf(
      DisabledAuthProvider,
    );
    expect(createAuthProvider({ ...base, NODE_ENV: 'development', DEV_AUTH_ENABLED: true })).toBeInstanceOf(
      DevAuthProvider,
    );
  });

  it('sso mode requires JWKS, issuer and audience configuration', () => {
    expect(() => createAuthProvider({
      ...base,
      AUTH_MODE: 'sso',
      NODE_ENV: 'development',
      DEV_AUTH_ENABLED: true,
      CENTRAL_AUTH_JWKS_URL: undefined,
      CENTRAL_AUTH_ISSUER: undefined,
      CENTRAL_AUTH_AUDIENCE: undefined,
    })).toThrow(/requires JWKS URL, issuer and audience/);

    const p = createAuthProvider({
      ...base,
      AUTH_MODE: 'sso',
      NODE_ENV: 'development',
      DEV_AUTH_ENABLED: true,
      CENTRAL_AUTH_JWKS_URL: 'https://auth.example/.well-known/jwks.json',
      CENTRAL_AUTH_ISSUER: 'https://auth.example/',
      CENTRAL_AUTH_AUDIENCE: 'gsc-peoples',
    });
    expect(p).toBeInstanceOf(SsoProvider);
  });

  it('dev provider accepts only provisioned ids, with no roles or extra segments', async () => {
    const p = new DevAuthProvider('c1');
    await expect(p.verifyToken('dev:dev-manager')).resolves.toEqual({ externalId: 'dev-manager', companyId: 'c1' });
    for (const bad of ['dev:someone-else', 'dev:dev-manager:HR_ADMIN', 'dev:', 'x:dev-manager', 'dev-manager', 'dev:dev-manager:']) {
      await expect(p.verifyToken(bad)).rejects.toThrow();
    }
  });
});
