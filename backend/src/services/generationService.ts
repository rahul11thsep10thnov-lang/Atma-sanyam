import { and, asc, count, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import type { Db } from '../database/client.js';
import {
  chapters,
  exams,
  generationBatches,
  generationJobs,
  questions,
  sourceMaterials,
  subjects,
  topics,
  type DifficultyDistribution,
} from '../database/schema.js';
import type { Env } from '../config/env.js';
import { audit } from '../lib/audit.js';
import { conflict, notFound, unprocessable } from '../lib/httpError.js';
import { ENABLED_LANGUAGE_CODES } from '../lib/languages.js';
import { estimateJobCost } from '../pipeline/ai/pricing.js';
import type { AiProvider } from '../pipeline/ai/types.js';
import { getSettings } from './settingsService.js';
import { resolveScope } from './taxonomyService.js';

export interface JobInput {
  examId: string;
  subjectId: string;
  chapterId: string;
  topicId?: string | null;
  language: string;
  questionCount: number;
  questionType: 'mcq' | 'multiple_select' | 'true_false' | 'numerical' | 'assertion_reason' | 'matching' | 'passage_based';
  /** Percentages, must add up to 100. */
  difficulty: DifficultyDistribution;
  explanationRequired: boolean;
  sourceReference?: string | null;
  sourceMaterialId?: string | null;
  additionalInstructions?: string | null;
  maxCostUsd?: number | null;
}

/** Exact counts per difficulty from percentages (largest remainder). */
export function splitByPercent(total: number, pct: DifficultyDistribution): DifficultyDistribution {
  const keys = ['easy', 'medium', 'hard'] as const;
  const raw = keys.map((k) => (total * pct[k]) / 100);
  const out = raw.map(Math.floor);
  let remaining = total - out.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac);
  for (const { i } of order) {
    if (remaining-- <= 0) break;
    out[i]!++;
  }
  return { easy: out[0]!, medium: out[1]!, hard: out[2]! };
}

/** Spreads the difficulty counts evenly over batches, so every batch gets a
 * similar mix and the batch totals add up exactly to the requested counts. */
export function planBatches(total: number, batchSize: number, pct: DifficultyDistribution): DifficultyDistribution[] {
  const counts = splitByPercent(total, pct);
  const sequence: { d: keyof DifficultyDistribution; pos: number }[] = [];
  for (const d of ['easy', 'medium', 'hard'] as const) {
    for (let i = 0; i < counts[d]; i++) sequence.push({ d, pos: (i + 0.5) / counts[d] });
  }
  sequence.sort((a, b) => a.pos - b.pos);
  const batches: DifficultyDistribution[] = [];
  for (let i = 0; i < sequence.length; i += batchSize) {
    const mix = { easy: 0, medium: 0, hard: 0 };
    for (const item of sequence.slice(i, i + batchSize)) mix[item.d]++;
    batches.push(mix);
  }
  return batches;
}

export async function monthToDateSpend(db: Db): Promise<number> {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${generationJobs.actualCostUsd}), 0)` })
    .from(generationJobs)
    .where(gte(generationJobs.createdAt, start));
  return Number(row?.total ?? 0);
}

export async function estimate(db: Db, env: Env, ai: AiProvider, questionCount: number) {
  const settings = await getSettings(db, env);
  const estimatedCostUsd = estimateJobCost({
    questions: questionCount,
    batchSize: settings.batchSize,
    generationModel: ai.generationModel,
    reviewModel: ai.reviewModel,
    mock: ai.name === 'mock',
    override: { input: env.AI_PRICE_INPUT_PER_MTOK, output: env.AI_PRICE_OUTPUT_PER_MTOK },
  });
  const spent = await monthToDateSpend(db);
  return {
    provider: ai.name,
    generationModel: ai.generationModel,
    reviewModel: ai.reviewModel,
    batchSize: settings.batchSize,
    batches: Math.ceil(questionCount / settings.batchSize),
    estimatedCostUsd,
    monthToDateSpendUsd: spent,
    monthlyBudgetUsd: settings.monthlyBudgetUsd,
    maxQuestionsPerJob: settings.maxQuestionsPerJob,
  };
}

export async function createJob(db: Db, env: Env, ai: AiProvider, input: JobInput, adminId: string) {
  if (input.questionType !== 'mcq') {
    throw unprocessable(`Question type ${input.questionType.toUpperCase()} is planned but not generated yet. Use MCQ.`);
  }
  if (!ENABLED_LANGUAGE_CODES.includes(input.language)) throw unprocessable(`Language ${input.language} is not enabled.`);
  const pctTotal = input.difficulty.easy + input.difficulty.medium + input.difficulty.hard;
  if (pctTotal !== 100) throw unprocessable(`Difficulty percentages must add up to 100 (they add up to ${pctTotal}).`);
  const scope = await resolveScope(db, input);
  if (!scope.ok) throw unprocessable(scope.problem ?? 'Invalid exam/subject/chapter.');
  if (input.sourceMaterialId) {
    const [src] = await db.select().from(sourceMaterials).where(eq(sourceMaterials.id, input.sourceMaterialId)).limit(1);
    if (!src) throw notFound('Source material not found.');
    if (!src.approved) throw unprocessable('That source material has not been approved for generation yet.');
  }

  const settings = await getSettings(db, env);
  if (input.questionCount > settings.maxQuestionsPerJob) {
    throw unprocessable(`At most ${settings.maxQuestionsPerJob} questions per job (see Settings).`);
  }
  const est = await estimate(db, env, ai, input.questionCount);
  if (settings.monthlyBudgetUsd !== null && est.monthToDateSpendUsd + est.estimatedCostUsd > settings.monthlyBudgetUsd) {
    throw unprocessable(
      `This job (estimated $${est.estimatedCostUsd.toFixed(2)}) would exceed the monthly AI budget of $${settings.monthlyBudgetUsd.toFixed(2)} ($${est.monthToDateSpendUsd.toFixed(2)} spent so far).`
    );
  }

  const plan = planBatches(input.questionCount, settings.batchSize, input.difficulty);
  // Default per-job hard cap: twice the estimate (estimates are rough).
  const maxCost = input.maxCostUsd ?? (est.estimatedCostUsd > 0 ? Math.max(1, est.estimatedCostUsd * 2) : null);

  const job = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(generationJobs)
      .values({
        createdBy: adminId,
        examId: input.examId,
        subjectId: input.subjectId,
        chapterId: input.chapterId,
        topicId: input.topicId ?? null,
        language: input.language,
        questionType: 'mcq',
        requestedCount: input.questionCount,
        batchSize: settings.batchSize,
        difficultyDistribution: input.difficulty,
        explanationRequired: input.explanationRequired,
        sourceReference: input.sourceReference ?? null,
        sourceMaterialId: input.sourceMaterialId ?? null,
        additionalInstructions: input.additionalInstructions ?? null,
        provider: ai.name,
        generationModel: ai.generationModel,
        reviewModel: ai.reviewModel,
        maxCostUsd: maxCost === null ? null : maxCost.toFixed(4),
        estimatedCostUsd: est.estimatedCostUsd.toFixed(4),
      })
      .returning();
    await tx.insert(generationBatches).values(
      plan.map((mix, i) => ({
        jobId: row!.id,
        batchIndex: i + 1,
        requestedCount: mix.easy + mix.medium + mix.hard,
        difficultyMix: mix,
        maxRetries: settings.maxRetries,
      }))
    );
    return row!;
  });

  await audit(db, adminId, 'generation.job_created', 'generation_job', job.id, {
    requested: input.questionCount,
    batches: plan.length,
    provider: ai.name,
    estimatedCostUsd: est.estimatedCostUsd,
  });
  return getJob(db, job.id);
}

function progressOf(job: typeof generationJobs.$inferSelect, batchCounts: Record<string, number>) {
  const totalBatches = Object.values(batchCounts).reduce((a, b) => a + b, 0);
  const doneBatches = (batchCounts.completed ?? 0) + (batchCounts.failed ?? 0) + (batchCounts.cancelled ?? 0);
  return {
    generated: job.generatedCount,
    requested: job.requestedCount,
    percent: job.requestedCount ? Math.min(100, Math.round((job.generatedCount / job.requestedCount) * 100)) : 0,
    batches: { total: totalBatches, done: doneBatches, ...batchCounts },
  };
}

export async function listJobs(db: Db, opts: { page?: number; pageSize?: number; status?: string }) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 20));
  const where = opts.status ? eq(generationJobs.status, opts.status as 'queued') : undefined;
  const [total] = await db.select({ n: count() }).from(generationJobs).where(where);
  const rows = await db
    .select({ job: generationJobs, examName: exams.name, subjectName: subjects.name, chapterName: chapters.name, topicName: topics.name })
    .from(generationJobs)
    .innerJoin(exams, eq(exams.id, generationJobs.examId))
    .innerJoin(subjects, eq(subjects.id, generationJobs.subjectId))
    .innerJoin(chapters, eq(chapters.id, generationJobs.chapterId))
    .leftJoin(topics, eq(topics.id, generationJobs.topicId))
    .where(where)
    .orderBy(desc(generationJobs.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  const ids = rows.map((r) => r.job.id);
  const batchRows = ids.length
    ? await db
        .select({ jobId: generationBatches.jobId, status: generationBatches.status, n: count() })
        .from(generationBatches)
        .where(inArray(generationBatches.jobId, ids))
        .groupBy(generationBatches.jobId, generationBatches.status)
    : [];
  return {
    page,
    pageSize,
    total: Number(total?.n ?? 0),
    items: rows.map((r) => {
      const counts = Object.fromEntries(batchRows.filter((b) => b.jobId === r.job.id).map((b) => [b.status, Number(b.n)]));
      return {
        ...r.job,
        examName: r.examName,
        subjectName: r.subjectName,
        chapterName: r.chapterName,
        topicName: r.topicName,
        progress: progressOf(r.job, counts),
      };
    }),
  };
}

export async function getJob(db: Db, id: string) {
  const [r] = await db
    .select({ job: generationJobs, examName: exams.name, subjectName: subjects.name, chapterName: chapters.name, topicName: topics.name })
    .from(generationJobs)
    .innerJoin(exams, eq(exams.id, generationJobs.examId))
    .innerJoin(subjects, eq(subjects.id, generationJobs.subjectId))
    .innerJoin(chapters, eq(chapters.id, generationJobs.chapterId))
    .leftJoin(topics, eq(topics.id, generationJobs.topicId))
    .where(eq(generationJobs.id, id))
    .limit(1);
  if (!r) throw notFound('Generation job not found');
  const batches = await db
    .select()
    .from(generationBatches)
    .where(eq(generationBatches.jobId, id))
    .orderBy(asc(generationBatches.batchIndex));
  const counts: Record<string, number> = {};
  for (const b of batches) counts[b.status] = (counts[b.status] ?? 0) + 1;
  // Where the job's questions are *now* (humans may have acted since).
  const current = await db
    .select({ status: questions.status, n: count() })
    .from(questions)
    .where(eq(questions.generationJobId, id))
    .groupBy(questions.status);
  return {
    ...r.job,
    examName: r.examName,
    subjectName: r.subjectName,
    chapterName: r.chapterName,
    topicName: r.topicName,
    progress: progressOf(r.job, counts),
    currentStatusCounts: Object.fromEntries(current.map((c) => [c.status, Number(c.n)])),
    batches,
  };
}

/** [RETRY FAILED JOB]: re-queues only the failed batches; successful batches
 * and their questions are untouched. */
export async function retryFailed(db: Db, id: string, adminId: string) {
  const [job] = await db.select().from(generationJobs).where(eq(generationJobs.id, id)).limit(1);
  if (!job) throw notFound('Generation job not found');
  if (job.status === 'cancelled') throw conflict('This job was cancelled.');
  const failed = await db
    .update(generationBatches)
    .set({ status: 'queued', retryCount: 0, errorMessage: null, failedAt: null, nextAttemptAt: new Date(), lockedAt: null, lockedBy: null, updatedAt: new Date() })
    .where(and(eq(generationBatches.jobId, id), eq(generationBatches.status, 'failed')))
    .returning({ id: generationBatches.id });
  if (failed.length === 0) throw conflict('This job has no failed batches.');
  await db
    .update(generationJobs)
    .set({ status: 'generating', errorMessage: null, failedAt: null, completedAt: null, updatedAt: new Date() })
    .where(eq(generationJobs.id, id));
  await audit(db, adminId, 'generation.job_retried', 'generation_job', id, { batches: failed.length });
  return getJob(db, id);
}

export async function cancelJob(db: Db, id: string, adminId: string) {
  const [job] = await db.select().from(generationJobs).where(eq(generationJobs.id, id)).limit(1);
  if (!job) throw notFound('Generation job not found');
  if (job.status === 'completed' || job.status === 'cancelled') throw conflict(`The job is already ${job.status}.`);
  const cancelled = await db
    .update(generationBatches)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(and(eq(generationBatches.jobId, id), inArray(generationBatches.status, ['queued', 'failed'])))
    .returning({ id: generationBatches.id });
  // Batches already running finish normally; their questions are kept.
  await db
    .update(generationJobs)
    .set({ status: 'cancelled', updatedAt: new Date(), completedAt: new Date() })
    .where(eq(generationJobs.id, id));
  await audit(db, adminId, 'generation.job_cancelled', 'generation_job', id, { batches: cancelled.length });
  return getJob(db, id);
}
