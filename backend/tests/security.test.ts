import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auth, adminToken, scopeIds, setupTestApp, userToken } from './helpers.js';

describe('authentication & authorization', () => {
  let ctx: Awaited<ReturnType<typeof setupTestApp>>;
  let superAdmin: string;
  let reviewer: string;
  let user: string;
  let ids: Awaited<ReturnType<typeof scopeIds>>;

  beforeAll(async () => {
    ctx = await setupTestApp();
    superAdmin = await adminToken(ctx.app, ctx.db, 'super_admin');
    reviewer = await adminToken(ctx.app, ctx.db, 'reviewer');
    user = await userToken(ctx.app);
    ids = await scopeIds(ctx.app, superAdmin);
  });
  afterAll(async () => ctx.close());

  it('rejects anonymous and website-user tokens on admin routes', async () => {
    expect((await request(ctx.app).get('/api/admin/dashboard')).status).toBe(401);
    expect((await request(ctx.app).get('/api/admin/dashboard').set(auth(user))).status).toBe(401);
    expect((await request(ctx.app).get('/api/admin/dashboard').set({ authorization: 'Bearer not-a-real-token' })).status).toBe(401);
  });

  it('rejects wrong passwords without revealing whether the email exists', async () => {
    const a = await request(ctx.app).post('/api/admin/auth/login').send({ email: 'super_admin@example.com', password: 'nope-nope-1' });
    const b = await request(ctx.app).post('/api/admin/auth/login').send({ email: 'nobody@example.com', password: 'nope-nope-1' });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body.error.message).toBe(b.body.error.message);
  });

  it('limits reviewers to reviewing', async () => {
    const job = await request(ctx.app)
      .post('/api/admin/generation-jobs')
      .set(auth(reviewer))
      .send({ examId: ids.examId, subjectId: ids.mathsId, chapterId: ids.percentageId, language: 'en', questionCount: 5, difficulty: { easy: 100, medium: 0, hard: 0 } });
    expect(job.status).toBe(403);
    expect((await request(ctx.app).get('/api/admin/questions').set(auth(reviewer))).status).toBe(200);
    expect((await request(ctx.app).put('/api/admin/settings').set(auth(reviewer)).send({ batchSize: 5 })).status).toBe(403);
    expect((await request(ctx.app).get('/api/admin/admins').set(auth(reviewer))).status).toBe(403);
    const bulk = await request(ctx.app).post('/api/admin/questions/bulk').set(auth(reviewer)).send({ ids: [ids.examId], action: 'publish' });
    expect(bulk.status).toBe(403);
  });

  it('lets a reviewer approve but not publish', async () => {
    const created = await request(ctx.app)
      .post('/api/admin/questions')
      .set(auth(superAdmin))
      .send({
        examId: ids.examId,
        subjectId: ids.mathsId,
        chapterId: ids.percentageId,
        questionText: 'What is 10% of 250?',
        options: ['20', '25', '30', '35'].map((text, i) => ({ label: 'ABCD'[i], text })),
        correctOption: 'B',
        explanation: '10% of 250 = 250 × 10/100 = 25.',
        difficulty: 'easy',
        language: 'en',
      });
    expect(created.status).toBe(201);
    const id = created.body.id;
    expect((await request(ctx.app).post(`/api/admin/questions/${id}/approve`).set(auth(reviewer))).status).toBe(200);
    expect((await request(ctx.app).post(`/api/admin/questions/${id}/publish`).set(auth(reviewer))).status).toBe(403);
    expect((await request(ctx.app).post(`/api/admin/questions/${id}/publish`).set(auth(superAdmin))).status).toBe(200);
  });

  it('keeps each user’s attempts private', async () => {
    const other = await userToken(ctx.app, 'Other');
    const res = await request(ctx.app).get('/api/attempts').set(auth(other));
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect((await request(ctx.app).get('/api/attempts')).status).toBe(401);
  });

  it('never exposes secrets through settings', async () => {
    const res = await request(ctx.app).get('/api/admin/settings').set(auth(superAdmin));
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toMatch(/sk-ant|AI_API_KEY/);
    expect(res.body.ai).toHaveProperty('apiKeyConfigured');
  });

  it('writes an audit trail', async () => {
    const res = await request(ctx.app).get('/api/admin/audit').set(auth(superAdmin));
    const actions = res.body.items.map((i: { action: string }) => i.action);
    expect(actions).toEqual(expect.arrayContaining(['admin.login', 'question.created', 'question.approved', 'question.published']));
  });
});

describe('API input validation', () => {
  let ctx: Awaited<ReturnType<typeof setupTestApp>>;
  let admin: string;
  let ids: Awaited<ReturnType<typeof scopeIds>>;

  beforeAll(async () => {
    ctx = await setupTestApp();
    admin = await adminToken(ctx.app, ctx.db);
    ids = await scopeIds(ctx.app, admin);
  });
  afterAll(async () => ctx.close());

  const job = (over: Record<string, unknown>) => ({
    examId: ids.examId,
    subjectId: ids.mathsId,
    chapterId: ids.percentageId,
    language: 'en',
    questionCount: 20,
    difficulty: { easy: 30, medium: 50, hard: 20 },
    ...over,
  });

  it('uses one error shape everywhere', async () => {
    const res = await request(ctx.app).post('/api/admin/generation-jobs').set(auth(admin)).send({ examId: 'x' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: { code: 'bad_request', message: 'Invalid request', details: expect.any(Array) } });
    const notFound = await request(ctx.app).get('/api/nope');
    expect(notFound.body.error.code).toBe('not_found');
  });

  it('checks generation parameters', async () => {
    const pct = await request(ctx.app).post('/api/admin/generation-jobs').set(auth(admin)).send(job({ difficulty: { easy: 50, medium: 50, hard: 20 } }));
    expect(pct.status).toBe(422);
    expect(pct.body.error.message).toMatch(/add up to 100/);
    const mismatch = await request(ctx.app).post('/api/admin/generation-jobs').set(auth(admin)).send(job({ chapterId: ids.seriesId }));
    expect(mismatch.status).toBe(422);
    const type = await request(ctx.app).post('/api/admin/generation-jobs').set(auth(admin)).send(job({ questionType: 'matching' }));
    expect(type.status).toBe(422);
    const lang = await request(ctx.app).post('/api/admin/generation-jobs').set(auth(admin)).send(job({ language: 'ta' }));
    expect(lang.status).toBe(400); // not enabled yet
    const tooMany = await request(ctx.app).post('/api/admin/generation-jobs').set(auth(admin)).send(job({ questionCount: 5000 }));
    expect(tooMany.status).toBe(422);
  });

  it('refuses to save a question that fails validation', async () => {
    const res = await request(ctx.app)
      .post('/api/admin/questions')
      .set(auth(admin))
      .send({
        examId: ids.examId,
        subjectId: ids.mathsId,
        chapterId: ids.percentageId,
        questionText: 'What is 10% of 250?',
        options: ['20', '25', '25', '35'].map((text, i) => ({ label: 'ABCD'[i], text })),
        correctOption: 'B',
        explanation: '',
        difficulty: 'easy',
        language: 'en',
      });
    expect(res.status).toBe(422);
    const found = res.body.error.details.map((d: { code: string }) => d.code);
    expect(found).toEqual(expect.arrayContaining(['DUPLICATE_OPTIONS', 'EXPLANATION_MISSING']));
  });

  it('treats malformed ids as not found and bad submissions as bad requests', async () => {
    expect((await request(ctx.app).get('/api/mock-tests/not-a-uuid')).status).toBe(404);
    const user = await userToken(ctx.app);
    const res = await request(ctx.app)
      .post(`/api/mock-tests/${ids.examId}/submit`)
      .set(auth(user))
      .send({ attemptId: ids.examId, answers: [{ questionId: ids.examId, selectedOption: 'Z' }] });
    expect(res.status).toBe(400);
  });
});
