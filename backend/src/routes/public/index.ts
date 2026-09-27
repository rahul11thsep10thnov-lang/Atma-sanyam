import { Router } from 'express';
import { z } from 'zod';
import { and, asc, eq, sql } from 'drizzle-orm';
import { categories, content, devices, events, users, userSessions } from '../../database/schema.js';
import type { Auth } from '../../middleware/auth.js';
import type { createRateLimits } from '../../middleware/rateLimits.js';
import { parse } from '../../middleware/validate.js';
import { badRequest, conflict, notFound, unauthorized } from '../../lib/httpError.js';
import { burnPasswordCheck, hashPassword, verifyPassword } from '../../lib/password.js';
import { normalizeEmail } from '../../lib/strings.js';
import { EXPO_PUSH_TOKEN_RE } from '../../lib/push.js';
import { listPublishedContent, toPublicImage } from '../../services/contentService.js';
import { createUserSession, revokeAllUserSessions } from '../../services/sessionService.js';
import { publicConfig } from '../../services/settingsService.js';
import type { AppDeps } from '../../types.js';

const email = z.string().trim().email().max(254);
const userPassword = z.string().min(8, 'Password must be at least 8 characters').max(128);
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

function publicUser(u: typeof users.$inferSelect) {
  return { id: u.id, email: u.email, displayName: u.displayName, createdAt: u.createdAt.toISOString() };
}

export function publicRouter(deps: AppDeps, auth: Auth, limits: ReturnType<typeof createRateLimits>) {
  const { db, env } = deps;
  const r = Router();

  r.get('/health', async (_req, res) => {
    await db.execute(sql`select 1`);
    res.json({ ok: true, time: new Date().toISOString() });
  });

  r.get('/config', async (_req, res) => {
    res.set('Cache-Control', 'public, max-age=60');
    res.json(await publicConfig(db));
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
    const session = await createUserSession(db, user!.id, env.USER_SESSION_TTL_DAYS);
    res.status(201).json({ token: session.token, expiresAt: session.expiresAt.toISOString(), user: publicUser(user!) });
  });

  r.post('/auth/login', limits.login, async (req, res) => {
    const body = parse(z.object({ email, password: z.string().min(1).max(128) }), req.body);
    const [user] = await db.select().from(users).where(eq(users.email, normalizeEmail(body.email)));
    if (!user) {
      await burnPasswordCheck(body.password);
      throw unauthorized('Incorrect email or password');
    }
    const ok = await verifyPassword(body.password, user.passwordHash);
    // Same message for wrong password and deactivated accounts' wrong password;
    // a deactivated account with the right password gets a clear explanation.
    if (!ok) throw unauthorized('Incorrect email or password');
    if (user.status !== 'active') throw unauthorized('This account has been deactivated. Contact support.');
    await db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, user.id));
    const session = await createUserSession(db, user.id, env.USER_SESSION_TTL_DAYS);
    res.json({ token: session.token, expiresAt: session.expiresAt.toISOString(), user: publicUser(user) });
  });

  r.post('/auth/logout', auth.requireUser, async (req, res) => {
    await db.delete(userSessions).where(eq(userSessions.id, req.user!.sessionId));
    res.status(204).end();
  });

  r.get('/me', auth.requireUser, async (req, res) => {
    const [user] = await db.select().from(users).where(eq(users.id, req.user!.id));
    if (!user) throw unauthorized();
    res.json(publicUser(user));
  });

  r.patch('/me', auth.requireUser, async (req, res) => {
    const body = parse(z.object({ displayName: z.string().trim().min(1).max(60).nullable() }), req.body);
    const [user] = await db
      .update(users)
      .set({ displayName: body.displayName, updatedAt: new Date() })
      .where(eq(users.id, req.user!.id))
      .returning();
    res.json(publicUser(user!));
  });

  r.post('/me/password', auth.requireUser, async (req, res) => {
    const body = parse(z.object({ currentPassword: z.string().min(1).max(128), newPassword: userPassword }), req.body);
    const [user] = await db.select().from(users).where(eq(users.id, req.user!.id));
    if (!user || !(await verifyPassword(body.currentPassword, user.passwordHash))) {
      throw badRequest('Current password is incorrect');
    }
    await db.update(users).set({ passwordHash: await hashPassword(body.newPassword), updatedAt: new Date() }).where(eq(users.id, user.id));
    // Sign out every other device.
    await db.delete(userSessions).where(and(eq(userSessions.userId, user.id), sql`${userSessions.id} <> ${req.user!.sessionId}`));
    res.status(204).end();
  });

  // In-app account deletion (required by Apple App Store guideline 5.1.1(v)).
  // Analytics events are kept but de-linked from the person (user_id -> null).
  r.delete('/me', auth.requireUser, async (req, res) => {
    const body = parse(z.object({ password: z.string().min(1).max(128) }), req.body ?? {});
    const [user] = await db.select().from(users).where(eq(users.id, req.user!.id));
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
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
