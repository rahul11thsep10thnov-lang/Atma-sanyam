import { and, asc, count, eq, inArray, sql } from 'drizzle-orm';
import type { Db } from '../database/client.js';
import { chapters, exams, questions, subjects, topics } from '../database/schema.js';
import { badRequest, conflict, notFound } from '../lib/httpError.js';

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || `item-${Date.now().toString(36)}`;

type Level = 'exam' | 'subject' | 'chapter' | 'topic';
const TABLE = { exam: exams, subject: subjects, chapter: chapters, topic: topics } as const;

export async function listTree(db: Db, opts: { includeArchived?: boolean; examId?: string } = {}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const active = (t: { status: any }) => (opts.includeArchived ? undefined : eq(t.status, 'active'));
  const examRows = await db
    .select()
    .from(exams)
    .where(and(active(exams), opts.examId ? eq(exams.id, opts.examId) : undefined))
    .orderBy(asc(exams.name));
  if (examRows.length === 0) return [];
  const examIds = examRows.map((e) => e.id);
  const subjectRows = await db
    .select()
    .from(subjects)
    .where(and(inArray(subjects.examId, examIds), active(subjects)))
    .orderBy(asc(subjects.sortOrder), asc(subjects.name));
  const subjectIds = subjectRows.map((s) => s.id);
  const chapterRows = subjectIds.length
    ? await db
        .select()
        .from(chapters)
        .where(and(inArray(chapters.subjectId, subjectIds), active(chapters)))
        .orderBy(asc(chapters.sortOrder), asc(chapters.name))
    : [];
  const chapterIds = chapterRows.map((c) => c.id);
  const topicRows = chapterIds.length
    ? await db
        .select()
        .from(topics)
        .where(and(inArray(topics.chapterId, chapterIds), active(topics)))
        .orderBy(asc(topics.sortOrder), asc(topics.name))
    : [];
  const qCounts = await db
    .select({ chapterId: questions.chapterId, status: questions.status, n: count() })
    .from(questions)
    .where(inArray(questions.examId, examIds))
    .groupBy(questions.chapterId, questions.status);
  const countFor = (chapterId: string) => {
    const rows = qCounts.filter((r) => r.chapterId === chapterId);
    return {
      total: rows.reduce((s, r) => s + Number(r.n), 0),
      published: Number(rows.find((r) => r.status === 'published')?.n ?? 0),
    };
  };
  return examRows.map((e) => ({
    ...e,
    subjects: subjectRows
      .filter((s) => s.examId === e.id)
      .map((s) => ({
        ...s,
        chapters: chapterRows
          .filter((c) => c.subjectId === s.id)
          .map((c) => ({ ...c, questionCounts: countFor(c.id), topics: topicRows.filter((t) => t.chapterId === c.id) })),
      })),
  }));
}

export interface NodeInput {
  name: string;
  slug?: string;
  description?: string | null;
  sortOrder?: number;
  stateCode?: string | null;
  examType?: string | null;
  defaultLanguage?: string;
}

async function parentExists(db: Db, level: Level, parentId: string | undefined) {
  if (level === 'exam') return;
  if (!parentId) throw badRequest(`A ${level} needs a parent.`);
  const parentTable = level === 'subject' ? exams : level === 'chapter' ? subjects : chapters;
  const [p] = await db.select({ id: parentTable.id }).from(parentTable).where(eq(parentTable.id, parentId)).limit(1);
  if (!p) throw notFound(`Parent not found.`);
}

export async function createNode(db: Db, level: Level, input: NodeInput, parentId?: string) {
  await parentExists(db, level, parentId);
  const slug = input.slug ? slugify(input.slug) : slugify(input.name);
  try {
    if (level === 'exam') {
      const [row] = await db
        .insert(exams)
        .values({
          name: input.name,
          slug,
          description: input.description ?? null,
          stateCode: input.stateCode ?? null,
          examType: input.examType ?? null,
          defaultLanguage: input.defaultLanguage ?? 'hi-Latn',
        })
        .returning();
      return row!;
    }
    const base = { name: input.name, slug, sortOrder: input.sortOrder ?? 0 };
    if (level === 'subject') return (await db.insert(subjects).values({ ...base, examId: parentId! }).returning())[0]!;
    if (level === 'chapter') return (await db.insert(chapters).values({ ...base, subjectId: parentId! }).returning())[0]!;
    return (await db.insert(topics).values({ ...base, chapterId: parentId! }).returning())[0]!;
  } catch (e) {
    if ((e as { code?: string }).code === '23505' || String((e as Error).message).includes('duplicate key')) {
      throw conflict(`A ${level} with the slug "${slug}" already exists here.`);
    }
    throw e;
  }
}

export async function updateNode(db: Db, level: Level, id: string, input: Partial<NodeInput> & { status?: 'active' | 'archived' }) {
  const table = TABLE[level];
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (input.name !== undefined) patch.name = input.name;
  if (input.slug !== undefined) patch.slug = slugify(input.slug);
  if (input.status !== undefined) patch.status = input.status;
  if (level === 'exam') {
    if (input.description !== undefined) patch.description = input.description;
    if (input.stateCode !== undefined) patch.stateCode = input.stateCode;
    if (input.examType !== undefined) patch.examType = input.examType;
    if (input.defaultLanguage !== undefined) patch.defaultLanguage = input.defaultLanguage;
  } else if (input.sortOrder !== undefined) {
    patch.sortOrder = input.sortOrder;
  }
  const rows = await db.update(table).set(patch).where(eq(table.id, id)).returning();
  if (!rows[0]) throw notFound(`${level} not found`);
  return rows[0];
}

/** Archive by default (keeps history and question links); hard delete only
 * when nothing references the node. */
export async function deleteNode(db: Db, level: Level, id: string, hard: boolean) {
  if (!hard) return updateNode(db, level, id, { status: 'archived' });
  const column = { exam: questions.examId, subject: questions.subjectId, chapter: questions.chapterId, topic: questions.topicId }[level];
  const [used] = await db.select({ n: count() }).from(questions).where(eq(column, id));
  if (Number(used?.n ?? 0) > 0) throw conflict(`This ${level} still has questions. Archive it instead.`);
  const table = TABLE[level];
  try {
    const rows = await db.delete(table).where(eq(table.id, id)).returning({ id: table.id });
    if (!rows[0]) throw notFound(`${level} not found`);
  } catch (e) {
    if ((e as { code?: string }).code === '23503') throw conflict(`This ${level} is still in use. Archive it instead.`);
    throw e;
  }
  return { id, deleted: true };
}

export interface ScopeIds {
  examId: string;
  subjectId: string;
  chapterId: string;
  topicId?: string | null;
}

export interface ResolvedScope {
  ok: boolean;
  exam?: typeof exams.$inferSelect;
  subject?: typeof subjects.$inferSelect;
  chapter?: typeof chapters.$inferSelect;
  topic?: typeof topics.$inferSelect | null;
  problem?: string;
}

/** Checks the ids exist, are active and belong to each other. */
export async function resolveScope(db: Db, ids: ScopeIds): Promise<ResolvedScope> {
  const [row] = await db
    .select({ exam: exams, subject: subjects, chapter: chapters })
    .from(chapters)
    .innerJoin(subjects, eq(subjects.id, chapters.subjectId))
    .innerJoin(exams, eq(exams.id, subjects.examId))
    .where(and(eq(chapters.id, ids.chapterId), eq(subjects.id, ids.subjectId), eq(exams.id, ids.examId)))
    .limit(1);
  if (!row) return { ok: false, problem: 'Exam, subject and chapter do not match each other.' };
  if (row.exam.status !== 'active' || row.subject.status !== 'active' || row.chapter.status !== 'active') {
    return { ok: false, ...row, problem: 'Exam, subject or chapter is archived.' };
  }
  let topic: typeof topics.$inferSelect | null = null;
  if (ids.topicId) {
    const [t] = await db.select().from(topics).where(and(eq(topics.id, ids.topicId), eq(topics.chapterId, ids.chapterId))).limit(1);
    if (!t || t.status !== 'active') return { ok: false, ...row, problem: 'Topic does not belong to this chapter or is archived.' };
    topic = t;
  }
  return { ok: true, ...row, topic };
}

/** Resolve names/slugs (used by CSV/JSON import) to ids within one exam. */
export async function findScopeByNames(
  db: Db,
  names: { exam: string; subject: string; chapter: string; topic?: string | null }
): Promise<ScopeIds | null> {
  const lc = (s: string) => s.trim().toLowerCase();
  const [exam] = await db
    .select({ id: exams.id })
    .from(exams)
    .where(sql`lower(${exams.slug}) = ${lc(names.exam)} or lower(${exams.name}) = ${lc(names.exam)}`)
    .limit(1);
  if (!exam) return null;
  const [subject] = await db
    .select({ id: subjects.id })
    .from(subjects)
    .where(and(eq(subjects.examId, exam.id), sql`(lower(${subjects.slug}) = ${lc(names.subject)} or lower(${subjects.name}) = ${lc(names.subject)})`))
    .limit(1);
  if (!subject) return null;
  const [chapter] = await db
    .select({ id: chapters.id })
    .from(chapters)
    .where(
      and(
        eq(chapters.subjectId, subject.id),
        sql`(lower(${chapters.slug}) = ${lc(names.chapter)} or lower(${chapters.name}) = ${lc(names.chapter)} or ${chapters.slug} = ${slugify(names.chapter)})`
      )
    )
    .limit(1);
  if (!chapter) return null;
  let topicId: string | null = null;
  if (names.topic?.trim()) {
    const [topic] = await db
      .select({ id: topics.id })
      .from(topics)
      .where(and(eq(topics.chapterId, chapter.id), sql`(lower(${topics.name}) = ${lc(names.topic)} or ${topics.slug} = ${slugify(names.topic)})`))
      .limit(1);
    if (!topic) return null;
    topicId = topic.id;
  }
  return { examId: exam.id, subjectId: subject.id, chapterId: chapter.id, topicId };
}
