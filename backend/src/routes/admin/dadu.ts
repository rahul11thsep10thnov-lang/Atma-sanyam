// DADU admin API (/admin/v1/dadu/*): content items with versions and the
// eight-step workflow, media assets, offline packs, feature flags and the
// read-only parent-support view. Every write is audited.
import { Router } from 'express';
import { z } from 'zod';
import { and, asc, count, desc, eq, ilike, inArray, isNull, max, sql, type SQL } from 'drizzle-orm';
import {
  daduChildProfiles,
  daduContentItems,
  daduContentVersions,
  daduFeatureFlags,
  daduMediaAssets,
  daduPacks,
  daduReviewSteps,
  daduWorldStates,
} from '../../database/schema.js';
import type { Auth } from '../../middleware/auth.js';
import { parse } from '../../middleware/validate.js';
import { badRequest, conflict, forbidden, HttpError, notFound } from '../../lib/httpError.js';
import { audit } from '../../lib/audit.js';
import type { AppDeps } from '../../types.js';
import { bodyForKind, CONTENT_KINDS, contentId, lang } from '../../dadu/contracts.js';
import { checkTransition, WORKFLOW_ORDER, type WorkflowState } from '../../dadu/workflow.js';
import { buildPackManifest, packView } from '../../services/daduService.js';

const kind = z.enum(CONTENT_KINDS);
const status = z.enum(WORKFLOW_ORDER);

const listQuery = z.object({
  kind: kind.optional(),
  section: z.string().max(20).optional(),
  status: status.optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

const createBody = z.object({
  id: contentId,
  kind,
  body: z.record(z.string(), z.unknown()),
  changeNote: z.string().trim().max(500).default('Created'),
});
const updateBody = z.object({ body: z.record(z.string(), z.unknown()), changeNote: z.string().trim().max(500).default('Edited') });
const transitionBody = z.object({ to: status, note: z.string().trim().max(1000).default('') });
const rollbackBody = z.object({ version: z.number().int().min(1) });

const assetBody = z.object({
  kind: z.enum(['image', 'audio', 'animation', 'video', 'font']),
  url: z.string().url().max(1000),
  mime: z.string().max(100),
  bytes: z.number().int().min(0).default(0),
  width: z.number().int().min(1).optional(),
  height: z.number().int().min(1).optional(),
  durationMs: z.number().int().min(0).optional(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  licence: z.string().trim().min(1).max(120),
  source: z.string().trim().min(1).max(300),
  creator: z.string().trim().min(1).max(200),
  attributionRequired: z.boolean().default(false),
  attributionText: z.string().max(500).optional(),
  characterKey: z.string().max(20).optional(),
  locationId: z.string().max(120).optional(),
});
const assetPatch = assetBody.omit({ sha256: true, url: true }).partial();
const assetQuery = z.object({ kind: z.enum(['image', 'audio', 'animation', 'video', 'font']).optional(), characterKey: z.string().max(20).optional(), locationId: z.string().max(120).optional(), page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(25) });
const packBuildBody = z.object({ kind: z.enum(['core', 'language', 'world', 'section', 'stories', 'audio']), language: lang.optional() });
const flagBody = z.object({ value: z.unknown() });
const flagKey = z.string().regex(/^[a-z][a-z0-9_.]{1,60}$/);
const uuid = z.string().uuid();

/** Item-level fields are derived from the validated body so the two can never disagree. */
function derive(k: z.infer<typeof kind>, body: Record<string, unknown>) {
  const meta = (body.meta ?? {}) as Partial<{ section: string; subject: string; topic: string; bands: string[]; difficulty: number; languages: string[]; rights: string; provenance: string }>;
  if (k === 'lesson' || k === 'story' || k === 'assignment') {
    return { section: meta.section ?? null, subject: meta.subject ?? null, topic: meta.topic ?? null, bands: meta.bands ?? [], difficulty: meta.difficulty ?? 1, languages: meta.languages ?? ['en'], rights: (meta.rights ?? 'original') as 'original', provenance: meta.provenance ?? '' };
  }
  const langs = new Set<string>(['en']);
  const name = (body.name ?? {}) as Record<string, unknown>;
  for (const l of Object.keys(name)) langs.add(l);
  return { section: k === 'object' ? ((body.section as string) ?? null) : null, subject: null, topic: null, bands: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'], difficulty: 1, languages: [...langs], rights: 'original' as const, provenance: 'DADU original' };
}

function validateBody(k: z.infer<typeof kind>, id: string, raw: Record<string, unknown>) {
  const body = parse(bodyForKind[k], raw) as Record<string, unknown>;
  const meta = body.meta as { id?: string } | undefined;
  if (meta && meta.id !== id) throw badRequest('Invalid request', [{ path: 'body.meta.id', message: `must equal the item id "${id}"` }]);
  if ((k === 'object' || k === 'location') && body.id !== id) throw badRequest('Invalid request', [{ path: 'body.id', message: `must equal the item id "${id}"` }]);
  if (k === 'character' && body.key !== id) throw badRequest('Invalid request', [{ path: 'body.key', message: `must equal the item id "${id}"` }]);
  return body;
}

export function adminDaduRouter({ db }: AppDeps, auth: Auth) {
  const r = Router();

  async function loadItem(id: string) {
    const [item] = await db.select().from(daduContentItems).where(eq(daduContentItems.id, id)).limit(1);
    if (!item) throw notFound('Content item not found');
    return item;
  }
  async function itemDetail(id: string) {
    const item = await loadItem(id);
    const versions = await db.select().from(daduContentVersions).where(eq(daduContentVersions.itemId, id)).orderBy(asc(daduContentVersions.version));
    const reviews = await db.select().from(daduReviewSteps).where(eq(daduReviewSteps.itemId, id)).orderBy(asc(daduReviewSteps.id));
    return {
      ...item,
      versions: versions.map((v) => ({ id: v.id, version: v.version, body: v.body, changeNote: v.changeNote, createdBy: v.createdBy, createdAt: v.createdAt.toISOString(), publishedAt: v.publishedAt?.toISOString() ?? null })),
      reviews: reviews.map((s) => ({ id: s.id, version: s.version, step: s.step, decision: s.decision, reviewerId: s.reviewerId, note: s.note, createdAt: s.createdAt.toISOString() })),
    };
  }

  // ---- content items ----------------------------------------------------------
  r.get('/content', auth.requirePermission('dadu:content:read'), async (req, res) => {
    const q = parse(listQuery, req.query);
    const conds: SQL[] = [];
    if (q.kind) conds.push(eq(daduContentItems.kind, q.kind));
    if (q.section) conds.push(eq(daduContentItems.section, q.section));
    if (q.status) conds.push(eq(daduContentItems.status, q.status));
    if (q.search) conds.push(ilike(daduContentItems.id, `%${q.search.replace(/[%_\\]/g, '\\$&')}%`));
    const where = conds.length ? and(...conds) : undefined;
    const [total] = await db.select({ n: count() }).from(daduContentItems).where(where);
    const rows = await db.select().from(daduContentItems).where(where).orderBy(desc(daduContentItems.updatedAt)).limit(q.pageSize).offset((q.page - 1) * q.pageSize);
    res.json({ items: rows, total: total?.n ?? 0, page: q.page, pageSize: q.pageSize });
  });

  r.get('/content/:id', auth.requirePermission('dadu:content:read'), async (req, res) => {
    res.json(await itemDetail(parse(contentId, req.params.id)));
  });

  r.post('/content', auth.requirePermission('dadu:content:write'), async (req, res) => {
    const body = parse(createBody, req.body);
    const validated = validateBody(body.kind, body.id, body.body);
    const [existing] = await db.select({ id: daduContentItems.id }).from(daduContentItems).where(eq(daduContentItems.id, body.id)).limit(1);
    if (existing) throw conflict(`Content "${body.id}" already exists`);
    const item = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(daduContentItems)
        .values({ id: body.id, kind: body.kind, ...derive(body.kind, validated), status: 'draft', currentVersion: 1, createdBy: req.admin!.id, updatedBy: req.admin!.id })
        .returning();
      await tx.insert(daduContentVersions).values({ itemId: body.id, version: 1, body: validated, changeNote: body.changeNote, createdBy: req.admin!.id });
      return row!;
    });
    await audit(db, req.admin!.id, 'dadu.content.create', 'dadu_content', body.id, { kind: body.kind });
    res.status(201).json(await itemDetail(item.id));
  });

  // Edit: drafts are edited in place; a published item gets a new draft version; items in review must be sent back first.
  r.put('/content/:id', auth.requirePermission('dadu:content:write'), async (req, res) => {
    const id = parse(contentId, req.params.id);
    const body = parse(updateBody, req.body);
    const item = await loadItem(id);
    const validated = validateBody(item.kind, id, body.body);
    if (item.status === 'draft') {
      await db.transaction(async (tx) => {
        await tx.update(daduContentVersions).set({ body: validated, changeNote: body.changeNote, createdBy: req.admin!.id }).where(and(eq(daduContentVersions.itemId, id), eq(daduContentVersions.version, item.currentVersion)));
        await tx.update(daduContentItems).set({ ...derive(item.kind, validated), updatedBy: req.admin!.id, updatedAt: new Date() }).where(eq(daduContentItems.id, id));
      });
    } else if (item.status === 'published' || item.status === 'approved') {
      const next = item.currentVersion + 1;
      await db.transaction(async (tx) => {
        await tx.insert(daduContentVersions).values({ itemId: id, version: next, body: validated, changeNote: body.changeNote, createdBy: req.admin!.id });
        await tx.update(daduContentItems).set({ ...derive(item.kind, validated), currentVersion: next, status: 'draft', updatedBy: req.admin!.id, updatedAt: new Date() }).where(eq(daduContentItems.id, id));
      });
    } else {
      throw new HttpError(409, `Content is in ${item.status}; send it back to draft before editing`, 'workflow_locked');
    }
    await audit(db, req.admin!.id, 'dadu.content.update', 'dadu_content', id, { note: body.changeNote });
    res.json(await itemDetail(id));
  });

  r.post('/content/:id/transition', auth.requirePermission('dadu:content:read'), async (req, res) => {
    const id = parse(contentId, req.params.id);
    const body = parse(transitionBody, req.body);
    const item = await loadItem(id);
    const check = checkTransition(item.status as WorkflowState, body.to);
    if (!check.ok) throw new HttpError(409, check.reason, 'workflow_invalid');
    if (!check.needed.some((p) => req.admin!.permissions.has(p))) throw forbidden();
    await db.transaction(async (tx) => {
      await tx.update(daduContentItems).set({ status: body.to, updatedBy: req.admin!.id, updatedAt: new Date() }).where(eq(daduContentItems.id, id));
      await tx.insert(daduReviewSteps).values({ itemId: id, version: item.currentVersion, step: item.status, decision: check.kind === 'forward' ? 'approve' : 'send_back', reviewerId: req.admin!.id, note: body.note });
    });
    await audit(db, req.admin!.id, `dadu.content.${check.kind}`, 'dadu_content', id, { from: item.status, to: body.to });
    res.json(await itemDetail(id));
  });

  r.post('/content/:id/publish', auth.requirePermission('dadu:content:publish'), async (req, res) => {
    const id = parse(contentId, req.params.id);
    const item = await loadItem(id);
    if (item.status !== 'approved') throw new HttpError(409, 'Only approved content can be published', 'workflow_invalid');
    await db.transaction(async (tx) => {
      await tx.update(daduContentVersions).set({ publishedAt: new Date() }).where(and(eq(daduContentVersions.itemId, id), eq(daduContentVersions.version, item.currentVersion)));
      await tx.update(daduContentItems).set({ status: 'published', publishedVersion: item.currentVersion, updatedBy: req.admin!.id, updatedAt: new Date() }).where(eq(daduContentItems.id, id));
    });
    await audit(db, req.admin!.id, 'dadu.content.publish', 'dadu_content', id, { version: item.currentVersion });
    res.json(await itemDetail(id));
  });

  r.post('/content/:id/unpublish', auth.requirePermission('dadu:content:publish'), async (req, res) => {
    const id = parse(contentId, req.params.id);
    const item = await loadItem(id);
    if (!item.publishedVersion) throw new HttpError(409, 'Content is not published', 'workflow_invalid');
    await db.update(daduContentItems).set({ status: item.status === 'published' ? 'approved' : item.status, publishedVersion: null, updatedBy: req.admin!.id, updatedAt: new Date() }).where(eq(daduContentItems.id, id));
    await audit(db, req.admin!.id, 'dadu.content.unpublish', 'dadu_content', id, { version: item.publishedVersion });
    res.json(await itemDetail(id));
  });

  // Rollback points the live version at an earlier published version; nothing is deleted.
  r.post('/content/:id/rollback', auth.requirePermission('dadu:content:publish'), async (req, res) => {
    const id = parse(contentId, req.params.id);
    const body = parse(rollbackBody, req.body);
    const item = await loadItem(id);
    const [v] = await db.select().from(daduContentVersions).where(and(eq(daduContentVersions.itemId, id), eq(daduContentVersions.version, body.version))).limit(1);
    if (!v) throw notFound('Version not found');
    if (!v.publishedAt) throw new HttpError(409, 'Only a version that was published before can be rolled back to', 'workflow_invalid');
    await db.update(daduContentItems).set({ publishedVersion: body.version, status: item.status === 'draft' ? 'draft' : 'published', updatedBy: req.admin!.id, updatedAt: new Date() }).where(eq(daduContentItems.id, id));
    await audit(db, req.admin!.id, 'dadu.content.rollback', 'dadu_content', id, { from: item.publishedVersion, to: body.version });
    res.json(await itemDetail(id));
  });

  // ---- media assets -----------------------------------------------------------------
  r.get('/assets', auth.requirePermission('dadu:content:read'), async (req, res) => {
    const q = parse(assetQuery, req.query);
    const conds: SQL[] = [];
    if (q.kind) conds.push(eq(daduMediaAssets.kind, q.kind));
    if (q.characterKey) conds.push(eq(daduMediaAssets.characterKey, q.characterKey));
    if (q.locationId) conds.push(eq(daduMediaAssets.locationId, q.locationId));
    const where = conds.length ? and(...conds) : undefined;
    const [total] = await db.select({ n: count() }).from(daduMediaAssets).where(where);
    const rows = await db.select().from(daduMediaAssets).where(where).orderBy(desc(daduMediaAssets.createdAt)).limit(q.pageSize).offset((q.page - 1) * q.pageSize);
    res.json({ items: rows, total: total?.n ?? 0, page: q.page, pageSize: q.pageSize });
  });

  r.post('/assets', auth.requirePermission('dadu:assets:write'), async (req, res) => {
    const body = parse(assetBody, req.body);
    if (body.attributionRequired && !body.attributionText) throw badRequest('Invalid request', [{ path: 'attributionText', message: 'required when attribution is required' }]);
    const [dup] = await db.select().from(daduMediaAssets).where(eq(daduMediaAssets.sha256, body.sha256)).limit(1);
    if (dup) {
      res.status(409).json({ error: { code: 'duplicate_asset', message: 'An asset with the same content already exists' }, asset: dup });
      return;
    }
    const [row] = await db.insert(daduMediaAssets).values({ ...body, uploadedBy: req.admin!.id }).returning();
    await audit(db, req.admin!.id, 'dadu.asset.register', 'dadu_media_asset', row!.id, { kind: body.kind, licence: body.licence });
    res.status(201).json(row);
  });

  r.patch('/assets/:id', auth.requirePermission('dadu:assets:write'), async (req, res) => {
    const id = parse(uuid, req.params.id);
    const body = parse(assetPatch, req.body);
    const [row] = await db.update(daduMediaAssets).set({ ...body, version: sql`${daduMediaAssets.version} + 1` }).where(eq(daduMediaAssets.id, id)).returning();
    if (!row) throw notFound('Asset not found');
    await audit(db, req.admin!.id, 'dadu.asset.update', 'dadu_media_asset', id, body as Record<string, unknown>);
    res.json(row);
  });

  r.delete('/assets/:id', auth.requirePermission('dadu:assets:write'), async (req, res) => {
    const id = parse(uuid, req.params.id);
    const [asset] = await db.select().from(daduMediaAssets).where(eq(daduMediaAssets.id, id)).limit(1);
    if (!asset) throw notFound('Asset not found');
    // Refuse when a published version references the asset by id or url.
    const [ref] = await db
      .select({ itemId: daduContentVersions.itemId })
      .from(daduContentVersions)
      .innerJoin(daduContentItems, and(eq(daduContentItems.id, daduContentVersions.itemId), eq(daduContentItems.publishedVersion, daduContentVersions.version)))
      .where(sql`${daduContentVersions.body}::text like ${'%' + asset.id + '%'} or ${daduContentVersions.body}::text like ${'%' + asset.url + '%'}`)
      .limit(1);
    if (ref) throw new HttpError(409, `Asset is used by published content "${ref.itemId}"`, 'asset_in_use');
    await db.delete(daduMediaAssets).where(eq(daduMediaAssets.id, id));
    await audit(db, req.admin!.id, 'dadu.asset.delete', 'dadu_media_asset', id);
    res.status(204).end();
  });

  // ---- packs ------------------------------------------------------------------------
  r.get('/packs', auth.requirePermission('dadu:content:read'), async (_req, res) => {
    const rows = await db.select().from(daduPacks).orderBy(desc(daduPacks.createdAt)).limit(200);
    res.json({ items: rows.map(packView) });
  });
  r.get('/packs/:id', auth.requirePermission('dadu:content:read'), async (req, res) => {
    const [pack] = await db.select().from(daduPacks).where(eq(daduPacks.id, parse(uuid, req.params.id))).limit(1);
    if (!pack) throw notFound('Pack not found');
    res.json({ ...packView(pack), manifest: pack.manifest });
  });
  r.post('/packs/build', auth.requirePermission('dadu:packs:publish'), async (req, res) => {
    const body = parse(packBuildBody, req.body);
    if (body.kind === 'language' && !body.language) throw badRequest('Invalid request', [{ path: 'language', message: 'required for a language pack' }]);
    const language = body.language ?? null;
    const built = await buildPackManifest(db, body.kind, language);
    const [prev] = await db
      .select({ v: max(daduPacks.version) })
      .from(daduPacks)
      .where(and(eq(daduPacks.kind, body.kind), language ? eq(daduPacks.language, language) : isNull(daduPacks.language)));
    const version = (prev?.v ?? 0) + 1;
    const [row] = await db.insert(daduPacks).values({ kind: body.kind, language, version, manifest: built.manifest, bytes: built.bytes, sha256: built.sha256, createdBy: req.admin!.id }).returning();
    await audit(db, req.admin!.id, 'dadu.pack.build', 'dadu_pack', row!.id, { kind: body.kind, language, version, items: built.manifest.items.length });
    res.status(201).json({ ...packView(row!), manifest: row!.manifest });
  });
  r.post('/packs/:id/publish', auth.requirePermission('dadu:packs:publish'), async (req, res) => {
    const id = parse(uuid, req.params.id);
    const [row] = await db.update(daduPacks).set({ status: 'published', publishedAt: new Date() }).where(eq(daduPacks.id, id)).returning();
    if (!row) throw notFound('Pack not found');
    await audit(db, req.admin!.id, 'dadu.pack.publish', 'dadu_pack', id, { kind: row.kind, version: row.version });
    res.json(packView(row));
  });

  // ---- feature flags ---------------------------------------------------------------------
  r.get('/flags', auth.requirePermission('dadu:content:read'), async (_req, res) => {
    const rows = await db.select().from(daduFeatureFlags).orderBy(asc(daduFeatureFlags.key));
    res.json({ items: rows.map((f) => ({ key: f.key, value: f.value, updatedAt: f.updatedAt.toISOString() })) });
  });
  r.put('/flags/:key', auth.requirePermission('dadu:flags:write'), async (req, res) => {
    const key = parse(flagKey, req.params.key);
    const body = parse(flagBody, req.body);
    if (body.value === undefined) throw badRequest('Invalid request', [{ path: 'value', message: 'required' }]);
    const [row] = await db
      .insert(daduFeatureFlags)
      .values({ key, value: body.value, updatedBy: req.admin!.id })
      .onConflictDoUpdate({ target: daduFeatureFlags.key, set: { value: body.value, updatedBy: req.admin!.id, updatedAt: new Date() } })
      .returning();
    await audit(db, req.admin!.id, 'dadu.flag.set', 'dadu_feature_flag', key, { value: body.value as unknown as Record<string, unknown> });
    res.json({ key: row!.key, value: row!.value, updatedAt: row!.updatedAt.toISOString() });
  });

  // ---- parent support (read-only, minimal) ----------------------------------------------------
  r.get('/parents/:userId/children', auth.requirePermission('dadu:parents:read'), async (req, res) => {
    const userId = parse(uuid, req.params.userId);
    const rows = await db.select().from(daduChildProfiles).where(and(eq(daduChildProfiles.userId, userId), isNull(daduChildProfiles.deletedAt))).orderBy(asc(daduChildProfiles.createdAt));
    const ids = rows.map((c) => c.id);
    const worlds = ids.length ? await db.select({ childId: daduWorldStates.childId, version: daduWorldStates.version, updatedAt: daduWorldStates.updatedAt, state: daduWorldStates.state }).from(daduWorldStates).where(inArray(daduWorldStates.childId, ids)) : [];
    const byChild = new Map(worlds.map((w) => [w.childId, w]));
    res.json({
      items: rows.map((c) => {
        const w = byChild.get(c.id);
        const st = (w?.state ?? {}) as { lessonsCompleted?: string[]; storiesRead?: string[]; rewards?: { stars?: number } };
        return {
          id: c.id,
          firstName: c.name.split(' ')[0],
          band: c.band,
          language: c.language,
          difficulty: c.difficulty,
          createdAt: c.createdAt.toISOString(),
          worldVersion: w?.version ?? 0,
          lastSyncAt: w?.updatedAt.toISOString() ?? null,
          lessonsCompleted: st.lessonsCompleted?.length ?? 0,
          storiesRead: st.storiesRead?.length ?? 0,
          stars: st.rewards?.stars ?? 0,
        };
      }),
    });
  });

  return r;
}
