import request from 'supertest';
import { eq } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';
import { generationBatches, questions } from '../src/database/schema.js';
import { MockProvider } from '../src/pipeline/ai/mockProvider.js';
import { InvalidAiOutputError, PermanentAiError, type AiProvider, type GenerateParams, type ReviewParams } from '../src/pipeline/ai/types.js';
import { auth, adminToken, scopeIds, setupTestApp } from './helpers.js';

/** Wraps the mock provider and fails on chosen calls. */
class FlakyProvider implements AiProvider {
  readonly name = 'mock' as const;
  readonly generationModel = 'mock';
  readonly reviewModel = 'mock';
  generateCalls = 0;
  reviewCalls = 0;
  private inner = new MockProvider({ faultRate: 0, latencyMs: 0, seed: () => `flaky-${this.generateCalls}` });
  constructor(
    private readonly failGenerate: (call: number, p: GenerateParams) => Error | null,
    private readonly failReview: (call: number) => Error | null = () => null
  ) {}
  async generate(p: GenerateParams, o: { timeoutMs: number }) {
    const call = ++this.generateCalls;
    const err = this.failGenerate(call, p);
    if (err) throw err;
    return this.inner.generate(p, o);
  }
  async review(p: ReviewParams, o: { timeoutMs: number }) {
    const err = this.failReview(++this.reviewCalls);
    if (err) throw err;
    return this.inner.review(p, o);
  }
}

const invalidJson = () =>
  new InvalidAiOutputError('AI output failed schema validation after a correction attempt: invalid JSON', {
    model: 'mock',
    inputTokens: 100,
    outputTokens: 50,
    costUsd: 0.01,
  });

let ctx: Awaited<ReturnType<typeof setupTestApp>> | null = null;
afterEach(async () => {
  await ctx?.close();
  ctx = null;
});

async function startJob(provider: AiProvider, count = 40, extra: Record<string, unknown> = {}) {
  ctx = await setupTestApp({ ai: provider });
  const admin = await adminToken(ctx.app, ctx.db);
  const ids = await scopeIds(ctx.app, admin);
  const res = await request(ctx.app)
    .post('/api/admin/generation-jobs')
    .set(auth(admin))
    .send({
      examId: ids.examId,
      subjectId: ids.mathsId,
      chapterId: ids.percentageId,
      language: 'en',
      questionCount: count,
      difficulty: { easy: 30, medium: 50, hard: 20 },
      ...extra,
    });
  expect(res.status).toBe(201);
  return { admin, ids, jobId: res.body.id as string };
}

describe('generation failures', () => {
  it('retries invalid JSON, then marks only that batch FAILED and keeps the others', async () => {
    // With backoff ignored the worker retries batch 1 straight away, so
    // calls 1–3 are batch 1 (first try + 2 retries) and call 4 is batch 2.
    const provider = new FlakyProvider((call) => (call <= 3 ? invalidJson() : null));
    const { admin, jobId } = await startJob(provider);
    await ctx!.worker.drain({ ignoreBackoff: true });

    const job = (await request(ctx!.app).get(`/api/admin/generation-jobs/${jobId}`).set(auth(admin))).body;
    const [b1, b2] = job.batches;
    expect(b1.status).toBe('failed');
    expect(b1.retryCount).toBe(2); // max retries from settings
    expect(b1.errorMessage).toMatch(/schema validation/);
    expect(b1.failedAt).toBeTruthy();
    expect(b2.status).toBe('completed');
    expect(job.status).toBe('failed');
    expect(job.errorMessage).toMatch(/1 of 2 batches failed/);
    expect(job.generatedCount).toBe(20); // batch 2's questions are kept
    // Failed attempts still count towards cost.
    expect(Number(job.actualCostUsd)).toBeCloseTo(0.03, 5);
  });

  it('[RETRY FAILED JOB] re-runs only the failed batches', async () => {
    let broken = true;
    const provider = new FlakyProvider((call) => (broken && call <= 3 ? invalidJson() : null));
    const { admin, jobId } = await startJob(provider);
    await ctx!.worker.drain({ ignoreBackoff: true });
    let job = (await request(ctx!.app).get(`/api/admin/generation-jobs/${jobId}`).set(auth(admin))).body;
    expect(job.status).toBe('failed');

    broken = false;
    const retry = await request(ctx!.app).post(`/api/admin/generation-jobs/${jobId}/retry`).set(auth(admin));
    expect(retry.status).toBe(200);
    expect(await ctx!.worker.drain({ ignoreBackoff: true })).toBe(1);
    job = (await request(ctx!.app).get(`/api/admin/generation-jobs/${jobId}`).set(auth(admin))).body;
    expect(job.status).toBe('completed');
    expect(job.generatedCount).toBe(40);
  });

  it('does not retry permanent errors (refusal, bad key)', async () => {
    const provider = new FlakyProvider(() => new PermanentAiError('The model declined this request.'));
    const { admin, jobId } = await startJob(provider, 20);
    await ctx!.worker.drain({ ignoreBackoff: true });
    expect(provider.generateCalls).toBe(1);
    const job = (await request(ctx!.app).get(`/api/admin/generation-jobs/${jobId}`).set(auth(admin))).body;
    expect(job.batches[0].status).toBe('failed');
    expect(job.batches[0].retryCount).toBe(0);
  });

  it('backs off before retrying transient errors', async () => {
    const provider = new FlakyProvider((c) => (c === 1 ? new Error('503 overloaded') : null));
    const { jobId } = await startJob(provider, 20);
    expect(await ctx!.worker.drain()).toBe(1); // first attempt fails
    expect(await ctx!.worker.drain()).toBe(0); // not due yet
    const [batch] = await ctx!.db.select().from(generationBatches).where(eq(generationBatches.jobId, jobId));
    expect(batch!.status).toBe('queued');
    expect(batch!.retryCount).toBe(1);
    expect(batch!.nextAttemptAt.getTime()).toBeGreaterThan(Date.now() + 20_000);
    expect(await ctx!.worker.drain({ ignoreBackoff: true })).toBe(1);
    const [done] = await ctx!.db.select().from(generationBatches).where(eq(generationBatches.jobId, jobId));
    expect(done!.status).toBe('completed');
  });

  it('sends questions to human review when the AI reviewer is down — nothing is lost', async () => {
    const provider = new FlakyProvider(() => null, () => new Error('review timeout'));
    const { jobId } = await startJob(provider, 20);
    await ctx!.worker.drain({ ignoreBackoff: true });
    const rows = await ctx!.db.select().from(questions).where(eq(questions.generationJobId, jobId));
    expect(rows).toHaveLength(20);
    expect(rows.every((q) => q.status === 'needs_review')).toBe(true);
    expect(rows[0]!.validationIssues.map((i) => i.code)).toContain('AI_REVIEW_UNAVAILABLE');
  });

  it('stops at the job cost cap', async () => {
    const provider = new FlakyProvider(() => invalidJson());
    const { jobId } = await startJob(provider, 20, { maxCostUsd: 0.015 });
    await ctx!.worker.drain({ ignoreBackoff: true });
    // 0.01 per failed call: the second attempt is refused by the cap.
    expect(provider.generateCalls).toBe(2);
    const [batch] = await ctx!.db.select().from(generationBatches).where(eq(generationBatches.jobId, jobId));
    expect(batch!.status).toBe('failed');
    expect(batch!.errorMessage).toMatch(/cost limit/);
  });

  it('refuses a job that would exceed the monthly budget', async () => {
    ctx = await setupTestApp({ ai: new MockProvider({ faultRate: 0, latencyMs: 0 }) });
    const admin = await adminToken(ctx.app, ctx.db);
    const ids = await scopeIds(ctx.app, admin);
    // Pretend a real provider: the estimate is then non-zero.
    Object.assign(ctx.deps.ai, { name: 'anthropic', generationModel: 'claude-opus-5', reviewModel: 'claude-opus-5' });
    await request(ctx.app).put('/api/admin/settings').set(auth(admin)).send({ monthlyBudgetUsd: 1 });
    const res = await request(ctx.app)
      .post('/api/admin/generation-jobs')
      .set(auth(admin))
      .send({ examId: ids.examId, subjectId: ids.mathsId, chapterId: ids.percentageId, language: 'en', questionCount: 500, difficulty: { easy: 30, medium: 50, hard: 20 } });
    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/monthly AI budget/);
  });
});

describe('duplicates in the pipeline', () => {
  it('flags a regenerated question as POSSIBLE DUPLICATE and never deletes it', async () => {
    // Same seed for both jobs → identical questions the second time.
    const provider = new MockProvider({ faultRate: 0, latencyMs: 0, seed: () => 'same-every-time' });
    ctx = await setupTestApp({ ai: provider });
    const admin = await adminToken(ctx.app, ctx.db);
    const ids = await scopeIds(ctx.app, admin);
    const body = { examId: ids.examId, subjectId: ids.mathsId, chapterId: ids.percentageId, language: 'en', questionCount: 10, difficulty: { easy: 100, medium: 0, hard: 0 } };
    await request(ctx.app).post('/api/admin/generation-jobs').set(auth(admin)).send(body);
    await ctx.worker.drain();
    const second = await request(ctx.app).post('/api/admin/generation-jobs').set(auth(admin)).send(body);
    await ctx.worker.drain();
    const rows = await ctx.db.select().from(questions).where(eq(questions.generationJobId, second.body.id));
    expect(rows).toHaveLength(10);
    expect(rows.every((q) => q.status === 'needs_review' && q.duplicateOfId)).toBe(true);
    const detail = await request(ctx.app).get(`/api/admin/questions/${rows[0]!.id}`).set(auth(admin));
    expect(detail.body.duplicateOf.questionText).toBe(detail.body.questionText);
    expect(detail.body.validationIssues.map((i: { code: string }) => i.code)).toContain('POSSIBLE_DUPLICATE');
  });
});
