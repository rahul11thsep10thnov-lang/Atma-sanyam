import request from 'supertest';
import { and, eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { questions, testAttempts } from '../src/database/schema.js';
import { linkSupabase } from '../src/services/userService.js';
import { MAX_POINT_EVENTS_PER_DAY } from '../src/services/progressService.js';
import { auth, adminToken, scopeIds, setupTestApp, userToken } from './helpers.js';

type Ctx = Awaited<ReturnType<typeof setupTestApp>>;

let n = 0;
const ev = (e: Record<string, unknown>, at = new Date().toISOString()) => ({ id: `evt-${Date.now()}-${n++}`, at, ...e });

describe('student progress sync', () => {
  let ctx: Ctx;

  beforeAll(async () => {
    ctx = await setupTestApp();
  });
  afterAll(() => ctx.close());

  const post = (token: string, events: object[]) => request(ctx.app).post('/api/me/progress/events').set(auth(token)).send({ events });
  const get = (token: string) => request(ctx.app).get('/api/me/progress').set(auth(token));

  it('requires a session', async () => {
    expect((await request(ctx.app).get('/api/me/progress')).status).toBe(401);
  });

  it('applies bookmarks, mistakes and clears, in time order', async () => {
    const t = await userToken(ctx.app);
    const t0 = Date.now() - 60_000;
    const at = (s: number) => new Date(t0 + s * 1000).toISOString();
    const res = await post(t, [
      // Sent out of order: the server sorts by time.
      ev({ kind: 'bookmark', questionKey: 'q1', on: false }, at(3)),
      ev({ kind: 'bookmark', questionKey: 'q1', on: true }, at(1)),
      ev({ kind: 'bookmark', questionKey: 'q2', on: true }, at(2)),
      ev({ kind: 'answer', questionKey: 'q3', correct: false }, at(1)),
      ev({ kind: 'answer', questionKey: 'q3', correct: false }, at(2)),
      ev({ kind: 'answer', questionKey: 'q4', correct: false }, at(1)),
      ev({ kind: 'answer', questionKey: 'q4', correct: true }, at(2)),
      ev({ kind: 'answer', questionKey: 'q5', correct: false }, at(1)),
      ev({ kind: 'mistake_clear', questionKey: 'q5' }, at(2)),
    ]);
    expect(res.status).toBe(200);
    expect(res.body.applied).toHaveLength(9);
    const p = (await get(t)).body;
    expect(p.bookmarks).toEqual(['q2']);
    expect(p.mistakes).toEqual([expect.objectContaining({ questionKey: 'q3', wrongCount: 2 })]);
  });

  it('applies a retried event only once', async () => {
    const t = await userToken(ctx.app);
    const e = ev({ kind: 'answer', questionKey: 'qq', correct: false });
    const p1 = ev({ kind: 'points', amount: 10 });
    await post(t, [e, p1]);
    const again = await post(t, [e, p1]);
    expect(again.body.duplicate).toEqual(expect.arrayContaining([e.id, p1.id]));
    expect(again.body.applied).toEqual([]);
    const p = (await get(t)).body;
    expect(p.mistakes[0].wrongCount).toBe(1);
    expect(p.points).toBe(10);
  });

  it('counts the daily quiz once per day and builds a streak', async () => {
    const t = await userToken(ctx.app);
    await post(t, [ev({ kind: 'daily_quiz', date: '2026-01-01' }), ev({ kind: 'daily_quiz', date: '2026-01-01' })]);
    let p = (await get(t)).body;
    expect(p).toMatchObject({ streak: 1, points: 20, lastQuizDate: '2026-01-01' });
    await post(t, [ev({ kind: 'daily_quiz', date: '2026-01-02' })]);
    await post(t, [ev({ kind: 'daily_quiz', date: '2026-01-01' })]); // older day: ignored
    p = (await get(t)).body;
    expect(p).toMatchObject({ streak: 2, points: 40, lastQuizDate: '2026-01-02' });
    await post(t, [ev({ kind: 'daily_quiz', date: '2026-01-05' })]); // gap: streak restarts
    expect((await get(t)).body).toMatchObject({ streak: 1, points: 60 });
  });

  it('takes a browser’s earlier streak only for the first record', async () => {
    const t = await userToken(ctx.app);
    await post(t, [ev({ kind: 'daily_quiz', date: '2026-02-10', importedStreak: 7 })]);
    expect((await get(t)).body).toMatchObject({ streak: 7 });
    await post(t, [ev({ kind: 'daily_quiz', date: '2026-02-11', importedStreak: 300 })]);
    expect((await get(t)).body).toMatchObject({ streak: 8 });
  });

  it('rejects invalid events and bounds practice points', async () => {
    const t = await userToken(ctx.app);
    expect((await post(t, [ev({ kind: 'points', amount: 5000 })])).status).toBe(400);
    expect((await post(t, [ev({ kind: 'teleport' })])).status).toBe(400);
    expect((await post(t, [])).status).toBe(400);
    const many = Array.from({ length: MAX_POINT_EVENTS_PER_DAY + 5 }, () => ev({ kind: 'points', amount: 20 }));
    const r1 = await post(t, many.slice(0, 100));
    const r2 = await post(t, many.slice(100));
    expect(r1.body.applied.length + r2.body.applied.length).toBe(MAX_POINT_EVENTS_PER_DAY);
    expect(r2.body.rejected).toHaveLength(5);
    expect((await get(t)).body.points).toBe(MAX_POINT_EVENTS_PER_DAY * 20);
  });

  it('keeps each student’s progress separate', async () => {
    const a = await userToken(ctx.app, 'A');
    const b = await userToken(ctx.app, 'B');
    await post(a, [ev({ kind: 'bookmark', questionKey: 'only-a', on: true })]);
    expect((await get(b)).body.bookmarks).toEqual([]);
  });

  it('merges a guest’s progress and attempts into the account on sign-in', async () => {
    const admin = await adminToken(ctx.app, ctx.db);
    const ids = await scopeIds(ctx.app, admin);
    const job = await request(ctx.app)
      .post('/api/admin/generation-jobs')
      .set(auth(admin))
      .send({ examId: ids.examId, subjectId: ids.mathsId, chapterId: ids.percentageId, language: 'en', questionCount: 10, difficulty: { easy: 30, medium: 50, hard: 20 } });
    await ctx.worker.drain({ ignoreBackoff: true });
    await ctx.db
      .update(questions)
      .set({ status: 'published', publishedAt: new Date() })
      .where(and(eq(questions.generationJobId, job.body.id), inArray(questions.status, ['approved', 'needs_review'])));
    const test = await request(ctx.app)
      .post('/api/admin/mock-tests/generate')
      .set(auth(admin))
      .send({
        examId: ids.examId,
        title: 'Merge test',
        language: 'en',
        totalQuestions: 3,
        durationMinutes: 10,
        marksPerQuestion: 1,
        negativeMarks: 0,
        difficulty: { easy: 30, medium: 50, hard: 20 },
        sections: [{ subjectId: ids.mathsId, count: 3 }],
      });
    expect(test.status, JSON.stringify(test.body)).toBe(201);
    const testId = test.body.test.id as string;
    await request(ctx.app).post(`/api/admin/mock-tests/${testId}/publish`).set(auth(admin));

    // The account already has an open attempt on this test (another device).
    const first = await linkSupabase(ctx.db, ctx.deps.env, { id: 'sb-merge', email: null, phone: null, name: 'Merged' }, null);
    expect((await request(ctx.app).post(`/api/mock-tests/${testId}/start`).set(auth(first.token))).status).toBe(201);
    await post(first.token, [ev({ kind: 'points', amount: 10 }), ev({ kind: 'answer', questionKey: 'shared', correct: false })]);

    // A guest on this phone also opened it, and has progress.
    const guest = await userToken(ctx.app, 'Guest');
    const gs = await request(ctx.app).post(`/api/mock-tests/${testId}/start`).set(auth(guest));
    expect(gs.status).toBe(201);
    await post(guest, [
      ev({ kind: 'bookmark', questionKey: 'gq', on: true }),
      ev({ kind: 'answer', questionKey: 'shared', correct: false }),
      ev({ kind: 'points', amount: 20 }),
    ]);
    const me = await request(ctx.app).get('/api/me').set(auth(guest));

    const linked = await linkSupabase(ctx.db, ctx.deps.env, { id: 'sb-merge', email: null, phone: null, name: 'Merged' }, me.body.id);
    const p = (await get(linked.token)).body;
    expect(p.bookmarks).toEqual(['gq']);
    expect(p.points).toBe(30);
    expect(p.mistakes).toEqual([expect.objectContaining({ questionKey: 'shared', wrongCount: 2 })]);

    // Both attempts now belong to the account, and only one is still open.
    const rows = await ctx.db.select().from(testAttempts).where(eq(testAttempts.userId, linked.user.id));
    expect(rows).toHaveLength(2);
    expect(rows.filter((r) => r.status === 'in_progress')).toHaveLength(1);
    expect(rows.find((r) => r.id === gs.body.attemptId)?.status).toBe('submitted');
  });
});
