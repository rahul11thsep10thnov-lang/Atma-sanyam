import request from 'supertest';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { questions } from '../src/database/schema.js';
import { auth, adminToken, scopeIds, setupTestApp, userToken } from './helpers.js';

type Ctx = Awaited<ReturnType<typeof setupTestApp>>;

describe('figure questions through the API', () => {
  let ctx: Ctx;
  let admin: string;
  let ids: Awaited<ReturnType<typeof scopeIds>>;

  beforeAll(async () => {
    ctx = await setupTestApp();
    admin = await adminToken(ctx.app, ctx.db);
    ids = await scopeIds(ctx.app, admin);
  });
  afterAll(async () => ctx.close());

  const generate = (body: Record<string, unknown>) => request(ctx.app).post('/api/admin/figure-questions').set(auth(admin)).send(body);

  it('lists the figure types', async () => {
    const res = await request(ctx.app).get('/api/admin/figure-generators').set(auth(admin));
    expect(res.status).toBe(200);
    const types = (res.body.items as { id: string }[]).map((g) => g.id);
    expect(types).toEqual(expect.arrayContaining(['series-rotation', 'mirror-image', 'embedded-figure', 'paper-folding', 'count-triangles', 'venn-diagram']));
  });

  it('previews without saving anything', async () => {
    const res = await request(ctx.app)
      .post('/api/admin/figure-questions/preview')
      .set(auth(admin))
      .send({ generator: 'mirror-image', difficulty: 'medium', language: 'hi', count: 3, seed: 11 });
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(3);
    expect(res.body.items[0].figureSvg).toMatch(/^<svg /);
    expect(res.body.items[0].options[0].svg).toMatch(/^<svg /);
    const rows = await ctx.db.select({ id: questions.id }).from(questions);
    expect(rows).toHaveLength(0);
  });

  it('explains which chapters are missing', async () => {
    const res = await generate({
      examId: ids.examId,
      subjectId: ids.reasoningId,
      generators: ['mirror-image', 'count-triangles'],
      language: 'en',
      count: 4,
      difficulty: { easy: 30, medium: 50, hard: 20 },
    });
    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/"mirror-image".*"counting-figures"|"counting-figures".*"mirror-image"/);
  });

  it('rejects bad input', async () => {
    const base = { examId: ids.examId, subjectId: ids.reasoningId, chapterId: ids.seriesId, generators: ['mirror-image'], count: 4, difficulty: { easy: 30, medium: 50, hard: 20 } };
    expect((await generate({ ...base, language: 'fr' })).status).toBe(400);
    expect((await generate({ ...base, language: 'en', generators: ['nope'] })).status).toBe(404);
    expect((await generate({ ...base, language: 'en', difficulty: { easy: 50, medium: 50, hard: 20 } })).status).toBe(422);
    expect((await request(ctx.app).post('/api/admin/figure-questions').send({})).status).toBe(401);
  });

  let created: string[] = [];
  it('generates, validates and stores figure questions in NEEDS_REVIEW', async () => {
    const res = await generate({
      examId: ids.examId,
      subjectId: ids.reasoningId,
      chapterId: ids.seriesId,
      generators: ['series-rotation', 'mirror-image', 'paper-folding', 'count-triangles', 'venn-diagram', 'embedded-figure'],
      language: 'en',
      count: 30,
      difficulty: { easy: 30, medium: 50, hard: 20 },
    });
    expect(res.status).toBe(201);
    expect(res.body.created).toBe(30);
    expect(res.body.failed).toBe(0);
    created = res.body.questionIds;
    const rows = await ctx.db.select().from(questions).where(eq(questions.source, 'figure'));
    expect(rows).toHaveLength(30);
    for (const r of rows) {
      expect(r.status).toBe('needs_review');
      expect(r.figureKind).toBeTruthy();
      expect(r.fingerprint).toMatch(/^fig:/);
      expect(r.duplicateOfId).toBeNull();
      expect(r.validationIssues.filter((i) => i.severity === 'error')).toEqual([]);
    }
    const counts = { easy: 0, medium: 0, hard: 0 } as Record<string, number>;
    rows.forEach((r) => counts[r.difficulty]!++);
    expect(counts).toEqual({ easy: 9, medium: 15, hard: 6 });

    const one = await request(ctx.app).get(`/api/admin/questions/${created[0]}`).set(auth(admin));
    expect(one.body.figureKind).toBeTruthy();
    expect(one.body.options).toHaveLength(4);
  });

  it('keeps the figures when a question is edited', async () => {
    const id = created.find(Boolean)!;
    const q = (await request(ctx.app).get(`/api/admin/questions/${id}`).set(auth(admin))).body;
    const res = await request(ctx.app)
      .put(`/api/admin/questions/${id}`)
      .set(auth(admin))
      .send({
        examId: q.examId,
        subjectId: q.subjectId,
        chapterId: q.chapterId,
        questionText: `${q.questionText} (edited)`,
        options: q.options.map((o: { label: string; text: string }) => ({ label: o.label, text: o.text })),
        correctOption: q.correctOption,
        explanation: q.explanation,
        difficulty: q.difficulty,
        language: q.language,
      });
    expect(res.status).toBe(200);
    expect(res.body.figureSvg).toBe(q.figureSvg);
    expect(res.body.options.map((o: { svg: string | null }) => o.svg)).toEqual(q.options.map((o: { svg: string | null }) => o.svg));
    expect(res.body.fingerprint).toBe(q.fingerprint);
  });

  it('serves figures in a published test without the answers, and scores them on the server', async () => {
    await request(ctx.app).post('/api/admin/questions/bulk').set(auth(admin)).send({ ids: created, action: 'approve' });
    const pub = await request(ctx.app).post('/api/admin/questions/bulk').set(auth(admin)).send({ ids: created, action: 'publish' });
    expect(pub.body.succeeded).toBe(30);
    const gen = await request(ctx.app)
      .post('/api/admin/mock-tests/generate')
      .set(auth(admin))
      .send({
        examId: ids.examId,
        title: 'Non-verbal sectional',
        language: 'en',
        totalQuestions: 10,
        durationMinutes: 10,
        marksPerQuestion: 2,
        negativeMarks: 0.5,
        difficulty: { easy: 30, medium: 50, hard: 20 },
        sections: [{ subjectId: ids.reasoningId, count: 10 }],
      });
    expect(gen.status).toBe(201);
    const testId = gen.body.test.id as string;
    expect((await request(ctx.app).post(`/api/admin/mock-tests/${testId}/publish`).set(auth(admin))).status).toBe(200);

    const pubTest = await request(ctx.app).get(`/api/mock-tests/${testId}`);
    expect(pubTest.status).toBe(200);
    const qs = pubTest.body.questions as { id: string; figureSvg: string | null; options: { label: string; svg: string | null }[]; correctOption?: string }[];
    expect(qs.every((q) => q.figureSvg !== undefined)).toBe(true);
    expect(qs.some((q) => q.options.some((o) => o.svg))).toBe(true);
    expect(qs.every((q) => q.correctOption === undefined)).toBe(true);
    expect(JSON.stringify(pubTest.body)).not.toMatch(/"explanation"/);

    const user = await userToken(ctx.app, 'Figures');
    const start = await request(ctx.app).post(`/api/mock-tests/${testId}/start`).set(auth(user));
    const keyRows = await ctx.db.select({ id: questions.id, correct: questions.correctOption }).from(questions);
    const key = new Map(keyRows.map((r) => [r.id, r.correct]));
    const answers = qs.map((q) => ({ questionId: q.id, selectedOption: key.get(q.id)! }));
    const res = await request(ctx.app).post(`/api/mock-tests/${testId}/submit`).set(auth(user)).send({ attemptId: start.body.attemptId, answers });
    expect(res.status).toBe(200);
    expect(res.body.summary.correct).toBe(10);
    expect(res.body.summary.score).toBe(20);
    expect(res.body.questions[0].figureSvg).toBeDefined();
    expect(res.body.questions.some((q: { options: { svg: string | null }[] }) => q.options.some((o) => o.svg))).toBe(true);
  });

  it('never stores the same puzzle twice', async () => {
    const rows = await ctx.db.select({ fp: questions.fingerprint }).from(questions).where(eq(questions.source, 'figure'));
    expect(new Set(rows.map((r) => r.fp)).size).toBe(rows.length);
  });
});
