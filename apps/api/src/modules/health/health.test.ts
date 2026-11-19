import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { healthResponseSchema } from '@gsc/contracts';
import { createApp } from '../../app';

const app = createApp();

describe('GET /api/v1/health', () => {
  it('returns a valid health payload without requiring auth', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    const body = healthResponseSchema.parse(res.body);
    expect(body.status).toBe('ok');
    expect(body.dependencies.redis).toBe('not_configured');
  });

  it('rejects unauthenticated requests to non-public routes', async () => {
    const res = await request(app).get('/api/v1/nope');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects the development token format when malformed', async () => {
    const res = await request(app).get('/api/v1/nope').set('authorization', 'Bearer bad');
    expect(res.status).toBe(401);
  });

  it('accepts a development token and then 404s on unknown routes', async () => {
    const res = await request(app).get('/api/v1/nope').set('authorization', 'Bearer dev:user-1');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
