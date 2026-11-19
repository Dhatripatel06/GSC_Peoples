import { describe, expect, it } from 'vitest';
import {
  devAuthClientAvailable,
  devAuthServerEnabled,
  resolveEmployeesAdapter,
} from './config';

describe('production safety: development auth gates', () => {
  it('server token issuance is only on with NODE_ENV=development AND the explicit flag', () => {
    expect(devAuthServerEnabled({ NODE_ENV: 'development', DEV_AUTH_ENABLED: 'true' })).toBe(true);
    expect(devAuthServerEnabled({ NODE_ENV: 'production', DEV_AUTH_ENABLED: 'true' })).toBe(false);
    expect(devAuthServerEnabled({ NODE_ENV: 'test', DEV_AUTH_ENABLED: 'true' })).toBe(false);
    expect(devAuthServerEnabled({ NODE_ENV: 'development' })).toBe(false);
    expect(devAuthServerEnabled({ NODE_ENV: 'development', DEV_AUTH_ENABLED: '1' })).toBe(false);
  });

  it('identity switching never activates in production, even with the public flag', () => {
    expect(devAuthClientAvailable({ NODE_ENV: 'production', NEXT_PUBLIC_DEV_AUTH: 'true' })).toBe(false);
    expect(devAuthClientAvailable({ NODE_ENV: 'development' })).toBe(false);
    expect(devAuthClientAvailable({ NODE_ENV: 'development', NEXT_PUBLIC_DEV_AUTH: 'true' })).toBe(true);
  });

  it('production is always http, never demo, whatever the variable says', () => {
    for (const v of [undefined, 'demo', 'http', 'anything'])
      expect(resolveEmployeesAdapter({ NODE_ENV: 'production', NEXT_PUBLIC_EMPLOYEES_ADAPTER: v })).toBe('http');
  });

  it('outside production demo is the default and http is explicit', () => {
    expect(resolveEmployeesAdapter({ NODE_ENV: 'development' })).toBe('demo');
    expect(resolveEmployeesAdapter({ NODE_ENV: 'development', NEXT_PUBLIC_EMPLOYEES_ADAPTER: 'http' })).toBe('http');
  });
});
