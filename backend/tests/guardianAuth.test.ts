import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { guardians, otpChallenges } from '../src/database/schema.js';
import { setupTestApp } from './helpers.js';
import { as, loginGuardian, registerGuardian } from './lojiHelpers.js';

let ctx: Awaited<ReturnType<typeof setupTestApp>>;
const PHONE = '+919876543210';

beforeAll(async () => {
  ctx = await setupTestApp({ disableRateLimits: true, envExtra: { OTP_TEST_NUMBERS: '+919999900001:123456' } });
});
afterAll(async () => {
  await ctx.close();
});

describe('guardian registration', () => {
  it('needs a name, a valid number, a strong password and consent', async () => {
    expect((await request(ctx.app).post('/v1/guardian/register/start').send({ name: 'A', phone: '12', password: 'Guard-pass1', acceptTerms: true })).status).toBe(400);
    expect((await request(ctx.app).post('/v1/guardian/register/start').send({ name: 'A', phone: PHONE, password: 'weak', acceptTerms: true })).status).toBe(400);
    expect((await request(ctx.app).post('/v1/guardian/register/start').send({ name: 'A', phone: PHONE, password: 'Guard-pass1', acceptTerms: false })).status).toBe(400);
    expect((await request(ctx.app).post('/v1/guardian/register/start').send({ phone: PHONE, password: 'Guard-pass1', acceptTerms: true })).status).toBe(400);
  });

  it('sends a code, never returns it, and creates nothing until the code is right', async () => {
    const res = await request(ctx.app).post('/v1/guardian/register/start').send({ name: 'Asha', phone: '098765 43210', password: 'Guard-pass1', acceptTerms: true });
    expect(res.status).toBe(202);
    expect(res.body.phoneMasked).toBe('+91 •••••••• 10');
    expect(res.body.challengeId).toMatch(/^[0-9a-f-]{36}$/);
    const code = ctx.sms.lastCode(PHONE)!;
    expect(code).toMatch(/^\d{6}$/);
    expect(JSON.stringify(res.body)).not.toContain(code);
    expect(await ctx.db.select().from(guardians)).toHaveLength(0);
    // A stored challenge never holds the raw code or password.
    const [row] = await ctx.db.select().from(otpChallenges);
    expect(JSON.stringify(row)).not.toContain(code);
    expect(JSON.stringify(row)).not.toContain('Guard-pass1');

    const wrong = await request(ctx.app).post('/v1/guardian/register/verify').send({ challengeId: res.body.challengeId, code: code === '000000' ? '111111' : '000000' });
    expect(wrong.status).toBe(400);
    const ok = await request(ctx.app).post('/v1/guardian/register/verify').send({ challengeId: res.body.challengeId, code });
    expect(ok.status).toBe(201);
    expect(ok.body.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(ok.body.guardian.name).toBe('Asha');
    expect(ok.body.guardian.phone).toBe(PHONE);
    expect(ok.body.entitlement).toEqual({ active: false, status: 'never_subscribed', validUntil: null, adFree: false });
    expect(ok.body.children).toEqual([]);
    // The code works once.
    expect((await request(ctx.app).post('/v1/guardian/register/verify').send({ challengeId: res.body.challengeId, code })).status).toBe(400);
    const [g] = await ctx.db.select().from(guardians).where(eq(guardians.phone, PHONE));
    expect(g!.passwordHash).toMatch(/^scrypt\$/);
    expect(g!.termsAcceptedAt).toBeInstanceOf(Date);
  });

  it('refuses a second account on the same number', async () => {
    const res = await request(ctx.app).post('/v1/guardian/register/start').send({ name: 'Dup', phone: PHONE, password: 'Guard-pass1', acceptTerms: true });
    expect(res.status).toBe(409);
  });

  it('locks a code after 5 wrong attempts', async () => {
    const start = await request(ctx.app).post('/v1/guardian/register/start').send({ name: 'B', phone: '+919876543211', password: 'Guard-pass1', acceptTerms: true });
    const good = ctx.sms.lastCode('+919876543211')!;
    const bad = good === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) expect((await request(ctx.app).post('/v1/guardian/register/verify').send({ challengeId: start.body.challengeId, code: bad })).status).toBe(400);
    expect((await request(ctx.app).post('/v1/guardian/register/verify').send({ challengeId: start.body.challengeId, code: good })).status).toBe(400);
  });

  it('a code for one purpose cannot be used for another', async () => {
    const start = await request(ctx.app).post('/v1/guardian/register/start').send({ name: 'C', phone: '+919876543212', password: 'Guard-pass1', acceptTerms: true });
    const code = ctx.sms.lastCode('+919876543212')!;
    expect((await request(ctx.app).post('/v1/guardian/login/verify').send({ challengeId: start.body.challengeId, code })).status).toBe(400);
  });

  it('test numbers use their fixed code without an SMS', async () => {
    const before = ctx.sms.sent.length;
    const start = await request(ctx.app).post('/v1/guardian/register/start').send({ name: 'Review', phone: '+919999900001', password: 'Guard-pass1', acceptTerms: true });
    expect(start.status).toBe(202);
    expect(ctx.sms.sent.length).toBe(before);
    expect((await request(ctx.app).post('/v1/guardian/register/verify').send({ challengeId: start.body.challengeId, code: '123456' })).status).toBe(201);
  });
});

describe('guardian sign-in: password, then a fresh code', () => {
  it('does not reveal whether a number exists and needs the code', async () => {
    const unknown = await request(ctx.app).post('/v1/guardian/login').send({ phone: '+919000000000', password: 'Guard-pass1' });
    const wrongPw = await request(ctx.app).post('/v1/guardian/login').send({ phone: PHONE, password: 'Wrong-pass1' });
    expect(unknown.status).toBe(401);
    expect(wrongPw.status).toBe(401);
    expect(unknown.body.error.message).toBe(wrongPw.body.error.message);

    const start = await request(ctx.app).post('/v1/guardian/login').send({ phone: PHONE, password: 'Guard-pass1' });
    expect(start.status).toBe(202);
    expect(start.body).not.toHaveProperty('token');
    const code = ctx.sms.lastCode(PHONE)!;
    const res = await request(ctx.app).post('/v1/guardian/login/verify').send({ challengeId: start.body.challengeId, code });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    const me = await request(ctx.app).get('/v1/guardian/me').set(as(res.body.token));
    expect(me.status).toBe(200);
    expect(me.body.guardian.name).toBe('Asha');
    expect(me.body.stepUpValidUntil).toBeTruthy();
  });

  it('locks the account for a while after 5 wrong passwords', async () => {
    const { phone } = await registerGuardian(ctx, '+919876543220');
    for (let i = 0; i < 5; i++) expect((await request(ctx.app).post('/v1/guardian/login').send({ phone, password: 'Wrong-pass1' })).status).toBe(401);
    const locked = await request(ctx.app).post('/v1/guardian/login').send({ phone, password: 'Guard-pass1' });
    expect(locked.status).toBe(423);
    await ctx.db.update(guardians).set({ lockedUntil: null, failedLoginCount: 0 }).where(eq(guardians.phone, phone));
    expect((await loginGuardian(ctx, phone, 'Guard-pass1')).status).toBe(200);
  });

  it('resends the code of a live challenge', async () => {
    const start = await request(ctx.app).post('/v1/guardian/login').send({ phone: PHONE, password: 'Guard-pass1' });
    const first = ctx.sms.lastCode(PHONE)!;
    const resend = await request(ctx.app).post('/v1/guardian/otp/resend').send({ challengeId: start.body.challengeId });
    expect(resend.status).toBe(202);
    // The old code is dead, the new one works.
    expect((await request(ctx.app).post('/v1/guardian/login/verify').send({ challengeId: start.body.challengeId, code: first })).status).toBe(400);
    expect((await request(ctx.app).post('/v1/guardian/login/verify').send({ challengeId: resend.body.challengeId, code: ctx.sms.lastCode(PHONE)! })).status).toBe(200);
  });

  it('logout revokes the session; a forged token is rejected', async () => {
    const res = await loginGuardian(ctx, PHONE, 'Guard-pass1');
    await request(ctx.app).post('/v1/guardian/logout').set(as(res.body.token)).expect(204);
    expect((await request(ctx.app).get('/v1/guardian/me').set(as(res.body.token))).status).toBe(401);
    expect((await request(ctx.app).get('/v1/guardian/me').set(as('x'.repeat(43)))).status).toBe(401);
  });
});

describe('recovery and step-up', () => {
  it('recovers an account by code and new password, revoking older sessions', async () => {
    const old = await loginGuardian(ctx, PHONE, 'Guard-pass1');
    const start = await request(ctx.app).post('/v1/guardian/recovery/start').send({ phone: PHONE });
    expect(start.status).toBe(202);
    // Unknown numbers get the same answer.
    const ghost = await request(ctx.app).post('/v1/guardian/recovery/start').send({ phone: '+919000000099' });
    expect(ghost.status).toBe(202);
    const res = await request(ctx.app).post('/v1/guardian/recovery/verify').send({ challengeId: start.body.challengeId, code: ctx.sms.lastCode(PHONE)!, newPassword: 'Newer-pass2' });
    expect(res.status).toBe(200);
    expect((await request(ctx.app).get('/v1/guardian/me').set(as(old.body.token))).status).toBe(401);
    expect((await request(ctx.app).post('/v1/guardian/login').send({ phone: PHONE, password: 'Guard-pass1' })).status).toBe(401);
    expect((await request(ctx.app).post('/v1/guardian/login').send({ phone: PHONE, password: 'Newer-pass2' })).status).toBe(202);
  });

  it('sensitive actions need a recent code (step-up)', async () => {
    const res = await loginGuardian(ctx, PHONE, 'Newer-pass2');
    const token = res.body.token as string;
    // Fresh from sign-in: allowed.
    await request(ctx.app).post('/v1/guardian/password').set(as(token)).send({ currentPassword: 'Newer-pass2', newPassword: 'Third-pass3' }).expect(204);
    // Make the step-up stale.
    const { guardianSessions } = await import('../src/database/schema.js');
    await ctx.db.update(guardianSessions).set({ stepUpAt: new Date(Date.now() - 60 * 60_000) });
    const stale = await request(ctx.app).post('/v1/guardian/password').set(as(token)).send({ currentPassword: 'Third-pass3', newPassword: 'Fourth-pass4' });
    expect(stale.status).toBe(403);
    expect(stale.body.error.code).toBe('step_up_required');
    const su = await request(ctx.app).post('/v1/guardian/step-up/start').set(as(token));
    expect(su.status).toBe(202);
    await request(ctx.app).post('/v1/guardian/step-up/verify').set(as(token)).send({ challengeId: su.body.challengeId, code: ctx.sms.lastCode(PHONE)! }).expect(200);
    await request(ctx.app).post('/v1/guardian/password').set(as(token)).send({ currentPassword: 'Third-pass3', newPassword: 'Fourth-pass4' }).expect(204);
  });

  it('account deletion has a cooling-off period and can be cancelled', async () => {
    const res = await loginGuardian(ctx, PHONE, 'Fourth-pass4');
    const token = res.body.token as string;
    const del = await request(ctx.app).delete('/v1/guardian/me').set(as(token)).send({ password: 'Fourth-pass4' });
    expect(del.status).toBe(200);
    expect(new Date(del.body.scheduledFor).getTime()).toBeGreaterThan(Date.now() + 6 * 86_400_000);
    const me = await request(ctx.app).get('/v1/guardian/me').set(as(token));
    expect(me.body.guardian.status).toBe('deleted_pending');
    expect(me.body.pendingDeletion).toBeTruthy();
    await request(ctx.app).post('/v1/guardian/me/deletion/cancel').set(as(token)).expect(204);
    expect((await request(ctx.app).get('/v1/guardian/me').set(as(token))).body.guardian.status).toBe('active');
  });
});
