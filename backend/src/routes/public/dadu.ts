// DADU public API (/v1/dadu/*): what the mobile app uses. Everything except
// the manifest needs a parent's user token; everything under
// /children/:id/* additionally proves the child belongs to that parent.
import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { and, count, desc, eq, inArray, isNull } from 'drizzle-orm';
import {
  daduAssignmentCompletions,
  daduChildProfiles,
  daduConsents,
  daduPacks,
  daduScreenRules,
} from '../../database/schema.js';
import type { Auth } from '../../middleware/auth.js';
import { parse } from '../../middleware/validate.js';
import { HttpError, notFound } from '../../lib/httpError.js';
import type { AppDeps } from '../../types.js';
import { childCreate, childPatch, lang, progressEvent, worldState } from '../../dadu/contracts.js';
import {
  activeConsent,
  catalogueSummary,
  childSummary,
  childView,
  featureFlags,
  findOwnedChild,
  getWorld,
  languageCoverage,
  listChildren,
  listProgress,
  MAX_CHILDREN,
  packView,
  publishedContent,
  publishedItem,
  publishedPacks,
  putWorld,
  recordProgress,
  screenRules,
  screenTime,
} from '../../services/daduService.js';

const uuid = z.string().uuid();
const consentBody = z.object({ kind: z.enum(['processing', 'photos', 'analytics']), version: z.string().min(1).max(40), childId: uuid.optional() });
const worldPut = z.object({ version: z.number().int().min(0), state: worldState });
const progressBody = z.object({ events: z.array(progressEvent).min(1).max(200) });
const progressQuery = z.object({ since: z.coerce.number().int().min(0).default(0), limit: z.coerce.number().int().min(1).max(500).default(200) });
const completeBody = z.object({ note: z.string().trim().max(500).optional(), photoAssetId: z.string().max(120).optional() });
const rulesBody = z.object({ dailyMinutes: z.number().int().min(5).max(240).nullable(), bedtime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable(), breakEveryMinutes: z.number().int().min(5).max(120).default(20) });
const daysQuery = z.object({ days: z.coerce.number().int().min(1).max(90).default(7) });
const contentQuery = z.object({
  kind: z.enum(['lesson', 'story', 'assignment', 'object', 'character', 'location']).optional(),
  section: z.string().max(20).optional(),
  language: lang.optional(),
  since: z.string().datetime({ offset: true }).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});
const manifestQuery = z.object({ language: lang.optional() });

export function daduPublicRouter({ db }: AppDeps, auth: Auth) {
  const r = Router();

  // Everything the app needs before any sign-in. Never cached: flags change.
  r.get('/manifest', async (req, res) => {
    const q = parse(manifestQuery, req.query);
    res.set('Cache-Control', 'no-cache');
    res.json({
      serverTime: new Date().toISOString(),
      consentVersion: '2026-11',
      languages: await languageCoverage(db),
      features: await featureFlags(db),
      packs: await publishedPacks(db, q.language),
      catalogue: await catalogueSummary(db),
    });
  });

  r.get('/content', async (req, res) => {
    const q = parse(contentQuery, req.query);
    res.json(await publishedContent(db, { ...q, since: q.since ? new Date(q.since) : undefined }));
  });
  r.get('/content/:id', async (req, res) => {
    const item = await publishedItem(db, parse(z.string().max(120), req.params.id));
    if (!item) throw notFound('Content not found');
    res.json(item);
  });
  r.get('/packs', async (req, res) => {
    const q = parse(manifestQuery, req.query);
    res.json({ items: await publishedPacks(db, q.language) });
  });
  r.get('/packs/:id', async (req, res) => {
    const [pack] = await db.select().from(daduPacks).where(and(eq(daduPacks.id, parse(uuid, req.params.id)), eq(daduPacks.status, 'published'))).limit(1);
    if (!pack) throw notFound('Pack not found');
    res.json({ ...packView(pack), manifest: pack.manifest });
  });

  r.use(auth.requireUser);

  // ---- consent ---------------------------------------------------------------
  r.get('/consents', async (req, res) => {
    const rows = await db.select().from(daduConsents).where(eq(daduConsents.userId, req.user!.id)).orderBy(desc(daduConsents.grantedAt));
    res.json({ items: rows.map(consentView) });
  });
  r.post('/consents', async (req, res) => {
    const body = parse(consentBody, req.body);
    if (body.childId && !(await findOwnedChild(db, req.user!.id, body.childId))) throw notFound('Child not found');
    const [row] = await db.insert(daduConsents).values({ userId: req.user!.id, childId: body.childId ?? null, kind: body.kind, version: body.version }).returning();
    res.status(201).json(consentView(row!));
  });
  r.post('/consents/:id/withdraw', async (req, res) => {
    const id = parse(uuid, req.params.id);
    const [row] = await db
      .update(daduConsents)
      .set({ withdrawnAt: new Date() })
      .where(and(eq(daduConsents.id, id), eq(daduConsents.userId, req.user!.id), isNull(daduConsents.withdrawnAt)))
      .returning();
    if (!row) throw notFound('Consent not found');
    res.json(consentView(row));
  });

  // ---- children ------------------------------------------------------------------
  r.get('/children', async (req, res) => {
    res.json({ items: (await listChildren(db, req.user!.id)).map(childView) });
  });
  r.post('/children', async (req, res) => {
    const body = parse(childCreate, req.body);
    if (!(await activeConsent(db, req.user!.id, 'processing'))) throw new HttpError(403, 'Parental consent for processing is required first', 'consent_required');
    const [n] = await db.select({ n: count() }).from(daduChildProfiles).where(and(eq(daduChildProfiles.userId, req.user!.id), isNull(daduChildProfiles.deletedAt)));
    if ((n?.n ?? 0) >= MAX_CHILDREN) throw new HttpError(409, `An account can have at most ${MAX_CHILDREN} children`, 'child_limit');
    const [row] = await db.insert(daduChildProfiles).values({ userId: req.user!.id, ...body }).returning();
    res.status(201).json(childView(row!));
  });

  const requireChild: RequestHandler = async (req, _res, next) => {
    try {
      const id = parse(uuid, req.params.id);
      const child = await findOwnedChild(db, req.user!.id, id);
      if (!child) throw notFound('Child not found');
      req.daduChild = { id: child.id, userId: child.userId, name: child.name, band: child.band, difficulty: child.difficulty, language: child.language };
      next();
    } catch (err) {
      next(err);
    }
  };

  r.get('/children/:id', requireChild, async (req, res) => {
    res.json(childView((await findOwnedChild(db, req.user!.id, req.daduChild!.id))!));
  });
  r.patch('/children/:id', requireChild, async (req, res) => {
    const body = parse(childPatch, req.body);
    const [row] = await db.update(daduChildProfiles).set({ ...body, updatedAt: new Date() }).where(eq(daduChildProfiles.id, req.daduChild!.id)).returning();
    res.json(childView(row!));
  });
  // Soft delete: the profile disappears immediately; rows are purged 30 days later by `npm run cleanup` (undo window).
  r.delete('/children/:id', requireChild, async (req, res) => {
    const purgeAt = new Date(Date.now() + 30 * 86_400_000);
    await db.update(daduChildProfiles).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(daduChildProfiles.id, req.daduChild!.id));
    res.status(202).json({ deletionScheduledFor: purgeAt.toISOString() });
  });

  // ---- world state -----------------------------------------------------------------
  r.get('/children/:id/world', requireChild, async (req, res) => {
    const w = await getWorld(db, req.daduChild!.id);
    if (!w) throw notFound('No world state saved yet');
    res.json(w);
  });
  r.put('/children/:id/world', requireChild, async (req, res) => {
    const body = parse(worldPut, req.body);
    const result = await putWorld(db, req.daduChild!.id, body.version, body.state);
    if (result.conflict) {
      res.status(409).json({ error: { code: 'version_conflict', message: 'The server had a newer world; the merged copy is returned' }, world: { version: result.version, state: result.state } });
      return;
    }
    res.json({ version: result.version, state: result.state });
  });

  // ---- progress --------------------------------------------------------------------
  r.post('/children/:id/progress', requireChild, async (req, res) => {
    const body = parse(progressBody, req.body);
    const out = await recordProgress(db, req.daduChild!.id, body.events);
    res.status(202).json(out);
  });
  r.get('/children/:id/progress', requireChild, async (req, res) => {
    const q = parse(progressQuery, req.query);
    res.json(await listProgress(db, req.daduChild!.id, q.since, q.limit));
  });

  // ---- assignments ---------------------------------------------------------------------
  r.post('/children/:id/assignments/:assignmentId/complete', requireChild, async (req, res) => {
    const assignmentId = parse(z.string().regex(/^[a-z0-9_.-]{3,120}$/), req.params.assignmentId);
    const body = parse(completeBody, req.body);
    let consentId: string | null = null;
    if (body.photoAssetId) {
      const c = await activeConsent(db, req.user!.id, 'photos', req.daduChild!.id);
      if (!c) throw new HttpError(403, 'A photo needs the optional photo consent for this child', 'photo_consent_required');
      consentId = c.id;
    }
    const [row] = await db
      .insert(daduAssignmentCompletions)
      .values({ childId: req.daduChild!.id, assignmentId, note: body.note ?? null, photoAssetId: body.photoAssetId ?? null, consentId })
      .onConflictDoUpdate({ target: [daduAssignmentCompletions.childId, daduAssignmentCompletions.assignmentId], set: { completedAt: new Date(), note: body.note ?? null, photoAssetId: body.photoAssetId ?? null, consentId } })
      .returning();
    res.status(201).json({ id: row!.id, assignmentId, completedAt: row!.completedAt.toISOString(), note: row!.note, hasPhoto: !!row!.photoAssetId });
  });
  r.get('/children/:id/assignments', requireChild, async (req, res) => {
    const rows = await db.select().from(daduAssignmentCompletions).where(eq(daduAssignmentCompletions.childId, req.daduChild!.id)).orderBy(desc(daduAssignmentCompletions.completedAt));
    res.json({ items: rows.map((x) => ({ id: x.id, assignmentId: x.assignmentId, completedAt: x.completedAt.toISOString(), note: x.note, hasPhoto: !!x.photoAssetId })) });
  });

  // ---- screen time -------------------------------------------------------------------------
  r.get('/children/:id/screen-rules', requireChild, async (req, res) => {
    res.json(await screenRules(db, req.daduChild!.id));
  });
  r.put('/children/:id/screen-rules', requireChild, async (req, res) => {
    const body = parse(rulesBody, req.body);
    await db
      .insert(daduScreenRules)
      .values({ childId: req.daduChild!.id, ...body })
      .onConflictDoUpdate({ target: daduScreenRules.childId, set: { ...body, updatedAt: new Date() } });
    res.json(await screenRules(db, req.daduChild!.id));
  });
  r.get('/children/:id/screen-time', requireChild, async (req, res) => {
    const q = parse(daysQuery, req.query);
    res.json({ days: await screenTime(db, req.daduChild!.id, q.days), rules: await screenRules(db, req.daduChild!.id) });
  });

  r.get('/children/:id/summary', requireChild, async (req, res) => {
    res.json({ child: childView((await findOwnedChild(db, req.user!.id, req.daduChild!.id))!), ...(await childSummary(db, req.daduChild!.id)) });
  });

  // ---- account-level deletion of every DADU record -----------------------------------------------
  r.delete('/me/data', async (req, res) => {
    // Consents first (so child-scoped ones are counted), then children, which cascade to every child-scoped table.
    const deletedConsents = await db.delete(daduConsents).where(eq(daduConsents.userId, req.user!.id)).returning({ id: daduConsents.id });
    const children = await db.select({ id: daduChildProfiles.id }).from(daduChildProfiles).where(eq(daduChildProfiles.userId, req.user!.id));
    const ids = children.map((c) => c.id);
    const deletedChildren = ids.length ? await db.delete(daduChildProfiles).where(inArray(daduChildProfiles.id, ids)).returning({ id: daduChildProfiles.id }) : [];
    res.json({ children: deletedChildren.length, consents: deletedConsents.length });
  });

  return r;
}

function consentView(c: { id: string; childId: string | null; kind: string; version: string; grantedAt: Date; withdrawnAt: Date | null }) {
  return { id: c.id, childId: c.childId, kind: c.kind, version: c.version, grantedAt: c.grantedAt.toISOString(), withdrawnAt: c.withdrawnAt?.toISOString() ?? null };
}
