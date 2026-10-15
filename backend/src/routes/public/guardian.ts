// Guardian accounts: registration (name, mobile, code, password, consent),
// sign-in (password, then a fresh code), recovery, step-up for sensitive
// actions, profile and account deletion. Children and controls are in
// household.ts, subscriptions in subscription.ts.
import { Router } from 'express';
import { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';
import { accountDeletionRequests, children, devices, guardianSessions, guardians } from '../../database/schema.js';
import type { Auth } from '../../middleware/auth.js';
import type { createRateLimits } from '../../middleware/rateLimits.js';
import { parse } from '../../middleware/validate.js';
import { badRequest, conflict, HttpError, notFound, unauthorized } from '../../lib/httpError.js';
import { burnPasswordCheck, hashPassword, verifyPassword } from '../../lib/password.js';
import { maskPhone, normalizePhone } from '../../lib/phone.js';
import { userPassword } from '../../lib/passwordPolicy.js';
import { consumeOtp, findLiveChallenge, issueOtp } from '../../lib/otp.js';
import { createGuardianSession, revokeAllGuardianSessions, revokeAllPlayerSessions } from '../../services/sessionService.js';
import { getEntitlement, publicEntitlement } from '../../services/entitlementService.js';
import { publicChild } from './household.js';
import type { AppDeps } from '../../types.js';

export const TERMS_VERSION = '2026-10';
const LOGIN_MAX_FAILURES = 5;
const LOGIN_LOCK_MIN = 15;

const phoneField = z.string().trim().min(6).max(24);
const codeField = z.string().regex(/^\d{6}$/, 'Enter the 6-digit code');
const challengeField = z.string().uuid();
const installIdField = z.string().regex(/^[A-Za-z0-9-]{16,64}$/).optional();

export function publicGuardian(g: typeof guardians.$inferSelect) {
  return {
    id: g.id,
    name: g.name,
    phone: g.phone,
    phoneMasked: maskPhone(g.phone),
    email: g.email,
    status: g.status,
    termsVersion: g.termsVersion,
    createdAt: g.createdAt.toISOString(),
  };
}

export function guardianRouter(deps: AppDeps, auth: Auth, limits: ReturnType<typeof createRateLimits>) {
  const { db, env } = deps;
  const r = Router();

  async function deviceIdFor(installId: string | undefined, guardianId: string | null): Promise<string | null> {
    if (!installId) return null;
    const [row] = await db.select({ id: devices.id }).from(devices).where(eq(devices.installId, installId));
    if (!row) return null;
    if (guardianId) await db.update(devices).set({ guardianId, lastSeenAt: new Date() }).where(eq(devices.id, row.id));
    return row.id;
  }

  async function sessionResponse(g: typeof guardians.$inferSelect, opts: { stepUp?: boolean; installId?: string }) {
    const deviceId = await deviceIdFor(opts.installId, g.id);
    const session = await createGuardianSession(db, g.id, env.GUARDIAN_SESSION_TTL_DAYS, { stepUpAt: opts.stepUp ? new Date() : undefined, deviceId });
    const kids = await db.select().from(children).where(and(eq(children.guardianId, g.id), eq(children.status, 'active')));
    return {
      token: session.token,
      expiresAt: session.expiresAt.toISOString(),
      guardian: publicGuardian(g),
      entitlement: publicEntitlement(await getEntitlement(db, g.id)),
      children: kids.map(publicChild),
    };
  }

  // ---- registration ------------------------------------------------------
  r.post('/register/start', limits.register, limits.otp, async (req, res) => {
    const body = parse(
      z.object({
        name: z.string().trim().min(1).max(80),
        phone: phoneField,
        password: userPassword,
        acceptTerms: z.literal(true, { error: 'You must accept the Terms and Privacy Policy' }),
      }),
      req.body
    );
    const phone = normalizePhone(body.phone, env.DEFAULT_COUNTRY_CODE);
    if (!phone) throw badRequest('Enter a valid mobile number');
    const [existing] = await db.select({ id: guardians.id }).from(guardians).where(eq(guardians.phone, phone));
    if (existing) throw conflict('An account with this mobile number already exists. Sign in instead.');
    // The draft is kept inside the challenge: nothing is created until the code is right.
    const passwordHash = await hashPassword(body.password);
    const issued = await issueOtp(deps, { purpose: 'register', phone, context: { name: body.name, passwordHash } });
    res.status(202).json(issued);
  });

  r.post('/register/verify', limits.otpVerify, async (req, res) => {
    const body = parse(z.object({ challengeId: challengeField, code: codeField, installId: installIdField }), req.body);
    const challenge = await consumeOtp(db, body.challengeId, body.code, 'register');
    const ctx = (challenge.context ?? {}) as { name?: string; passwordHash?: string };
    if (!ctx.name || !ctx.passwordHash) throw badRequest('This registration has expired. Start again.');
    const now = new Date();
    let g: typeof guardians.$inferSelect | undefined;
    try {
      [g] = await db
        .insert(guardians)
        .values({ phone: challenge.phone, phoneVerifiedAt: now, passwordHash: ctx.passwordHash, name: ctx.name, termsVersion: TERMS_VERSION, termsAcceptedAt: now, privacyAcceptedAt: now, lastSeenAt: now })
        .returning();
    } catch (err) {
      if ((err as { code?: string; cause?: { code?: string } })?.cause?.code === '23505') throw conflict('An account with this mobile number already exists. Sign in instead.');
      throw err;
    }
    res.status(201).json(await sessionResponse(g!, { stepUp: true, installId: body.installId }));
  });

  // ---- sign-in: password, then a fresh code ------------------------------
  r.post('/login', limits.login, async (req, res) => {
    const body = parse(z.object({ phone: phoneField, password: z.string().min(1).max(128) }), req.body);
    const wrong = unauthorized('Incorrect mobile number or password');
    const phone = normalizePhone(body.phone, env.DEFAULT_COUNTRY_CODE);
    if (!phone) throw wrong;
    const [g] = await db.select().from(guardians).where(eq(guardians.phone, phone));
    if (!g) {
      await burnPasswordCheck(body.password);
      throw wrong;
    }
    if (g.lockedUntil && g.lockedUntil.getTime() > Date.now()) {
      throw new HttpError(423, `Too many wrong passwords. Try again in ${Math.ceil((g.lockedUntil.getTime() - Date.now()) / 60_000)} minutes.`, 'locked');
    }
    if (!(await verifyPassword(body.password, g.passwordHash))) {
      const failures = g.failedLoginCount + 1;
      await db
        .update(guardians)
        .set({ failedLoginCount: failures, lockedUntil: failures >= LOGIN_MAX_FAILURES ? new Date(Date.now() + LOGIN_LOCK_MIN * 60_000) : null })
        .where(eq(guardians.id, g.id));
      throw wrong;
    }
    if (g.status === 'deactivated') throw unauthorized('This account has been deactivated. Contact support.');
    if (g.failedLoginCount > 0) await db.update(guardians).set({ failedLoginCount: 0, lockedUntil: null }).where(eq(guardians.id, g.id));
    const issued = await issueOtp(deps, { purpose: 'login', phone, guardianId: g.id, text: `{code} is your LoJi sign-in code. It expires in 10 minutes. Never share it.` });
    res.status(202).json(issued);
  });

  r.post('/login/verify', limits.otpVerify, async (req, res) => {
    const body = parse(z.object({ challengeId: challengeField, code: codeField, installId: installIdField }), req.body);
    const challenge = await consumeOtp(db, body.challengeId, body.code, 'login');
    const [g] = await db.select().from(guardians).where(eq(guardians.id, challenge.guardianId!));
    if (!g || g.status === 'deactivated') throw unauthorized();
    await db.update(guardians).set({ lastSeenAt: new Date() }).where(eq(guardians.id, g.id));
    res.json(await sessionResponse(g, { stepUp: true, installId: body.installId }));
  });

  // Resend the code of a live challenge (same purpose and person).
  r.post('/otp/resend', limits.otp, async (req, res) => {
    const body = parse(z.object({ challengeId: challengeField }), req.body);
    const live = await findLiveChallenge(db, body.challengeId);
    if (!live) throw badRequest('This code has expired. Start again.');
    const issued = await issueOtp(deps, { purpose: live.purpose, phone: live.phone, guardianId: live.guardianId, childId: live.childId, context: live.context ?? undefined });
    res.status(202).json(issued);
  });

  // ---- account recovery (forgot password) --------------------------------
  // Always answers 202 so it cannot be used to discover who has an account.
  r.post('/recovery/start', limits.recovery, async (req, res) => {
    const body = parse(z.object({ phone: phoneField }), req.body);
    const phone = normalizePhone(body.phone, env.DEFAULT_COUNTRY_CODE);
    let challengeId: string | null = null;
    if (phone) {
      const [g] = await db.select().from(guardians).where(eq(guardians.phone, phone));
      if (g && g.status !== 'deactivated') {
        try {
          challengeId = (await issueOtp(deps, { purpose: 'recovery', phone, guardianId: g.id })).challengeId;
        } catch (err) {
          if (!(err instanceof HttpError && err.status === 429)) throw err;
        }
      }
    }
    res.status(202).json({ ok: true, phone: phone ? maskPhone(phone) : null, challengeId, expiresInSeconds: 600, resendAfterSeconds: 45 });
  });

  r.post('/recovery/verify', limits.otpVerify, async (req, res) => {
    const body = parse(z.object({ challengeId: challengeField, code: codeField, newPassword: userPassword, installId: installIdField }), req.body);
    const challenge = await consumeOtp(db, body.challengeId, body.code, 'recovery');
    const [g] = await db
      .update(guardians)
      .set({ passwordHash: await hashPassword(body.newPassword), failedLoginCount: 0, lockedUntil: null, updatedAt: new Date() })
      .where(eq(guardians.id, challenge.guardianId!))
      .returning();
    if (!g) throw unauthorized();
    await revokeAllGuardianSessions(db, g.id);
    res.json(await sessionResponse(g, { stepUp: true, installId: body.installId }));
  });

  // ---- signed-in ---------------------------------------------------------
  r.use(auth.requireGuardian);

  r.get('/me', async (req, res) => {
    const [g] = await db.select().from(guardians).where(eq(guardians.id, req.guardian!.id));
    if (!g) throw unauthorized();
    const kids = await db.select().from(children).where(and(eq(children.guardianId, g.id), eq(children.status, 'active')));
    const [pending] = await db
      .select()
      .from(accountDeletionRequests)
      .where(and(eq(accountDeletionRequests.guardianId, g.id), eq(accountDeletionRequests.scope, 'account'), isNull(accountDeletionRequests.completedAt), isNull(accountDeletionRequests.cancelledAt)));
    res.json({
      guardian: publicGuardian(g),
      entitlement: publicEntitlement(await getEntitlement(db, g.id)),
      children: kids.map(publicChild),
      stepUpValidUntil: req.guardian!.stepUpAt ? new Date(req.guardian!.stepUpAt.getTime() + 15 * 60_000).toISOString() : null,
      pendingDeletion: pending ? { requestedAt: pending.requestedAt.toISOString(), scheduledFor: pending.scheduledFor.toISOString() } : null,
    });
  });

  r.patch('/me', async (req, res) => {
    const body = parse(z.object({ name: z.string().trim().min(1).max(80).optional(), email: z.string().trim().email().max(254).nullable().optional() }), req.body);
    const [g] = await db.update(guardians).set({ ...body, updatedAt: new Date() }).where(eq(guardians.id, req.guardian!.id)).returning();
    res.json(publicGuardian(g!));
  });

  r.post('/logout', async (req, res) => {
    await db.update(guardianSessions).set({ revokedAt: new Date() }).where(eq(guardianSessions.id, req.guardian!.sessionId));
    res.status(204).end();
  });

  r.post('/logout-all', auth.requireStepUp, async (req, res) => {
    await revokeAllGuardianSessions(db, req.guardian!.id, req.guardian!.sessionId);
    res.status(204).end();
  });

  // Step-up: a fresh code for sensitive actions when the sign-in one is stale.
  r.post('/step-up/start', limits.otp, async (req, res) => {
    res.status(202).json(await issueOtp(deps, { purpose: 'step_up', phone: req.guardian!.phone, guardianId: req.guardian!.id, text: `{code} is your LoJi confirmation code. It expires in 10 minutes. Never share it.` }));
  });

  r.post('/step-up/verify', limits.otpVerify, async (req, res) => {
    const body = parse(z.object({ challengeId: challengeField, code: codeField }), req.body);
    const challenge = await consumeOtp(db, body.challengeId, body.code, 'step_up');
    if (challenge.guardianId !== req.guardian!.id) throw badRequest('That code is wrong or has expired. Ask for a new one.');
    const until = new Date();
    await db.update(guardianSessions).set({ stepUpAt: until }).where(eq(guardianSessions.id, req.guardian!.sessionId));
    res.json({ ok: true, stepUpValidUntil: new Date(until.getTime() + 15 * 60_000).toISOString() });
  });

  r.post('/password', auth.requireStepUp, async (req, res) => {
    const body = parse(z.object({ currentPassword: z.string().min(1).max(128), newPassword: userPassword }), req.body);
    const [g] = await db.select().from(guardians).where(eq(guardians.id, req.guardian!.id));
    if (!g || !(await verifyPassword(body.currentPassword, g.passwordHash))) throw unauthorized('The current password is wrong');
    await db.update(guardians).set({ passwordHash: await hashPassword(body.newPassword), updatedAt: new Date() }).where(eq(guardians.id, g.id));
    await revokeAllGuardianSessions(db, g.id, req.guardian!.sessionId);
    res.status(204).end();
  });

  // ---- account deletion ----------------------------------------------------
  // A cooling-off period (DELETION_COOLING_OFF_DAYS) before the data goes;
  // children stop being able to sign in at once. Cancelling restores access.
  r.delete('/me', auth.requireStepUp, async (req, res) => {
    const body = parse(z.object({ password: z.string().min(1).max(128), reason: z.string().trim().max(500).optional() }), req.body ?? {});
    const [g] = await db.select().from(guardians).where(eq(guardians.id, req.guardian!.id));
    if (!g || !(await verifyPassword(body.password, g.passwordHash))) throw unauthorized('The password is wrong');
    const scheduledFor = new Date(Date.now() + env.DELETION_COOLING_OFF_DAYS * 86_400_000);
    const [existing] = await db
      .select({ id: accountDeletionRequests.id })
      .from(accountDeletionRequests)
      .where(and(eq(accountDeletionRequests.guardianId, g.id), eq(accountDeletionRequests.scope, 'account'), isNull(accountDeletionRequests.completedAt), isNull(accountDeletionRequests.cancelledAt)));
    if (!existing) await db.insert(accountDeletionRequests).values({ guardianId: g.id, scope: 'account', reason: body.reason ?? null, scheduledFor });
    await db.update(guardians).set({ status: 'deleted_pending', updatedAt: new Date() }).where(eq(guardians.id, g.id));
    const kids = await db.select({ id: children.id }).from(children).where(eq(children.guardianId, g.id));
    for (const k of kids) await revokeAllPlayerSessions(db, k.id);
    res.json({ scheduledFor: scheduledFor.toISOString() });
  });

  r.post('/me/deletion/cancel', async (req, res) => {
    const [pending] = await db
      .update(accountDeletionRequests)
      .set({ cancelledAt: new Date() })
      .where(and(eq(accountDeletionRequests.guardianId, req.guardian!.id), eq(accountDeletionRequests.scope, 'account'), isNull(accountDeletionRequests.completedAt), isNull(accountDeletionRequests.cancelledAt)))
      .returning();
    if (!pending) throw notFound('No deletion is pending');
    await db.update(guardians).set({ status: 'active', updatedAt: new Date() }).where(eq(guardians.id, req.guardian!.id));
    res.status(204).end();
  });

  // Everything the account holds, for data-portability requests.
  r.get('/me/export', auth.requireStepUp, async (req, res) => {
    const [g] = await db.select().from(guardians).where(eq(guardians.id, req.guardian!.id));
    const kids = await db.select().from(children).where(eq(children.guardianId, req.guardian!.id));
    res.set('Cache-Control', 'no-store');
    res.json({
      exportedAt: new Date().toISOString(),
      guardian: publicGuardian(g!),
      children: kids.map((k) => ({ ...publicChild(k), birthMonth: k.birthMonth })),
    });
  });

  return r;
}
