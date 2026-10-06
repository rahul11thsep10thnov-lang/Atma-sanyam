import { and, asc, count, desc, eq, ilike, inArray, isNotNull, isNull, ne, notInArray, sql, type SQL } from 'drizzle-orm';
import type { Db } from '../database/client.js';
import {
  chapters,
  exams,
  mockTestQuestions,
  questionOptions,
  questionReviews,
  questions,
  subjects,
  testAnswers,
  topics,
  type ValidationIssue,
} from '../database/schema.js';
import { audit } from '../lib/audit.js';
import { conflict, notFound, unprocessable } from '../lib/httpError.js';
import { OPTION_LABELS, type QuestionCandidate } from '../pipeline/questionSchema.js';
import { bestMatch, fingerprint, normalizeText, type DuplicateMatch } from '../pipeline/similarity.js';
import { sanitizeCandidate, validateQuestion, type ValidationResult } from '../pipeline/validator.js';
import { resolveScope } from './taxonomyService.js';

export type QuestionStatus = (typeof questions.status.enumValues)[number];
export type QuestionSource = (typeof questions.source.enumValues)[number];

const POOL_LIMIT = 5000;

/** Existing questions a new one is compared against: same exam, subject and
 * language, excluding rejected/archived ones. */
export async function loadDuplicatePool(
  db: Db,
  scope: { examId: string; subjectId: string; language: string },
  excludeId?: string
) {
  return db
    .select({ id: questions.id, normalizedText: questions.normalizedText })
    .from(questions)
    .where(
      and(
        eq(questions.examId, scope.examId),
        eq(questions.subjectId, scope.subjectId),
        eq(questions.language, scope.language),
        notInArray(questions.status, ['rejected', 'archived']),
        // Figure questions share stems ("choose the next figure"); their
        // duplicates are caught by figure fingerprint instead.
        isNull(questions.figureKind),
        excludeId ? ne(questions.id, excludeId) : undefined
      )
    )
    .orderBy(desc(questions.createdAt))
    .limit(POOL_LIMIT);
}

export interface Evaluation {
  candidate: QuestionCandidate;
  validation: ValidationResult;
  duplicate: DuplicateMatch | null;
  normalizedText: string;
  fingerprint: string;
}

/** Sanitize → duplicate check → validate. Pure except for the pool lookup. */
export function evaluate(
  raw: QuestionCandidate,
  opts: {
    explanationRequired: boolean;
    metadataOk: boolean;
    sourceProvided: boolean;
    pool: { id: string; normalizedText: string }[];
  }
): Evaluation {
  const candidate = sanitizeCandidate(raw);
  let normalizedText = normalizeText(candidate.question_text);
  // A generic stem ("शुद्ध वाक्य चुनिए।", "Choose the odd one") only means
  // something together with its options; two such questions are repeats only if
  // the options repeat too.
  const stemTokens = normalizedText.split(' ').filter(Boolean);
  if (stemTokens.length <= 4 && !/\d/.test(normalizedText) && candidate.options.length) {
    normalizedText = normalizeText([candidate.question_text, ...candidate.options.map((o) => o.text)].join(' '));
  }
  const duplicate = normalizedText ? bestMatch({ normalizedText }, opts.pool) : null;
  const validation = validateQuestion(candidate, {
    explanationRequired: opts.explanationRequired,
    metadataOk: opts.metadataOk,
    sourceProvided: opts.sourceProvided,
    duplicate,
  });
  return { candidate, validation, duplicate, normalizedText, fingerprint: fingerprint(normalizedText) };
}

/** Optional bank metadata (the extra columns of a bulk import). */
export interface BankMeta {
  externalId?: string | null;
  topicLabel?: string | null;
  subtopic?: string | null;
  concept?: string | null;
  cognitiveLevel?: string | null;
  year?: number | null;
  variationAllowed?: boolean | null;
  variationRule?: string | null;
  difficultyLabel?: string | null;
  answerVerified?: boolean | null;
  aiVerified?: boolean | null;
  verificationMethod?: string | null;
  qaGrade?: string | null;
  qaFlags?: string | null;
  qaFixes?: string | null;
}

export interface InsertMeta {
  status: QuestionStatus;
  source: QuestionSource;
  sourceName?: string | null;
  sourceReference?: string | null;
  sourceMaterialId?: string | null;
  sourceExcerpt?: string | null;
  validAsOf?: string | null;
  createdBy?: string | null;
  generationJobId?: string | null;
  generationBatchId?: string | null;
  bank?: BankMeta;
  /** Non-verbal question from the figure engine. */
  figure?: { svg: string | null; kind: string; params: Record<string, unknown>; optionSvgs: (string | null)[] };
}

export async function insertQuestion(db: Db, ev: Evaluation, meta: InsertMeta) {
  const c = ev.candidate;
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(questions)
      .values({
        examId: c.examId,
        subjectId: c.subjectId,
        chapterId: c.chapterId,
        topicId: c.topicId,
        questionText: c.question_text,
        questionType: 'mcq',
        language: c.language,
        difficulty: c.difficulty as 'easy' | 'medium' | 'hard',
        explanation: c.explanation || null,
        correctOption: c.correct_option,
        computation: c.computation,
        status: meta.status,
        source: meta.source,
        sourceName: meta.sourceName ?? null,
        sourceReference: meta.sourceReference ?? null,
        sourceMaterialId: meta.sourceMaterialId ?? null,
        sourceExcerpt: meta.sourceExcerpt ?? null,
        validAsOf: meta.validAsOf ?? null,
        normalizedText: ev.normalizedText,
        fingerprint: ev.fingerprint,
        duplicateOfId: ev.duplicate?.id ?? null,
        duplicateScore: ev.duplicate?.score ?? null,
        validationIssues: ev.validation.issues,
        createdBy: meta.createdBy ?? null,
        generationJobId: meta.generationJobId ?? null,
        generationBatchId: meta.generationBatchId ?? null,
        figureSvg: meta.figure?.svg ?? null,
        figureKind: meta.figure?.kind ?? null,
        figureParams: meta.figure?.params ?? null,
        ...meta.bank,
      })
      .returning();
    await tx.insert(questionOptions).values(
      c.options.map((o, i) => ({
        questionId: row!.id,
        label: o.id || OPTION_LABELS[i]!,
        text: o.text,
        svg: meta.figure?.optionSvgs[i] ?? null,
        sortOrder: i,
      }))
    );
    await tx.insert(questionReviews).values({
      questionId: row!.id,
      reviewerType: 'validator',
      decision: ev.validation.decision === 'passed' ? 'approved' : ev.validation.decision,
      valid: ev.validation.decision !== 'rejected',
      duplicateProbability: ev.duplicate?.score ?? 0,
      issues: ev.validation.issues,
      notes: ev.validation.issues.length ? null : 'All automated checks passed.',
    });
    return row!;
  });
}

// ---------------------------------------------------------------------------
// Admin create / edit
// ---------------------------------------------------------------------------

export interface QuestionInput {
  examId: string;
  subjectId: string;
  chapterId: string;
  topicId?: string | null;
  questionText: string;
  options: { label: string; text: string }[];
  correctOption: string;
  explanation?: string | null;
  difficulty: string;
  language: string;
  computation?: string | null;
  sourceName?: string | null;
  sourceReference?: string | null;
  sourceMaterialId?: string | null;
  validAsOf?: string | null;
}

function toCandidate(input: QuestionInput): QuestionCandidate {
  return {
    question_text: input.questionText,
    options: input.options.map((o) => ({ id: o.label, text: o.text })),
    correct_option: input.correctOption,
    explanation: input.explanation ?? '',
    difficulty: input.difficulty,
    computation: input.computation ?? null,
    language: input.language,
    question_type: 'mcq',
    examId: input.examId,
    subjectId: input.subjectId,
    chapterId: input.chapterId,
    topicId: input.topicId ?? null,
  };
}

function refuseOnErrors(v: ValidationResult) {
  const errors = v.issues.filter((i) => i.severity === 'error');
  if (errors.length) throw unprocessable('The question failed validation. Fix the listed problems and save again.', errors);
}

export async function createQuestion(db: Db, input: QuestionInput, adminId: string) {
  const scope = await resolveScope(db, input);
  const pool = await loadDuplicatePool(db, { examId: input.examId, subjectId: input.subjectId, language: input.language });
  const ev = evaluate(toCandidate(input), {
    explanationRequired: true,
    metadataOk: scope.ok,
    sourceProvided: !!(input.sourceReference || input.sourceMaterialId),
    pool,
  });
  refuseOnErrors(ev.validation);
  const row = await insertQuestion(db, ev, {
    status: ev.validation.decision === 'passed' ? 'draft' : 'needs_review',
    source: 'manual',
    sourceName: input.sourceName,
    sourceReference: input.sourceReference,
    sourceMaterialId: input.sourceMaterialId,
    validAsOf: input.validAsOf,
    createdBy: adminId,
  });
  await audit(db, adminId, 'question.created', 'question', row.id, { status: row.status, issues: ev.validation.issues.length });
  return getQuestion(db, row.id);
}

export async function updateQuestion(db: Db, id: string, input: QuestionInput, adminId: string) {
  const [existing] = await db.select().from(questions).where(eq(questions.id, id)).limit(1);
  if (!existing) throw notFound('Question not found');
  if (existing.status === 'archived') throw conflict('Restore the question before editing it.');
  const scope = await resolveScope(db, input);
  const isFigure = !!existing.figureKind;
  const pool = isFigure ? [] : await loadDuplicatePool(db, { examId: input.examId, subjectId: input.subjectId, language: input.language }, id);
  const ev = evaluate(toCandidate(input), {
    explanationRequired: true,
    metadataOk: scope.ok,
    sourceProvided: !!(input.sourceReference || input.sourceMaterialId || existing.sourceMaterialId),
    pool,
  });
  refuseOnErrors(ev.validation);
  if (isFigure) {
    // The figures are fixed; text edits must not change the puzzle's identity.
    ev.normalizedText = existing.normalizedText;
    ev.fingerprint = existing.fingerprint;
  }
  // Option figures stay attached to their letters through an edit.
  const oldSvgs = await db.select({ label: questionOptions.label, svg: questionOptions.svg }).from(questionOptions).where(eq(questionOptions.questionId, id));
  const svgFor = (label: string) => oldSvgs.find((o) => o.label === label)?.svg ?? null;
  // A human edit keeps approved/published status (the edit is audited); a
  // rejected question goes back to the review queue.
  const status: QuestionStatus = existing.status === 'rejected' ? 'needs_review' : existing.status;
  const c = ev.candidate;
  const before = await getQuestion(db, id);
  await db.transaction(async (tx) => {
    await tx
      .update(questions)
      .set({
        examId: c.examId,
        subjectId: c.subjectId,
        chapterId: c.chapterId,
        topicId: c.topicId,
        questionText: c.question_text,
        language: c.language,
        difficulty: c.difficulty as 'easy' | 'medium' | 'hard',
        explanation: c.explanation || null,
        correctOption: c.correct_option,
        computation: c.computation,
        sourceName: input.sourceName ?? existing.sourceName,
        sourceReference: input.sourceReference ?? existing.sourceReference,
        sourceMaterialId: input.sourceMaterialId ?? existing.sourceMaterialId,
        validAsOf: input.validAsOf ?? existing.validAsOf,
        normalizedText: ev.normalizedText,
        fingerprint: ev.fingerprint,
        duplicateOfId: ev.duplicate?.id ?? null,
        duplicateScore: ev.duplicate?.score ?? null,
        validationIssues: ev.validation.issues,
        status,
        updatedAt: new Date(),
      })
      .where(eq(questions.id, id));
    await tx.delete(questionOptions).where(eq(questionOptions.questionId, id));
    await tx
      .insert(questionOptions)
      .values(c.options.map((o, i) => ({ questionId: id, label: o.id, text: o.text, svg: svgFor(o.id), sortOrder: i })));
  });
  await audit(db, adminId, 'question.edited', 'question', id, {
    before: { questionText: before.questionText, options: before.options.map((o) => o.text), correctOption: before.correctOption },
    after: { questionText: c.question_text, options: c.options.map((o) => o.text), correctOption: c.correct_option },
  });
  return getQuestion(db, id);
}

// ---------------------------------------------------------------------------
// Status workflow
// ---------------------------------------------------------------------------

export type ReviewAction = 'approve' | 'reject' | 'publish' | 'unpublish' | 'archive' | 'restore';

const ALLOWED_FROM: Record<ReviewAction, QuestionStatus[]> = {
  approve: ['draft', 'generated', 'needs_review', 'rejected'],
  reject: ['draft', 'generated', 'validating', 'needs_review', 'approved', 'published'],
  // Publishing requires an explicit approval first — never straight from AI output.
  publish: ['approved'],
  unpublish: ['published'],
  archive: ['draft', 'generated', 'validating', 'needs_review', 'approved', 'rejected', 'published'],
  restore: ['archived'],
};

const TARGET: Record<ReviewAction, QuestionStatus> = {
  approve: 'approved',
  reject: 'rejected',
  publish: 'published',
  unpublish: 'approved',
  archive: 'archived',
  restore: 'needs_review',
};

const AUDIT_ACTION: Record<ReviewAction, string> = {
  approve: 'question.approved',
  reject: 'question.rejected',
  publish: 'question.published',
  unpublish: 'question.unpublished',
  archive: 'question.archived',
  restore: 'question.restored',
};

export async function transition(db: Db, id: string, action: ReviewAction, adminId: string, notes?: string | null) {
  const [q] = await db.select().from(questions).where(eq(questions.id, id)).limit(1);
  if (!q) throw notFound('Question not found');
  if (!ALLOWED_FROM[action].includes(q.status)) {
    throw conflict(`Cannot ${action} a question that is ${q.status.toUpperCase()}.`);
  }
  if (action === 'approve' || action === 'publish') {
    // Re-check the stored issues: blocking errors can never be approved.
    const errors = (q.validationIssues ?? []).filter((i: ValidationIssue) => i.severity === 'error');
    if (errors.length) throw unprocessable('This question has validation errors. Edit it before approving.', errors);
  }
  const now = new Date();
  const status = TARGET[action];
  await db
    .update(questions)
    .set({
      status,
      updatedAt: now,
      ...(action === 'approve' || action === 'reject' ? { reviewedBy: adminId, reviewedAt: now } : {}),
      ...(action === 'publish' ? { publishedAt: now } : {}),
    })
    .where(eq(questions.id, id));
  if (action === 'approve' || action === 'reject') {
    await db.insert(questionReviews).values({
      questionId: id,
      reviewerType: 'human',
      adminId,
      decision: action === 'approve' ? 'approved' : 'rejected',
      valid: action === 'approve',
      notes: notes ?? null,
    });
  }
  await audit(db, adminId, AUDIT_ACTION[action], 'question', id, { from: q.status, to: status, ...(notes ? { notes } : {}) });
  return { id, status };
}

export async function bulkTransition(db: Db, ids: string[], action: ReviewAction, adminId: string, notes?: string | null) {
  const results: { id: string; ok: boolean; status?: QuestionStatus; error?: string }[] = [];
  for (const id of ids) {
    try {
      const r = await transition(db, id, action, adminId, notes);
      results.push({ id, ok: true, status: r.status });
    } catch (e) {
      results.push({ id, ok: false, error: (e as Error).message });
    }
  }
  return { succeeded: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results };
}

export async function deleteQuestion(db: Db, id: string, adminId: string) {
  const [used] = await db.select({ n: count() }).from(mockTestQuestions).where(eq(mockTestQuestions.questionId, id));
  const [answered] = await db.select({ n: count() }).from(testAnswers).where(eq(testAnswers.questionId, id));
  if (Number(used?.n) > 0 || Number(answered?.n) > 0) {
    throw conflict('This question is used in a mock test or has answers. Archive it instead.');
  }
  const rows = await db.delete(questions).where(eq(questions.id, id)).returning({ id: questions.id });
  if (!rows[0]) throw notFound('Question not found');
  await audit(db, adminId, 'question.deleted', 'question', id);
  return { id, deleted: true };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export interface QuestionFilters {
  examId?: string;
  subjectId?: string;
  chapterId?: string;
  topicId?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  language?: string;
  status?: QuestionStatus[];
  source?: QuestionSource;
  jobId?: string;
  duplicatesOnly?: boolean;
  q?: string;
  page?: number;
  pageSize?: number;
  order?: 'newest' | 'oldest';
  /** Column to sort by (a key of SORT_COLUMNS) and direction. */
  sort?: SortKey;
  dir?: 'asc' | 'desc';
  // Bank-column filters. Text columns match exactly, except the free-text
  // ones (externalId prefix, subtopic and concept contain).
  externalId?: string;
  topicLabel?: string;
  subtopic?: string;
  concept?: string;
  cognitiveLevel?: string;
  year?: number;
  variationAllowed?: boolean;
  difficultyLabel?: string;
  answerVerified?: boolean;
  aiVerified?: boolean;
  verificationMethod?: string;
  qaGrade?: string;
  sourceName?: string;
  /** true: only questions used in no mock test; false: only used ones. */
  unused?: boolean;
}

const likeEscape = (v: string) => v.replace(/[%_\\]/g, (m) => `\\${m}`);

/** Mock tests a question is part of (a correlated count, used to filter and sort). */
const usageCountSql = sql<number>`(select count(*)::int from ${mockTestQuestions} where ${mockTestQuestions.questionId} = ${questions.id})`;

/** Every column the console may sort by. Anything else is rejected, so the
 * sort key can never reach the SQL text. */
export const SORT_COLUMNS = {
  created: questions.createdAt,
  updated: questions.updatedAt,
  question: questions.questionText,
  status: questions.status,
  difficulty: questions.difficulty,
  language: questions.language,
  source: questions.source,
  sourceName: questions.sourceName,
  correctOption: questions.correctOption,
  exam: exams.name,
  subject: subjects.name,
  chapter: chapters.name,
  topic: topics.name,
  externalId: questions.externalId,
  topicLabel: questions.topicLabel,
  subtopic: questions.subtopic,
  concept: questions.concept,
  cognitiveLevel: questions.cognitiveLevel,
  year: questions.year,
  variationAllowed: questions.variationAllowed,
  variationRule: questions.variationRule,
  difficultyLabel: questions.difficultyLabel,
  answerVerified: questions.answerVerified,
  aiVerified: questions.aiVerified,
  verificationMethod: questions.verificationMethod,
  qaGrade: questions.qaGrade,
  qaFlags: questions.qaFlags,
  validAsOf: questions.validAsOf,
  reviewedAt: questions.reviewedAt,
  publishedAt: questions.publishedAt,
  duplicateScore: questions.duplicateScore,
  checks: sql`jsonb_array_length(${questions.validationIssues})`,
  usage: usageCountSql,
} as const;
export type SortKey = keyof typeof SORT_COLUMNS;
export const SORT_KEYS = Object.keys(SORT_COLUMNS) as [SortKey, ...SortKey[]];

export async function listQuestions(db: Db, f: QuestionFilters) {
  const page = Math.max(1, f.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, f.pageSize ?? 25));
  const conds: (SQL | undefined)[] = [
    f.examId ? eq(questions.examId, f.examId) : undefined,
    f.subjectId ? eq(questions.subjectId, f.subjectId) : undefined,
    f.chapterId ? eq(questions.chapterId, f.chapterId) : undefined,
    f.topicId ? eq(questions.topicId, f.topicId) : undefined,
    f.difficulty ? eq(questions.difficulty, f.difficulty) : undefined,
    f.language ? eq(questions.language, f.language) : undefined,
    f.status?.length ? inArray(questions.status, f.status) : undefined,
    f.source ? eq(questions.source, f.source) : undefined,
    f.jobId ? eq(questions.generationJobId, f.jobId) : undefined,
    f.duplicatesOnly ? isNotNull(questions.duplicateOfId) : undefined,
    f.q ? ilike(questions.questionText, `%${likeEscape(f.q)}%`) : undefined,
    f.externalId ? ilike(questions.externalId, `${likeEscape(f.externalId)}%`) : undefined,
    f.topicLabel ? eq(questions.topicLabel, f.topicLabel) : undefined,
    f.subtopic ? ilike(questions.subtopic, `%${likeEscape(f.subtopic)}%`) : undefined,
    f.concept ? ilike(questions.concept, `%${likeEscape(f.concept)}%`) : undefined,
    f.cognitiveLevel ? eq(questions.cognitiveLevel, f.cognitiveLevel) : undefined,
    f.year !== undefined ? eq(questions.year, f.year) : undefined,
    f.variationAllowed !== undefined ? eq(questions.variationAllowed, f.variationAllowed) : undefined,
    f.difficultyLabel ? eq(questions.difficultyLabel, f.difficultyLabel) : undefined,
    f.answerVerified !== undefined ? eq(questions.answerVerified, f.answerVerified) : undefined,
    f.aiVerified !== undefined ? eq(questions.aiVerified, f.aiVerified) : undefined,
    f.verificationMethod ? eq(questions.verificationMethod, f.verificationMethod) : undefined,
    f.qaGrade ? eq(questions.qaGrade, f.qaGrade) : undefined,
    f.sourceName ? eq(questions.sourceName, f.sourceName) : undefined,
    f.unused === undefined ? undefined : f.unused ? sql`${usageCountSql} = 0` : sql`${usageCountSql} > 0`,
  ];
  const where = and(...conds);
  const [total] = await db.select({ n: count() }).from(questions).where(where);
  const direction = f.dir === 'asc' ? asc : desc;
  const orderBy = f.sort
    ? [sql`${SORT_COLUMNS[f.sort]} ${f.dir === 'asc' ? sql`asc` : sql`desc`} nulls last`, asc(questions.id)]
    : [f.order === 'oldest' ? asc(questions.createdAt) : direction(questions.createdAt), asc(questions.id)];
  const rows = await db
    .select({
      id: questions.id,
      questionText: questions.questionText,
      status: questions.status,
      difficulty: questions.difficulty,
      language: questions.language,
      source: questions.source,
      correctOption: questions.correctOption,
      duplicateOfId: questions.duplicateOfId,
      duplicateScore: questions.duplicateScore,
      validationIssues: questions.validationIssues,
      createdAt: questions.createdAt,
      updatedAt: questions.updatedAt,
      examName: exams.name,
      subjectName: subjects.name,
      chapterName: chapters.name,
      topicName: topics.name,
      sourceName: questions.sourceName,
      validAsOf: questions.validAsOf,
      reviewedAt: questions.reviewedAt,
      publishedAt: questions.publishedAt,
      externalId: questions.externalId,
      topicLabel: questions.topicLabel,
      subtopic: questions.subtopic,
      concept: questions.concept,
      cognitiveLevel: questions.cognitiveLevel,
      year: questions.year,
      variationAllowed: questions.variationAllowed,
      variationRule: questions.variationRule,
      difficultyLabel: questions.difficultyLabel,
      answerVerified: questions.answerVerified,
      aiVerified: questions.aiVerified,
      verificationMethod: questions.verificationMethod,
      qaGrade: questions.qaGrade,
      qaFlags: questions.qaFlags,
      usageCount: usageCountSql,
    })
    .from(questions)
    .innerJoin(exams, eq(exams.id, questions.examId))
    .innerJoin(subjects, eq(subjects.id, questions.subjectId))
    .innerJoin(chapters, eq(chapters.id, questions.chapterId))
    .leftJoin(topics, eq(topics.id, questions.topicId))
    .where(where)
    .orderBy(...orderBy)
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  return { items: rows, page, pageSize, total: Number(total?.n ?? 0) };
}

const FACET_COLUMNS = {
  topicLabel: questions.topicLabel,
  cognitiveLevel: questions.cognitiveLevel,
  year: questions.year,
  difficultyLabel: questions.difficultyLabel,
  verificationMethod: questions.verificationMethod,
  qaGrade: questions.qaGrade,
  sourceName: questions.sourceName,
} as const;

/** Distinct values and counts of the low-cardinality bank columns. */
export async function questionFacets(db: Db, scope: { examId?: string; subjectId?: string }) {
  const where = and(
    scope.examId ? eq(questions.examId, scope.examId) : undefined,
    scope.subjectId ? eq(questions.subjectId, scope.subjectId) : undefined
  );
  const entries = await Promise.all(
    Object.entries(FACET_COLUMNS).map(async ([key, col]) => {
      const rows = await db
        .select({ value: col, n: count() })
        .from(questions)
        .where(and(where, isNotNull(col)))
        .groupBy(col)
        .orderBy(asc(col));
      return [key, rows.map((r) => ({ value: r.value as string | number, count: Number(r.n) }))] as const;
    })
  );
  return Object.fromEntries(entries) as Record<keyof typeof FACET_COLUMNS, { value: string | number; count: number }[]>;
}

export async function getQuestion(db: Db, id: string) {
  const [row] = await db
    .select({
      q: questions,
      examName: exams.name,
      subjectName: subjects.name,
      chapterName: chapters.name,
      topicName: topics.name,
    })
    .from(questions)
    .innerJoin(exams, eq(exams.id, questions.examId))
    .innerJoin(subjects, eq(subjects.id, questions.subjectId))
    .innerJoin(chapters, eq(chapters.id, questions.chapterId))
    .leftJoin(topics, eq(topics.id, questions.topicId))
    .where(eq(questions.id, id))
    .limit(1);
  if (!row) throw notFound('Question not found');
  const options = await db
    .select({ label: questionOptions.label, text: questionOptions.text, svg: questionOptions.svg })
    .from(questionOptions)
    .where(eq(questionOptions.questionId, id))
    .orderBy(asc(questionOptions.sortOrder));
  const reviews = await db
    .select()
    .from(questionReviews)
    .where(eq(questionReviews.questionId, id))
    .orderBy(desc(questionReviews.createdAt));
  let duplicateOf: { id: string; questionText: string; status: QuestionStatus; options: string[] } | null = null;
  if (row.q.duplicateOfId) {
    const [d] = await db
      .select({ id: questions.id, questionText: questions.questionText, status: questions.status })
      .from(questions)
      .where(eq(questions.id, row.q.duplicateOfId))
      .limit(1);
    if (d) {
      const dOpts = await db
        .select({ text: questionOptions.text })
        .from(questionOptions)
        .where(eq(questionOptions.questionId, d.id))
        .orderBy(asc(questionOptions.sortOrder));
      duplicateOf = { ...d, options: dOpts.map((o) => o.text) };
    }
  }
  const [usage] = await db.select({ n: count() }).from(mockTestQuestions).where(eq(mockTestQuestions.questionId, id));
  const [stats] = await db
    .select({
      attempts: count(),
      correct: sql<number>`count(*) filter (where ${testAnswers.isCorrect} = true)`,
    })
    .from(testAnswers)
    .where(and(eq(testAnswers.questionId, id), isNotNull(testAnswers.selectedOption)));
  const attempts = Number(stats?.attempts ?? 0);
  return {
    ...row.q,
    examName: row.examName,
    subjectName: row.subjectName,
    chapterName: row.chapterName,
    topicName: row.topicName,
    options,
    reviews,
    duplicateOf,
    usedInMockTests: Number(usage?.n ?? 0),
    stats: { attempts, correct: Number(stats?.correct ?? 0), accuracy: attempts ? Number(stats?.correct ?? 0) / attempts : null },
  };
}
