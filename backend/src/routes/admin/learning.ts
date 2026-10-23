// Console management of the learning academy and the reward shop: lessons
// (authoring with the chapter template, review, publishing, curriculum
// mapping verification) and reward items. Publishing needs content:publish;
// marking a curriculum mapping verified needs content:verify.
import { Router } from 'express';
import { z } from 'zod';
import { and, asc, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { childRewards, coinTransactions, contentApprovals, lessonProgress, lessons, rankingEvents, rewardItems, LESSON_DIFFICULTIES, LESSON_SECTIONS, LESSON_STATUSES, REWARD_KINDS } from '../../database/schema.js';
import type { Auth } from '../../middleware/auth.js';
import { parse, parsePatch } from '../../middleware/validate.js';
import { badRequest, conflict, forbidden, notFound } from '../../lib/httpError.js';
import { escapeLike } from '../../lib/strings.js';
import { audit } from '../../lib/audit.js';
import { AGES, SUBJECT_BY_KEY } from '../../catalogue/learning.js';
import { learningOverview } from '../../services/learningService.js';
import { SCORING_RULES } from '../../services/rankingService.js';
import type { AppDeps } from '../../types.js';

const slug = z.string().regex(/^[a-z0-9-]{2,80}$/);
const visual = z.object({ kind: z.string().max(40), props: z.record(z.string(), z.unknown()).optional() });
const stepSchema = z.object({
  kind: z.enum(['objective', 'discover', 'understand', 'example', 'tryIt', 'realWorld', 'revision', 'didYouKnow', 'challenge']),
  title: z.string().max(120).optional(),
  text: z.string().max(2000).optional(),
  textByBracket: z.object({ A: z.string().max(600).optional(), B: z.string().max(600).optional(), C: z.string().max(600).optional(), D: z.string().max(600).optional() }).optional(),
  visual: visual.optional(),
  example: z.object({ steps: z.array(z.string().max(400)).max(12), visual: visual.optional() }).optional(),
  activity: z.record(z.string(), z.unknown()).optional(),
  points: z.array(z.string().max(300)).max(12).optional(),
  fact: z.object({ headline: z.string().max(200), body: z.string().max(1200), source: z.object({ title: z.string().max(200), publisher: z.string().max(120), url: z.string().url().max(500) }) }).optional(),
  questions: z.array(z.object({ question: z.string().max(400), options: z.array(z.string().max(120)).min(2).max(6), correctIndex: z.number().int().min(0).max(5), explanation: z.string().max(400).optional() })).max(10).optional(),
  safety: z.string().max(600).optional(),
});
const mappingSchema = z.object({
  framework: z.enum(['ncert', 'cbse', 'cisce', 'state', 'ib_pyp', 'ib_myp']),
  board: z.string().max(80).optional(),
  grade: z.string().min(1).max(40),
  syllabusTopic: z.string().min(1).max(200),
  learningOutcome: z.string().max(400).optional(),
  sourceRef: z.string().min(1).max(500),
  verificationStatus: z.enum(['pending_review', 'verified', 'rejected']).default('pending_review'),
  lastReviewedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
const lessonFields = z.object({
  section: z.enum(LESSON_SECTIONS),
  subject: z.string().min(1).max(40),
  topic: z.string().trim().min(1).max(80),
  subtopic: z.string().trim().max(80).default(''),
  title: z.string().trim().min(1).max(120),
  summary: z.string().trim().max(400).default(''),
  recommendedAge: z.number().int().min(3).max(12),
  minAge: z.number().int().min(3).max(12).default(3),
  maxAge: z.number().int().min(3).max(12).default(12),
  difficulty: z.enum(LESSON_DIFFICULTIES).default('beginner'),
  level: z.number().int().min(1).max(99).default(1),
  learningObjective: z.string().trim().min(1).max(400),
  prerequisites: z.array(z.string().max(80)).max(10).default([]),
  steps: z.array(stepSchema).max(12),
  estimatedMinutes: z.number().int().min(1).max(60).default(8),
  curriculum: z.array(mappingSchema).max(10).default([]),
  sources: z.array(z.object({ title: z.string().max(200), publisher: z.string().max(120), url: z.string().url().max(500), accessedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() })).max(10).default([]),
  safetyNotes: z.array(z.string().max(400)).max(10).default([]),
  adultAssisted: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(10000).default(0),
  translations: z.record(z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/), z.record(z.string(), z.unknown())).default({}),
});

/** The chapter template every published lesson must follow (see docs/LEARNING.md). */
export const TEMPLATE_ORDER = ['objective', 'discover', 'understand', 'example', 'tryIt', 'realWorld', 'revision', 'didYouKnow', 'challenge'] as const;

export function templateProblems(l: { steps: z.infer<typeof stepSchema>[]; section: string; subject: string; minAge: number; maxAge: number; recommendedAge: number }): string[] {
  const problems: string[] = [];
  const kinds = l.steps.map((s) => s.kind);
  for (const k of TEMPLATE_ORDER) if (!kinds.includes(k)) problems.push(`Missing step: ${k}`);
  const order = kinds.filter((k) => (TEMPLATE_ORDER as readonly string[]).includes(k));
  const expected = TEMPLATE_ORDER.filter((k) => kinds.includes(k));
  if (order.join() !== expected.join()) problems.push('Steps are not in the template order');
  const dyk = l.steps.find((s) => s.kind === 'didYouKnow');
  if (dyk && (!dyk.fact || !dyk.fact.source?.url)) problems.push('The Did You Know? step needs a fact with a source URL');
  const challenge = l.steps.find((s) => s.kind === 'challenge');
  if (challenge && !(challenge.questions?.length || challenge.activity)) problems.push('The chapter challenge needs questions or an activity');
  const tryIt = l.steps.find((s) => s.kind === 'tryIt');
  if (tryIt && !tryIt.activity) problems.push('The Try It step needs an activity');
  const subject = SUBJECT_BY_KEY.get(l.subject);
  if (!subject) problems.push(`Unknown subject ${l.subject}`);
  else if (subject.section !== l.section) problems.push(`Subject ${l.subject} belongs to the ${subject.section} section`);
  if (l.minAge > l.maxAge) problems.push('minAge is above maxAge');
  if (l.recommendedAge < l.minAge || l.recommendedAge > l.maxAge) problems.push('recommendedAge is outside minAge..maxAge');
  if (l.subject === 'swimming' && !l.steps.some((s) => (s.safety ?? '').toLowerCase().includes('instructor') || (s.text ?? '').toLowerCase().includes('instructor'))) problems.push('Swimming lessons must state that real swimming needs a qualified in-person instructor');
  return problems;
}

export function adminLearningRouter({ db }: AppDeps, auth: Auth) {
  const r = Router();
  const canPublish = (req: { admin?: { permissions: Set<string> } }) => req.admin!.permissions.has('content:publish');

  // ---- lessons -------------------------------------------------------------
  r.get('/learning/overview', auth.requirePermission('content:read'), async (_req, res) => {
    res.json(await learningOverview(db));
  });

  r.get('/lessons', auth.requirePermission('content:read'), async (req, res) => {
    const q = parse(z.object({ section: z.enum(LESSON_SECTIONS).optional(), subject: z.string().max(40).optional(), status: z.enum(LESSON_STATUSES).optional(), age: z.coerce.number().int().min(3).max(12).optional(), search: z.string().trim().max(100).optional(), limit: z.coerce.number().int().min(1).max(500).default(200), offset: z.coerce.number().int().min(0).default(0) }), req.query);
    const conds: SQL[] = [];
    if (q.section) conds.push(eq(lessons.section, q.section));
    if (q.subject) conds.push(eq(lessons.subject, q.subject));
    if (q.status) conds.push(eq(lessons.status, q.status));
    if (q.age) conds.push(eq(lessons.recommendedAge, q.age));
    if (q.search) conds.push(or(ilike(lessons.title, `%${escapeLike(q.search)}%`), ilike(lessons.id, `%${escapeLike(q.search)}%`), ilike(lessons.topic, `%${escapeLike(q.search)}%`))!);
    const where = conds.length ? and(...conds) : undefined;
    const [total] = await db.select({ n: sql<number>`count(*)::int` }).from(lessons).where(where);
    const rows = await db
      .select({ id: lessons.id, section: lessons.section, subject: lessons.subject, topic: lessons.topic, subtopic: lessons.subtopic, title: lessons.title, recommendedAge: lessons.recommendedAge, difficulty: lessons.difficulty, level: lessons.level, status: lessons.status, origin: lessons.origin, adminEdited: lessons.adminEdited, stepCount: sql<number>`jsonb_array_length(${lessons.steps})`, mappings: sql<number>`jsonb_array_length(${lessons.curriculum})`, verifiedMappings: sql<number>`(select count(*) from jsonb_array_elements(${lessons.curriculum}) m where m->>'verificationStatus' = 'verified')::int`, updatedAt: lessons.updatedAt, publishedAt: lessons.publishedAt })
      .from(lessons)
      .where(where)
      .orderBy(asc(lessons.section), asc(lessons.subject), asc(lessons.recommendedAge), asc(lessons.level), asc(lessons.sortOrder))
      .limit(q.limit)
      .offset(q.offset);
    res.json({ total: total?.n ?? 0, items: rows, ages: AGES });
  });

  r.get('/lessons/:id', auth.requirePermission('content:read'), async (req, res) => {
    const [l] = await db.select().from(lessons).where(eq(lessons.id, parse(slug, req.params.id)));
    if (!l) throw notFound('Lesson not found');
    const approvals = await db.select().from(contentApprovals).where(and(eq(contentApprovals.entityType, 'lesson'), eq(contentApprovals.entityId, l.id))).orderBy(desc(contentApprovals.createdAt)).limit(20);
    const [stats] = await db.select({ started: sql<number>`count(*)::int`, completed: sql<number>`count(*) filter (where ${lessonProgress.completedAt} is not null)::int`, avgQuiz: sql<number | null>`avg(${lessonProgress.bestQuizScore}::float / nullif(${lessonProgress.quizTotal}, 0))` }).from(lessonProgress).where(eq(lessonProgress.lessonId, l.id));
    res.json({ ...l, approvals, stats: { started: stats?.started ?? 0, completed: stats?.completed ?? 0, avgQuizRatio: stats?.avgQuiz ?? null }, templateProblems: templateProblems(l) });
  });

  r.post('/lessons', auth.requirePermission('content:write'), async (req, res) => {
    const body = parse(lessonFields.extend({ id: slug }), req.body);
    const [existing] = await db.select({ id: lessons.id }).from(lessons).where(eq(lessons.id, body.id));
    if (existing) throw conflict('A lesson with this id already exists');
    const problems = templateProblems(body);
    const [row] = await db.insert(lessons).values({ ...body, status: 'draft', origin: 'admin', adminEdited: true, updatedBy: req.admin!.id }).returning();
    await audit(db, req.admin!.id, 'lesson.created', 'lesson', row!.id, { title: row!.title });
    res.status(201).json({ ...row, templateProblems: problems });
  });

  r.patch('/lessons/:id', auth.requirePermission('content:write'), async (req, res) => {
    const id = parse(slug, req.params.id);
    const body = parsePatch(lessonFields, req.body);
    const [l] = await db.select().from(lessons).where(eq(lessons.id, id));
    if (!l) throw notFound('Lesson not found');
    const merged = { ...l, ...body };
    const problems = templateProblems(merged);
    if (l.status === 'published' && problems.length) throw badRequest('A published lesson must keep the chapter template', problems.map((p) => ({ path: 'steps', message: p })));
    // Editing a seeded lesson detaches it from future seed updates.
    const [row] = await db.update(lessons).set({ ...body, adminEdited: true, updatedBy: req.admin!.id, updatedAt: new Date() }).where(eq(lessons.id, id)).returning();
    await audit(db, req.admin!.id, 'lesson.updated', 'lesson', id, { fields: Object.keys(body) });
    res.json({ ...row, templateProblems: problems });
  });

  // Workflow: draft → in_review → published (content:publish) → archived.
  r.post('/lessons/:id/status', auth.requirePermission('content:write'), async (req, res) => {
    const id = parse(slug, req.params.id);
    const body = parse(z.object({ status: z.enum(LESSON_STATUSES), note: z.string().max(500).optional() }), req.body);
    const [l] = await db.select().from(lessons).where(eq(lessons.id, id));
    if (!l) throw notFound('Lesson not found');
    const wasPublished: boolean = l.status === 'published';
    if ((body.status === 'published' || wasPublished) && !canPublish(req)) throw forbidden('You cannot publish or unpublish lessons');
    if (body.status === 'published') {
      const problems = templateProblems(l);
      if (problems.length) throw badRequest('This lesson does not follow the chapter template yet', problems.map((p) => ({ path: 'steps', message: p })));
      if (l.sources.length === 0) throw badRequest('A published lesson needs at least one source');
    }
    const now = new Date();
    const [row] = await db
      .update(lessons)
      .set({ status: body.status, publishedAt: body.status === 'published' ? (l.publishedAt ?? now) : l.publishedAt, reviewedBy: body.status === 'in_review' || body.status === 'published' ? req.admin!.id : l.reviewedBy, reviewedAt: body.status === 'in_review' || body.status === 'published' ? now : l.reviewedAt, updatedBy: req.admin!.id, updatedAt: now })
      .where(eq(lessons.id, id))
      .returning();
    await db.insert(contentApprovals).values({ entityType: 'lesson', entityId: id, status: body.status === 'published' ? 'approved' : body.status === 'archived' ? 'rejected' : 'pending', reviewerId: req.admin!.id, note: body.note ?? null });
    await audit(db, req.admin!.id, `lesson.${body.status}`, 'lesson', id, { from: l.status });
    res.json(row);
  });

  // A fact checker marks one curriculum mapping verified or rejected after
  // checking the syllabus document named in sourceRef.
  r.post('/lessons/:id/curriculum/:index/verify', auth.requirePermission('content:verify'), async (req, res) => {
    const id = parse(slug, req.params.id);
    const index = parse(z.coerce.number().int().min(0).max(9), req.params.index);
    const body = parse(z.object({ verificationStatus: z.enum(['verified', 'rejected', 'pending_review']), note: z.string().max(500).optional() }), req.body);
    const [l] = await db.select().from(lessons).where(eq(lessons.id, id));
    if (!l) throw notFound('Lesson not found');
    const m = l.curriculum[index];
    if (!m) throw notFound('Mapping not found');
    const curriculum = l.curriculum.map((x, i) => (i === index ? { ...x, verificationStatus: body.verificationStatus, lastReviewedAt: new Date().toISOString().slice(0, 10) } : x));
    const [row] = await db.update(lessons).set({ curriculum, updatedBy: req.admin!.id, updatedAt: new Date() }).where(eq(lessons.id, id)).returning();
    await audit(db, req.admin!.id, 'lesson.curriculum_verified', 'lesson', id, { index, framework: m.framework, grade: m.grade, status: body.verificationStatus, note: body.note });
    res.json(row);
  });

  r.delete('/lessons/:id', auth.requirePermission('content:delete'), async (req, res) => {
    const id = parse(slug, req.params.id);
    const [l] = await db.select({ id: lessons.id, status: lessons.status }).from(lessons).where(eq(lessons.id, id));
    if (!l) throw notFound('Lesson not found');
    if (l.status === 'published') throw badRequest('Unpublish (archive) the lesson before deleting it');
    await db.delete(lessons).where(eq(lessons.id, id));
    await audit(db, req.admin!.id, 'lesson.deleted', 'lesson', id);
    res.status(204).end();
  });

  // ---- reward items ----------------------------------------------------------
  const itemFields = z.object({
    name: z.string().trim().min(1).max(60),
    description: z.string().trim().max(200).default(''),
    kind: z.enum(REWARD_KINDS),
    emoji: z.string().min(1).max(8).default('🎁'),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#FFC93C'),
    visual: z.record(z.string(), z.unknown()).default({}),
    price: z.number().int().min(0).max(100_000),
    premiumOnly: z.boolean().default(false),
    status: z.enum(['draft', 'published', 'archived']).default('published'),
    sortOrder: z.number().int().min(0).max(10000).default(0),
  });

  r.get('/reward-items', auth.requirePermission('content:read'), async (_req, res) => {
    const rows = await db.select({ item: rewardItems, owners: sql<number>`(select count(*) from child_rewards cr where cr.item_key = ${rewardItems.key})::int` }).from(rewardItems).orderBy(asc(rewardItems.sortOrder));
    const [economy] = await db.select({ earned: sql<number>`coalesce(sum(${coinTransactions.amount}) filter (where ${coinTransactions.amount} > 0), 0)::int`, spent: sql<number>`coalesce(-sum(${coinTransactions.amount}) filter (where ${coinTransactions.amount} < 0), 0)::int`, transactions: sql<number>`count(*)::int` }).from(coinTransactions);
    const [purchases] = await db.select({ n: sql<number>`count(*)::int` }).from(childRewards);
    res.json({ items: rows.map((x) => ({ ...x.item, owners: x.owners })), economy: { ...economy, purchases: purchases?.n ?? 0 } });
  });

  r.post('/reward-items', auth.requirePermission('content:write'), async (req, res) => {
    const body = parse(itemFields.extend({ key: slug }), req.body);
    const [existing] = await db.select({ key: rewardItems.key }).from(rewardItems).where(eq(rewardItems.key, body.key));
    if (existing) throw conflict('An item with this key already exists');
    const [row] = await db.insert(rewardItems).values(body).returning();
    await audit(db, req.admin!.id, 'reward_item.created', 'reward_item', row!.key, { name: row!.name, price: row!.price });
    res.status(201).json(row);
  });

  r.patch('/reward-items/:key', auth.requirePermission('content:write'), async (req, res) => {
    const key = parse(slug, req.params.key);
    const body = parsePatch(itemFields, req.body);
    const [row] = await db.update(rewardItems).set(body).where(eq(rewardItems.key, key)).returning();
    if (!row) throw notFound('Item not found');
    await audit(db, req.admin!.id, 'reward_item.updated', 'reward_item', key, { fields: Object.keys(body) });
    res.json(row);
  });

  // ---- rankings overview -------------------------------------------------------
  r.get('/rankings/overview', auth.requirePermission('analytics:read'), async (_req, res) => {
    const perGame = await db.select({ gameId: rankingEvents.gameId, events: sql<number>`count(*)::int`, players: sql<number>`count(distinct ${rankingEvents.childId})::int`, wins: sql<number>`count(*) filter (where ${rankingEvents.won})::int`, last7d: sql<number>`count(*) filter (where ${rankingEvents.createdAt} >= now() - interval '7 days')::int` }).from(rankingEvents).groupBy(rankingEvents.gameId);
    res.json({ games: Object.entries(SCORING_RULES).map(([gameId, rule]) => ({ gameId, kind: rule.kind, label: rule.label, ...(perGame.find((p) => p.gameId === gameId) ?? { events: 0, players: 0, wins: 0, last7d: 0 }) })) });
  });

  return r;
}
