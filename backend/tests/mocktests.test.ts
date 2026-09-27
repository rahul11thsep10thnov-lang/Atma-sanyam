import request from 'supertest';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { questions } from '../src/database/schema.js';
import { auth, adminToken, scopeIds, setupTestApp, userToken } from './helpers.js';

type Ctx = Awaited<ReturnType<typeof setupTestApp>>;

/** Generate with the mock AI and publish everything that passed. */
async function publishedBank(ctx: Ctx, admin: string, subjectId: string, chapterId: string, count: number, language = 'en') {
  const ids = await scopeIds(ctx.app, admin);
  const res = await request(ctx.app)
    .post('/api/admin/generation-jobs')
    .set(auth(admin))
    .send({ examId: ids.examId, subjectId, chapterId, language, questionCount: count, difficulty: { easy: 30, medium: 50, hard: 20 } });
  expect(res.status).toBe(201);
  await ctx.worker.drain({ ignoreBackoff: true });
  await ctx.db
    .update(questions)
    .set({ status: 'published', publishedAt: new Date() })
    .where(and(eq(questions.generationJobId, res.body.id), inArray(questions.status, ['approved', 'needs_review'])));
}

describe('mock test generator', () => {
  let ctx: Ctx;
  let admin: string;
  let ids: Awaited<ReturnType<typeof scopeIds>>;

  beforeAll(async () => {
    ctx = await setupTestApp();
    admin = await adminToken(ctx.app, ctx.db);
    ids = await scopeIds(ctx.app, admin);
    await publishedBank(ctx, admin, ids.mathsId, ids.percentageId, 40);
    await publishedBank(ctx, admin, ids.reasoningId, ids.seriesId, 40);
  });
  afterAll(async () => ctx.close());

  const spec = (over: Record<string, unknown> = {}) => ({
    examId: ids.examId,
    title: 'Mock',
    language: 'en',
    totalQuestions: 20,
    durationMinutes: 24,
    marksPerQuestion: 1,
    negativeMarks: 0.25,
    difficulty: { easy: 30, medium: 50, hard: 20 },
    sections: [
      { subjectId: ids.mathsId, count: 10 },
      { subjectId: ids.reasoningId, count: 10 },
    ],
    ...over,
  });

  it('follows the subject and difficulty distribution without repeats', async () => {
    const res = await request(ctx.app).post('/api/admin/mock-tests/generate').set(auth(admin)).send(spec());
    expect(res.status).toBe(201);
    const qs = res.body.test.questions as { id: string; subjectId: string; difficulty: string; status: string }[];
    expect(qs).toHaveLength(20);
    expect(new Set(qs.map((q) => q.id)).size).toBe(20);
    expect(qs.filter((q) => q.subjectId === ids.mathsId)).toHaveLength(10);
    expect(qs.every((q) => q.status === 'published')).toBe(true);
    const count = (d: string) => qs.filter((q) => q.difficulty === d).length;
    expect([count('easy'), count('medium'), count('hard')]).toEqual([6, 10, 4]);
    // Sections keep their order: maths first, then reasoning.
    expect(qs.slice(0, 10).every((q) => q.subjectId === ids.mathsId)).toBe(true);
  });

  it('uses only PUBLISHED questions', async () => {
    const res = await request(ctx.app).post('/api/admin/mock-tests/generate').set(auth(admin)).send(spec({ language: 'hi' }));
    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/Not enough published questions/);
  });

  it('explains exactly what is missing when the bank is too small', async () => {
    const res = await request(ctx.app)
      .post('/api/admin/mock-tests/generate')
      .set(auth(admin))
      .send(spec({ totalQuestions: 60, sections: [{ subjectId: ids.mathsId, count: 50 }, { subjectId: ids.reasoningId, count: 10 }] }));
    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/Numerical Ability: needs 50, 40 usable of 40 published/);
  });

  it('rejects inconsistent specs', async () => {
    const res = await request(ctx.app).post('/api/admin/mock-tests/generate').set(auth(admin)).send(spec({ totalQuestions: 25 }));
    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/add up to 20/);
  });

  it('creates a series from a blueprint while minimizing repetition', async () => {
    const bp = await request(ctx.app)
      .post('/api/admin/blueprints')
      .set(auth(admin))
      .send({
        examId: ids.examId,
        name: 'UP Constable Mini',
        language: 'en',
        totalQuestions: 20,
        durationMinutes: 20,
        marksPerQuestion: 2,
        negativeMarks: 0.5,
        difficulty: { easy: 30, medium: 50, hard: 20 },
        sections: [
          { subjectId: ids.mathsId, count: 10 },
          { subjectId: ids.reasoningId, count: 10 },
        ],
      });
    expect(bp.status).toBe(201);
    const gen = await request(ctx.app).post(`/api/admin/blueprints/${bp.body.id}/generate`).set(auth(admin)).send({ count: 2, publish: true });
    expect(gen.status).toBe(201);
    expect(gen.body.created.map((c: { title: string }) => c.title)).toEqual(['UP Constable Mini — Mock Test 1', 'UP Constable Mini — Mock Test 2']);
    const [a, b] = await Promise.all(
      gen.body.created.map((c: { id: string }) => request(ctx.app).get(`/api/admin/mock-tests/${c.id}`).set(auth(admin)))
    );
    const setA = new Set(a!.body.questions.map((q: { id: string }) => q.id));
    const overlap = b!.body.questions.filter((q: { id: string }) => setA.has(q.id)).length;
    // 80 published questions minus the 20 used by the first test in this file:
    // tests 2 and 3 can be fully disjoint.
    expect(overlap).toBe(0);
    expect(b!.body.status).toBe('published');

    const list = await request(ctx.app).get('/api/admin/blueprints').set(auth(admin));
    expect(list.body.items[0].testsCreated).toBe(2);
  });

  it('refuses to publish a test whose questions were unpublished', async () => {
    const res = await request(ctx.app).post('/api/admin/mock-tests/generate').set(auth(admin)).send(spec());
    const first = res.body.test.questions[0].id;
    await request(ctx.app).post(`/api/admin/questions/${first}/unpublish`).set(auth(admin));
    const pub = await request(ctx.app).post(`/api/admin/mock-tests/${res.body.test.id}/publish`).set(auth(admin));
    expect(pub.status).toBe(422);
  });
});

describe('attempts & scoring', () => {
  let ctx: Ctx;
  let admin: string;
  let testId: string;
  let key: { id: string; correctOption: string }[];

  beforeAll(async () => {
    ctx = await setupTestApp();
    admin = await adminToken(ctx.app, ctx.db);
    const ids = await scopeIds(ctx.app, admin);
    await publishedBank(ctx, admin, ids.mathsId, ids.percentageId, 20);
    const res = await request(ctx.app)
      .post('/api/admin/mock-tests/generate')
      .set(auth(admin))
      .send({
        examId: ids.examId,
        title: 'Scoring test',
        language: 'en',
        totalQuestions: 8,
        durationMinutes: 10,
        marksPerQuestion: 4,
        negativeMarks: 1,
        difficulty: { easy: 50, medium: 50, hard: 0 },
      });
    testId = res.body.test.id;
    key = res.body.test.questions;
    await request(ctx.app).post(`/api/admin/mock-tests/${testId}/publish`).set(auth(admin));
  });
  afterAll(async () => ctx.close());

  const wrong = (c: string) => 'ABCD'.replace(c, '')[0]!;

  it('applies marks and negative marking', async () => {
    const user = await userToken(ctx.app);
    const start = await request(ctx.app).post(`/api/mock-tests/${testId}/start`).set(auth(user));
    const answers = key.map((q, i) => ({ questionId: q.id, selectedOption: i < 5 ? q.correctOption : i < 7 ? wrong(q.correctOption) : null }));
    const res = await request(ctx.app).post(`/api/mock-tests/${testId}/submit`).set(auth(user)).send({ attemptId: start.body.attemptId, answers });
    expect(res.body.summary).toMatchObject({ correct: 5, incorrect: 2, unanswered: 1, attempted: 7, score: 18, maxScore: 32, percentage: 56.25 });
    expect(res.body.timeTakenSeconds).toBeGreaterThanOrEqual(0);
  });

  it('can score negative totals', async () => {
    const user = await userToken(ctx.app);
    const start = await request(ctx.app).post(`/api/mock-tests/${testId}/start`).set(auth(user));
    const answers = key.map((q) => ({ questionId: q.id, selectedOption: wrong(q.correctOption) }));
    const res = await request(ctx.app).post(`/api/mock-tests/${testId}/submit`).set(auth(user)).send({ attemptId: start.body.attemptId, answers });
    expect(res.body.summary.score).toBe(-8);
  });

  it('resumes an open attempt instead of starting a new one', async () => {
    const user = await userToken(ctx.app);
    const a = await request(ctx.app).post(`/api/mock-tests/${testId}/start`).set(auth(user));
    const b = await request(ctx.app).post(`/api/mock-tests/${testId}/start`).set(auth(user));
    expect(b.body.attemptId).toBe(a.body.attemptId);
    expect(b.body.resumed).toBe(true);
  });

  it('is idempotent and rejects questions that were not served', async () => {
    const user = await userToken(ctx.app);
    const start = await request(ctx.app).post(`/api/mock-tests/${testId}/start`).set(auth(user));
    const bad = await request(ctx.app)
      .post(`/api/mock-tests/${testId}/submit`)
      .set(auth(user))
      .send({ attemptId: start.body.attemptId, answers: [{ questionId: testId, selectedOption: 'A' }] });
    expect(bad.status).toBe(400);
    const answers = key.map((q) => ({ questionId: q.id, selectedOption: q.correctOption }));
    const first = await request(ctx.app).post(`/api/mock-tests/${testId}/submit`).set(auth(user)).send({ attemptId: start.body.attemptId, answers });
    const again = await request(ctx.app).post(`/api/mock-tests/${testId}/submit`).set(auth(user)).send({ attemptId: start.body.attemptId, answers: [] });
    expect(first.body.summary.score).toBe(32);
    expect(again.body.summary).toEqual(first.body.summary);
    const history = await request(ctx.app).get('/api/attempts').set(auth(user));
    expect(history.body.items).toHaveLength(1);
  });

  it('closes an expired attempt when a new one starts, so it cannot be submitted later', async () => {
    const user = await userToken(ctx.app);
    const first = await request(ctx.app).post(`/api/mock-tests/${testId}/start`).set(auth(user));
    // Pretend the deadline (plus grace) passed without a submission.
    await ctx.db.execute(sql`update test_attempts set deadline_at = now() - interval '1 hour' where id = ${first.body.attemptId}`);
    const second = await request(ctx.app).post(`/api/mock-tests/${testId}/start`).set(auth(user));
    expect(second.body.attemptId).not.toBe(first.body.attemptId);
    const answers = key.map((q) => ({ questionId: q.id, selectedOption: q.correctOption }));
    const late = await request(ctx.app).post(`/api/mock-tests/${testId}/submit`).set(auth(user)).send({ attemptId: first.body.attemptId, answers });
    // The stored result stands: nothing was answered in time.
    expect(late.body.summary.correct).toBe(0);
    expect(late.body.summary.unanswered).toBe(8);
  });

  it('won’t let one user submit another user’s attempt', async () => {
    const owner = await userToken(ctx.app);
    const thief = await userToken(ctx.app);
    const start = await request(ctx.app).post(`/api/mock-tests/${testId}/start`).set(auth(owner));
    const res = await request(ctx.app).post(`/api/mock-tests/${testId}/submit`).set(auth(thief)).send({ attemptId: start.body.attemptId, answers: [] });
    expect(res.status).toBe(404);
  });

  it('reports question accuracy and unusually hard questions', async () => {
    const a = await request(ctx.app).get('/api/admin/analytics?minAttempts=2').set(auth(admin));
    expect(a.body.testsAttempted).toBe(4);
    const q = a.body.mostDifficultQuestions[0];
    expect(q.accuracy).toBeGreaterThanOrEqual(0);
    expect(q.accuracy).toBeLessThanOrEqual(1);
    expect(q.correct / q.attempts).toBeCloseTo(q.accuracy, 5);
  });
});

describe('CSV / JSON import', () => {
  let ctx: Ctx;
  let admin: string;
  beforeAll(async () => {
    ctx = await setupTestApp();
    admin = await adminToken(ctx.app, ctx.db);
  });
  afterAll(async () => ctx.close());

  const csv = [
    'exam,subject,chapter,topic,question,option_a,option_b,option_c,option_d,correct_option,explanation,difficulty,language',
    'up-police-constable,numerical-ability,Percentage,,What is 25% of 80?,10,20,30,40,B,"25% of 80 = 80 × 25/100 = 20.",easy,English',
    'UP Police Constable,Numerical Ability,percentage,,"What is 50% of 90, exactly?",40,45,50,55,B,50% of 90 = 90 × 50/100 = 45.,easy,en',
    'up-police-constable,numerical-ability,Percentage,,What is 10% of 70?,7,7,8,9,A,10% of 70 = 7.,easy,en',
    'up-police-constable,unknown-subject,Percentage,,What is 10% of 70?,7,6,8,9,A,10% of 70 = 7.,easy,en',
  ].join('\n');

  it('previews with a dry run without saving', async () => {
    const res = await request(ctx.app).post('/api/admin/imports').set(auth(admin)).send({ format: 'csv', content: csv, dryRun: true });
    expect(res.body).toMatchObject({ dryRun: true, total: 4, imported: 2, failed: 2 });
    const list = await request(ctx.app).get('/api/admin/questions').set(auth(admin));
    expect(list.body.total).toBe(0);
  });

  it('imports valid rows into NEEDS_REVIEW and reports the rest', async () => {
    const res = await request(ctx.app).post('/api/admin/imports').set(auth(admin)).send({ format: 'csv', content: csv });
    expect(res.body.imported).toBe(2);
    const failures = res.body.rows.filter((r: { ok: boolean }) => !r.ok);
    expect(failures.map((f: { row: number }) => f.row)).toEqual([4, 5]);
    expect(failures[0].issues.map((i: { code: string }) => i.code)).toContain('DUPLICATE_OPTIONS');
    expect(failures[1].issues[0].code).toBe('METADATA_MISSING');
    const list = await request(ctx.app).get('/api/admin/questions?status=needs_review').set(auth(admin));
    expect(list.body.total).toBe(2);
    expect(list.body.items.every((q: { source: string }) => q.source === 'import')).toBe(true);
  });

  it('accepts JSON with an options array', async () => {
    const json = JSON.stringify([
      { exam: 'up-police-constable', subject: 'numerical-ability', chapter: 'profit-loss', question: 'An item bought for ₹200 is sold for ₹250. What is the profit?', options: ['₹25', '₹50', '₹75', '₹100'], correct_option: 'B', explanation: 'Profit = 250 − 200 = 50.', difficulty: 'easy', language: 'en' },
    ]);
    const res = await request(ctx.app).post('/api/admin/imports').set(auth(admin)).send({ format: 'json', content: json });
    expect(res.body.imported).toBe(1);
  });
});
