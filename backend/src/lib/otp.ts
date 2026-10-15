// One-time codes for every purpose (registration, guardian sign-in, step-up,
// a child's sign-in approved from the guardian's phone, account recovery).
// Only a hash of the code is stored; a code lasts 10 minutes, is locked after
// 5 wrong attempts, works once, and the newest code for a purpose and number
// is the only valid one. Sends are capped per number per hour.
import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { and, count, desc, eq, gt, isNull, max } from 'drizzle-orm';
import type { Db } from '../database/client.js';
import { otpChallenges, type OtpPurpose } from '../database/schema.js';
import type { Env } from '../config/env.js';
import type { SmsSender } from './sms.js';
import { HttpError, badRequest } from './httpError.js';
import { maskPhone } from './phone.js';

export const OTP_TTL_MIN = 10;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_MAX_SENDS_PER_HOUR = 6;
const maxSendsPerHour = (env: Env) => (env.NODE_ENV === 'test' ? 1000 : OTP_MAX_SENDS_PER_HOUR);

const hashCode = (challengeId: string, code: string) => createHash('sha256').update(`otp:${challengeId}:${code}`).digest();

export interface OtpDeps {
  db: Db;
  env: Env;
  sms: SmsSender | null;
}

export interface IssueOptions {
  purpose: OtpPurpose;
  phone: string; // E.164
  guardianId?: string | null;
  childId?: string | null;
  context?: Record<string, unknown>;
  /** The SMS wording; `{code}` is replaced. Keep it short: DLT templates in India are fixed. */
  text?: string;
}

export interface IssuedChallenge {
  challengeId: string;
  phoneMasked: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
}

export async function issueOtp({ db, env, sms }: OtpDeps, opts: IssueOptions): Promise<IssuedChallenge> {
  const testCode = env.OTP_TEST_NUMBERS.get(opts.phone);
  if (!sms && !testCode) throw new HttpError(503, 'Verification by SMS is not available right now.', 'unavailable');

  const since = new Date(Date.now() - 60 * 60_000);
  const [recent] = await db
    .select({ n: count(), last: max(otpChallenges.createdAt) })
    .from(otpChallenges)
    .where(and(eq(otpChallenges.phone, opts.phone), gt(otpChallenges.createdAt, since)));
  if ((recent?.n ?? 0) >= maxSendsPerHour(env)) {
    throw new HttpError(429, 'Too many codes were sent to this number. Try again in an hour.', 'rate_limited');
  }
  const cooldown = env.OTP_RESEND_COOLDOWN_S;
  if (cooldown > 0 && recent?.last && Date.now() - new Date(recent.last).getTime() < cooldown * 1000) {
    throw new HttpError(429, `Wait ${cooldown} seconds before asking for another code.`, 'rate_limited');
  }

  // Only the newest code for this number and purpose stays valid.
  await db
    .update(otpChallenges)
    .set({ usedAt: new Date() })
    .where(and(eq(otpChallenges.phone, opts.phone), eq(otpChallenges.purpose, opts.purpose), isNull(otpChallenges.usedAt)));

  const code = testCode ?? String(randomInt(0, 1_000_000)).padStart(6, '0');
  const [row] = await db
    .insert(otpChallenges)
    .values({
      purpose: opts.purpose,
      phone: opts.phone,
      guardianId: opts.guardianId ?? null,
      childId: opts.childId ?? null,
      // Placeholder: the hash binds the code to the row id, set right after.
      codeHash: '',
      context: opts.context ?? null,
      expiresAt: new Date(Date.now() + OTP_TTL_MIN * 60_000),
    })
    .returning({ id: otpChallenges.id });
  const challengeId = row!.id;
  await db.update(otpChallenges).set({ codeHash: hashCode(challengeId, code).toString('hex') }).where(eq(otpChallenges.id, challengeId));

  if (!testCode) {
    const text = (opts.text ?? `{code} is your LoJi verification code. It expires in ${OTP_TTL_MIN} minutes. Never share it.`).replace('{code}', code);
    try {
      await sms!.send({ to: opts.phone, code, text });
    } catch (err) {
      // Log the provider's message, never the code or the number.
      console.error('[sms] sending a code failed:', err instanceof Error ? err.message : err);
      await db.update(otpChallenges).set({ usedAt: new Date() }).where(eq(otpChallenges.id, challengeId));
      throw new HttpError(502, 'The code could not be sent. Try again in a moment.', 'sms_failed');
    }
  }
  return { challengeId, phoneMasked: maskPhone(opts.phone), expiresInSeconds: OTP_TTL_MIN * 60, resendAfterSeconds: cooldown };
}

export const invalidCode = () => badRequest('That code is wrong or has expired. Ask for a new one.', undefined);

/**
 * Checks a code against a challenge and marks it used. Throws the same error
 * for an unknown challenge, a wrong purpose, an expired or locked code and a
 * wrong code, so nothing can be learnt from the difference.
 */
export async function consumeOtp(db: Db, challengeId: string, code: string, purpose: OtpPurpose) {
  const [row] = await db
    .select()
    .from(otpChallenges)
    .where(and(eq(otpChallenges.id, challengeId), eq(otpChallenges.purpose, purpose), isNull(otpChallenges.usedAt), gt(otpChallenges.expiresAt, new Date())))
    .orderBy(desc(otpChallenges.createdAt))
    .limit(1);
  if (!row || row.attempts >= OTP_MAX_ATTEMPTS || !row.codeHash) throw invalidCode();
  if (!timingSafeEqual(Buffer.from(row.codeHash, 'hex'), hashCode(row.id, code))) {
    await db.update(otpChallenges).set({ attempts: row.attempts + 1 }).where(eq(otpChallenges.id, row.id));
    throw invalidCode();
  }
  await db.update(otpChallenges).set({ usedAt: new Date() }).where(eq(otpChallenges.id, row.id));
  return row;
}

/** Looks a live challenge up without consuming it (for resends). */
export async function findLiveChallenge(db: Db, challengeId: string) {
  const [row] = await db
    .select()
    .from(otpChallenges)
    .where(and(eq(otpChallenges.id, challengeId), isNull(otpChallenges.usedAt), gt(otpChallenges.expiresAt, new Date())))
    .limit(1);
  return row ?? null;
}
