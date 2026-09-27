import { and, asc, count, desc, eq, sql } from 'drizzle-orm';
import type { Db } from '../database/client.js';
import {
  generationBatches,
  generationJobs,
  questionReviews,
  questions,
  sourceMaterials,
  type ValidationIssue,
} from '../database/schema.js';
import { errorMessage, log } from '../lib/logger.js';
import { LANGUAGE_MAP } from '../lib/languages.js';
import { evaluate, insertQuestion, loadDuplicatePool } from '../services/questionService.js';
import { getSettings, type PipelineSettings } from '../services/settingsService.js';
import { monthToDateSpend } from '../services/generationService.js';
import { resolveScope, type ResolvedScope } from '../services/taxonomyService.js';
import type { AppDeps } from '../types.js';
import type { QuestionCandidate, ReviewItem } from './questionSchema.js';
import { InvalidAiOutputError, PermanentAiError, type AiUsage, type SourceContext } from './ai/types.js';
import { balanceAnswerPositions } from './validator.js';

type Batch = typeof generationBatches.$inferSelect;
type Job = typeof generationJobs.$inferSelect;
type Deps = Pick<AppDeps, 'db' | 'env' | 'ai'>;

class PermanentBatchError extends Error {}

const money = (n: number) => n.toFixed(4);

async function addUsage(db: Db, batch: Batch, usage: AiUsage) {
  if (!usage.inputTokens && !usage.outputTokens && !usage.costUsd) return;
  await db
    .update(generationBatches)
    .set({
      inputTokens: sql`${generationBatches.inputTokens} + ${usage.inputTokens}`,
      outputTokens: sql`${generationBatches.outputTokens} + ${usage.outputTokens}`,
      costUsd: sql`${generationBatches.costUsd} + ${money(usage.costUsd)}`,
      updatedAt: new Date(),
    })
    .where(eq(generationBatches.id, batch.id));
  await db
    .update(generationJobs)
    .set({
      inputTokens: sql`${generationJobs.inputTokens} + ${usage.inputTokens}`,
      outputTokens: sql`${generationJobs.outputTokens} + ${usage.outputTokens}`,
      actualCostUsd: sql`${generationJobs.actualCostUsd} + ${money(usage.costUsd)}`,
      updatedAt: new Date(),
    })
    .where(eq(generationJobs.id, batch.jobId));
}

/** Recomputes the job status from its batches. */
export async function refreshJobStatus(db: Db, jobId: string) {
  const [job] = await db.select().from(generationJobs).where(eq(generationJobs.id, jobId)).limit(1);
  if (!job) return;
  const rows = await db
    .select({ status: generationBatches.status, n: count() })
    .from(generationBatches)
    .where(eq(generationBatches.jobId, jobId))
    .groupBy(generationBatches.status);
  const c: Record<string, number> = Object.fromEntries(rows.map((r) => [r.status, Number(r.n)]));
  const total = rows.reduce((s, r) => s + Number(r.n), 0);
  const terminal = (c.completed ?? 0) + (c.failed ?? 0) + (c.cancelled ?? 0);
  const now = new Date();
  if (job.status === 'cancelled') return;
  if (terminal === total) {
    const failed = c.failed ?? 0;
    if (failed > 0) {
      await db
        .update(generationJobs)
        .set({
          status: 'failed',
          failedAt: now,
          errorMessage: `${failed} of ${total} batches failed. Questions from the other batches are kept — use Retry failed batches.`,
          updatedAt: now,
        })
        .where(eq(generationJobs.id, jobId));
      log.warn('generation.failed', { jobId, failedBatches: failed, totalBatches: total });
    } else {
      await db.update(generationJobs).set({ status: 'completed', completedAt: now, updatedAt: now }).where(eq(generationJobs.id, jobId));
      log.info('generation.completed', {
        jobId,
        generated: job.generatedCount,
        approved: job.approvedCount,
        needsReview: job.needsReviewCount,
        rejected: job.rejectedCount,
        costUsd: Number(job.actualCostUsd),
      });
    }
    return;
  }
  const status = (c.generating ?? 0) > 0 || (c.completed ?? 0) + (c.failed ?? 0) > 0 ? 'generating' : (c.validating ?? 0) > 0 ? 'validating' : 'queued';
  if (status !== job.status) {
    await db
      .update(generationJobs)
      .set({ status, startedAt: job.startedAt ?? now, updatedAt: now })
      .where(eq(generationJobs.id, jobId));
  }
}

async function failBatch(db: Db, batch: Batch, message: string, permanent: boolean) {
  const now = new Date();
  const exhausted = permanent || batch.retryCount >= batch.maxRetries;
  if (exhausted) {
    await db
      .update(generationBatches)
      .set({ status: 'failed', errorMessage: message, failedAt: now, lockedAt: null, lockedBy: null, updatedAt: now })
      .where(eq(generationBatches.id, batch.id));
    log.warn('generation.batch_failed', { jobId: batch.jobId, batch: batch.batchIndex, retries: batch.retryCount, message });
  } else {
    // Exponential backoff: 30s, 60s, 120s…
    const delay = 30_000 * 2 ** batch.retryCount;
    await db
      .update(generationBatches)
      .set({
        status: 'queued',
        retryCount: batch.retryCount + 1,
        errorMessage: message,
        nextAttemptAt: new Date(now.getTime() + delay),
        lockedAt: null,
        lockedBy: null,
        updatedAt: now,
      })
      .where(eq(generationBatches.id, batch.id));
    log.warn('generation.batch_retry', { jobId: batch.jobId, batch: batch.batchIndex, attempt: batch.retryCount + 1, inMs: delay, message });
  }
  await refreshJobStatus(db, batch.jobId);
}

async function loadSource(db: Db, job: Job): Promise<SourceContext | null> {
  if (job.sourceMaterialId) {
    const [s] = await db.select().from(sourceMaterials).where(eq(sourceMaterials.id, job.sourceMaterialId)).limit(1);
    if (s && s.approved) {
      return { name: s.name, reference: s.reference, content: s.content, validFrom: s.validFrom, validTo: s.validTo };
    }
    throw new PermanentBatchError('The job’s source material is missing or no longer approved.');
  }
  if (job.sourceReference) return { name: job.sourceReference, reference: job.sourceReference, content: null, validFrom: null, validTo: null };
  return null;
}

/** AI verdict → final status. Warnings from the rule validator (including
 * POSSIBLE DUPLICATE) always leave the question for a human. */
export function decide(
  review: ReviewItem | undefined,
  hadWarnings: boolean,
  correctOption: string,
  settings: Pick<PipelineSettings, 'autoApprove' | 'minReviewConfidence'>,
  explanationRequired: boolean
): 'approved' | 'needs_review' | 'rejected' {
  if (!review) return 'needs_review';
  const confident = review.confidence >= settings.minReviewConfidence;
  const reviewerDisagrees = !!review.reviewer_answer && review.reviewer_answer.trim().toUpperCase() !== correctOption;
  // Clearly incorrect: a confident reviewer found a different answer, or
  // declared the question invalid with concrete issues.
  if (confident && reviewerDisagrees && !review.correct_answer_verified) return 'rejected';
  if (confident && !review.valid && review.issues.length > 0 && !review.correct_answer_verified) return 'rejected';
  const clean =
    review.valid &&
    review.correct_answer_verified &&
    !reviewerDisagrees &&
    (review.explanation_verified || !explanationRequired) &&
    review.difficulty_appropriate &&
    !review.ambiguous &&
    review.duplicate_probability < 0.5 &&
    confident;
  if (clean && !hadWarnings && settings.autoApprove) return 'approved';
  return 'needs_review';
}

/**
 * Runs one claimed batch end to end:
 * generate → schema check (in the provider) → sanitize/balance → rule
 * validation + duplicate check → AI review → status. Never throws: failures
 * are recorded on the batch (with retry/backoff) so the job is never lost.
 */
export async function processBatch(deps: Deps, batch: Batch): Promise<void> {
  const { db, env, ai } = deps;
  const settings = await getSettings(db, env);
  try {
    const [job] = await db.select().from(generationJobs).where(eq(generationJobs.id, batch.jobId)).limit(1);
    if (!job) return;
    if (job.status === 'cancelled') {
      await db.update(generationBatches).set({ status: 'cancelled', lockedAt: null, updatedAt: new Date() }).where(eq(generationBatches.id, batch.id));
      return;
    }
    await refreshJobStatus(db, job.id);

    // A batch that already stored questions (worker died mid-review) is
    // finished instead of regenerated, so nothing is paid for twice.
    const [already] = await db.select({ n: count() }).from(questions).where(eq(questions.generationBatchId, batch.id));
    if (Number(already?.n ?? 0) > 0) {
      await finishInterruptedBatch(db, batch);
      return;
    }

    // Spending guards.
    if (job.maxCostUsd !== null && Number(job.actualCostUsd) >= Number(job.maxCostUsd)) {
      throw new PermanentBatchError(`Job cost limit of $${Number(job.maxCostUsd).toFixed(2)} reached.`);
    }
    if (settings.monthlyBudgetUsd !== null && (await monthToDateSpend(db)) >= settings.monthlyBudgetUsd) {
      throw new PermanentBatchError(`Monthly AI budget of $${settings.monthlyBudgetUsd.toFixed(2)} reached.`);
    }

    const scope = await resolveScope(db, job);
    if (!scope.ok) throw new PermanentBatchError(scope.problem ?? 'Exam/subject/chapter no longer valid.');
    const source = await loadSource(db, job);
    const language = LANGUAGE_MAP.get(job.language);
    if (!language) throw new PermanentBatchError(`Language ${job.language} is not supported.`);

    const recent = await db
      .select({ text: questions.questionText })
      .from(questions)
      .where(and(eq(questions.chapterId, job.chapterId), eq(questions.language, job.language)))
      .orderBy(desc(questions.createdAt))
      .limit(30);

    log.info('generation.batch_started', { jobId: job.id, batch: batch.batchIndex, count: batch.requestedCount, provider: ai.name });
    let generated;
    try {
      generated = await ai.generate(
        {
          exam: scope.exam!.name,
          subject: scope.subject!.name,
          chapter: scope.chapter!.name,
          topic: scope.topic?.name ?? null,
          languageCode: language.code,
          languagePromptName: language.promptName,
          questionType: 'mcq',
          count: batch.requestedCount,
          difficultyMix: batch.difficultyMix,
          explanationRequired: job.explanationRequired,
          additionalInstructions: job.additionalInstructions,
          source,
          avoid: recent.map((r) => r.text.slice(0, 200)),
        },
        { timeoutMs: settings.generationTimeoutMs }
      );
    } catch (e) {
      if (e instanceof InvalidAiOutputError) await addUsage(db, batch, e.usage);
      throw e;
    }
    await addUsage(db, batch, generated.usage);

    await db.update(generationBatches).set({ status: 'validating', updatedAt: new Date() }).where(eq(generationBatches.id, batch.id));
    await refreshJobStatus(db, job.id);
    await validateAndReview(deps, settings, job, batch, scope, source, generated.questions.slice(0, batch.requestedCount));
  } catch (e) {
    const permanent = e instanceof PermanentBatchError || e instanceof PermanentAiError;
    await failBatch(db, batch, errorMessage(e), permanent);
  }
}

async function validateAndReview(
  deps: Deps,
  settings: PipelineSettings,
  job: Job,
  batch: Batch,
  scope: ResolvedScope,
  source: SourceContext | null,
  generatedQuestions: { question_text: string; options: { id: string; text: string }[]; correct_option: string; explanation: string; difficulty: string; computation: string | null }[]
) {
  const { db, ai } = deps;
  const pool = await loadDuplicatePool(db, { examId: job.examId, subjectId: job.subjectId, language: job.language });
  const candidates: QuestionCandidate[] = balanceAnswerPositions(
    generatedQuestions.map((g) => ({
      ...g,
      language: job.language,
      question_type: 'mcq' as const,
      examId: job.examId,
      subjectId: job.subjectId,
      chapterId: job.chapterId,
      topicId: job.topicId,
    }))
  );

  let rejected = 0;
  const toReview: { id: string; index: number; hadWarnings: boolean; candidate: QuestionCandidate }[] = [];
  for (const [index, raw] of candidates.entries()) {
    const ev = evaluate(raw, { explanationRequired: job.explanationRequired, metadataOk: scope.ok, sourceProvided: !!source, pool });
    const status = ev.validation.decision === 'rejected' ? 'rejected' : 'validating';
    const row = await insertQuestion(db, ev, {
      status,
      source: 'ai',
      sourceName: source?.name ?? null,
      sourceReference: source?.reference ?? null,
      sourceMaterialId: job.sourceMaterialId,
      validAsOf: source?.validTo ?? null,
      generationJobId: job.id,
      generationBatchId: batch.id,
    });
    // Later questions in the same batch are checked against this one too.
    pool.push({ id: row.id, normalizedText: ev.normalizedText });
    if (status === 'rejected') rejected++;
    else toReview.push({ id: row.id, index, hadWarnings: ev.validation.decision === 'needs_review', candidate: ev.candidate });
  }
  log.info('validation.completed', { jobId: job.id, batch: batch.batchIndex, checked: candidates.length, rejectedByRules: rejected });

  // Second, independent AI review, in chunks.
  let approved = 0;
  let needsReview = 0;
  for (let i = 0; i < toReview.length; i += settings.reviewBatchSize) {
    const chunk = toReview.slice(i, i + settings.reviewBatchSize);
    let reviews: ReviewItem[] = [];
    let reviewError: string | null = null;
    try {
      const res = await ai.review(
        {
          exam: scope.exam!.name,
          subject: scope.subject!.name,
          chapter: scope.chapter!.name,
          topic: scope.topic?.name ?? null,
          languagePromptName: LANGUAGE_MAP.get(job.language)?.promptName ?? job.language,
          source,
          questions: chunk.map((c, k) => ({
            index: k,
            question_text: c.candidate.question_text,
            options: c.candidate.options,
            correct_option: c.candidate.correct_option,
            explanation: c.candidate.explanation,
            difficulty: c.candidate.difficulty,
          })),
        },
        { timeoutMs: settings.reviewTimeoutMs }
      );
      reviews = res.reviews;
      await addUsage(db, batch, res.usage);
    } catch (e) {
      // Review failures never lose questions: they wait for a human instead.
      reviewError = errorMessage(e);
      if (e instanceof InvalidAiOutputError) await addUsage(db, batch, e.usage);
      log.warn('review.unavailable', { jobId: job.id, batch: batch.batchIndex, message: reviewError });
    }

    for (const [k, item] of chunk.entries()) {
      const review = reviews.find((r) => r.index === k);
      const decision = reviewError ? 'needs_review' : decide(review, item.hadWarnings, item.candidate.correct_option, settings, job.explanationRequired);
      if (decision === 'approved') approved++;
      else if (decision === 'rejected') rejected++;
      else needsReview++;
      const extraIssues: ValidationIssue[] = reviewError
        ? [{ code: 'AI_REVIEW_UNAVAILABLE', severity: 'warning', message: `AI review failed: ${reviewError}` }]
        : !review
          ? [{ code: 'AI_REVIEW_MISSING', severity: 'warning', message: 'The AI reviewer returned no verdict for this question.' }]
          : [];
      await db.transaction(async (tx) => {
        await tx
          .update(questions)
          .set({
            status: decision,
            updatedAt: new Date(),
            ...(extraIssues.length
              ? { validationIssues: sql`${questions.validationIssues} || ${JSON.stringify(extraIssues)}::jsonb` }
              : {}),
          })
          .where(eq(questions.id, item.id));
        if (review) {
          await tx.insert(questionReviews).values({
            questionId: item.id,
            reviewerType: 'ai',
            model: ai.reviewModel,
            decision,
            valid: review.valid,
            correctAnswerVerified: review.correct_answer_verified,
            explanationVerified: review.explanation_verified,
            difficultyAppropriate: review.difficulty_appropriate,
            duplicateProbability: Math.max(0, Math.min(1, review.duplicate_probability)),
            issues: [
              ...review.issues,
              ...(review.reviewer_answer && review.reviewer_answer.toUpperCase() !== item.candidate.correct_option
                ? [`Reviewer's answer: ${review.reviewer_answer.toUpperCase()} (key: ${item.candidate.correct_option})`]
                : []),
              ...(review.ambiguous ? ['Reviewer marked the question ambiguous'] : []),
            ],
            notes: `${review.review_notes} (confidence ${review.confidence.toFixed(2)})`,
          });
        }
      });
    }
  }

  const now = new Date();
  await db
    .update(generationBatches)
    .set({
      status: 'completed',
      generatedCount: candidates.length,
      approvedCount: approved,
      needsReviewCount: needsReview,
      rejectedCount: rejected,
      discardedCount: Math.max(0, batch.requestedCount - candidates.length),
      completedAt: now,
      lockedAt: null,
      lockedBy: null,
      errorMessage: null,
      updatedAt: now,
    })
    .where(eq(generationBatches.id, batch.id));
  await db
    .update(generationJobs)
    .set({
      generatedCount: sql`${generationJobs.generatedCount} + ${candidates.length}`,
      approvedCount: sql`${generationJobs.approvedCount} + ${approved}`,
      needsReviewCount: sql`${generationJobs.needsReviewCount} + ${needsReview}`,
      rejectedCount: sql`${generationJobs.rejectedCount} + ${rejected}`,
      discardedCount: sql`${generationJobs.discardedCount} + ${Math.max(0, batch.requestedCount - candidates.length)}`,
      updatedAt: now,
    })
    .where(eq(generationJobs.id, job.id));
  log.info('generation.batch_completed', { jobId: job.id, batch: batch.batchIndex, generated: candidates.length, approved, needsReview, rejected });
  await refreshJobStatus(db, job.id);
}

/** Questions stuck in VALIDATING from an interrupted run go to a human. */
async function finishInterruptedBatch(db: Db, batch: Batch) {
  const rows = await db
    .select({ id: questions.id, status: questions.status })
    .from(questions)
    .where(eq(questions.generationBatchId, batch.id))
    .orderBy(asc(questions.createdAt));
  const stuck = rows.filter((r) => r.status === 'validating').map((r) => r.id);
  for (const id of stuck) {
    await db
      .update(questions)
      .set({
        status: 'needs_review',
        validationIssues: sql`${questions.validationIssues} || ${JSON.stringify([
          { code: 'AI_REVIEW_INTERRUPTED', severity: 'warning', message: 'Processing was interrupted before the AI review finished.' },
        ])}::jsonb`,
        updatedAt: new Date(),
      })
      .where(eq(questions.id, id));
  }
  const tally = (s: string) => rows.filter((r) => r.status === s).length;
  const needsReview = tally('needs_review') + stuck.length;
  await db
    .update(generationBatches)
    .set({
      status: 'completed',
      generatedCount: rows.length,
      approvedCount: tally('approved'),
      needsReviewCount: needsReview,
      rejectedCount: tally('rejected'),
      completedAt: new Date(),
      lockedAt: null,
      lockedBy: null,
      updatedAt: new Date(),
    })
    .where(eq(generationBatches.id, batch.id));
  await db
    .update(generationJobs)
    .set({
      generatedCount: sql`${generationJobs.generatedCount} + ${rows.length}`,
      approvedCount: sql`${generationJobs.approvedCount} + ${tally('approved')}`,
      needsReviewCount: sql`${generationJobs.needsReviewCount} + ${needsReview}`,
      rejectedCount: sql`${generationJobs.rejectedCount} + ${tally('rejected')}`,
      updatedAt: new Date(),
    })
    .where(eq(generationJobs.id, batch.jobId));
  log.warn('generation.batch_resumed', { jobId: batch.jobId, batch: batch.batchIndex, recovered: rows.length });
  await refreshJobStatus(db, batch.jobId);
}
