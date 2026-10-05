import { createHash } from 'node:crypto';
import request from 'supertest';
import { and, eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auditLogs, questions } from '../src/database/schema.js';
import { generateFigureQuestion, GENERATORS } from '../src/figures/index.js';
import { renderPaperPdf, type PaperQuestion } from '../src/services/pdf/paperPdf.js';
import { KEEP_PER_VARIANT } from '../src/services/pdfService.js';
import { auth, adminToken, scopeIds, setupTestApp } from './helpers.js';

type Ctx = Awaited<ReturnType<typeof setupTestApp>>;

/** Collects a binary response body (supertest buffers only text by default). */
function binary(res: request.Response, cb: (err: Error | null, body: Buffer) => void) {
  const chunks: Buffer[] = [];
  res.on('data', (c: Buffer) => chunks.push(c));
  res.on('end', () => cb(null, Buffer.concat(chunks)));
}

describe('PDF renderer', () => {
  it('draws Hindi text, symbols and figures with embedded fonts', async () => {
    const qs: PaperQuestion[] = [
      {
        position: 1,
        subjectName: 'गणित',
        chapterName: 'प्रतिशत',
        questionText: 'यदि A → B और B ⇒ C, तो x² का मान ⅓ हो, तो ‘क्षत्रिय’ का विच्छेद?',
        figureSvg: null,
        difficulty: 'easy',
        correctOption: 'A',
        explanation: 'उत्तर (A)',
        options: ['A', 'B', 'C', 'D'].map((l) => ({ label: l, text: `विकल्प ${l}`, svg: null })),
      },
    ];
    GENERATORS.forEach((g, i) => {
      const f = generateFigureQuestion(g.id, 'medium', 'hi', 100 + i);
      qs.push({
        position: i + 2,
        subjectName: 'तर्कशक्ति',
        chapterName: g.chapter,
        questionText: f.stem,
        figureSvg: f.stimulus,
        difficulty: 'medium',
        correctOption: 'ABCD'[f.correct]!,
        explanation: f.explanation,
        options: f.options.map((o, k) => ({ label: 'ABCD'[k]!, text: o.text, svg: o.svg ?? null })),
      });
    });
    const t = {
      title: 'परीक्षण',
      description: null,
      examName: 'UP Police Constable',
      language: 'hi',
      languageName: 'Hindi',
      durationMinutes: 20,
      marksPerQuestion: 2,
      negativeMarks: 0.5,
      questions: qs,
    };
    const both = await renderPaperPdf(t, { variant: 'both', showDetails: true });
    const paper = await renderPaperPdf(t, { variant: 'paper', showDetails: true });
    const key = await renderPaperPdf(t, { variant: 'key', showDetails: true });
    for (const r of [both, paper, key]) {
      expect(r.data.subarray(0, 5).toString()).toBe('%PDF-');
      expect(r.data.subarray(-6).toString()).toContain('%%EOF');
    }
    const raw = both.data.toString('latin1');
    expect(raw).toContain('Hind-Regular');
    expect(raw).toContain('Hind-SemiBold');
    expect(raw).toContain('NotoSansMath'); // → ⇒
    expect(raw).toContain('NotoSans-Regular'); // ⅓ ²
    expect(paper.pages).toBeGreaterThan(1);
    expect(key.pages).toBeGreaterThanOrEqual(1);
    expect(both.pages).toBe(paper.pages + key.pages);
  });
});

describe('stored mock-test PDFs', () => {
  let ctx: Ctx;
  let admin: string;
  let reviewer: string;
  let ids: Awaited<ReturnType<typeof scopeIds>>;
  let testId: string;

  const make = (id: string, body: Record<string, unknown>, token = admin) =>
    request(ctx.app).post(`/api/admin/mock-tests/${id}/pdfs`).set(auth(token)).send(body);
  const list = (id: string, token = admin) => request(ctx.app).get(`/api/admin/mock-tests/${id}/pdfs`).set(auth(token));
  const download = (id: string, pdfId: string, token = admin) =>
    request(ctx.app).get(`/api/admin/mock-tests/${id}/pdfs/${pdfId}/download`).set(auth(token)).buffer(true).parse(binary);

  beforeAll(async () => {
    ctx = await setupTestApp();
    admin = await adminToken(ctx.app, ctx.db);
    reviewer = await adminToken(ctx.app, ctx.db, 'reviewer');
    ids = await scopeIds(ctx.app, admin);
    for (const [subjectId, chapterId] of [
      [ids.mathsId, ids.percentageId],
      [ids.reasoningId, ids.seriesId],
    ] as const) {
      const res = await request(ctx.app)
        .post('/api/admin/generation-jobs')
        .set(auth(admin))
        .send({ examId: ids.examId, subjectId, chapterId, language: 'en', questionCount: 30, difficulty: { easy: 30, medium: 50, hard: 20 } });
      expect(res.status).toBe(201);
      await ctx.worker.drain({ ignoreBackoff: true });
      await ctx.db
        .update(questions)
        .set({ status: 'published', publishedAt: new Date() })
        .where(and(eq(questions.generationJobId, res.body.id), inArray(questions.status, ['approved', 'needs_review'])));
    }
    const res = await request(ctx.app)
      .post('/api/admin/mock-tests/generate')
      .set(auth(admin))
      .send({
        examId: ids.examId,
        title: 'Weekly Test #3 (Maths + Reasoning)',
        language: 'en',
        totalQuestions: 12,
        durationMinutes: 15,
        marksPerQuestion: 2,
        negativeMarks: 0.5,
        difficulty: { easy: 30, medium: 50, hard: 20 },
        sections: [
          { subjectId: ids.mathsId, count: 6 },
          { subjectId: ids.reasoningId, count: 6 },
        ],
      });
    expect(res.status).toBe(201);
    testId = res.body.test.id;
  });
  afterAll(async () => ctx.close());

  it('makes, lists and downloads a question paper', async () => {
    const res = await make(testId, { variant: 'paper' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ variant: 'paper', showDetails: false, outdated: false });
    expect(res.body.fileName).toMatch(/^weekly-test-3-maths-reasoning-question-paper-\d{4}-\d{2}-\d{2}\.pdf$/);
    expect(res.body.pages).toBeGreaterThanOrEqual(1);
    expect(res.body).not.toHaveProperty('data');
    expect(res.body).not.toHaveProperty('contentHash');

    const file = await download(testId, res.body.id);
    expect(file.status).toBe(200);
    expect(file.headers['content-type']).toBe('application/pdf');
    expect(file.headers['content-disposition']).toContain(`attachment; filename="${res.body.fileName}"`);
    expect(file.headers['cache-control']).toBe('no-store');
    const body = file.body as Buffer;
    expect(body.subarray(0, 5).toString()).toBe('%PDF-');
    expect(body.length).toBe(res.body.sizeBytes);
    expect(createHash('sha256').update(body).digest('hex')).toBe(res.body.sha256);

    const l = await list(testId);
    expect(l.status).toBe(200);
    expect(l.body.items.map((p: { id: string }) => p.id)).toContain(res.body.id);
    expect(l.body.items[0]).not.toHaveProperty('data');
    expect(l.body.keepPerVariant).toBe(KEEP_PER_VARIANT);

    const [log] = await ctx.db.select().from(auditLogs).where(eq(auditLogs.action, 'mocktest.pdf_created')).limit(1);
    expect(log?.entityId).toBe(testId);
  });

  it('marks a PDF outdated after the test or one of its questions changes', async () => {
    const paper = (await make(testId, { variant: 'paper' })).body;
    const key = (await make(testId, { variant: 'key', showDetails: true })).body;
    const state = async () => {
      const items = (await list(testId)).body.items as { id: string; outdated: boolean }[];
      return { paper: items.find((p) => p.id === paper.id)!.outdated, key: items.find((p) => p.id === key.id)!.outdated };
    };
    expect(await state()).toEqual({ paper: false, key: false });

    // A new explanation changes the key, not the candidate paper.
    const t = (await request(ctx.app).get(`/api/admin/mock-tests/${testId}`).set(auth(admin))).body;
    await ctx.db.update(questions).set({ explanation: 'Corrected working.' }).where(eq(questions.id, t.questions[0].id));
    expect(await state()).toEqual({ paper: false, key: true });

    // Renaming the test changes both.
    const put = await request(ctx.app).put(`/api/admin/mock-tests/${testId}`).set(auth(admin)).send({ title: 'Weekly Test #3 (revised)' });
    expect(put.status).toBe(200);
    expect(await state()).toEqual({ paper: true, key: true });

    // A fresh PDF is current again.
    const again = (await make(testId, { variant: 'paper' })).body;
    expect(again.outdated).toBe(false);
    expect(again.fileName).toMatch(/^weekly-test-3-revised-question-paper-/);
  });

  it(`keeps the newest ${KEEP_PER_VARIANT} files of each kind`, async () => {
    for (let i = 0; i < KEEP_PER_VARIANT + 2; i++) expect((await make(testId, { variant: 'both' })).status).toBe(201);
    const items = (await list(testId)).body.items as { variant: string }[];
    expect(items.filter((p) => p.variant === 'both')).toHaveLength(KEEP_PER_VARIANT);
    expect(items.filter((p) => p.variant === 'paper').length).toBeGreaterThan(0);
  });

  it('lets reviewers download but not make or delete PDFs', async () => {
    const pdf = (await make(testId, { variant: 'key' })).body;
    expect((await list(testId, reviewer)).status).toBe(200);
    expect((await download(testId, pdf.id, reviewer)).status).toBe(200);
    expect((await make(testId, { variant: 'paper' }, reviewer)).status).toBe(403);
    expect((await request(ctx.app).delete(`/api/admin/mock-tests/${testId}/pdfs/${pdf.id}`).set(auth(reviewer))).status).toBe(403);
    expect((await request(ctx.app).get(`/api/admin/mock-tests/${testId}/pdfs`)).status).toBe(401);
  });

  it('deletes a PDF and rejects bad input', async () => {
    const pdf = (await make(testId, { variant: 'paper' })).body;
    const del = await request(ctx.app).delete(`/api/admin/mock-tests/${testId}/pdfs/${pdf.id}`).set(auth(admin));
    expect(del.status).toBe(200);
    expect(del.body).toEqual({ deleted: 1 });
    expect((await download(testId, pdf.id)).status).toBe(404);
    expect((await request(ctx.app).delete(`/api/admin/mock-tests/${testId}/pdfs/${pdf.id}`).set(auth(admin))).status).toBe(404);

    expect((await make(testId, { variant: 'everything' })).status).toBe(400);
    expect((await make('00000000-0000-4000-8000-000000000000', { variant: 'paper' })).status).toBe(404);
    expect((await download(testId, 'not-a-uuid')).status).toBe(404);

    // A PDF id from another test is not served under this one.
    const other = await request(ctx.app)
      .post('/api/admin/mock-tests/generate')
      .set(auth(admin))
      .send({
        examId: ids.examId,
        title: 'Other',
        language: 'en',
        totalQuestions: 4,
        durationMinutes: 5,
        marksPerQuestion: 1,
        negativeMarks: 0,
        difficulty: { easy: 30, medium: 50, hard: 20 },
        sections: [{ subjectId: ids.mathsId, count: 4 }],
      });
    const otherPdf = (await make(other.body.test.id, { variant: 'paper' })).body;
    expect((await download(testId, otherPdf.id)).status).toBe(404);
    expect((await download(other.body.test.id, otherPdf.id)).status).toBe(200);
  });
});
