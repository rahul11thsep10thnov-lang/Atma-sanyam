import { Router } from 'express';
import { z } from 'zod';
import { and, asc, eq, sql } from 'drizzle-orm';
import { ageBrackets, categories, content, devices, events, gameCategories } from '../../database/schema.js';
import { notFound } from '../../lib/httpError.js';
import { listPublishedContent, toPublicImage } from '../../services/contentService.js';
import type { Auth } from '../../middleware/auth.js';
import type { createRateLimits } from '../../middleware/rateLimits.js';
import { parse } from '../../middleware/validate.js';
import { EXPO_PUSH_TOKEN_RE } from '../../lib/push.js';
import { publicConfig } from '../../services/settingsService.js';
import { FACT_CATEGORIES } from '../../catalogue/factCategories.js';
import { AGES, AGE_FOCUS, CURRICULUM_FRAMEWORKS, SECTIONS, SUBJECTS } from '../../catalogue/learning.js';
import { SCORING_RULES } from '../../services/rankingService.js';
import type { AppDeps } from '../../types.js';
import { guardianRouter, TERMS_VERSION } from './guardian.js';
import { householdRouter } from './household.js';
import { subscriptionRouter } from './subscription.js';
import { playerRouter } from './player.js';
import { webhookRouter } from './webhooks.js';

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

export function publicRouter(deps: AppDeps, auth: Auth, limits: ReturnType<typeof createRateLimits>) {
  const { db, env, sms, billing, realtime } = deps;
  const r = Router();

  r.get('/health', async (_req, res) => {
    await db.execute(sql`select 1`);
    res.json({ ok: true, time: new Date().toISOString() });
  });

  r.get('/config', async (_req, res) => {
    // Must be fresh: maintenance mode / forced updates have to apply on the
    // next app open, not whenever an HTTP cache decides to expire.
    res.set('Cache-Control', 'no-cache');
    res.json(
      await publicConfig(db, {
        phoneSignIn: sms !== null || env.OTP_TEST_NUMBERS.size > 0,
        googlePlayBilling: billing.googlePlay !== null,
        razorpayBilling: billing.razorpay !== null,
        sandboxBilling: billing.sandbox !== null,
        termsVersion: TERMS_VERSION,
        subscription: { productId: env.SUBSCRIPTION_PRODUCT_ID, priceInr: env.SUBSCRIPTION_PRICE_INR },
        ads: { interstitialAndroid: env.ADMOB_INTERSTITIAL_UNIT_ANDROID, interstitialIos: env.ADMOB_INTERSTITIAL_UNIT_IOS },
      })
    );
  });

  // Public catalogue metadata (no personal data; cacheable).
  r.get('/catalogue/brackets', async (_req, res) => {
    res.set('Cache-Control', 'public, max-age=3600');
    res.json(await db.select().from(ageBrackets).orderBy(asc(ageBrackets.sortOrder)));
  });
  r.get('/catalogue/game-categories', async (_req, res) => {
    res.set('Cache-Control', 'public, max-age=3600');
    res.json(await db.select().from(gameCategories).orderBy(asc(gameCategories.sortOrder)));
  });
  // Licensed illustration library (published images only), used by facts and crafts.
  r.get('/categories', async (_req, res) => {
    const rows = await db.select({ id: categories.id, name: categories.name, parentId: categories.parentId }).from(categories).orderBy(asc(categories.sortOrder), asc(categories.name));
    res.set('Cache-Control', 'public, max-age=300');
    res.json(rows);
  });
  r.get('/images', async (req, res) => {
    const q = parse(imagesQuery, req.query);
    res.json(await listPublishedContent(db, q));
  });
  r.get('/images/:id', async (req, res) => {
    const id = parse(z.string().uuid(), req.params.id);
    const [row] = await db.select().from(content).where(and(eq(content.id, id), eq(content.status, 'published')));
    if (!row) throw notFound('Image not found');
    res.json(toPublicImage(row));
  });
  r.get('/catalogue/fact-categories', (_req, res) => {
    res.set('Cache-Control', 'public, max-age=3600');
    res.json(FACT_CATEGORIES);
  });
  // The learning academy's fixed framework: sections, subjects, ages, curricula.
  r.get('/catalogue/learning', (_req, res) => {
    res.set('Cache-Control', 'public, max-age=3600');
    res.json({ sections: SECTIONS, subjects: SUBJECTS, ages: AGES, ageFocus: AGE_FOCUS, curriculumFrameworks: CURRICULUM_FRAMEWORKS });
  });
  // How each competitive game is scored (shown under every leaderboard).
  r.get('/catalogue/scoring-rules', (_req, res) => {
    res.set('Cache-Control', 'public, max-age=3600');
    res.json(Object.entries(SCORING_RULES).map(([gameId, rule]) => ({ gameId, kind: rule.kind, label: rule.label })));
  });

  // ---- devices (install registration + push) -----------------------------
  // Signed-in guardians link the device to their account; a child's player
  // sign-in links it to the child (player.ts). Push tokens are only for
  // guardians (time-limit reached, device approval, billing).
  r.post('/devices', async (req, res) => {
    const body = parse(
      z.object({
        installId,
        platform,
        appVersion,
        label: z.string().trim().max(60).optional(),
        pushToken: z.string().regex(EXPO_PUSH_TOKEN_RE, 'Invalid push token').nullable().optional(),
        pushEnabled: z.boolean().optional(),
      }),
      req.body
    );
    // Optional guardian: links the install when a token is present.
    let guardianId: string | null = null;
    const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
    if (token) {
      await new Promise<void>((resolve) => auth.requireGuardian(req, res, () => resolve()));
      if (res.headersSent) return;
      guardianId = req.guardian?.id ?? null;
    }
    const now = new Date();
    const [row] = await db
      .insert(devices)
      .values({ installId: body.installId, platform: body.platform, appVersion: body.appVersion ?? null, label: body.label ?? null, guardianId, pushToken: body.pushToken ?? null, pushEnabled: body.pushEnabled ?? false, lastSeenAt: now, approvedAt: guardianId ? now : null })
      .onConflictDoUpdate({
        target: devices.installId,
        set: {
          platform: body.platform,
          appVersion: body.appVersion ?? null,
          ...(body.label !== undefined ? { label: body.label } : {}),
          ...(guardianId ? { guardianId, approvedAt: now } : {}),
          ...(body.pushToken !== undefined ? { pushToken: body.pushToken } : {}),
          ...(body.pushEnabled !== undefined ? { pushEnabled: body.pushEnabled } : {}),
          lastSeenAt: now,
        },
      })
      .returning({ id: devices.id, approvedAt: devices.approvedAt });
    res.json({ id: row!.id, approved: !!row!.approvedAt });
  });

  // ---- anonymous product analytics (opt-in in Settings) -------------------
  r.post('/events', limits.events, async (req, res) => {
    const body = parse(z.object({ installId, platform, appVersion, events: z.array(eventSchema).min(1).max(50) }), req.body);
    const now = new Date();
    let guardianId: string | null = null;
    if (req.headers.authorization?.startsWith('Bearer ')) {
      await new Promise<void>((resolve) => auth.requireGuardian(req, res, () => resolve()));
      if (res.headersSent) return;
      guardianId = req.guardian?.id ?? null;
    }
    await db.insert(events).values(
      body.events.map((e) => ({
        name: e.name,
        installId: body.installId,
        guardianId,
        platform: body.platform,
        appVersion: body.appVersion ?? null,
        screen: e.screen ?? null,
        contentId: e.contentId ?? null,
        properties: e.properties ?? null,
        occurredAt: e.occurredAt ? new Date(e.occurredAt) : now,
      }))
    );
    res.status(202).json({ accepted: body.events.length });
  });

  // ---- WebSocket ticket --------------------------------------------------
  // The socket authenticates with the same bearer token (`?token=`); this
  // endpoint tells the app where to connect and reports who it is.
  r.get('/ws/info', auth.requireGuardianOrPlayer, (req, res) => {
    res.json({ path: '/v1/ws', role: req.guardian ? 'guardian' : 'player', online: req.player ? realtime.isPlayerOnline(req.player.childId) : undefined });
  });

  r.use('/guardian', guardianRouter(deps, auth, limits));
  r.use('/guardian', householdRouter(deps, auth));
  r.use('/guardian/subscription', subscriptionRouter(deps, auth, limits));
  r.use('/player', playerRouter(deps, auth, limits));
  r.use('/webhooks', webhookRouter(deps, limits));

  return r;
}
