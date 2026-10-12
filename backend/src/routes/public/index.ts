import { Router } from 'express';
import { z } from 'zod';
import { and, asc, count, desc, eq, gt, isNull, max, sql } from 'drizzle-orm';
import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { categories, content, devices, events, otpCodes, passwordResetCodes, users, userSessions } from '../../database/schema.js';
import type { Auth } from '../../middleware/auth.js';
import type { createRateLimits } from '../../middleware/rateLimits.js';
import { parse } from '../../middleware/validate.js';
import { badRequest, conflict, HttpError, notFound, unauthorized } from '../../lib/httpError.js';
import { burnPasswordCheck, hashPassword, verifyPassword } from '../../lib/password.js';
import { normalizeEmail } from '../../lib/strings.js';
import { maskPhone, normalizePhone } from '../../lib/phone.js';
import { userPassword } from '../../lib/passwordPolicy.js';
import { normalizeUsername, usernameProblem } from '../../lib/username.js';
import { EXPO_PUSH_TOKEN_RE } from '../../lib/push.js';
import { listPublishedContent, toPublicImage } from '../../services/contentService.js';
import { createUserSession, revokeAllUserSessions } from '../../services/sessionService.js';
import { publicConfig } from '../../services/settingsService.js';
import type { AppDeps } from '../../types.js';

const email = z.string().trim().email().max(254);
const installId = z.string().regex(/^[A-Za-z0-9-]{16,64}$/, 'Invalid install id');
const platform = z.enum(['ios', 'android', 'web']);
const appVersion = z.string().max(32).optional();

const imagesQuery = z.object({
  search: z.string().trim().max(100).optional(),
  categoryId: z.string().max(80).optional(),
  tags: z
    .string()
    .max(300)
    .optional()
    .transform((v) => (v ? v.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 10) : undefined)),
  sort: z.enum(['newest', 'popular', 'title']).default('newest'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().max(200).optional(),
});

const eventSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9_]{1,48}$/),
  occurredAt: z.string().datetime({ offset: true }).optional(),
  screen: z.string().max(64).optional(),
  contentId: z.string().max(64).optional(),
  properties: z
    .record(z.string().max(40), z.union([z.string().max(500), z.number(), z.boolean(), z.null()]))
    .refine((p) => Object.keys(p).length <= 20, 'Too many properties')
    .optional(),
});

const eventsBody = z.object({
  installId,
  platform,
  appVersion,
  events: z.array(eventSchema).min(1).max(50),
});

// The owner's own view of their account: the full number is shown to them
// alone. Other people get `publicProfile` (never the number or email).
export function publicUser(u: typeof users.$inferSelect) {
  return {
    id: u.id,
    phone: u.phone,
    phoneMasked: u.phone ? maskPhone(u.phone) : null,
    email: u.email,
    username: u.username,
    displayName: u.displayName,
    avatarId: u.avatarId,
    allowPokes: u.allowPokes,
    discoverableByPhone: u.discoverableByPhone,
    hasPassword: !!u.passwordHash,
    createdAt: u.createdAt.toISOString(),
  };
}

export function publicProfile(u: Pick<typeof users.$inferSelect, 'id' | 'username' | 'displayName' | 'avatarId'>) {
  return { id: u.id, username: u.username, displayName: u.displayName, avatarId: u.avatarId };
}

// What a new account still has to do before it is complete.
function onboardingOf(u: typeof users.$inferSelect) {
  return { needsPassword: !u.passwordHash, needsUsername: !u.usernameNormalized };
}

const RESET_TTL_MIN = 15;
const RESET_MAX_ATTEMPTS = 5;
const hashResetCode = (userId: string, code: string) => createHash('sha256').update(`${userId}:${code}`).digest();

const OTP_TTL_MIN = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_MAX_SENDS_PER_HOUR = 5;
const OTP_RESEND_COOLDOWN_S = 45;
// After signing in with a code, a new password may be set without the old one for this long.
const OTP_PASSWORD_WINDOW_MIN = 15;
// Postgres unique_violation, which drizzle wraps as the error's cause.
function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } } | null;
  return e?.code === '23505' || e?.cause?.code === '23505';
}
const hashOtp = (phone: string, code: string) => createHash('sha256').update(`otp:${phone}:${code}`).digest();

export function publicRouter(deps: AppDeps, auth: Auth, limits: ReturnType<typeof createRateLimits>) {
  const { db, env, mailer, sms } = deps;
  const r = Router();

  r.get('/health', async (_req, res) => {
    await db.execute(sql`select 1`);
    res.json({ ok: true, time: new Date().toISOString() });
  });

  r.get('/config', async (_req, res) => {
    // Must be fresh: maintenance mode / forced updates have to apply on the
    // next app open, not whenever an HTTP cache decides to expire.
    res.set('Cache-Control', 'no-cache');
    res.json(await publicConfig(db, { passwordReset: mailer !== null, phoneSignIn: sms !== null || env.OTP_TEST_NUMBERS.size > 0 }));
  });

  // ---- content library -------------------------------------------------
  r.get('/categories', async (_req, res) => {
    const rows = await db
      .select({ id: categories.id, name: categories.name, parentId: categories.parentId })
      .from(categories)
      .orderBy(asc(categories.sortOrder), asc(categories.name));
    res.set('Cache-Control', 'public, max-age=300');
    res.json(rows);
  });

  r.get('/images', async (req, res) => {
    const q = parse(imagesQuery, req.query);
    res.json(await listPublishedContent(db, q));
  });

  r.get('/images/:id', async (req, res) => {
    const id = parse(z.string().uuid(), req.params.id);
    const [row] = await db
      .select()
      .from(content)
      .where(and(eq(content.id, id), eq(content.status, 'published')));
    if (!row) throw notFound('Image not found');
    res.json(toPublicImage(row));
  });

  // ---- accounts ---------------------------------------------------------
  // Phone-first: a one-time code by SMS signs you in (and creates the
  // account the first time); then a password, a username and an avatar are
  // set. Email + password remains for accounts made before phone sign-in.

  async function sessionResponse(user: typeof users.$inferSelect, opts: { otp?: boolean } = {}) {
    const session = await createUserSession(db, user.id, env.USER_SESSION_TTL_DAYS, opts.otp ? { otpVerifiedAt: new Date() } : {});
    return { token: session.token, expiresAt: session.expiresAt.toISOString(), user: publicUser(user), onboarding: onboardingOf(user) };
  }

  r.post('/auth/otp/request', limits.otp, async (req, res) => {
    const body = parse(z.object({ phone: z.string().trim().min(6).max(24) }), req.body);
    const phone = normalizePhone(body.phone, env.DEFAULT_COUNTRY_CODE);
    if (!phone) throw badRequest('Enter a valid mobile number');
    const testCode = env.OTP_TEST_NUMBERS.get(phone);
    if (!sms && !testCode) throw new HttpError(503, 'Sign-in by SMS is not available right now.', 'unavailable');
    const since = new Date(Date.now() - 60 * 60_000);
    const [recent] = await db
      .select({ n: count(), last: max(otpCodes.createdAt) })
      .from(otpCodes)
      .where(and(eq(otpCodes.phone, phone), gt(otpCodes.createdAt, since)));
    if ((recent?.n ?? 0) >= OTP_MAX_SENDS_PER_HOUR) throw new HttpError(429, 'Too many codes sent to this number. Try again in an hour.', 'rate_limited');
    if (recent?.last && Date.now() - new Date(recent.last).getTime() < OTP_RESEND_COOLDOWN_S * 1000) {
      throw new HttpError(429, `Wait ${OTP_RESEND_COOLDOWN_S} seconds before asking for another code.`, 'rate_limited');
    }
    const code = testCode ?? String(randomInt(0, 1_000_000)).padStart(6, '0');
    // Only the newest code for a number is valid.
    await db.update(otpCodes).set({ usedAt: new Date() }).where(and(eq(otpCodes.phone, phone), isNull(otpCodes.usedAt)));
    await db.insert(otpCodes).values({ phone, codeHash: hashOtp(phone, code).toString('hex'), expiresAt: new Date(Date.now() + OTP_TTL_MIN * 60_000) });
    if (!testCode) {
      try {
        await sms!.send({ to: phone, code, text: `${code} is your Tame sign-in code. It expires in ${OTP_TTL_MIN} minutes. Never share it.` });
      } catch (err) {
        // The provider's message, never the code or the number.
        console.error('[sms] sending a sign-in code failed:', err instanceof Error ? err.message : err);
        throw new HttpError(502, 'The code could not be sent. Try again in a moment.', 'sms_failed');
      }
    }
    res.status(202).json({ ok: true, phone: maskPhone(phone), expiresInSeconds: OTP_TTL_MIN * 60, resendAfterSeconds: OTP_RESEND_COOLDOWN_S });
  });

  r.post('/auth/otp/verify', limits.otp, async (req, res) => {
    const body = parse(z.object({ phone: z.string().trim().min(6).max(24), code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code') }), req.body);
    const phone = normalizePhone(body.phone, env.DEFAULT_COUNTRY_CODE);
    const invalid = badRequest('That code is wrong or has expired. Ask for a new one.');
    if (!phone) throw invalid;
    const [row] = await db
      .select()
      .from(otpCodes)
      .where(and(eq(otpCodes.phone, phone), isNull(otpCodes.usedAt), gt(otpCodes.expiresAt, new Date())))
      .orderBy(desc(otpCodes.createdAt))
      .limit(1);
    if (!row || row.attempts >= OTP_MAX_ATTEMPTS) throw invalid;
    if (!timingSafeEqual(Buffer.from(row.codeHash, 'hex'), hashOtp(phone, body.code))) {
      await db.update(otpCodes).set({ attempts: row.attempts + 1 }).where(eq(otpCodes.id, row.id));
      throw invalid;
    }
    await db.update(otpCodes).set({ usedAt: new Date() }).where(eq(otpCodes.id, row.id));
    const now = new Date();
    let [user] = await db.select().from(users).where(eq(users.phone, phone));
    if (user && user.status !== 'active') throw unauthorized('This account has been deactivated. Contact support.');
    const created = !user;
    if (user) {
      [user] = await db.update(users).set({ lastSeenAt: now, phoneVerifiedAt: user.phoneVerifiedAt ?? now }).where(eq(users.id, user.id)).returning();
    } else {
      [user] = await db.insert(users).values({ phone, phoneVerifiedAt: now, lastSeenAt: now }).returning();
    }
    res.status(created ? 201 : 200).json(await sessionResponse(user!, { otp: true }));
  });

  r.post('/auth/register', limits.register, async (req, res) => {
    const body = parse(
      z.object({ email, password: userPassword, displayName: z.string().trim().min(1).max(60).optional() }),
      req.body
    );
    const normalized = normalizeEmail(body.email);
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, normalized));
    if (existing) throw conflict('An account with this email already exists');
    const [user] = await db
      .insert(users)
      .values({ email: normalized, passwordHash: await hashPassword(body.password), displayName: body.displayName ?? null, lastSeenAt: new Date() })
      .returning();
    res.status(201).json(await sessionResponse(user!));
  });

  r.post('/auth/login', limits.login, async (req, res) => {
    const body = parse(
      z.object({ phone: z.string().trim().min(6).max(24).optional(), email: email.optional(), password: z.string().min(1).max(128) }).refine((b) => b.phone || b.email, 'Enter your mobile number or email'),
      req.body
    );
    const wrong = unauthorized(body.phone ? 'Incorrect mobile number or password' : 'Incorrect email or password');
    const phone = body.phone ? normalizePhone(body.phone, env.DEFAULT_COUNTRY_CODE) : null;
    if (body.phone && !phone) throw wrong;
    const [user] = await db.select().from(users).where(phone ? eq(users.phone, phone) : eq(users.email, normalizeEmail(body.email!)));
    if (!user || !user.passwordHash) {
      await burnPasswordCheck(body.password);
      throw wrong;
    }
    const ok = await verifyPassword(body.password, user.passwordHash);
    // Same message for wrong password and deactivated accounts' wrong password;
    // a deactivated account with the right password gets a clear explanation.
    if (!ok) throw wrong;
    if (user.status !== 'active') throw unauthorized('This account has been deactivated. Contact support.');
    await db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, user.id));
    res.json(await sessionResponse(user));
  });

  // ---- forgot password (emailed 6-digit code; phone accounts use a sign-in
  // code and then set a new password) ------------------------------------
  // Always answers the same way whether or not the email exists, so it can't
  // be used to discover who has an account.
  r.post('/auth/password-reset/request', limits.passwordReset, async (req, res) => {
    if (!mailer) throw new HttpError(503, 'Password reset is not available right now.', 'unavailable');
    const body = parse(z.object({ email }), req.body);
    const [user] = await db.select().from(users).where(eq(users.email, normalizeEmail(body.email)));
    if (user && user.status === 'active' && user.email) {
      const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
      await db.delete(passwordResetCodes).where(eq(passwordResetCodes.userId, user.id));
      await db.insert(passwordResetCodes).values({
        userId: user.id,
        codeHash: hashResetCode(user.id, code).toString('hex'),
        expiresAt: new Date(Date.now() + RESET_TTL_MIN * 60_000),
      });
      try {
        await mailer.send({
          to: user.email,
          subject: 'Your Tame password reset code',
          text: `Your Tame password reset code is ${code}.\n\nIt expires in ${RESET_TTL_MIN} minutes. If you didn't ask for this, you can ignore this email — your password won't change.`,
        });
      } catch (err) {
        console.error('[mail] password reset email failed:', err instanceof Error ? err.message : err);
      }
    }
    res.status(202).json({ ok: true, message: 'If that email has an account, a code is on its way.' });
  });

  r.post('/auth/password-reset/confirm', limits.passwordReset, async (req, res) => {
    const body = parse(z.object({ email, code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'), newPassword: userPassword }), req.body);
    const invalid = badRequest('That code is invalid or has expired. Request a new one.');
    const [user] = await db.select().from(users).where(eq(users.email, normalizeEmail(body.email)));
    if (!user || user.status !== 'active') throw invalid;
    const [row] = await db
      .select()
      .from(passwordResetCodes)
      .where(and(eq(passwordResetCodes.userId, user.id), isNull(passwordResetCodes.usedAt), gt(passwordResetCodes.expiresAt, new Date())))
      .orderBy(desc(passwordResetCodes.createdAt))
      .limit(1);
    if (!row || row.attempts >= RESET_MAX_ATTEMPTS) throw invalid;
    const ok = timingSafeEqual(Buffer.from(row.codeHash, 'hex'), hashResetCode(user.id, body.code));
    if (!ok) {
      await db.update(passwordResetCodes).set({ attempts: row.attempts + 1 }).where(eq(passwordResetCodes.id, row.id));
      throw invalid;
    }
    await db.update(passwordResetCodes).set({ usedAt: new Date() }).where(eq(passwordResetCodes.id, row.id));
    await db.update(users).set({ passwordHash: await hashPassword(body.newPassword), updatedAt: new Date() }).where(eq(users.id, user.id));
    // Anyone who had the old password is signed out everywhere.
    await revokeAllUserSessions(db, user.id);
    res.json(await sessionResponse(user));
  });

  r.post('/auth/logout', auth.requireUser, async (req, res) => {
    await db.delete(userSessions).where(eq(userSessions.id, req.user!.sessionId));
    res.status(204).end();
  });

  r.get('/me', auth.requireUser, async (req, res) => {
    const [user] = await db.select().from(users).where(eq(users.id, req.user!.id));
    if (!user) throw unauthorized();
    res.json({ ...publicUser(user), onboarding: onboardingOf(user) });
  });

  // Live "is this username free?" while typing. The answer is advisory: the
  // unique index decides when the name is saved.
  r.get('/usernames/availability', limits.usernameCheck, auth.requireUser, async (req, res) => {
    const q = parse(z.object({ username: z.string().max(40) }), req.query);
    const problem = usernameProblem(q.username);
    if (problem) {
      res.json({ username: q.username.trim(), available: false, reason: problem });
      return;
    }
    const normalized = normalizeUsername(q.username);
    const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.usernameNormalized, normalized));
    const available = !taken || taken.id === req.user!.id;
    res.json({ username: q.username.trim(), available, reason: available ? null : 'taken' });
  });

  r.patch('/me', auth.requireUser, async (req, res) => {
    const body = parse(
      z.object({
        displayName: z.string().trim().min(1).max(60).nullable().optional(),
        username: z.string().trim().max(40).optional(),
        avatarId: z.string().regex(/^[a-z]+_\d{2}$/, 'Unknown avatar').nullable().optional(),
        allowPokes: z.boolean().optional(),
        discoverableByPhone: z.boolean().optional(),
      }),
      req.body
    );
    const set: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
    if (body.displayName !== undefined) set.displayName = body.displayName;
    if (body.avatarId !== undefined) set.avatarId = body.avatarId;
    if (body.allowPokes !== undefined) set.allowPokes = body.allowPokes;
    if (body.discoverableByPhone !== undefined) set.discoverableByPhone = body.discoverableByPhone;
    if (body.username !== undefined) {
      const problem = usernameProblem(body.username);
      if (problem === 'invalid') throw badRequest('Usernames are 3–20 letters, numbers, dots or underscores and start with a letter');
      if (problem === 'reserved') throw badRequest('That username is reserved');
      set.username = body.username;
      set.usernameNormalized = normalizeUsername(body.username);
    }
    try {
      const [user] = await db.update(users).set(set).where(eq(users.id, req.user!.id)).returning();
      res.json({ ...publicUser(user!), onboarding: onboardingOf(user!) });
    } catch (err) {
      // Two people saving the same username at once: the unique index wins.
      if (isUniqueViolation(err)) throw conflict('That username was just taken. Try another.');
      throw err;
    }
  });

  // Set or change the password. The current one is needed, except when the
  // account has none yet (first sign-in) or this session was opened by a
  // one-time code a few minutes ago (forgot password on a phone account).
  r.post('/me/password', auth.requireUser, async (req, res) => {
    const body = parse(z.object({ currentPassword: z.string().min(1).max(128).optional(), newPassword: userPassword }), req.body);
    const [user] = await db.select().from(users).where(eq(users.id, req.user!.id));
    if (!user) throw unauthorized();
    if (user.passwordHash) {
      let allowed = false;
      if (body.currentPassword) allowed = await verifyPassword(body.currentPassword, user.passwordHash);
      else {
        const [session] = await db.select({ otpVerifiedAt: userSessions.otpVerifiedAt }).from(userSessions).where(eq(userSessions.id, req.user!.sessionId));
        allowed = !!session?.otpVerifiedAt && Date.now() - session.otpVerifiedAt.getTime() < OTP_PASSWORD_WINDOW_MIN * 60_000;
      }
      if (!allowed) throw badRequest(body.currentPassword ? 'Current password is incorrect' : 'Enter your current password');
    }
    await db.update(users).set({ passwordHash: await hashPassword(body.newPassword), updatedAt: new Date() }).where(eq(users.id, user.id));
    // Sign out every other device.
    await db.delete(userSessions).where(and(eq(userSessions.userId, user.id), sql`${userSessions.id} <> ${req.user!.sessionId}`));
    res.status(204).end();
  });

  // In-app account deletion (required by Apple App Store guideline 5.1.1(v)).
  // Analytics events are kept but de-linked from the person (user_id -> null).
  r.delete('/me', auth.requireUser, async (req, res) => {
    const body = parse(z.object({ password: z.string().min(1).max(128).optional() }), req.body ?? {});
    const [user] = await db.select().from(users).where(eq(users.id, req.user!.id));
    if (!user) throw unauthorized();
    if (user.passwordHash && (!body.password || !(await verifyPassword(body.password, user.passwordHash)))) {
      throw badRequest('Password is incorrect');
    }
    await revokeAllUserSessions(db, user.id);
    await db.delete(users).where(eq(users.id, user.id));
    res.status(204).end();
  });

  // ---- devices / push ---------------------------------------------------
  r.post('/devices', auth.optionalUser, async (req, res) => {
    const body = parse(
      z.object({
        installId,
        platform,
        appVersion,
        pushToken: z.string().regex(EXPO_PUSH_TOKEN_RE, 'Invalid Expo push token').nullable().optional(),
        pushEnabled: z.boolean().optional(),
      }),
      req.body
    );
    const now = new Date();
    const pushToken = body.pushToken ?? null;
    const values = {
      installId: body.installId,
      platform: body.platform,
      appVersion: body.appVersion ?? null,
      // The owner comes only from the session, never from the request body.
      userId: req.user?.id ?? null,
      lastSeenAt: now,
      ...(body.pushToken !== undefined ? { pushToken } : {}),
      ...(body.pushEnabled !== undefined ? { pushEnabled: body.pushEnabled && !!pushToken } : {}),
    };
    await db.insert(devices).values(values).onConflictDoUpdate({ target: devices.installId, set: values });
    res.status(204).end();
  });

  // ---- analytics ----------------------------------------------------------
  r.post('/events', limits.events, auth.optionalUser, async (req, res) => {
    const body = parse(eventsBody, req.body);
    const now = Date.now();
    const rowsToInsert = body.events.map((e) => {
      let occurred = e.occurredAt ? Date.parse(e.occurredAt) : now;
      // Clamp clocks that are wildly off (offline queues can be a few days old).
      if (!Number.isFinite(occurred) || occurred > now + 5 * 60_000 || occurred < now - 7 * 86_400_000) occurred = now;
      return {
        name: e.name,
        installId: body.installId,
        userId: req.user?.id ?? null,
        platform: body.platform,
        appVersion: body.appVersion ?? null,
        screen: e.screen ?? null,
        contentId: e.contentId ?? null,
        properties: e.properties ?? null,
        occurredAt: new Date(occurred),
      };
    });
    await db.insert(events).values(rowsToInsert);

    // Library popularity = number of times an image was picked for a session.
    const views = new Map<string, number>();
    for (const e of rowsToInsert) {
      if (e.name === 'content_view' && e.contentId) views.set(e.contentId, (views.get(e.contentId) ?? 0) + 1);
    }
    for (const [id, n] of views) {
      await db.update(content).set({ popularity: sql`${content.popularity} + ${n}` }).where(sql`${content.id}::text = ${id}`);
    }
    await db
      .insert(devices)
      .values({ installId: body.installId, platform: body.platform, appVersion: body.appVersion ?? null, userId: req.user?.id ?? null })
      .onConflictDoUpdate({
        target: devices.installId,
        set: { lastSeenAt: new Date(), appVersion: body.appVersion ?? null, ...(req.user ? { userId: req.user.id } : {}) },
      });
    res.status(202).json({ accepted: rowsToInsert.length });
  });

  return r;
}
