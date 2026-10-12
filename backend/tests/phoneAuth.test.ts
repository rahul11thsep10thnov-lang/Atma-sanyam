import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { otpCodes, users } from '../src/database/schema.js';
import { setupTestApp } from './helpers.js';

let ctx: Awaited<ReturnType<typeof setupTestApp>>;
const PHONE = '+919876543210';
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

async function signInWithCode(phone: string) {
  const req = await request(ctx.app).post('/v1/auth/otp/request').send({ phone });
  if (req.status !== 202) throw new Error(`otp request failed: ${req.status} ${JSON.stringify(req.body)}`);
  const code = ctx.sms.lastCode(phone)!;
  const res = await request(ctx.app).post('/v1/auth/otp/verify').send({ phone, code });
  if (res.status !== 200 && res.status !== 201) throw new Error(`otp verify failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body as { token: string; user: Record<string, unknown>; onboarding: { needsPassword: boolean; needsUsername: boolean } };
}

async function clearSendLimits(phone: string) {
  // The per-number send cap and cooldown are counted from the table.
  await ctx.db.delete(otpCodes).where(eq(otpCodes.phone, phone));
}

beforeAll(async () => {
  ctx = await setupTestApp({ disableRateLimits: true, envExtra: { OTP_TEST_NUMBERS: '+919999900001:123456' } });
});
afterAll(async () => {
  await ctx.close();
});

describe('sign in with a one-time code', () => {
  it('advertises phone sign-in in /v1/config', async () => {
    const res = await request(ctx.app).get('/v1/config');
    expect(res.body.features.phoneSignIn).toBe(true);
  });

  it('normalises the number, sends a 6-digit code and never returns it', async () => {
    const res = await request(ctx.app).post('/v1/auth/otp/request').send({ phone: '098765 43210' });
    expect(res.status).toBe(202);
    expect(res.body.phone).toBe('+91 •••••••• 10');
    expect(ctx.sms.sent).toHaveLength(1);
    expect(ctx.sms.sent[0]!.to).toBe(PHONE);
    expect(ctx.sms.sent[0]!.code).toMatch(/^\d{6}$/);
    expect(JSON.stringify(res.body)).not.toContain(ctx.sms.sent[0]!.code);
    expect(JSON.stringify(res.body)).not.toContain('9876543210');
  });

  it('rejects numbers that are not valid', async () => {
    expect((await request(ctx.app).post('/v1/auth/otp/request').send({ phone: '12' })).status).toBe(400);
    expect((await request(ctx.app).post('/v1/auth/otp/request').send({ phone: 'abc' })).status).toBe(400);
  });

  it('creates the account on the first correct code and asks for a password and username', async () => {
    const code = ctx.sms.lastCode(PHONE)!;
    const wrong = await request(ctx.app).post('/v1/auth/otp/verify').send({ phone: PHONE, code: code === '000000' ? '111111' : '000000' });
    expect(wrong.status).toBe(400);
    const res = await request(ctx.app).post('/v1/auth/otp/verify').send({ phone: '+91 98765 43210', code });
    expect(res.status).toBe(201);
    expect(res.body.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(res.body.user.phone).toBe(PHONE);
    expect(res.body.user.hasPassword).toBe(false);
    expect(res.body.user.username).toBeNull();
    expect(res.body.onboarding).toEqual({ needsPassword: true, needsUsername: true });
    // A code works once.
    expect((await request(ctx.app).post('/v1/auth/otp/verify').send({ phone: PHONE, code })).status).toBe(400);
    const [row] = await ctx.db.select().from(users).where(eq(users.phone, PHONE));
    expect(row!.phoneVerifiedAt).toBeInstanceOf(Date);
    expect(row!.email).toBeNull();
  });

  it('locks a code after 5 wrong attempts', async () => {
    await clearSendLimits(PHONE);
    await request(ctx.app).post('/v1/auth/otp/request').send({ phone: PHONE }).expect(202);
    const good = ctx.sms.lastCode(PHONE)!;
    const bad = good === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) expect((await request(ctx.app).post('/v1/auth/otp/verify').send({ phone: PHONE, code: bad })).status).toBe(400);
    expect((await request(ctx.app).post('/v1/auth/otp/verify').send({ phone: PHONE, code: good })).status).toBe(400);
  });

  it('caps sends per number and enforces the resend cooldown', async () => {
    await clearSendLimits(PHONE);
    await request(ctx.app).post('/v1/auth/otp/request').send({ phone: PHONE }).expect(202);
    const again = await request(ctx.app).post('/v1/auth/otp/request').send({ phone: PHONE });
    expect(again.status).toBe(429);
    expect(again.body.error.code).toBe('rate_limited');
  });

  it('reports a provider failure without leaking anything', async () => {
    await clearSendLimits(PHONE);
    ctx.sms.failNext = true;
    const res = await request(ctx.app).post('/v1/auth/otp/request').send({ phone: PHONE });
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('sms_failed');
  });

  it('accepts the fixed code of a configured test number without sending an SMS', async () => {
    const sentBefore = ctx.sms.sent.length;
    await request(ctx.app).post('/v1/auth/otp/request').send({ phone: '+919999900001' }).expect(202);
    expect(ctx.sms.sent.length).toBe(sentBefore);
    const res = await request(ctx.app).post('/v1/auth/otp/verify').send({ phone: '+919999900001', code: '123456' });
    expect(res.status).toBe(201);
  });
});

describe('password, username and avatar after the first code', () => {
  let token = '';

  beforeAll(async () => {
    await clearSendLimits(PHONE);
    token = (await signInWithCode(PHONE)).token;
  });

  it('enforces the password rule: 6–15 with capital, small, number and special', async () => {
    for (const weak of ['Ab1!', 'abcdef1!', 'ABCDEF1!', 'Abcdefg!', 'Abcdef12', 'Abcdefgh-123456!', 'Ab 1!xy']) {
      const r = await request(ctx.app).post('/v1/me/password').set(auth(token)).send({ newPassword: weak });
      expect(r.status, weak).toBe(400);
    }
    // No current password is needed because the account has none yet.
    expect((await request(ctx.app).post('/v1/me/password').set(auth(token)).send({ newPassword: 'Tame@2026' })).status).toBe(204);
    const me = await request(ctx.app).get('/v1/me').set(auth(token));
    expect(me.body.hasPassword).toBe(true);
    expect(me.body.onboarding.needsPassword).toBe(false);
  });

  it('checks username availability live', async () => {
    const check = (username: string) => request(ctx.app).get('/v1/usernames/availability').query({ username }).set(auth(token));
    expect((await check('ab')).body).toMatchObject({ available: false, reason: 'invalid' });
    expect((await check('1abc')).body).toMatchObject({ available: false, reason: 'invalid' });
    expect((await check('ab..c')).body).toMatchObject({ available: false, reason: 'invalid' });
    expect((await check('Admin')).body).toMatchObject({ available: false, reason: 'reserved' });
    expect((await check('Asha_Rao')).body).toMatchObject({ username: 'Asha_Rao', available: true, reason: null });
    expect((await request(ctx.app).get('/v1/usernames/availability').query({ username: 'x' })).status).toBe(401);
  });

  it('saves the username (case kept, uniqueness case-insensitive) and the avatar', async () => {
    const res = await request(ctx.app).patch('/v1/me').set(auth(token)).send({ username: 'Asha_Rao', avatarId: 'comic_07' });
    expect(res.status).toBe(200);
    expect(res.body.username).toBe('Asha_Rao');
    expect(res.body.avatarId).toBe('comic_07');
    expect(res.body.onboarding).toEqual({ needsPassword: false, needsUsername: false });
    const check = await request(ctx.app).get('/v1/usernames/availability').query({ username: 'asha_rao' }).set(auth(token));
    expect(check.body.available).toBe(true); // it is mine
    expect((await request(ctx.app).patch('/v1/me').set(auth(token)).send({ username: 'admin' })).status).toBe(400);
    expect((await request(ctx.app).patch('/v1/me').set(auth(token)).send({ avatarId: '../etc' })).status).toBe(400);
  });

  it('refuses a username another account holds, even in a race', async () => {
    const other = await signInWithCode('+919876500000');
    const check = await request(ctx.app).get('/v1/usernames/availability').query({ username: 'ASHA_rao' }).set(auth(other.token));
    expect(check.body).toMatchObject({ available: false, reason: 'taken' });
    const taken = await request(ctx.app).patch('/v1/me').set(auth(other.token)).send({ username: 'ASHA_rao' });
    expect(taken.status).toBe(409);
    // Two new accounts saving the same free name at the same moment: exactly one wins.
    const a = await signInWithCode('+919876500001');
    const b = await signInWithCode('+919876500002');
    const [ra, rb] = await Promise.all([
      request(ctx.app).patch('/v1/me').set(auth(a.token)).send({ username: 'Racer' }),
      request(ctx.app).patch('/v1/me').set(auth(b.token)).send({ username: 'racer' }),
    ]);
    expect([ra.status, rb.status].sort()).toEqual([200, 409]);
  });

  it('signs in with the number and password afterwards, with a generic error', async () => {
    const ok = await request(ctx.app).post('/v1/auth/login').send({ phone: '98765 43210', password: 'Tame@2026' });
    expect(ok.status).toBe(200);
    expect(ok.body.user.username).toBe('Asha_Rao');
    const wrong = await request(ctx.app).post('/v1/auth/login').send({ phone: PHONE, password: 'Nope@2026' });
    const unknown = await request(ctx.app).post('/v1/auth/login').send({ phone: '+919800000000', password: 'Nope@2026' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error.message).toBe(unknown.body.error.message);
    expect((await request(ctx.app).post('/v1/auth/login').send({ password: 'Tame@2026' })).status).toBe(400);
  });

  it('changing the password needs the current one on an ordinary session, and signs other devices out', async () => {
    const other = await request(ctx.app).post('/v1/auth/login').send({ phone: PHONE, password: 'Tame@2026' });
    expect((await request(ctx.app).post('/v1/me/password').set(auth(other.body.token)).send({ newPassword: 'Tame@2027' })).status).toBe(400);
    expect((await request(ctx.app).post('/v1/me/password').set(auth(other.body.token)).send({ currentPassword: 'wrong', newPassword: 'Tame@2027' })).status).toBe(400);
    expect((await request(ctx.app).post('/v1/me/password').set(auth(other.body.token)).send({ currentPassword: 'Tame@2026', newPassword: 'Tame@2027' })).status).toBe(204);
    expect((await request(ctx.app).get('/v1/me').set(auth(token))).status).toBe(401);
    token = other.body.token;
  });

  it('forgot password: a fresh code signs in and lets a new password be set without the old one', async () => {
    await clearSendLimits(PHONE);
    const fresh = await signInWithCode(PHONE);
    expect(fresh.onboarding).toEqual({ needsPassword: false, needsUsername: false });
    expect((await request(ctx.app).post('/v1/me/password').set(auth(fresh.token)).send({ newPassword: 'Tame@2028' })).status).toBe(204);
    expect((await request(ctx.app).post('/v1/auth/login').send({ phone: PHONE, password: 'Tame@2027' })).status).toBe(401);
    expect((await request(ctx.app).post('/v1/auth/login').send({ phone: PHONE, password: 'Tame@2028' })).status).toBe(200);
    token = fresh.token;
  });

  it('deletes the account with the password', async () => {
    expect((await request(ctx.app).delete('/v1/me').set(auth(token)).send({ password: 'wrong' })).status).toBe(400);
    expect((await request(ctx.app).delete('/v1/me').set(auth(token)).send({ password: 'Tame@2028' })).status).toBe(204);
    expect((await request(ctx.app).get('/v1/me').set(auth(token))).status).toBe(401);
    const [row] = await ctx.db.select().from(users).where(eq(users.phone, PHONE));
    expect(row).toBeUndefined();
  });
});

describe('without an SMS provider', () => {
  it('answers 503 and hides phone sign-in', async () => {
    const bare = await setupTestApp({ disableRateLimits: true, withSms: false });
    try {
      expect((await request(bare.app).get('/v1/config')).body.features.phoneSignIn).toBe(false);
      expect((await request(bare.app).post('/v1/auth/otp/request').send({ phone: PHONE })).status).toBe(503);
    } finally {
      await bare.close();
    }
  });
});
