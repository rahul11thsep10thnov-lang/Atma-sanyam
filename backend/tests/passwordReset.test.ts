import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { setupTestApp } from './helpers.js';

let ctx: Awaited<ReturnType<typeof setupTestApp>>;
const EMAIL = 'reset@example.com';

beforeAll(async () => {
  ctx = await setupTestApp();
  await request(ctx.app).post('/v1/auth/register').send({ email: EMAIL, password: 'original-pass-1' }).expect(201);
});
afterAll(async () => {
  await ctx.database.close();
});

describe('forgot password', () => {
  it('advertises the capability in /v1/config', async () => {
    const res = await request(ctx.app).get('/v1/config');
    expect(res.body.features.passwordReset).toBe(true);
  });

  it('answers identically for unknown emails and sends nothing', async () => {
    const known = await request(ctx.app).post('/v1/auth/password-reset/request').send({ email: EMAIL });
    const unknown = await request(ctx.app).post('/v1/auth/password-reset/request').send({ email: 'nobody@example.com' });
    expect(known.status).toBe(202);
    expect(unknown.status).toBe(202);
    expect(unknown.body).toEqual(known.body);
    expect(ctx.mailer.sent.map((m) => m.to)).toEqual([EMAIL]);
  });

  it('rejects wrong codes and locks after 5 attempts', async () => {
    await request(ctx.app).post('/v1/auth/password-reset/request').send({ email: EMAIL }).expect(202);
    const good = ctx.mailer.lastCode(EMAIL)!;
    const wrong = good === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) {
      const r = await request(ctx.app).post('/v1/auth/password-reset/confirm').send({ email: EMAIL, code: wrong, newPassword: 'brand-new-pass-1' });
      expect(r.status).toBe(400);
    }
    // Even the right code is now refused.
    const locked = await request(ctx.app).post('/v1/auth/password-reset/confirm').send({ email: EMAIL, code: good, newPassword: 'brand-new-pass-1' });
    expect(locked.status).toBe(400);
  });

  it('resets with a fresh code, signs in, and revokes old sessions', async () => {
    const old = await request(ctx.app).post('/v1/auth/login').send({ email: EMAIL, password: 'original-pass-1' });
    await request(ctx.app).post('/v1/auth/password-reset/request').send({ email: EMAIL }).expect(202);
    const code = ctx.mailer.lastCode(EMAIL)!;
    expect(code).toMatch(/^\d{6}$/);
    const res = await request(ctx.app).post('/v1/auth/password-reset/confirm').send({ email: EMAIL, code, newPassword: 'brand-new-pass-1' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect((await request(ctx.app).get('/v1/me').set('Authorization', `Bearer ${old.body.token}`)).status).toBe(401);
    expect((await request(ctx.app).post('/v1/auth/login').send({ email: EMAIL, password: 'original-pass-1' })).status).toBe(401);
    expect((await request(ctx.app).post('/v1/auth/login').send({ email: EMAIL, password: 'brand-new-pass-1' })).status).toBe(200);
    // A code works only once.
    const reuse = await request(ctx.app).post('/v1/auth/password-reset/confirm').send({ email: EMAIL, code, newPassword: 'another-pass-22' });
    expect(reuse.status).toBe(400);
  });
});

describe('without email configured', () => {
  it('reports the feature as unavailable', async () => {
    const noMail = await setupTestApp({ withMailer: false });
    try {
      expect((await request(noMail.app).get('/v1/config')).body.features.passwordReset).toBe(false);
      expect((await request(noMail.app).post('/v1/auth/password-reset/request').send({ email: EMAIL })).status).toBe(503);
    } finally {
      await noMail.database.close();
    }
  });
});
