import { Router } from 'express';
import { and, asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { chapters, exams, subjects } from '../../database/schema.js';
import { badRequest, notFound, unauthorized } from '../../lib/httpError.js';
import { parse } from '../../middleware/validate.js';
import type { Auth } from '../../middleware/auth.js';
import type { RateLimits } from '../../middleware/rateLimits.js';
import { getResult, listAttempts, startAttempt, submitAttempt } from '../../services/attemptService.js';
import { getMockTest, listMockTests } from '../../services/mockTestService.js';
import { guestSignIn, linkSupabase, logoutUser, profile } from '../../services/userService.js';
import { assertCanStart, confirmOrder, createOrder, getEntitlement } from '../../services/enrollmentService.js';
import { getSiteSettings } from '../../services/siteSettingsService.js';
import { mockTests } from '../../database/schema.js';
import type { AppDeps } from '../../types.js';
import { idParam, optionalUuid, pageQuery } from '../util.js';

const cache = (seconds: number) => `public, max-age=${seconds}, stale-while-revalidate=${seconds * 5}`;

export function publicRouter(deps: AppDeps, auth: Auth, limits: RateLimits) {
  const { db, env } = deps;
  const r = Router();

  r.get('/health', (_req, res) => {
    res.json({ status: 'ok', ai: deps.ai.name, mockAi: env.MOCK_AI });
  });

  // --- Website users -------------------------------------------------------
  r.post('/auth/guest', limits.userAuth, async (req, res) => {
    const body = parse(z.object({ displayName: z.string().trim().max(60).optional() }), req.body ?? {});
    res.status(201).json(await guestSignIn(db, env, body.displayName));
  });

  // Exchange a Supabase access token (Google / mobile OTP login on the
  // website) for an API session. A guest's history is merged into the account.
  r.post('/auth/supabase', limits.userAuth, auth.optionalUser, async (req, res) => {
    if (!deps.verifySupabaseToken) throw badRequest('Supabase login is not configured on this server.');
    const body = parse(z.object({ accessToken: z.string().min(20).max(4096) }), req.body);
    const identity = await deps.verifySupabaseToken(body.accessToken);
    if (!identity) throw unauthorized('That login has expired. Please sign in again.');
    res.json(await linkSupabase(db, env, identity, req.user?.id ?? null));
  });

  r.post('/auth/logout', auth.requireUser, async (req, res) => {
    await logoutUser(db, req.user!.sessionId);
    res.status(204).end();
  });

  r.get('/me', auth.requireUser, async (req, res) => {
    const [me, entitlement] = await Promise.all([profile(db, req.user!.id), getEntitlement(db, req.user!.id)]);
    res.json({ ...me, entitlement });
  });

  // --- Site settings + enrolment --------------------------------------------
  // The quotation under the site name, the plan and the popup text, as
  // edited in the admin console.
  r.get('/site', async (_req, res) => {
    res.set('Cache-Control', cache(60)).json(await getSiteSettings(db));
  });

  r.post('/enroll/order', limits.userAuth, auth.requireUser, async (req, res) => {
    res.status(201).json(await createOrder(db, env, req.user!.id));
  });

  // Razorpay: { orderId, paymentId, signature } — the signature is verified
  // with the secret on the server. Dev orders: { orderId } only.
  r.post('/enroll/confirm', limits.userAuth, auth.requireUser, async (req, res) => {
    const body = parse(
      z.object({
        orderId: z.uuid(),
        paymentId: z.string().trim().min(1).max(100).optional(),
        signature: z.string().trim().regex(/^[0-9a-f]{64}$/).optional(),
      }),
      req.body
    );
    const subscription = await confirmOrder(db, env, req.user!.id, body);
    res.json({ subscription, entitlement: await getEntitlement(db, req.user!.id) });
  });

  // --- Catalogue ------------------------------------------------------------
  r.get('/exams', async (req, res) => {
    const q = parse(z.object({ state: z.string().max(40).optional(), examType: z.string().max(40).optional() }), req.query);
    const rows = await db
      .select({
        id: exams.id,
        slug: exams.slug,
        name: exams.name,
        description: exams.description,
        stateCode: exams.stateCode,
        examType: exams.examType,
        defaultLanguage: exams.defaultLanguage,
      })
      .from(exams)
      .where(and(eq(exams.status, 'active'), q.state ? eq(exams.stateCode, q.state) : undefined, q.examType ? eq(exams.examType, q.examType) : undefined))
      .orderBy(asc(exams.name));
    res.set('Cache-Control', cache(300)).json({ items: rows });
  });

  r.get('/subjects', async (req, res) => {
    const q = parse(z.object({ examId: z.uuid() }), req.query);
    const rows = await db
      .select({ id: subjects.id, slug: subjects.slug, name: subjects.name, examId: subjects.examId })
      .from(subjects)
      .where(and(eq(subjects.examId, q.examId), eq(subjects.status, 'active')))
      .orderBy(asc(subjects.sortOrder), asc(subjects.name));
    res.set('Cache-Control', cache(300)).json({ items: rows });
  });

  r.get('/chapters', async (req, res) => {
    const q = parse(z.object({ subjectId: z.uuid() }), req.query);
    const rows = await db
      .select({ id: chapters.id, slug: chapters.slug, name: chapters.name, subjectId: chapters.subjectId })
      .from(chapters)
      .where(and(eq(chapters.subjectId, q.subjectId), eq(chapters.status, 'active')))
      .orderBy(asc(chapters.sortOrder), asc(chapters.name));
    res.set('Cache-Control', cache(300)).json({ items: rows });
  });

  // --- Mock tests -----------------------------------------------------------
  r.get('/mock-tests', async (req, res) => {
    const q = parse(
      z.object({ examId: optionalUuid, state: z.string().max(40).optional(), examType: z.string().max(40).optional(), ...pageQuery }),
      req.query
    );
    const list = await listMockTests(db, { ...q, stateCode: q.state, status: 'published' });
    res.set('Cache-Control', cache(60)).json({
      ...list,
      items: list.items.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        examId: t.examId,
        examName: t.examName,
        examSlug: t.examSlug,
        stateCode: t.stateCode,
        examType: t.examType,
        language: t.language,
        kind: t.kind,
        durationMinutes: t.durationMinutes,
        totalQuestions: t.totalQuestions,
        marksPerQuestion: t.marksPerQuestion,
        negativeMarks: t.negativeMarks,
        publishedAt: t.publishedAt,
        sections: t.sections,
      })),
    });
  });

  // Questions and options — never the answer key or explanations.
  r.get('/mock-tests/:id', async (req, res) => {
    const test = await getMockTest(db, idParam(req), { includeAnswers: false, publicOnly: true });
    res.set('Cache-Control', cache(60)).json(test);
  });

  // Free quota (2 full + 2 subject-wise by default) and the paid plan are
  // enforced here, never in the browser.
  r.post('/mock-tests/:id/start', limits.attempts, auth.requireUser, async (req, res) => {
    const id = idParam(req);
    const [test] = await db.select({ kind: mockTests.kind }).from(mockTests).where(and(eq(mockTests.id, id), eq(mockTests.status, 'published'))).limit(1);
    if (!test) throw notFound('Mock test not found');
    await assertCanStart(db, req.user!.id, id, test.kind);
    res.status(201).json(await startAttempt(db, req.user!.id, id, env.ATTEMPT_GRACE_SECONDS));
  });

  r.post('/mock-tests/:id/submit', limits.attempts, auth.requireUser, async (req, res) => {
    const body = parse(
      z.object({
        attemptId: z.uuid(),
        answers: z
          .array(
            z.object({
              questionId: z.uuid(),
              selectedOption: z.string().regex(/^[A-D]$/).nullable(),
              markedForReview: z.boolean().optional(),
              timeSpentSeconds: z.number().min(0).max(86_400).nullable().optional(),
            })
          )
          .max(500),
        // Anything the client claims about its score is ignored by design.
      }),
      req.body
    );
    res.json(await submitAttempt(db, req.user!.id, idParam(req), body.attemptId, body.answers, env.ATTEMPT_GRACE_SECONDS));
  });

  r.get('/attempts', auth.requireUser, async (req, res) => {
    res.json({ items: await listAttempts(db, req.user!.id) });
  });

  r.get('/attempts/:id', auth.requireUser, async (req, res) => {
    res.json(await getResult(db, req.user!.id, idParam(req)));
  });

  return r;
}

