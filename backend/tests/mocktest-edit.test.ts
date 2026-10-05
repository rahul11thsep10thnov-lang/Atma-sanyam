import request from 'supertest';
import { and, eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { questions, testAttempts } from '../src/database/schema.js';
import { auth, adminToken, scopeIds, setupTestApp, userToken } from './helpers.js';

type Ctx = Awaited<ReturnType<typeof setupTestApp>>;

async function publishedBank(ctx: Ctx, admin: string, subjectId: string, chapterId: string, count: number) {
  const ids = await scopeIds(ctx.app, admin);
  const res = await request(ctx.app)
    .post('/api/admin/generation-jobs')
    .set(auth(admin))
    .send({ examId: ids.examId, subjectId, chapterId, language: 'en', questionCount: count, difficulty: { easy: 30, medium: 50, hard: 20 } });
  expect(res.status).toBe(201);
  await ctx.worker.drain({ ignoreBackoff: true });
  await ctx.db
    .update(questions)
    .set({ status: 'published', publishedAt: new Date() })
    .where(and(eq(questions.generationJobId, res.body.id), inArray(questions.status, ['approved', 'needs_review'])));
}

describe('editing and swapping questions in a mock test', () => {
  let ctx: Ctx;
  let admin: string;
  let ids: Awaited<ReturnType<typeof scopeIds>>;

  const newTest = async (over: Record<string, unknown> = {}) => {
    const res = await request(ctx.app)
      .post('/api/admin/mock-tests/generate')
      .set(auth(admin))
      .send({
        examId: ids.examId,
        title: 'Swap test',
        language: 'en',
        totalQuestions: 10,
        durationMinutes: 12,
        marksPerQuestion: 2,
        negativeMarks: 0.5,
        difficulty: { easy: 30, medium: 50, hard: 20 },
        sections: [
          { subjectId: ids.mathsId, count: 5 },
          { subjectId: ids.reasoningId, count: 5 },
        ],
        ...over,
      });
    expect(res.status).toBe(201);
    return res.body.test as { id: string; questions: { id: string; position: number; subjectId: string; difficulty: string }[] };
  };
  const publish = (id: string) => request(ctx.app).post(`/api/admin/mock-tests/${id}/publish`).set(auth(admin));
  const candidates = (testId: string, qid: string, query: Record<string, string> = {}) =>
    request(ctx.app).get(`/api/admin/mock-tests/${testId}/questions/${qid}/candidates`).query(query).set(auth(admin));
  const swap = (testId: string, qid: string, body: Record<string, unknown> = {}) =>
    request(ctx.app).post(`/api/admin/mock-tests/${testId}/questions/${qid}/swap`).set(auth(admin)).send(body);

  beforeAll(async () => {
    ctx = await setupTestApp();
    admin = await adminToken(ctx.app, ctx.db);
    ids = await scopeIds(ctx.app, admin);
    await publishedBank(ctx, admin, ids.mathsId, ids.percentageId, 40);
    await publishedBank(ctx, admin, ids.reasoningId, ids.seriesId, 40);
  });
  afterAll(async () => ctx.close());

  // --- editing -----------------------------------------------------------------
  it('edits title, description, duration and kind, and returns the updated test', async () => {
    const t = await newTest();
    const res = await request(ctx.app)
      .put(`/api/admin/mock-tests/${t.id}`)
      .set(auth(admin))
      .send({ title: 'Renamed', description: 'Weekly test', durationMinutes: 30, kind: 'subject' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Renamed');
    expect(res.body.description).toBe('Weekly test');
    expect(res.body.durationMinutes).toBe(30);
    expect(res.body.kind).toBe('subject');
    expect(res.body.questions).toHaveLength(10);
    expect(res.body.attempts).toEqual({ total: 0, submitted: 0, inProgress: 0 });
  });

  it('rejects invalid edits and edits by a reviewer', async () => {
    const t = await newTest();
    expect((await request(ctx.app).put(`/api/admin/mock-tests/${t.id}`).set(auth(admin)).send({ title: '' })).status).toBe(400);
    expect((await request(ctx.app).put(`/api/admin/mock-tests/${t.id}`).set(auth(admin)).send({ durationMinutes: 0 })).status).toBe(400);
    const reviewer = await adminToken(ctx.app, ctx.db, 'reviewer');
    expect((await request(ctx.app).put(`/api/admin/mock-tests/${t.id}`).set(auth(reviewer)).send({ title: 'x' })).status).toBe(403);
  });

  it('lets marking change until the first attempt, then locks it', async () => {
    const t = await newTest();
    const ok = await request(ctx.app).put(`/api/admin/mock-tests/${t.id}`).set(auth(admin)).send({ marksPerQuestion: 1, negativeMarks: 0.25 });
    expect(ok.status).toBe(200);
    expect(ok.body.marksPerQuestion).toBe(1);
    expect(ok.body.negativeMarks).toBe(0.25);
    expect((await publish(t.id)).status).toBe(200);
    const user = await userToken(ctx.app, 'Locker');
    expect((await request(ctx.app).post(`/api/mock-tests/${t.id}/start`).set(auth(user))).status).toBe(201);
    const locked = await request(ctx.app).put(`/api/admin/mock-tests/${t.id}`).set(auth(admin)).send({ marksPerQuestion: 4 });
    expect(locked.status).toBe(409);
    expect(locked.body.error.message).toMatch(/attempt/);
    // Unchanged marking and other fields still go through.
    expect((await request(ctx.app).put(`/api/admin/mock-tests/${t.id}`).set(auth(admin)).send({ marksPerQuestion: 1, title: 'Still editable' })).status).toBe(200);
  });

  it('refuses to edit an archived test', async () => {
    const t = await newTest();
    await request(ctx.app).delete(`/api/admin/mock-tests/${t.id}`).set(auth(admin));
    expect((await request(ctx.app).put(`/api/admin/mock-tests/${t.id}`).set(auth(admin)).send({ title: 'x' })).status).toBe(409);
  });

  // --- swapping ----------------------------------------------------------------
  it('lists candidates from the same subject, language and exam, never ones already in the test', async () => {
    const t = await newTest();
    const target = t.questions[0]!;
    const res = await candidates(t.id, target.id);
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThan(5);
    const inTest = new Set(t.questions.map((q) => q.id));
    for (const c of res.body.items as { id: string; options: unknown[]; correctOption: string }[]) {
      expect(inTest.has(c.id)).toBe(false);
      expect(c.options).toHaveLength(4);
      expect(c.correctOption).toMatch(/^[A-D]$/);
    }
    const flags = (res.body.items as { sameDifficulty: boolean }[]).map((c) => c.sameDifficulty);
    expect(flags).toEqual([...flags].sort((a, b) => Number(b) - Number(a)));
    expect((await candidates(t.id, target.id, { search: 'zzzz-no-such-text' })).body.total).toBe(0);
  });

  it('swaps a chosen question in, keeping its number and section, and the test still publishes', async () => {
    const t = await newTest();
    const target = t.questions[2]!;
    const pick = (await candidates(t.id, target.id)).body.items[0] as { id: string };
    const res = await swap(t.id, target.id, { replacementId: pick.id });
    expect(res.status).toBe(200);
    expect(res.body.removedId).toBe(target.id);
    expect(res.body.addedId).toBe(pick.id);
    const after = res.body.test.questions as { id: string; position: number; subjectId: string }[];
    expect(after).toHaveLength(10);
    const slot = after.find((q) => q.position === target.position)!;
    expect(slot.id).toBe(pick.id);
    expect(slot.subjectId).toBe(target.subjectId);
    expect(after.some((q) => q.id === target.id)).toBe(false);
    expect(new Set(after.map((q) => q.id)).size).toBe(10);
    expect((await publish(t.id)).status).toBe(200);
  });

  it('auto-picks a same-difficulty replacement when none is named', async () => {
    const t = await newTest();
    const target = t.questions[0]!;
    const res = await swap(t.id, target.id);
    expect(res.status).toBe(200);
    const added = (res.body.test.questions as { id: string; difficulty: string }[]).find((q) => q.id === res.body.addedId)!;
    expect(added.difficulty).toBe(target.difficulty);
  });

  it('refuses unsuitable replacements with a clear reason', async () => {
    const t = await newTest();
    const a = t.questions[0]!;
    const b = t.questions[1]!;

    const dup = await swap(t.id, a.id, { replacementId: b.id });
    expect(dup.status).toBe(422);
    expect(dup.body.error.message).toMatch(/already in this test|duplicate/);

    const other = t.questions.find((q) => q.subjectId !== a.subjectId)!;
    const outside = await ctx.db
      .select({ id: questions.id })
      .from(questions)
      .where(and(eq(questions.subjectId, other.subjectId), eq(questions.status, 'published')));
    const unused = outside.find((q) => !t.questions.some((x) => x.id === q.id))!;
    const wrongSubject = await swap(t.id, a.id, { replacementId: unused.id });
    expect(wrongSubject.status).toBe(422);
    expect(wrongSubject.body.error.message).toMatch(/same subject/);

    const victim = (await candidates(t.id, a.id)).body.items[0].id as string;
    await ctx.db.update(questions).set({ status: 'approved' }).where(eq(questions.id, victim));
    const notLive = await swap(t.id, a.id, { replacementId: victim });
    expect(notLive.status).toBe(422);
    expect(notLive.body.error.message).toMatch(/PUBLISHED/);
    await ctx.db.update(questions).set({ status: 'published' }).where(eq(questions.id, victim));

    // A question that is not in this test cannot be swapped out.
    expect((await swap(t.id, unused.id)).status).toBe(404);
  });

  it('refuses a replacement that duplicates another question in the test', async () => {
    const t = await newTest();
    const a = t.questions[0]!;
    const b = t.questions.find((q) => q.id !== a.id && q.subjectId === a.subjectId)!;
    const clone = (await candidates(t.id, a.id)).body.items[0].id as string;
    await ctx.db.update(questions).set({ duplicateOfId: b.id }).where(eq(questions.id, clone));
    const res = await swap(t.id, a.id, { replacementId: clone });
    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/duplicate/);
    expect(((await candidates(t.id, a.id)).body.items as { id: string }[]).some((c) => c.id === clone)).toBe(false);
    await ctx.db.update(questions).set({ duplicateOfId: null }).where(eq(questions.id, clone));
  });

  it('only admins with test-write permission can swap', async () => {
    const t = await newTest();
    const reviewer = await adminToken(ctx.app, ctx.db, 'reviewer');
    const q = t.questions[0]!;
    expect((await request(ctx.app).post(`/api/admin/mock-tests/${t.id}/questions/${q.id}/swap`).set(auth(reviewer)).send({})).status).toBe(403);
    expect((await request(ctx.app).get(`/api/admin/mock-tests/${t.id}/questions/${q.id}/candidates`).set(auth(reviewer))).status).toBe(403);
    expect((await request(ctx.app).post(`/api/admin/mock-tests/${t.id}/questions/${q.id}/swap`).send({})).status).toBe(401);
  });

  it('is refused while a candidate is mid-test, and past results keep the question they saw', async () => {
    const t = await newTest();
    expect((await publish(t.id)).status).toBe(200);
    const user = await userToken(ctx.app, 'Mid-test');
    const target = t.questions[3]!;
    const start = await request(ctx.app).post(`/api/mock-tests/${t.id}/start`).set(auth(user));
    expect(start.status).toBe(201);

    const blocked = await swap(t.id, target.id);
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.message).toMatch(/taking this test/);

    const served = await request(ctx.app).get(`/api/mock-tests/${t.id}`);
    const answers = (served.body.questions as { id: string }[]).map((q) => ({ questionId: q.id, selectedOption: 'A' }));
    const submit = await request(ctx.app).post(`/api/mock-tests/${t.id}/submit`).set(auth(user)).send({ attemptId: start.body.attemptId, answers });
    expect(submit.status).toBe(200);
    const before = (submit.body.questions as { questionId: string; position: number }[]).map((q) => `${q.position}:${q.questionId}`);

    const swapped = await swap(t.id, target.id);
    expect(swapped.status).toBe(200);

    const result = await request(ctx.app).get(`/api/attempts/${start.body.attemptId}`).set(auth(user));
    expect(result.status).toBe(200);
    expect(result.body.summary.totalQuestions).toBe(10);
    expect((result.body.questions as { questionId: string; position: number }[]).map((q) => `${q.position}:${q.questionId}`)).toEqual(before);
    expect(result.body.sections.reduce((n: number, s: { total: number }) => n + s.total, 0)).toBe(10);

    const live = await request(ctx.app).get(`/api/mock-tests/${t.id}`);
    expect((live.body.questions as { id: string }[]).some((q) => q.id === swapped.body.addedId)).toBe(true);
    expect((live.body.questions as { id: string }[]).some((q) => q.id === target.id)).toBe(false);
    const attempts = await ctx.db.select().from(testAttempts).where(eq(testAttempts.mockTestId, t.id));
    expect(attempts).toHaveLength(1);
  });

  it('refuses to swap in an archived test', async () => {
    const t = await newTest();
    await request(ctx.app).delete(`/api/admin/mock-tests/${t.id}`).set(auth(admin));
    expect((await swap(t.id, t.questions[0]!.id)).status).toBe(409);
  });
});
