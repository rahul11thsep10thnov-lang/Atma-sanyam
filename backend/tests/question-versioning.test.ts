import request from 'supertest';
import { and, eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { appSettings, questionRevisions, questions } from '../src/database/schema.js';
import { flagsFor } from '../src/services/qualityService.js';
import { auth, adminToken, scopeIds, setupTestApp, userToken } from './helpers.js';

type Ctx = Awaited<ReturnType<typeof setupTestApp>>;

describe('question versioning, bulk edit and quality', () => {
  let ctx: Ctx;
  let admin: string;
  let ids: Awaited<ReturnType<typeof scopeIds>>;
  let bank: string[] = [];
  let testId = '';

  const getQ = async (id: string) => (await request(ctx.app).get(`/api/admin/questions/${id}`).set(auth(admin))).body;
  const edit = async (id: string, patch: Record<string, unknown>) => {
    const q = await getQ(id);
    return request(ctx.app)
      .put(`/api/admin/questions/${id}`)
      .set(auth(admin))
      .send({
        examId: q.examId,
        subjectId: q.subjectId,
        chapterId: q.chapterId,
        questionText: q.questionText,
        options: q.options.map((o: { label: string; text: string }) => ({ label: o.label, text: o.text })),
        correctOption: q.correctOption,
        explanation: q.explanation,
        difficulty: q.difficulty,
        language: q.language,
        ...patch,
      });
  };

  beforeAll(async () => {
    ctx = await setupTestApp();
    admin = await adminToken(ctx.app, ctx.db);
    ids = await scopeIds(ctx.app, admin);
    // Every student here comes from one test client; the guest quota guard
    // is covered in access-policy.test.ts.
    await ctx.db.insert(appSettings).values({ key: 'access_policy', value: { enabled: false } }).onConflictDoUpdate({ target: appSettings.key, set: { value: { enabled: false } } });
    const job = await request(ctx.app)
      .post('/api/admin/generation-jobs')
      .set(auth(admin))
      .send({ examId: ids.examId, subjectId: ids.mathsId, chapterId: ids.percentageId, language: 'en', questionCount: 8, difficulty: { easy: 30, medium: 50, hard: 20 } });
    await ctx.worker.drain({ ignoreBackoff: true });
    await ctx.db
      .update(questions)
      .set({ status: 'published', publishedAt: new Date() })
      .where(and(eq(questions.generationJobId, job.body.id), inArray(questions.status, ['approved', 'needs_review'])));
    bank = (await ctx.db.select({ id: questions.id }).from(questions).where(eq(questions.generationJobId, job.body.id))).map((r) => r.id);
    const gen = await request(ctx.app)
      .post('/api/admin/mock-tests/generate')
      .set(auth(admin))
      .send({
        examId: ids.examId,
        title: 'Versioned',
        language: 'en',
        totalQuestions: 3,
        durationMinutes: 10,
        marksPerQuestion: 1,
        negativeMarks: 0,
        difficulty: { easy: 30, medium: 50, hard: 20 },
        sections: [{ subjectId: ids.mathsId, count: 3 }],
      });
    expect(gen.status, JSON.stringify(gen.body)).toBe(201);
    testId = gen.body.test.id;
    await request(ctx.app).post(`/api/admin/mock-tests/${testId}/publish`).set(auth(admin));
  });
  afterAll(() => ctx.close());

  it('keeps the served version for a running attempt when a question is edited', async () => {
    const student = await userToken(ctx.app);
    const start = await request(ctx.app).post(`/api/mock-tests/${testId}/start`).set(auth(student));
    expect(start.status).toBe(201);
    const paper = await request(ctx.app).get(`/api/mock-tests/${testId}`).set(auth(student));
    const served = paper.body.questions[0];
    const before = await getQ(served.id);
    expect(before.version).toBe(1);

    // The admin fixes the key and wording while the student is in the test.
    const newKey = before.correctOption === 'A' ? 'B' : 'A';
    // Swap two options' texts so the key moves to another letter.
    const text = (l: string) => before.options.find((o: { label: string }) => o.label === l).text;
    const options = before.options.map((o: { label: string; text: string }) => ({
      label: o.label,
      text: o.label === newKey ? text(before.correctOption) : o.label === before.correctOption ? text(newKey) : o.text,
    }));
    const res = await edit(served.id, { questionText: `${before.questionText} (revised)`, options, correctOption: newKey });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.version).toBe(2);

    const hist = (await request(ctx.app).get(`/api/admin/questions/${served.id}/revisions`).set(auth(admin))).body;
    expect(hist.currentVersion).toBe(2);
    expect(hist.revisions).toEqual([expect.objectContaining({ version: 1, changeKind: 'edit' })]);
    expect(hist.revisions[0].snapshot).toMatchObject({ questionText: before.questionText, correctOption: before.correctOption });

    // Scored against the key that was in force when the attempt started.
    const submit = await request(ctx.app)
      .post(`/api/mock-tests/${testId}/submit`)
      .set(auth(student))
      .send({ attemptId: start.body.attemptId, answers: [{ questionId: served.id, selectedOption: before.correctOption, markedForReview: false }] });
    expect(submit.status, JSON.stringify(submit.body)).toBe(200);
    const q = submit.body.questions.find((x: { questionId: string }) => x.questionId === served.id);
    expect(q.isCorrect).toBe(true);
    expect(q.questionText).toBe(before.questionText);
  });

  it('restores an earlier version as a new version', async () => {
    const id = bank[1]!;
    const v1 = await getQ(id);
    await edit(id, { explanation: 'Changed explanation for the test.' });
    const restored = await request(ctx.app).post(`/api/admin/questions/${id}/revisions/1/restore`).set(auth(admin));
    expect(restored.status, JSON.stringify(restored.body)).toBe(200);
    expect(restored.body.version).toBe(3);
    expect(restored.body.explanation).toBe(v1.explanation);
    const hist = (await request(ctx.app).get(`/api/admin/questions/${id}/revisions`).set(auth(admin))).body;
    expect(hist.revisions.map((r: { version: number; changeKind: string }) => [r.version, r.changeKind])).toEqual([
      [2, 'restore'],
      [1, 'edit'],
    ]);
    expect((await request(ctx.app).post(`/api/admin/questions/${id}/revisions/99/restore`).set(auth(admin))).status).toBe(404);
  });

  it('bulk-edits chapter and difficulty, with a revision each and clear skips', async () => {
    const targets = bank.slice(2, 5);
    const res = await request(ctx.app)
      .post('/api/admin/questions/bulk-edit')
      .set(auth(admin))
      .send({ ids: targets, set: { chapterId: ids.profitLossId, difficulty: 'hard', sourceName: 'Board paper 2024' }, summary: 'Recategorised' });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.updated).toHaveLength(3);
    for (const id of targets) {
      const q = await getQ(id);
      expect(q).toMatchObject({ chapterId: ids.profitLossId, difficulty: 'hard', sourceName: 'Board paper 2024', version: 2 });
    }
    const revs = await ctx.db.select().from(questionRevisions).where(inArray(questionRevisions.questionId, targets));
    expect(revs.every((r) => r.changeKind === 'bulk_edit' && r.snapshot.chapterId === ids.percentageId)).toBe(true);

    // A chapter from another subject is refused per question, not silently applied.
    const wrong = await request(ctx.app).post('/api/admin/questions/bulk-edit').set(auth(admin)).send({ ids: targets, set: { chapterId: ids.seriesId } });
    expect(wrong.body.updated).toEqual([]);
    expect(wrong.body.skipped.every((s: { reason: string }) => s.reason === 'chapter_not_in_subject')).toBe(true);
    expect((await request(ctx.app).post('/api/admin/questions/bulk-edit').set(auth(admin)).send({ ids: targets, set: { status: 'published' } })).status).toBe(400);
  });

  it('flags questions from real answers only with enough data', async () => {
    // Seven students all pick the same wrong option on one question.
    let target: { id: string; correct: string; wrong: string } | null = null;
    for (let i = 0; i < 7; i++) {
      const t = await userToken(ctx.app, `S${i}`);
      const start = await request(ctx.app).post(`/api/mock-tests/${testId}/start`).set(auth(t));
      const paper = await request(ctx.app).get(`/api/mock-tests/${testId}`).set(auth(t));
      const q = paper.body.questions[2];
      if (!target) {
        const full = await getQ(q.id);
        target = { id: q.id, correct: full.correctOption, wrong: full.correctOption === 'A' ? 'C' : 'A' };
      }
      await request(ctx.app)
        .post(`/api/mock-tests/${testId}/submit`)
        .set(auth(t))
        .send({ attemptId: start.body.attemptId, answers: [{ questionId: target.id, selectedOption: target.wrong, markedForReview: false }] });
    }
    const few = await request(ctx.app).get('/api/admin/questions/quality?minSample=30').set(auth(admin));
    expect(few.status).toBe(200);
    expect(few.body.items.find((i: { questionId: string }) => i.questionId === target!.id)).toBeUndefined();

    const enough = await request(ctx.app).get('/api/admin/questions/quality?minSample=5&flag=key_suspect').set(auth(admin));
    const item = enough.body.items.find((i: { questionId: string }) => i.questionId === target!.id);
    expect(item).toBeDefined();
    expect(item.flags).toEqual(expect.arrayContaining(['too_hard', 'key_suspect', 'dead_distractor']));
    expect(item.answered).toBe(7);
    expect(item.optionCounts[target!.wrong]).toBe(7);
    expect(enough.body.content.total).toBeGreaterThan(0);
  });

  it('computes flags from counts', () => {
    const base = { served: 100, answered: 100, correct: 97, correctOption: 'A', optionCounts: { A: 97, B: 1, C: 1, D: 1 } };
    expect(flagsFor(base, 30)).toEqual(['too_easy', 'dead_distractor']);
    expect(flagsFor({ ...base, answered: 10 }, 30)).toEqual([]);
    expect(flagsFor({ served: 100, answered: 40, correct: 20, correctOption: 'A', optionCounts: { A: 20, B: 8, C: 6, D: 6 } }, 30)).toEqual(['high_skip']);
  });
});
