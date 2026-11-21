import request from 'supertest';
import { and, eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { abuseEvents, questions, users } from '../src/database/schema.js';
import { auth, adminToken, scopeIds, setupTestApp } from './helpers.js';

type Ctx = Awaited<ReturnType<typeof setupTestApp>>;

// Guest free-quota protection: shared device / network grouping, guest
// creation limits, sign-in path, admin policy and report.
describe('guest free-quota protection', () => {
  let ctx: Ctx;
  let admin: string;
  let ids: Awaited<ReturnType<typeof scopeIds>>;
  const full: string[] = [];

  /** A guest as a browser would create it: device id + user-agent headers. */
  async function guest(device: string | null, ua = 'Mozilla/5.0 (Linux; Android 14) PhoneA') {
    const req = request(ctx.app).post('/api/auth/guest').set('user-agent', ua);
    if (device) req.set('x-device-id', device);
    const res = await req.send({});
    return { res, token: res.body.token as string | undefined, device, ua };
  }
  const start = (g: { token?: string; device: string | null; ua: string }, testId: string) => {
    const req = request(ctx.app).post(`/api/mock-tests/${testId}/start`).set(auth(g.token!)).set('user-agent', g.ua);
    if (g.device) req.set('x-device-id', g.device);
    return req;
  };
  const policy = (patch: object) => request(ctx.app).put('/api/admin/access-policy').set(auth(admin)).send(patch);

  beforeAll(async () => {
    ctx = await setupTestApp();
    admin = await adminToken(ctx.app, ctx.db);
    ids = await scopeIds(ctx.app, admin);
    for (const [subjectId, chapterId] of [
      [ids.mathsId, ids.percentageId],
      [ids.reasoningId, ids.seriesId],
    ] as const) {
      const job = await request(ctx.app)
        .post('/api/admin/generation-jobs')
        .set(auth(admin))
        .send({ examId: ids.examId, subjectId, chapterId, language: 'en', questionCount: 20, difficulty: { easy: 30, medium: 50, hard: 20 } });
      await ctx.worker.drain({ ignoreBackoff: true });
      await ctx.db
        .update(questions)
        .set({ status: 'published', publishedAt: new Date() })
        .where(and(eq(questions.generationJobId, job.body.id), inArray(questions.status, ['approved', 'needs_review'])));
    }
    for (let i = 0; i < 3; i++) {
      const test = await request(ctx.app)
        .post('/api/admin/mock-tests/generate')
        .set(auth(admin))
        .send({
          examId: ids.examId,
          title: `Full ${i}`,
          language: 'en',
          totalQuestions: 4,
          durationMinutes: 10,
          marksPerQuestion: 1,
          negativeMarks: 0,
          difficulty: { easy: 30, medium: 50, hard: 20 },
          sections: [{ subjectId: ids.mathsId, count: 2 }, { subjectId: ids.reasoningId, count: 2 }],
        });
      expect(test.status, JSON.stringify(test.body)).toBe(201);
      await request(ctx.app).post(`/api/admin/mock-tests/${test.body.test.id}/publish`).set(auth(admin));
      full.push(test.body.test.id);
    }
  });
  afterAll(async () => ctx.close());

  it('guest accounts on one device share the free tests; the next guest is asked to sign in', async () => {
    const kind = (await request(ctx.app).get(`/api/mock-tests/${full[0]}`)).body.kind as 'full' | 'subject';
    const a = await guest('device-aaaaaaaaaaaaaaaa');
    expect(a.res.status).toBe(201);
    expect((await start(a, full[0]!)).status).toBe(201);
    expect((await start(a, full[1]!)).status).toBe(201);
    // Storage cleared → new guest account, same browser device id.
    const b = await guest('device-aaaaaaaaaaaaaaaa');
    const refused = await start(b, full[2]!);
    expect(refused.status).toBe(403);
    expect(refused.body.error.code).toBe('login_required');
    expect(refused.body.error.details).toMatchObject({ kind, scope: 'device' });
    // A test the first guest already started can still be resumed.
    expect((await start(a, full[0]!)).status).toBe(201);
    const events = await ctx.db.select().from(abuseEvents).where(eq(abuseEvents.kind, 'free_quota_device'));
    expect(events.length).toBeGreaterThanOrEqual(1);
    // Only hashes are stored, never the raw device id.
    expect(JSON.stringify(events)).not.toContain('device-aaaaaaaaaaaaaaaa');
  });

  it('a reset device id on the same network and browser is still grouped (with a higher limit)', async () => {
    // Network limit = free quota (2) × 3 = 6 free tests per network + browser.
    const ua = 'Mozilla/5.0 (Linux; Android 14) PhoneB';
    let refused = null;
    for (let i = 0; i < 5 && !refused; i++) {
      const g = await guest(null, ua); // cleared storage: no device id at all
      for (const t of full.slice(0, 2)) {
        const r = await start(g, t);
        if (r.status === 403) refused = r;
        else expect(r.status).toBe(201);
      }
    }
    expect(refused?.body.error.details).toMatchObject({ scope: 'network' });
  });

  it('people on the same Wi-Fi with different phones are not affected', async () => {
    const g = await guest('device-bbbbbbbbbbbbbbbb', 'Mozilla/5.0 (iPhone) PhoneC');
    expect((await start(g, full[0]!)).status).toBe(201);
    expect((await start(g, full[1]!)).status).toBe(201);
  });

  it('a signed-in (verified) account is counted per account only', async () => {
    const g = await guest('device-aaaaaaaaaaaaaaaa');
    // Turn this guest into a verified account (as the Supabase login would).
    const me = await request(ctx.app).get('/api/me').set(auth(g.token!));
    await ctx.db.update(users).set({ authProvider: 'supabase', externalId: 'verified-1' }).where(eq(users.id, me.body.id));
    expect((await start(g, full[2]!)).status).toBe(201);
  });

  it('limits new guest accounts per device per day', async () => {
    expect((await policy({ maxGuestAccountsPerDevicePerDay: 3 })).status).toBe(200);
    const statuses: number[] = [];
    for (let i = 0; i < 5; i++) statuses.push((await guest('device-cccccccccccccccc', 'UA-D')).res.status);
    expect(statuses.slice(0, 3)).toEqual([201, 201, 201]);
    expect(statuses[3]).toBe(429);
    const last = await guest('device-cccccccccccccccc', 'UA-D');
    expect(last.res.body.error.code).toBe('login_required');
  });

  it('the policy can be switched off and is validated; the report shows events without personal data', async () => {
    expect((await policy({ windowDays: 0 })).status).toBe(400);
    const off = await policy({ enabled: false });
    expect(off.body.policy.enabled).toBe(false);
    const g = await guest('device-aaaaaaaaaaaaaaaa');
    expect(g.res.status).toBe(201);
    expect((await start(g, full[2]!)).status).toBe(201);
    await policy({ enabled: true });

    const report = await request(ctx.app).get('/api/admin/access-policy?days=7').set(auth(admin));
    expect(report.status).toBe(200);
    expect(report.body.report.byKind.map((k: { kind: string }) => k.kind)).toEqual(
      expect.arrayContaining(['free_quota_device', 'free_quota_network', 'guest_accounts_per_device'])
    );
    expect(report.body.report.recent[0].device === null || report.body.report.recent[0].device.length === 8).toBe(true);
    // Reviewers (no settings permission) cannot read or change it.
    const reviewer = await adminToken(ctx.app, ctx.db, 'reviewer');
    expect((await request(ctx.app).get('/api/admin/access-policy').set(auth(reviewer))).status).toBe(403);
  });
});
