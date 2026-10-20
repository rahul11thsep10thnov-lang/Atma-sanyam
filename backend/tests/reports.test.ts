import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { auditLogs, userReports } from '../src/database/schema.js';
import { adminToken, createAdmin, setupTestApp } from './helpers.js';

let ctx: Awaited<ReturnType<typeof setupTestApp>>;
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

interface Person { id: string; token: string }
const people: Record<string, Person> = {};
let adminTok = '';
let editorTok = '';

async function makePerson(name: string, phone: string): Promise<Person> {
  await request(ctx.app).post('/v1/auth/otp/request').send({ phone }).expect(202);
  const code = ctx.sms.lastCode(phone)!;
  const res = await request(ctx.app).post('/v1/auth/otp/verify').send({ phone, code });
  const token = res.body.token as string;
  await request(ctx.app).post('/v1/me/password').set(auth(token)).send({ newPassword: 'Tame@2026' }).expect(204);
  const me = await request(ctx.app).patch('/v1/me').set(auth(token)).send({ username: name }).expect(200);
  return { id: me.body.id, token };
}

beforeAll(async () => {
  ctx = await setupTestApp();
  people.asha = await makePerson('Asha', '+919876510001');
  people.bela = await makePerson('Bela', '+919876510002');
  people.chitra = await makePerson('Chitra', '+919876510003');
  await createAdmin(ctx.db, 'admin');
  await createAdmin(ctx.db, 'editor');
  adminTok = await adminToken(ctx.app, 'admin@example.com');
  editorTok = await adminToken(ctx.app, 'editor@example.com');
});
afterAll(async () => {
  await ctx.close();
});

describe('report this person', () => {
  it('needs a signed-in person, a valid reason and someone else', async () => {
    await request(ctx.app).post(`/v1/people/${people.bela!.id}/report`).send({ reason: 'spam' }).expect(401);
    await request(ctx.app).post(`/v1/people/${people.bela!.id}/report`).set(auth(people.asha!.token)).send({ reason: 'rude' }).expect(400);
    await request(ctx.app).post(`/v1/people/${people.asha!.id}/report`).set(auth(people.asha!.token)).send({ reason: 'spam' }).expect(400);
    await request(ctx.app)
      .post(`/v1/people/${people.bela!.id}/report`)
      .set(auth(people.asha!.token))
      .send({ reason: 'other', note: 'x'.repeat(501) })
      .expect(400);
    await request(ctx.app).post('/v1/people/00000000-0000-4000-8000-000000000000/report').set(auth(people.asha!.token)).send({ reason: 'spam' }).expect(404);
  });

  it('records a report once a day per person, and can block at the same time', async () => {
    await request(ctx.app).post('/v1/friends/requests').set(auth(people.asha!.token)).send({ userId: people.bela!.id }).expect(201);
    const first = await request(ctx.app)
      .post(`/v1/people/${people.bela!.id}/report`)
      .set(auth(people.asha!.token))
      .send({ reason: 'harassment', note: '  keeps poking me  ', context: 'friends' });
    expect(first.status).toBe(201);
    expect(first.body).toMatchObject({ duplicate: false, blocked: false });
    const again = await request(ctx.app)
      .post(`/v1/people/${people.bela!.id}/report`)
      .set(auth(people.asha!.token))
      .send({ reason: 'spam', block: true });
    expect(again.status).toBe(200);
    expect(again.body).toMatchObject({ reportId: first.body.reportId, duplicate: true, blocked: true });

    const rows = await ctx.db.select().from(userReports).where(eq(userReports.reportedId, people.bela!.id));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ reporterId: people.asha!.id, reason: 'harassment', note: 'keeps poking me', context: 'friends', status: 'open' });

    // The block ended the pending request and hides them from each other.
    const blocked = await request(ctx.app).get('/v1/people/blocked').set(auth(people.asha!.token)).expect(200);
    expect(blocked.body.items.map((p: { id: string }) => p.id)).toEqual([people.bela!.id]);
    const theirs = await request(ctx.app).get('/v1/friends').set(auth(people.bela!.token)).expect(200);
    expect(theirs.body.incoming).toEqual([]);
    expect(theirs.body.sent).toEqual([]);
  });

  it('only accepts a group focus the reporter was in', async () => {
    await request(ctx.app)
      .post(`/v1/people/${people.chitra!.id}/report`)
      .set(auth(people.asha!.token))
      .send({ reason: 'spam', context: 'group', groupSessionId: '00000000-0000-4000-8000-000000000000' })
      .expect(400);
  });
});

describe('admin reports', () => {
  it('lists reports with both people and lets an admin resolve them, with an audit entry', async () => {
    await request(ctx.app).post(`/v1/people/${people.bela!.id}/report`).set(auth(people.chitra!.token)).send({ reason: 'impersonation' }).expect(201);

    await request(ctx.app).get('/admin/v1/reports').set(auth(editorTok)).expect(403);
    const list = await request(ctx.app).get('/admin/v1/reports').query({ status: 'open' }).set(auth(adminTok)).expect(200);
    expect(list.body.total).toBe(2);
    const item = list.body.items[0];
    expect(item.reported).toMatchObject({ id: people.bela!.id, username: 'Bela' });
    expect(item.reporter).toMatchObject({ id: people.chitra!.id, username: 'Chitra' });
    expect(item.openReportsAboutReported).toBe(2);
    expect(JSON.stringify(list.body)).not.toContain('+9198765');

    await request(ctx.app).patch(`/admin/v1/reports/${item.id}`).set(auth(editorTok)).send({ status: 'resolved' }).expect(403);
    const done = await request(ctx.app).patch(`/admin/v1/reports/${item.id}`).set(auth(adminTok)).send({ status: 'resolved', resolutionNote: 'Warned' }).expect(200);
    expect(done.body).toMatchObject({ status: 'resolved', resolutionNote: 'Warned', resolvedBy: expect.any(String), openReportsAboutReported: 1 });
    expect(done.body.resolvedAt).toBeTruthy();
    const audits = await ctx.db.select().from(auditLogs).where(eq(auditLogs.action, 'report.resolved'));
    expect(audits).toHaveLength(1);

    const reopened = await request(ctx.app).patch(`/admin/v1/reports/${item.id}`).set(auth(adminTok)).send({ status: 'open' }).expect(200);
    expect(reopened.body).toMatchObject({ status: 'open', resolvedAt: null, resolvedBy: null });
  });

  it('keeps a report without the reporter when the reporter deletes their account, and drops reports about a deleted account', async () => {
    await request(ctx.app).delete('/v1/me').set(auth(people.chitra!.token)).send({ password: 'Tame@2026' }).expect(204);
    const left = await ctx.db.select().from(userReports).where(eq(userReports.reason, 'impersonation'));
    expect(left).toHaveLength(1);
    expect(left[0]!.reporterId).toBeNull();

    await request(ctx.app).delete('/v1/me').set(auth(people.bela!.token)).send({ password: 'Tame@2026' }).expect(204);
    expect(await ctx.db.select().from(userReports)).toHaveLength(0);
  });
});
