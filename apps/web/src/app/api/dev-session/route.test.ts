import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from './route';

const post = (body: unknown) =>
  POST(new Request('http://x/api/dev-session', { method: 'POST', body: JSON.stringify(body) }));

afterEach(() => vi.unstubAllEnvs());

describe('dev-session route', () => {
  it('is 404 in production, even when the flag is set', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('DEV_AUTH_ENABLED', 'true');
    expect((await post({ persona: 'hr' })).status).toBe(404);
    expect(GET().status).toBe(404);
  });

  it('is 404 in development without the explicit flag', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('DEV_AUTH_ENABLED', '');
    expect((await post({ persona: 'hr' })).status).toBe(404);
  });

  describe('enabled (development + flag)', () => {
    const enable = () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('DEV_AUTH_ENABLED', 'true');
    };

    it('issues the dev token for a fixed persona only', async () => {
      enable();
      const res = await post({ persona: 'manager' });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ persona: 'manager', token: 'dev:dev-manager' });
    });

    it('cannot choose arbitrary users, roles, companies or permissions', async () => {
      enable();
      for (const body of [
        { persona: 'dev-hr-admin' },
        { persona: 'admin' },
        { userId: 'dev-hr-admin' },
        { role: 'HR_ADMIN' },
        'hr',
        null,
      ]) {
        expect((await post(body)).status).toBe(400);
      }
      // extra fields are ignored: the subject still comes only from the persona map
      const res = await post({ persona: 'employee', role: 'HR_ADMIN', companyId: 'x', permissions: ['employee:write'] });
      expect(await res.json()).toEqual({ persona: 'employee', token: 'dev:dev-employee' });
    });
  });
});
