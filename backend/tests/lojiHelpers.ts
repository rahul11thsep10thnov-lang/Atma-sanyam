import request from 'supertest';
import type { setupTestApp } from './helpers.js';

type Ctx = Awaited<ReturnType<typeof setupTestApp>>;
export const as = (token: string) => ({ Authorization: `Bearer ${token}` });

export async function registerGuardian(ctx: Ctx, phone: string, opts: { name?: string; password?: string; installId?: string } = {}) {
  const password = opts.password ?? 'Guard-pass1';
  const start = await request(ctx.app).post('/v1/guardian/register/start').send({ name: opts.name ?? 'Guardian', phone, password, acceptTerms: true });
  if (start.status !== 202) throw new Error(`register/start failed: ${start.status} ${JSON.stringify(start.body)}`);
  const code = ctx.sms.lastCode(phone) ?? ctx.deps.env.OTP_TEST_NUMBERS.get(phone);
  const res = await request(ctx.app).post('/v1/guardian/register/verify').send({ challengeId: start.body.challengeId, code, installId: opts.installId });
  if (res.status !== 201) throw new Error(`register/verify failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { token: res.body.token as string, guardian: res.body.guardian as { id: string }, password, phone };
}

export async function loginGuardian(ctx: Ctx, phone: string, password: string) {
  const start = await request(ctx.app).post('/v1/guardian/login').send({ phone, password });
  if (start.status !== 202) return start;
  return request(ctx.app).post('/v1/guardian/login/verify').send({ challengeId: start.body.challengeId, code: ctx.sms.lastCode(phone)! });
}

export async function subscribe(ctx: Ctx, token: string, days = 30) {
  const res = await request(ctx.app).post('/v1/guardian/subscription/sandbox/activate').set(as(token)).send({ days });
  if (res.status !== 201) throw new Error(`sandbox activate failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.entitlement;
}

export async function addChild(ctx: Ctx, token: string, child: { displayName?: string; birthMonth?: string; pin?: string; playerOtpRequired?: boolean; avatarId?: string } = {}) {
  const res = await request(ctx.app)
    .post('/v1/guardian/children')
    .set(as(token))
    .send({ displayName: child.displayName ?? 'Kiran', avatarId: child.avatarId ?? 'comic_01', birthMonth: child.birthMonth ?? birthMonthForAge(7), pin: child.pin ?? '2580', playerOtpRequired: child.playerOtpRequired ?? false });
  if (res.status !== 201) throw new Error(`add child failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body as { id: string; playerId: string; ageBracket: string; effectiveBracket: string };
}

export function birthMonthForAge(age: number): string {
  const d = new Date();
  // Born this month `age` years ago → exactly `age` years old.
  return `${d.getUTCFullYear() - age}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export async function playerLogin(ctx: Ctx, playerId: string, pin: string, installId?: string) {
  const res = await request(ctx.app).post('/v1/player/login').send({ playerId, pin, installId });
  if (res.status === 202 && res.body.otpRequired) {
    const guardianPhone = [...ctx.sms.sent].reverse()[0]!.to;
    return request(ctx.app).post('/v1/player/login/verify').send({ challengeId: res.body.challengeId, code: ctx.sms.lastCode(guardianPhone)! });
  }
  return res;
}
