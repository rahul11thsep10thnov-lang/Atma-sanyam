import request from 'supertest';
import { and, eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { questions } from '../src/database/schema.js';
import { createApp } from '../src/app.js';
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

describe('enrolment: free quota, plan and site settings', () => {
  let ctx: Ctx;
  let admin: string;
  let ids: Awaited<ReturnType<typeof scopeIds>>;
  const full: string[] = [];
  const subject: string[] = [];

  async function publishTest(kind: 'full' | 'subject', n: number) {
    const sections = kind === 'full' ? [{ subjectId: ids.mathsId, count: 3 }, { subjectId: ids.reasoningId, count: 3 }] : [{ subjectId: ids.mathsId, count: 6 }];
    const res = await request(ctx.app)
      .post('/api/admin/mock-tests/generate')
      .set(auth(admin))
      .send({
        examId: ids.examId,
        title: `${kind} ${n}`,
        language: 'en',
        totalQuestions: 6,
        durationMinutes: 10,
        marksPerQuestion: 1,
        negativeMarks: 0,
        difficulty: { easy: 30, medium: 50, hard: 20 },
        sections,
      });
    expect(res.status).toBe(201);
    expect(res.body.test.kind).toBe(kind);
    const pub = await request(ctx.app).post(`/api/admin/mock-tests/${res.body.test.id}/publish`).set(auth(admin));
    expect(pub.status).toBe(200);
    return res.body.test.id as string;
  }

  beforeAll(async () => {
    ctx = await setupTestApp({ env: { ENROLL_DEV_ACTIVATE: 'true' } });
    admin = await adminToken(ctx.app, ctx.db);
    ids = await scopeIds(ctx.app, admin);
    await publishedBank(ctx, admin, ids.mathsId, ids.percentageId, 40);
    await publishedBank(ctx, admin, ids.reasoningId, ids.seriesId, 40);
    for (let i = 1; i <= 3; i++) full.push(await publishTest('full', i));
    for (let i = 1; i <= 3; i++) subject.push(await publishTest('subject', i));
  });
  afterAll(async () => ctx.close());

  it('serves the site settings publicly and lets an admin change the quote', async () => {
    const before = await request(ctx.app).get('/api/site');
    expect(before.status).toBe(200);
    expect(before.body.plan).toEqual({ name: 'Mock Test Pass', priceInr: 49, listPriceInr: 299, durationDays: 365 });
    expect(before.body.freeQuota).toEqual({ full: 2, subject: 2 });
    expect(before.body.quote).toMatch(/उद्यमेन/);

    const put = await request(ctx.app).put('/api/admin/site-settings').set(auth(admin)).send({ quote: 'श्रम ही पूजा है', plan: { priceInr: 59 } });
    expect(put.status).toBe(200);
    expect(put.body.site.quote).toBe('श्रम ही पूजा है');
    expect(put.body.site.plan.priceInr).toBe(59);
    expect(put.body.site.plan.listPriceInr).toBe(299);

    const after = await request(ctx.app).get('/api/site');
    expect(after.body.quote).toBe('श्रम ही पूजा है');
    // Restore for the quota tests below.
    await request(ctx.app).put('/api/admin/site-settings').set(auth(admin)).send({ plan: { priceInr: 49 } });
  });

  it('rejects invalid site settings', async () => {
    const res = await request(ctx.app).put('/api/admin/site-settings').set(auth(admin)).send({ freeQuota: { full: -1 } });
    expect(res.status).toBe(400);
  });

  it('allows 2 full + 2 subject tests, then requires the plan (402), and enrolment lifts the limit', async () => {
    const user = await userToken(ctx.app, 'Quota');
    const start = (id: string) => request(ctx.app).post(`/api/mock-tests/${id}/start`).set(auth(user));

    expect((await start(full[0]!)).status).toBe(201);
    expect((await start(full[1]!)).status).toBe(201);
    // Resuming / retaking an already-started test never costs a slot.
    expect((await start(full[0]!)).status).toBe(201);
    const third = await start(full[2]!);
    expect(third.status).toBe(402);
    expect(third.body.error.code).toBe('subscription_required');
    expect(third.body.error.details.kind).toBe('full');

    // Subject-wise quota is separate.
    expect((await start(subject[0]!)).status).toBe(201);
    expect((await start(subject[1]!)).status).toBe(201);
    expect((await start(subject[2]!)).status).toBe(402);

    const me = await request(ctx.app).get('/api/me').set(auth(user));
    expect(me.body.entitlement.subscribed).toBe(false);
    expect(me.body.entitlement.freeQuota.full).toEqual({ used: 2, limit: 2, remaining: 0 });
    expect(me.body.entitlement.freeQuota.subject).toEqual({ used: 2, limit: 2, remaining: 0 });

    // Enrol (dev order: no payment gateway configured in tests).
    const order = await request(ctx.app).post('/api/enroll/order').set(auth(user));
    expect(order.status).toBe(201);
    expect(order.body.provider).toBe('dev');
    expect(order.body.amountInr).toBe(49);
    expect(order.body.listPriceInr).toBe(299);
    expect(order.body.keyId).toBeUndefined();

    const confirm = await request(ctx.app).post('/api/enroll/confirm').set(auth(user)).send({ orderId: order.body.orderId });
    expect(confirm.status).toBe(200);
    expect(confirm.body.subscription.status).toBe('active');
    expect(confirm.body.entitlement.subscribed).toBe(true);
    const expires = Date.parse(confirm.body.subscription.expiresAt);
    expect(expires - Date.now()).toBeGreaterThan(364 * 86_400_000);

    expect((await start(full[2]!)).status).toBe(201);
    expect((await start(subject[2]!)).status).toBe(201);

    // Confirming again is harmless; a second order is refused while active.
    expect((await request(ctx.app).post('/api/enroll/confirm').set(auth(user)).send({ orderId: order.body.orderId })).status).toBe(200);
    expect((await request(ctx.app).post('/api/enroll/order').set(auth(user))).status).toBe(409);
  });

  it('never activates another user’s order', async () => {
    const a = await userToken(ctx.app, 'A');
    const b = await userToken(ctx.app, 'B');
    const order = await request(ctx.app).post('/api/enroll/order').set(auth(a));
    const res = await request(ctx.app).post('/api/enroll/confirm').set(auth(b)).send({ orderId: order.body.orderId });
    expect(res.status).toBe(404);
  });

  it('refuses dev activation when it is switched off', async () => {
    // Same database, different setting. (A second setupTestApp() would wipe
    // the shared database when the suite runs on a real PostgreSQL server.)
    const strict = createApp({ ...ctx.deps, env: { ...ctx.deps.env, ENROLL_DEV_ACTIVATE: false } }, { disableRateLimits: true, logRequests: false });
    const user = await userToken(strict, 'Strict');
    const res = await request(strict).post('/api/enroll/order').set(auth(user));
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('payment_not_configured');
  });

  it('lets an admin grant the plan and shows it on the users list', async () => {
    const user = await userToken(ctx.app, 'Granted');
    const me = await request(ctx.app).get('/api/me').set(auth(user));
    const grant = await request(ctx.app).post(`/api/admin/users/${me.body.id}/subscription`).set(auth(admin)).send({ days: 30, note: 'support' });
    expect(grant.status).toBe(201);
    expect(grant.body.subscription.provider).toBe('manual');
    const list = await request(ctx.app).get('/api/admin/users').set(auth(admin));
    const row = list.body.items.find((u: { id: string }) => u.id === me.body.id);
    expect(row.subscription.status).toBe('active');
    const reviewer = await adminToken(ctx.app, ctx.db, 'reviewer');
    expect((await request(ctx.app).post(`/api/admin/users/${me.body.id}/subscription`).set(auth(reviewer)).send({})).status).toBe(403);
  });
});
