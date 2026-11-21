import request from 'supertest';
import { and, eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { questions, testAnswers, testAttempts } from '../src/database/schema.js';
import { finalizeExpiredAttempts } from '../src/services/attemptService.js';
import { auth, adminToken, scopeIds, setupTestApp, userToken } from './helpers.js';

type Ctx = Awaited<ReturnType<typeof setupTestApp>>;

// Stage 1–2: atomic starts, one finalisation, autosave with versions, expiry.
describe('exam attempts: concurrency, submission integrity and recovery', () => {
  let ctx: Ctx;
  let admin: string;
  let ids: Awaited<ReturnType<typeof scopeIds>>;
  const tests: string[] = [];

  async function publishTest(n: number, durationMinutes = 10) {
    const res = await request(ctx.app)
      .post('/api/admin/mock-tests/generate')
      .set(auth(admin))
      .send({
        examId: ids.examId,
        title: `Integrity ${n}`,
        language: 'en',
        totalQuestions: 4,
        durationMinutes,
        marksPerQuestion: 2,
        negativeMarks: 0.5,
        difficulty: { easy: 30, medium: 50, hard: 20 },
        sections: [{ subjectId: ids.mathsId, count: 2 }, { subjectId: ids.reasoningId, count: 2 }],
      });
    expect(res.status).toBe(201);
    expect((await request(ctx.app).post(`/api/admin/mock-tests/${res.body.test.id}/publish`).set(auth(admin))).status).toBe(200);
    return res.body.test.id as string;
  }

  async function bank(subjectId: string, chapterId: string) {
    const res = await request(ctx.app)
      .post('/api/admin/generation-jobs')
      .set(auth(admin))
      .send({ examId: ids.examId, subjectId, chapterId, language: 'en', questionCount: 20, difficulty: { easy: 30, medium: 50, hard: 20 } });
    expect(res.status).toBe(201);
    await ctx.worker.drain({ ignoreBackoff: true });
    await ctx.db
      .update(questions)
      .set({ status: 'published', publishedAt: new Date() })
      .where(and(eq(questions.generationJobId, res.body.id), inArray(questions.status, ['approved', 'needs_review'])));
  }

  /** The attempt's questions with their right and a wrong option. */
  async function keyOf(attemptId: string) {
    const rows = await ctx.db
      .select({ questionId: testAnswers.questionId, key: questions.correctOption })
      .from(testAnswers)
      .innerJoin(questions, eq(questions.id, testAnswers.questionId))
      .where(eq(testAnswers.attemptId, attemptId));
    return rows.map((r) => ({ questionId: r.questionId, right: r.key, wrong: r.key === 'A' ? 'B' : 'A' }));
  }

  beforeAll(async () => {
    ctx = await setupTestApp({ env: { ATTEMPT_GRACE_SECONDS: '60' } });
    admin = await adminToken(ctx.app, ctx.db);
    ids = await scopeIds(ctx.app, admin);
    // Every "candidate" here comes from one test machine (same IP and
    // browser), which the guest free-quota protection would rightly treat as
    // one network. That protection has its own tests (access-policy.test.ts).
    expect((await request(ctx.app).put('/api/admin/access-policy').set(auth(admin)).send({ enabled: false })).status).toBe(200);
    await bank(ids.mathsId, ids.percentageId);
    await bank(ids.reasoningId, ids.seriesId);
    for (let i = 1; i <= 6; i++) tests.push(await publishTest(i));
  });
  afterAll(async () => ctx.close());

  const start = (user: string, id: string) => request(ctx.app).post(`/api/mock-tests/${id}/start`).set(auth(user));

  it('ten simultaneous starts create exactly one attempt', async () => {
    const user = await userToken(ctx.app, 'Racer');
    const results = await Promise.all(Array.from({ length: 10 }, () => start(user, tests[0]!)));
    expect(results.every((r) => r.status === 201)).toBe(true);
    const idsSeen = new Set(results.map((r) => r.body.attemptId));
    expect(idsSeen.size).toBe(1);
    const [row] = await ctx.db.select({ userId: testAttempts.userId }).from(testAttempts).where(eq(testAttempts.id, [...idsSeen][0]!));
    const open = await ctx.db
      .select()
      .from(testAttempts)
      .where(and(eq(testAttempts.userId, row!.userId), eq(testAttempts.mockTestId, tests[0]!), eq(testAttempts.status, 'in_progress')));
    expect(open).toHaveLength(1);
  });

  it('the database itself refuses a second open attempt for the same test', async () => {
    const user = await userToken(ctx.app, 'Direct');
    const first = await start(user, tests[1]!);
    const [a] = await ctx.db.select().from(testAttempts).where(eq(testAttempts.id, first.body.attemptId));
    await expect(
      ctx.db.insert(testAttempts).values({ userId: a!.userId, mockTestId: a!.mockTestId, deadlineAt: a!.deadlineAt, totalQuestions: 4 })
    ).rejects.toThrow();
  });

  it('parallel starts of different tests cannot exceed the free quota', async () => {
    const user = await userToken(ctx.app, 'QuotaRacer');
    // Free quota: 2 full tests. Three different full tests at once → two allowed, one 402.
    const res = await Promise.all([start(user, tests[2]!), start(user, tests[3]!), start(user, tests[4]!)]);
    expect(res.map((r) => r.status).sort()).toEqual([201, 201, 402]);
  });

  it('concurrent submissions are scored once and all return the same stored result', async () => {
    const user = await userToken(ctx.app, 'DoubleSubmit');
    const s = await start(user, tests[1]!);
    const key = await keyOf(s.body.attemptId);
    const allRight = key.map((k) => ({ questionId: k.questionId, selectedOption: k.right }));
    const allWrong = key.map((k) => ({ questionId: k.questionId, selectedOption: k.wrong }));
    const send = (answers: typeof allRight) =>
      request(ctx.app).post(`/api/mock-tests/${tests[1]}/submit`).set(auth(user)).send({ attemptId: s.body.attemptId, answers });
    const results = await Promise.all([send(allRight), send(allWrong), send(allRight), send(allWrong), send(allRight)]);
    expect(results.every((r) => r.status === 200)).toBe(true);
    const scores = new Set(results.map((r) => r.body.summary.score));
    expect(scores.size).toBe(1);
    // Whichever submission won, the stored answers match the stored score.
    const score = results[0]!.body.summary.score;
    expect([8, -2]).toContain(score);
    const again = await send(score === 8 ? allWrong : allRight);
    expect(again.body.summary.score).toBe(score);
  });

  it('autosave keeps the newest version, and submit uses the saved answers', async () => {
    const user = await userToken(ctx.app, 'Saver');
    const s = await start(user, tests[5]!);
    const key = await keyOf(s.body.attemptId);
    const q0 = key[0]!;
    const save = (answers: object[]) => request(ctx.app).put(`/api/attempts/${s.body.attemptId}/answers`).set(auth(user)).send({ answers });

    const v2 = await save([{ questionId: q0.questionId, selectedOption: q0.right, version: 2 }]);
    expect(v2.status).toBe(200);
    expect(v2.body.saved).toEqual([{ questionId: q0.questionId, version: 2 }]);
    // A delayed older request arrives later: ignored.
    const v1 = await save([{ questionId: q0.questionId, selectedOption: q0.wrong, version: 1 }]);
    expect(v1.body.stale).toEqual([q0.questionId]);

    const state = await request(ctx.app).get(`/api/attempts/${s.body.attemptId}/state`).set(auth(user));
    expect(state.status).toBe(200);
    expect(state.body.status).toBe('in_progress');
    expect(state.body.answers.find((a: { questionId: string }) => a.questionId === q0.questionId)).toMatchObject({ selectedOption: q0.right, version: 2 });
    expect(Date.parse(state.body.deadlineAt)).toBeGreaterThan(Date.parse(state.body.serverTime));

    // Submit with an older copy of that answer (version 1) and nothing else:
    // the newer saved answer wins; the rest stay unanswered.
    const sub = await request(ctx.app)
      .post(`/api/mock-tests/${tests[5]}/submit`)
      .set(auth(user))
      .send({ attemptId: s.body.attemptId, answers: [{ questionId: q0.questionId, selectedOption: q0.wrong, version: 1 }] });
    expect(sub.status).toBe(200);
    expect(sub.body.status).toBe('submitted');
    expect(sub.body.summary).toMatchObject({ correct: 1, incorrect: 0, unanswered: 3, score: 2 });

    // Saving after submission is refused.
    const late = await save([{ questionId: q0.questionId, selectedOption: q0.wrong, version: 3 }]);
    expect(late.status).toBe(409);
    expect(late.body.error.code).toBe('attempt_closed');
  });

  it('a submission after deadline + grace counts only the answers saved in time', async () => {
    const user = await userToken(ctx.app, 'Late');
    const s = await start(user, tests[0]!);
    const key = await keyOf(s.body.attemptId);
    await request(ctx.app)
      .put(`/api/attempts/${s.body.attemptId}/answers`)
      .set(auth(user))
      .send({ answers: [{ questionId: key[0]!.questionId, selectedOption: key[0]!.right, version: 1 }] });
    // Time runs out (deadline moved 5 minutes into the past; grace is 60 s).
    await ctx.db.update(testAttempts).set({ deadlineAt: new Date(Date.now() - 5 * 60_000) }).where(eq(testAttempts.id, s.body.attemptId));
    const res = await request(ctx.app)
      .post(`/api/mock-tests/${tests[0]}/submit`)
      .set(auth(user))
      .send({ attemptId: s.body.attemptId, answers: key.map((k) => ({ questionId: k.questionId, selectedOption: k.right })) });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('auto_submitted');
    expect(res.body.summary).toMatchObject({ correct: 1, unanswered: 3 });
  });

  it('saving after the deadline closes the attempt from what was saved', async () => {
    const user = await userToken(ctx.app, 'SaveLate');
    const s = await start(user, tests[1]!);
    await ctx.db.update(testAttempts).set({ deadlineAt: new Date(Date.now() - 5 * 60_000) }).where(eq(testAttempts.id, s.body.attemptId));
    const key = await keyOf(s.body.attemptId);
    const res = await request(ctx.app)
      .put(`/api/attempts/${s.body.attemptId}/answers`)
      .set(auth(user))
      .send({ answers: [{ questionId: key[0]!.questionId, selectedOption: key[0]!.right, version: 1 }] });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('attempt_closed');
    const result = await request(ctx.app).get(`/api/attempts/${s.body.attemptId}`).set(auth(user));
    expect(result.status).toBe(200);
    expect(result.body.status).toBe('auto_submitted');
    expect(result.body.summary.attempted).toBe(0);
  });

  it('the sweeper finalises abandoned attempts; a retake then starts fresh', async () => {
    const user = await userToken(ctx.app, 'Abandon');
    const s = await start(user, tests[5]!);
    const key = await keyOf(s.body.attemptId);
    await request(ctx.app)
      .put(`/api/attempts/${s.body.attemptId}/answers`)
      .set(auth(user))
      .send({ answers: [{ questionId: key[1]!.questionId, selectedOption: key[1]!.wrong, version: 1 }] });
    await ctx.db.update(testAttempts).set({ deadlineAt: new Date(Date.now() - 5 * 60_000) }).where(eq(testAttempts.id, s.body.attemptId));
    expect(await finalizeExpiredAttempts(ctx.db, 60)).toBeGreaterThanOrEqual(1);
    const [row] = await ctx.db.select().from(testAttempts).where(eq(testAttempts.id, s.body.attemptId));
    expect(row!.status).toBe('auto_submitted');
    expect(row!.incorrectCount).toBe(1);
    expect(Number(row!.score)).toBe(-0.5);
    expect(await finalizeExpiredAttempts(ctx.db, 60)).toBe(0);

    const retake = await start(user, tests[5]!);
    expect(retake.status).toBe(201);
    expect(retake.body.resumed).toBe(false);
    expect(retake.body.attemptId).not.toBe(s.body.attemptId);
  });

  it('scores with the answer key recorded at start, even if the question is edited mid-test', async () => {
    const user = await userToken(ctx.app, 'Snapshot');
    const s = await start(user, tests[0]!);
    const key = await keyOf(s.body.attemptId);
    const q = key[0]!;
    // An editor changes the key while the candidate is writing the test.
    await ctx.db.update(questions).set({ correctOption: q.wrong }).where(eq(questions.id, q.questionId));
    const res = await request(ctx.app)
      .post(`/api/mock-tests/${tests[0]}/submit`)
      .set(auth(user))
      .send({ attemptId: s.body.attemptId, answers: [{ questionId: q.questionId, selectedOption: q.right }] });
    expect(res.body.summary.correct).toBe(1);
    expect(res.body.questions.find((x: { questionId: string }) => x.questionId === q.questionId).correctOption).toBe(q.right);
    await ctx.db.update(questions).set({ correctOption: q.right }).where(eq(questions.id, q.questionId));
  });

  it("another user cannot read, save or submit someone else's attempt", async () => {
    const owner = await userToken(ctx.app, 'Owner');
    const intruder = await userToken(ctx.app, 'Intruder');
    const s = await start(owner, tests[1]!);
    const key = await keyOf(s.body.attemptId);
    const ans = [{ questionId: key[0]!.questionId, selectedOption: 'A', version: 1 }];
    expect((await request(ctx.app).get(`/api/attempts/${s.body.attemptId}/state`).set(auth(intruder))).status).toBe(404);
    expect((await request(ctx.app).put(`/api/attempts/${s.body.attemptId}/answers`).set(auth(intruder)).send({ answers: ans })).status).toBe(404);
    expect(
      (await request(ctx.app).post(`/api/mock-tests/${tests[1]}/submit`).set(auth(intruder)).send({ attemptId: s.body.attemptId, answers: [] })).status
    ).toBe(404);
    // A question that is not in the attempt is refused.
    const bad = await request(ctx.app)
      .put(`/api/attempts/${s.body.attemptId}/answers`)
      .set(auth(owner))
      .send({ answers: [{ questionId: '00000000-0000-4000-8000-000000000000', selectedOption: 'A', version: 1 }] });
    expect(bad.status).toBe(400);
  });

  it('serves the server clock', async () => {
    const res = await request(ctx.app).get('/api/time');
    expect(res.status).toBe(200);
    expect(Math.abs(Date.parse(res.body.serverTime) - Date.now())).toBeLessThan(5000);
  });
});
