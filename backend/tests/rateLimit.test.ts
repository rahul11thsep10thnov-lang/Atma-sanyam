import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { setupTestApp } from './helpers.js';

let ctx: Awaited<ReturnType<typeof setupTestApp>>;

beforeAll(async () => {
  ctx = await setupTestApp({ disableRateLimits: false });
});
afterAll(async () => {
  await ctx.database.close();
});

describe('rate limiting', () => {
  it('throttles repeated sign-in attempts for the same account', async () => {
    const attempt = () => request(ctx.app).post('/v1/auth/login').send({ email: 'brute@example.com', password: 'guess-guess' });
    for (let i = 0; i < 10; i++) expect((await attempt()).status).toBe(401);
    const blocked = await attempt();
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('rate_limited');
    // A different account from the same IP is still allowed to try.
    const other = await request(ctx.app).post('/v1/auth/login').send({ email: 'someone@example.com', password: 'guess-guess' });
    expect(other.status).toBe(401);
  });

  it('applies to the admin login too', async () => {
    const attempt = () => request(ctx.app).post('/admin/v1/auth/login').send({ email: 'boss@example.com', password: 'guess-guess' });
    for (let i = 0; i < 10; i++) await attempt();
    expect((await attempt()).status).toBe(429);
  });

  it('only allows configured browser origins via CORS', async () => {
    const allowed = await request(ctx.app).get('/v1/health').set('Origin', 'http://localhost:8081');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:8081');
    const denied = await request(ctx.app).get('/v1/health').set('Origin', 'https://evil.example');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });
});
