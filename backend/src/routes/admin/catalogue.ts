// Console management of everything children see: games (metadata, brackets,
// status), craft tutorials, Did You Know? facts with their sources and quiz
// questions, and the approval trail. Publishing needs content:publish;
// marking a fact verified needs content:verify; a fact cannot be published
// without a source and a verification.
import { Router } from 'express';
import { z } from 'zod';
import { and, asc, count, desc, eq, ilike, or, type SQL } from 'drizzle-orm';
import { contentApprovals, craftTutorials, factSources, facts, gameCategories, games, quizQuestions, type CraftStep } from '../../database/schema.js';
import type { Auth } from '../../middleware/auth.js';
import { parse } from '../../middleware/validate.js';
import { badRequest, conflict, forbidden, notFound } from '../../lib/httpError.js';
import { escapeLike, slugify } from '../../lib/strings.js';
import { audit } from '../../lib/audit.js';
import { canIngestFrom } from '../../services/sourceRegistryService.js';
import { FACT_CATEGORY_KEYS } from '../../catalogue/factCategories.js';
import type { AppDeps } from '../../types.js';

const slug = z.string().regex(/^[a-z0-9-]{2,60}$/);
const bracket = z.enum(['A', 'B', 'C', 'D']);
const statusField = z.enum(['draft', 'in_development', 'published', 'archived']);
const translations = z.record(z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/), z.record(z.string(), z.unknown())).optional();

export function adminCatalogueRouter({ db }: AppDeps, auth: Auth) {
  const r = Router();
  const canPublish = (req: { admin?: { permissions: Set<string> } }) => req.admin!.permissions.has('content:publish');

  async function approve(req: { admin?: { id: string } }, entityType: 'game' | 'craft' | 'fact', entityId: string, status: 'pending' | 'approved' | 'rejected', note?: string) {
    await db.insert(contentApprovals).values({ entityType, entityId, status, reviewerId: req.admin!.id, note: note ?? null });
  }

  // ---- games ----------------------------------------------------------------
  const gameFields = z.object({
    name: z.string().trim().min(1).max(80),
    tagline: z.string().trim().max(120).default(''),
    description: z.string().trim().max(1000).default(''),
    instructions: z.string().trim().max(3000).default(''),
    categoryId: z.string().max(40).nullable().optional(),
    brackets: z.array(bracket).min(1).max(4),
    difficulties: z.array(z.object({ key: z.string().regex(/^[a-z0-9_-]{1,20}$/), label: z.string().trim().min(1).max(40), brackets: z.array(bracket).optional() })).min(1).max(8),
    skills: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
    contentRating: z.string().trim().max(30).default('everyone'),
    estimatedMinutes: z.number().int().min(1).max(120).default(5),
    offlineCapable: z.boolean().default(true),
    accessibility: z.record(z.string(), z.unknown()).default({}),
    assetLicense: z.string().trim().max(200).default('original'),
    status: statusField.optional(),
    sortOrder: z.number().int().min(0).max(10000).optional(),
    translations,
  });

  r.get('/games', auth.requirePermission('content:read'), async (req, res) => {
    const q = parse(z.object({ search: z.string().trim().max(100).optional(), status: statusField.optional(), bracket: bracket.optional() }), req.query);
    const conds: SQL[] = [];
    if (q.status) conds.push(eq(games.status, q.status));
    if (q.search) conds.push(or(ilike(games.name, `%${escapeLike(q.search)}%`), ilike(games.id, `%${escapeLike(q.search)}%`))!);
    const rows = await db.select().from(games).where(conds.length ? and(...conds) : undefined).orderBy(asc(games.sortOrder));
    res.json({ items: q.bracket ? rows.filter((g) => g.brackets.includes(q.bracket!)) : rows, categories: await db.select().from(gameCategories).orderBy(asc(gameCategories.sortOrder)) });
  });

  r.get('/games/:id', auth.requirePermission('content:read'), async (req, res) => {
    const [g] = await db.select().from(games).where(eq(games.id, parse(slug, req.params.id)));
    if (!g) throw notFound('Game not found');
    const approvals = await db.select().from(contentApprovals).where(and(eq(contentApprovals.entityType, 'game'), eq(contentApprovals.entityId, g.id))).orderBy(desc(contentApprovals.createdAt)).limit(20);
    res.json({ ...g, approvals });
  });

  r.post('/games', auth.requirePermission('content:write'), async (req, res) => {
    const body = parse(gameFields.extend({ id: slug }), req.body);
    if (body.status === 'published' && !canPublish(req)) throw forbidden('You cannot publish games');
    if (body.categoryId) await assertCategory(body.categoryId);
    const [existing] = await db.select({ id: games.id }).from(games).where(eq(games.id, body.id));
    if (existing) throw conflict('A game with this id already exists');
    const [row] = await db.insert(games).values({ ...body, status: body.status ?? 'draft', translations: body.translations ?? {}, updatedBy: req.admin!.id }).returning();
    await audit(db, req.admin!.id, 'game.created', 'game', row!.id, { name: row!.name });
    res.status(201).json(row);
  });

  r.patch('/games/:id', auth.requirePermission('content:write'), async (req, res) => {
    const id = parse(slug, req.params.id);
    const body = parse(gameFields.partial(), req.body);
    const [existing] = await db.select().from(games).where(eq(games.id, id));
    if (!existing) throw notFound('Game not found');
    if (body.status !== undefined && body.status !== existing.status && !canPublish(req)) throw forbidden('You cannot publish or unpublish games');
    if (body.categoryId) await assertCategory(body.categoryId);
    const [row] = await db.update(games).set({ ...body, translations: body.translations ?? existing.translations, updatedBy: req.admin!.id, updatedAt: new Date() }).where(eq(games.id, id)).returning();
    if (body.status && body.status !== existing.status) await approve(req, 'game', id, body.status === 'published' ? 'approved' : 'pending', `status → ${body.status}`);
    await audit(db, req.admin!.id, 'game.updated', 'game', id, { changed: Object.keys(body) });
    res.json(row);
  });

  async function assertCategory(id: string) {
    const [c] = await db.select({ id: gameCategories.id }).from(gameCategories).where(eq(gameCategories.id, id));
    if (!c) throw badRequest(`Category "${id}" does not exist`);
  }

  r.get('/game-categories', auth.requirePermission('content:read'), async (_req, res) => {
    res.json(await db.select().from(gameCategories).orderBy(asc(gameCategories.sortOrder)));
  });

  r.post('/game-categories', auth.requirePermission('content:write'), async (req, res) => {
    const body = parse(z.object({ name: z.string().trim().min(1).max(60), icon: z.string().max(30).default('puzzle'), color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#FF7A59'), sortOrder: z.number().int().min(0).default(0) }), req.body);
    const id = slugify(body.name);
    const [existing] = await db.select({ id: gameCategories.id }).from(gameCategories).where(eq(gameCategories.id, id));
    if (existing) throw conflict('That category already exists');
    const [row] = await db.insert(gameCategories).values({ id, ...body }).returning();
    await audit(db, req.admin!.id, 'game_category.created', 'game_category', id, { name: body.name });
    res.status(201).json(row);
  });

  // ---- crafts ---------------------------------------------------------------
  const stepSchema = z.object({ title: z.string().trim().min(1).max(80), text: z.string().trim().min(1).max(600), diagram: z.record(z.string(), z.unknown()).optional(), tip: z.string().trim().max(300).optional(), caution: z.string().trim().max(300).optional() });
  const craftFields = z.object({
    title: z.string().trim().min(1).max(80),
    kind: z.enum(['origami', 'paper_craft', 'drawing', 'digital']),
    description: z.string().trim().max(1000).default(''),
    brackets: z.array(bracket).min(1).max(4),
    difficulty: z.number().int().min(1).max(5).default(1),
    estimatedMinutes: z.number().int().min(1).max(180).default(10),
    materials: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
    hazards: z.array(z.enum(['scissors', 'glue', 'craft_knife', 'wire', 'needle', 'hot_glue', 'small_parts', 'paint'])).max(8).default([]),
    adultSupervision: z.boolean().default(false),
    physical: z.boolean().default(true),
    steps: z.array(stepSchema).max(40).default([]),
    finalPreview: z.record(z.string(), z.unknown()).nullable().optional(),
    checklist: z.array(z.string().trim().min(1).max(120)).max(12).default([]),
    status: statusField.optional(),
    sortOrder: z.number().int().min(0).max(10000).optional(),
    translations,
  });

  function craftProblems(c: { hazards: string[]; adultSupervision: boolean; steps: unknown[]; physical: boolean }) {
    if (c.hazards.length > 0 && !c.adultSupervision) return 'Crafts with hazardous materials must require adult supervision';
    if (c.steps.length === 0) return 'A tutorial needs at least one step';
    return null;
  }

  r.get('/crafts', auth.requirePermission('content:read'), async (req, res) => {
    const q = parse(z.object({ status: statusField.optional(), kind: z.string().max(20).optional() }), req.query);
    const conds: SQL[] = [];
    if (q.status) conds.push(eq(craftTutorials.status, q.status));
    if (q.kind) conds.push(eq(craftTutorials.kind, q.kind as typeof craftTutorials.$inferSelect.kind));
    res.json(await db.select().from(craftTutorials).where(conds.length ? and(...conds) : undefined).orderBy(asc(craftTutorials.sortOrder)));
  });

  r.get('/crafts/:id', auth.requirePermission('content:read'), async (req, res) => {
    const [c] = await db.select().from(craftTutorials).where(eq(craftTutorials.id, parse(slug, req.params.id)));
    if (!c) throw notFound('Craft not found');
    res.json(c);
  });

  r.post('/crafts', auth.requirePermission('content:write'), async (req, res) => {
    const body = parse(craftFields.extend({ id: slug.optional() }), req.body);
    const id = body.id ?? slugify(body.title);
    const status = body.status ?? 'draft';
    if (status === 'published') {
      if (!canPublish(req)) throw forbidden('You cannot publish crafts');
      const problem = craftProblems(body);
      if (problem) throw badRequest(problem);
    }
    const [existing] = await db.select({ id: craftTutorials.id }).from(craftTutorials).where(eq(craftTutorials.id, id));
    if (existing) throw conflict('A craft with this id already exists');
    const [row] = await db.insert(craftTutorials).values({ ...body, id, status, steps: body.steps as CraftStep[], translations: body.translations ?? {}, updatedBy: req.admin!.id }).returning();
    await audit(db, req.admin!.id, 'craft.created', 'craft', id, { title: body.title });
    res.status(201).json(row);
  });

  r.patch('/crafts/:id', auth.requirePermission('content:write'), async (req, res) => {
    const id = parse(slug, req.params.id);
    const body = parse(craftFields.partial(), req.body);
    const [existing] = await db.select().from(craftTutorials).where(eq(craftTutorials.id, id));
    if (!existing) throw notFound('Craft not found');
    const merged = { ...existing, ...body };
    if (body.status !== undefined && body.status !== existing.status) {
      if (!canPublish(req)) throw forbidden('You cannot publish or unpublish crafts');
      if (body.status === 'published') {
        const problem = craftProblems(merged);
        if (problem) throw badRequest(problem);
      }
    }
    const [row] = await db.update(craftTutorials).set({ ...body, steps: body.steps as CraftStep[] | undefined, translations: body.translations ?? existing.translations, updatedBy: req.admin!.id, updatedAt: new Date() }).where(eq(craftTutorials.id, id)).returning();
    if (body.status && body.status !== existing.status) await approve(req, 'craft', id, body.status === 'published' ? 'approved' : 'pending', `status → ${body.status}`);
    await audit(db, req.admin!.id, 'craft.updated', 'craft', id, { changed: Object.keys(body) });
    res.json(row);
  });

  r.delete('/crafts/:id', auth.requirePermission('content:delete'), async (req, res) => {
    const id = parse(slug, req.params.id);
    const [row] = await db.delete(craftTutorials).where(eq(craftTutorials.id, id)).returning();
    if (!row) throw notFound('Craft not found');
    await audit(db, req.admin!.id, 'craft.deleted', 'craft', id, { title: row.title });
    res.status(204).end();
  });

  // ---- facts ------------------------------------------------------------------
  const factFields = z.object({
    slug: slug.optional(),
    category: z.enum(FACT_CATEGORY_KEYS),
    headline: z.string().trim().min(1).max(120),
    body: z.string().trim().min(1).max(1200),
    whyText: z.string().trim().max(1200).default(''),
    followUpQuestion: z.string().trim().max(200).default(''),
    brackets: z.array(bracket).min(1).max(4),
    readingLevel: z.number().int().min(1).max(4).default(2),
    illustration: z.string().regex(/^[a-z0-9_-]{1,40}$/).default('sparkles'),
    imageContentId: z.string().uuid().nullable().optional(),
    audioUrl: z.string().url().max(500).nullable().optional(),
    sourceId: z.string().uuid().nullable().optional(),
    translations: z.record(z.string(), z.record(z.string(), z.string())).optional(),
    sortOrder: z.number().int().min(0).optional(),
  });
  const factStatus = z.enum(['draft', 'verified', 'published', 'archived']);

  r.get('/facts', auth.requirePermission('content:read'), async (req, res) => {
    const q = parse(z.object({ search: z.string().trim().max(100).optional(), status: factStatus.optional(), category: z.string().max(40).optional(), page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(200).default(50) }), req.query);
    const conds: SQL[] = [];
    if (q.status) conds.push(eq(facts.status, q.status));
    if (q.category) conds.push(eq(facts.category, q.category));
    if (q.search) conds.push(or(ilike(facts.headline, `%${escapeLike(q.search)}%`), ilike(facts.body, `%${escapeLike(q.search)}%`))!);
    const where = conds.length ? and(...conds) : undefined;
    const [total] = await db.select({ n: count() }).from(facts).where(where);
    const rows = await db
      .select({ f: facts, sourceTitle: factSources.title, sourcePublisher: factSources.publisher, questions: count(quizQuestions.id) })
      .from(facts)
      .leftJoin(factSources, eq(factSources.id, facts.sourceId))
      .leftJoin(quizQuestions, eq(quizQuestions.factId, facts.id))
      .where(where)
      .groupBy(facts.id, factSources.title, factSources.publisher)
      .orderBy(desc(facts.updatedAt))
      .limit(q.pageSize)
      .offset((q.page - 1) * q.pageSize);
    res.json({ items: rows.map((x) => ({ ...x.f, sourceTitle: x.sourceTitle, sourcePublisher: x.sourcePublisher, questionCount: x.questions })), total: total?.n ?? 0, page: q.page, pageSize: q.pageSize });
  });

  r.get('/facts/:id', auth.requirePermission('content:read'), async (req, res) => {
    const id = parse(z.string().uuid(), req.params.id);
    const [f] = await db.select().from(facts).where(eq(facts.id, id));
    if (!f) throw notFound('Fact not found');
    const [source] = f.sourceId ? await db.select().from(factSources).where(eq(factSources.id, f.sourceId)) : [];
    const questions = await db.select().from(quizQuestions).where(eq(quizQuestions.factId, id)).orderBy(asc(quizQuestions.sortOrder));
    const approvals = await db.select().from(contentApprovals).where(and(eq(contentApprovals.entityType, 'fact'), eq(contentApprovals.entityId, id))).orderBy(desc(contentApprovals.createdAt)).limit(20);
    res.json({ ...f, source: source ?? null, questions, approvals });
  });

  r.post('/facts', auth.requirePermission('content:write'), async (req, res) => {
    const body = parse(factFields, req.body);
    const s = body.slug ?? slugify(body.headline);
    const [existing] = await db.select({ id: facts.id }).from(facts).where(eq(facts.slug, s));
    if (existing) throw conflict('A fact with this slug already exists');
    const [row] = await db.insert(facts).values({ ...body, slug: s, imageContentId: body.imageContentId ?? null, audioUrl: body.audioUrl ?? null, sourceId: body.sourceId ?? null, translations: body.translations ?? {}, updatedBy: req.admin!.id }).returning();
    await audit(db, req.admin!.id, 'fact.created', 'fact', row!.id, { headline: body.headline });
    res.status(201).json(row);
  });

  r.patch('/facts/:id', auth.requirePermission('content:write'), async (req, res) => {
    const id = parse(z.string().uuid(), req.params.id);
    const body = parse(factFields.partial(), req.body);
    const [existing] = await db.select().from(facts).where(eq(facts.id, id));
    if (!existing) throw notFound('Fact not found');
    // Any change to the wording invalidates the verification.
    const wordingChanged = ['headline', 'body', 'whyText', 'sourceId'].some((k) => k in body && (body as Record<string, unknown>)[k] !== (existing as Record<string, unknown>)[k]);
    const [row] = await db
      .update(facts)
      .set({ ...body, translations: body.translations ?? existing.translations, ...(wordingChanged && existing.status !== 'draft' ? { status: 'draft' as const, verifiedAt: null, verifiedBy: null, publishedAt: null } : {}), updatedBy: req.admin!.id, updatedAt: new Date() })
      .where(eq(facts.id, id))
      .returning();
    await audit(db, req.admin!.id, 'fact.updated', 'fact', id, { changed: Object.keys(body), unverified: wordingChanged && existing.status !== 'draft' });
    res.json(row);
  });

  // Status transitions with their own permissions.
  r.post('/facts/:id/status', auth.requirePermission('content:read'), async (req, res) => {
    const id = parse(z.string().uuid(), req.params.id);
    const body = parse(z.object({ status: factStatus, note: z.string().trim().max(500).optional() }), req.body);
    const [f] = await db.select().from(facts).where(eq(facts.id, id));
    if (!f) throw notFound('Fact not found');
    const perms = req.admin!.permissions;
    const patch: Partial<typeof facts.$inferInsert> = { status: body.status, updatedBy: req.admin!.id, updatedAt: new Date() };
    if (body.status === 'verified') {
      if (!perms.has('content:verify')) throw forbidden('You cannot verify facts');
      if (!f.sourceId) throw badRequest('Add a source before verifying');
      patch.verifiedAt = new Date();
      patch.verifiedBy = req.admin!.id;
    } else if (body.status === 'published') {
      if (!perms.has('content:publish')) throw forbidden('You cannot publish facts');
      if (!f.sourceId) throw badRequest('A fact cannot be published without a source');
      if (!f.verifiedAt) throw badRequest('A fact must be verified against its source before publishing');
      if (f.ingestionKind === 'ingested') {
        const [src] = await db.select().from(factSources).where(eq(factSources.id, f.sourceId));
        if (!src || !canIngestFrom(src, 'text')) throw badRequest('This fact was ingested from a source that is not currently approved for use; approve the source first');
        if (!f.attributionText || !f.sourceUrl) throw badRequest('An ingested fact needs its source page and attribution before publishing');
      }
      const [q] = await db.select({ n: count() }).from(quizQuestions).where(eq(quizQuestions.factId, id));
      if ((q?.n ?? 0) === 0) throw badRequest('Add at least one quiz question before publishing');
      patch.publishedAt = new Date();
    } else if (body.status === 'archived' || body.status === 'draft') {
      if (!perms.has('content:publish') && !perms.has('content:write')) throw forbidden();
      if (body.status === 'draft') {
        patch.verifiedAt = null;
        patch.verifiedBy = null;
        patch.publishedAt = null;
      }
    }
    const [row] = await db.update(facts).set(patch).where(eq(facts.id, id)).returning();
    await approve(req, 'fact', id, body.status === 'published' ? 'approved' : body.status === 'archived' ? 'rejected' : 'pending', body.note ?? `status → ${body.status}`);
    await audit(db, req.admin!.id, `fact.${body.status}`, 'fact', id, { headline: f.headline });
    res.json(row);
  });

  r.delete('/facts/:id', auth.requirePermission('content:delete'), async (req, res) => {
    const id = parse(z.string().uuid(), req.params.id);
    const [row] = await db.delete(facts).where(eq(facts.id, id)).returning();
    if (!row) throw notFound('Fact not found');
    await audit(db, req.admin!.id, 'fact.deleted', 'fact', id, { headline: row.headline });
    res.status(204).end();
  });

  const questionFields = z.object({ question: z.string().trim().min(1).max(300), options: z.array(z.string().trim().min(1).max(120)).min(2).max(5), correctIndex: z.number().int().min(0), explanation: z.string().trim().max(500).default(''), sortOrder: z.number().int().min(0).default(0) }).refine((q) => q.correctIndex < q.options.length, 'correctIndex is out of range');

  r.post('/facts/:id/questions', auth.requirePermission('content:write'), async (req, res) => {
    const id = parse(z.string().uuid(), req.params.id);
    const body = parse(questionFields, req.body);
    const [f] = await db.select({ id: facts.id }).from(facts).where(eq(facts.id, id));
    if (!f) throw notFound('Fact not found');
    const [row] = await db.insert(quizQuestions).values({ ...body, factId: id }).returning();
    res.status(201).json(row);
  });

  r.patch('/questions/:id', auth.requirePermission('content:write'), async (req, res) => {
    const id = parse(z.string().uuid(), req.params.id);
    const body = parse(z.object({ question: z.string().trim().min(1).max(300).optional(), options: z.array(z.string().trim().min(1).max(120)).min(2).max(5).optional(), correctIndex: z.number().int().min(0).optional(), explanation: z.string().trim().max(500).optional(), sortOrder: z.number().int().min(0).optional() }), req.body);
    const [existing] = await db.select().from(quizQuestions).where(eq(quizQuestions.id, id));
    if (!existing) throw notFound('Question not found');
    const options = body.options ?? existing.options;
    const correctIndex = body.correctIndex ?? existing.correctIndex;
    if (correctIndex >= options.length) throw badRequest('correctIndex is out of range');
    const [row] = await db.update(quizQuestions).set(body).where(eq(quizQuestions.id, id)).returning();
    res.json(row);
  });

  r.delete('/questions/:id', auth.requirePermission('content:write'), async (req, res) => {
    const id = parse(z.string().uuid(), req.params.id);
    await db.delete(quizQuestions).where(eq(quizQuestions.id, id));
    res.status(204).end();
  });

  r.get('/approvals', auth.requirePermission('content:read'), async (req, res) => {
    const q = parse(z.object({ entityType: z.enum(['game', 'craft', 'fact']).optional(), limit: z.coerce.number().int().min(1).max(200).default(50) }), req.query);
    res.json(await db.select().from(contentApprovals).where(q.entityType ? eq(contentApprovals.entityType, q.entityType) : undefined).orderBy(desc(contentApprovals.createdAt)).limit(q.limit));
  });

  return r;
}
