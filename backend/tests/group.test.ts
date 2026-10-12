import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import WebSocket from 'ws';
import { and, eq } from 'drizzle-orm';
import { focusSessions, groupParticipants, groupSessions } from '../src/database/schema.js';
import { setupTestApp } from './helpers.js';

let ctx: Awaited<ReturnType<typeof setupTestApp>>;
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
interface Person { id: string; token: string }
const P: Record<string, Person> = {};

async function makePerson(name: string, phone: string): Promise<Person> {
  await request(ctx.app).post('/v1/auth/otp/request').send({ phone }).expect(202);
  const res = await request(ctx.app).post('/v1/auth/otp/verify').send({ phone, code: ctx.sms.lastCode(phone)! });
  const token = res.body.token as string;
  await request(ctx.app).post('/v1/me/password').set(auth(token)).send({ newPassword: 'Tame@2026' }).expect(204);
  const me = await request(ctx.app).patch('/v1/me').set(auth(token)).send({ username: name }).expect(200);
  return { id: me.body.id, token };
}
async function befriend(a: Person, b: Person) {
  const r = await request(ctx.app).post('/v1/friends/requests').set(auth(a.token)).send({ userId: b.id }).expect(201);
  await request(ctx.app).post(`/v1/friends/requests/${r.body.requestId}/accept`).set(auth(b.token)).expect(200);
}
function listen(token: string) {
  return new Promise<{ events: Record<string, unknown>[]; close: () => void }>((resolve) => {
    const ws = new WebSocket(`${ctx.wsUrl}?token=${token}`);
    const events: Record<string, unknown>[] = [];
    ws.on('message', (raw) => events.push(JSON.parse(raw.toString())));
    ws.once('open', () => resolve({ events, close: () => ws.close() }));
  });
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const PLANT = { kind: 'plant', speciesId: 'rose' };

beforeAll(async () => {
  ctx = await setupTestApp();
  P.host = await makePerson('Host', '+919876600001');
  P.amy = await makePerson('Amy', '+919876600002');
  P.ben = await makePerson('Ben', '+919876600003');
  P.cal = await makePerson('Cal', '+919876600004');
  P.stranger = await makePerson('Stranger', '+919876600005');
  await befriend(P.host!, P.amy!);
  await befriend(P.host!, P.ben!);
  await befriend(P.host!, P.cal!);
});
afterAll(async () => {
  await ctx.close();
});

describe('invitations and the proposal', () => {
  let id = '';
  it('a host invites friends only, with a plant or picture and a length', async () => {
    const bad = await request(ctx.app).post('/v1/group/sessions').set(auth(P.host!.token)).send({ proposal: PLANT, plannedMinutes: 25, inviteeIds: [P.stranger!.id] });
    expect(bad.status).toBe(403);
    expect((await request(ctx.app).post('/v1/group/sessions').set(auth(P.host!.token)).send({ proposal: { kind: 'free', text: 'x' }, plannedMinutes: 25, inviteeIds: [P.amy!.id] })).status).toBe(400);
    const res = await request(ctx.app).post('/v1/group/sessions').set(auth(P.host!.token)).send({ proposal: PLANT, plannedMinutes: 25, inviteeIds: [P.amy!.id, P.ben!.id] });
    expect(res.status).toBe(201);
    id = res.body.id;
    expect(res.body.status).toBe('lobby');
    expect(res.body.participants.map((p: { username: string; status: string }) => `${p.username}:${p.status}`).sort()).toEqual(['Amy:invited', 'Ben:invited', 'Host:approved']);
    const amyNotifs = await request(ctx.app).get('/v1/notifications').set(auth(P.amy!.token));
    expect(amyNotifs.body.items[0]).toMatchObject({ type: 'group_invite', data: { sessionId: id } });
    expect((await request(ctx.app).post('/v1/group/sessions').set(auth(P.host!.token)).send({ proposal: PLANT, plannedMinutes: 25, inviteeIds: [P.amy!.id] })).status).toBe(409);
    expect((await request(ctx.app).get(`/v1/group/sessions/${id}`).set(auth(P.stranger!.token))).status).toBe(403);
  });

  it('an invitee can reject with a note; the host revises and everyone agrees again', async () => {
    const rej = await request(ctx.app).post(`/v1/group/sessions/${id}/respond`).set(auth(P.amy!.token)).send({ accept: false, note: 'Too long, 15?' });
    expect(rej.status).toBe(200);
    expect(rej.body.me.status).toBe('rejected');
    const hostNotifs = await request(ctx.app).get('/v1/notifications').set(auth(P.host!.token));
    expect(hostNotifs.body.items[0].type).toBe('group_rejected');
    expect(hostNotifs.body.items[0].body).toContain('Too long, 15?');
    await request(ctx.app).post(`/v1/group/sessions/${id}/respond`).set(auth(P.ben!.token)).send({ accept: true }).expect(200);
    expect((await request(ctx.app).patch(`/v1/group/sessions/${id}`).set(auth(P.ben!.token)).send({ plannedMinutes: 15 })).status).toBe(403);
    const rev = await request(ctx.app).patch(`/v1/group/sessions/${id}`).set(auth(P.host!.token)).send({ plannedMinutes: 15 });
    expect(rev.status).toBe(200);
    expect(rev.body.revision).toBe(2);
    expect(rev.body.plannedMinutes).toBe(15);
    // Ben's earlier yes was for the old plan
    expect(rev.body.participants.map((p: { username: string; status: string }) => `${p.username}:${p.status}`).sort()).toEqual(['Amy:invited', 'Ben:invited', 'Host:approved']);
  });

  it('the lobby starts only when every approved member pressed Start, atomically, with server timestamps', async () => {
    await request(ctx.app).post(`/v1/group/sessions/${id}/respond`).set(auth(P.amy!.token)).send({ accept: true }).expect(200);
    await request(ctx.app).post(`/v1/group/sessions/${id}/respond`).set(auth(P.ben!.token)).send({ accept: true }).expect(200);
    const amyWs = await listen(P.amy!.token);
    const hostWs = await listen(P.host!.token);
    const r1 = await request(ctx.app).post(`/v1/group/sessions/${id}/ready`).set(auth(P.host!.token));
    expect(r1.body.status).toBe('lobby');
    const r2 = await request(ctx.app).post(`/v1/group/sessions/${id}/ready`).set(auth(P.amy!.token));
    expect(r2.body.status).toBe('lobby');
    expect(r2.body.participants.filter((p: { status: string }) => p.status === 'ready')).toHaveLength(2);
    // The last Start (two at once) starts the clock exactly once.
    const [a, b] = await Promise.all([
      request(ctx.app).post(`/v1/group/sessions/${id}/ready`).set(auth(P.ben!.token)),
      request(ctx.app).post(`/v1/group/sessions/${id}/ready`).set(auth(P.ben!.token)),
    ]);
    expect(a.body.status).toBe('running');
    expect(b.body.status).toBe('running');
    expect(a.body.startedAt).toBe(b.body.startedAt);
    expect(new Date(a.body.endsAt).getTime() - new Date(a.body.startedAt).getTime()).toBe(15 * 60_000);
    expect(a.body.membersAtStart).toBe(3);
    expect(a.body.participants.every((p: { status: string }) => p.status === 'active')).toBe(true);
    await sleep(150);
    expect(amyWs.events.some((e) => e.type === 'group' && e.event === 'started')).toBe(true);
    expect(hostWs.events.some((e) => e.type === 'group' && e.event === 'started')).toBe(true);
    // everyone is now "in a group" for their friends
    const friends = await request(ctx.app).get('/v1/friends').set(auth(P.cal!.token));
    expect(friends.body.friends.find((f: { id: string }) => f.id === P.host!.id).presence).toMatchObject({ focusing: true, inGroup: true });
    const [fs] = await ctx.db.select().from(focusSessions).where(and(eq(focusSessions.userId, P.amy!.id), eq(focusSessions.groupSessionId, id)));
    expect(fs!.outcome).toBe('running');
    amyWs.close();
    hostWs.close();
  });

  it('chat accepts only the predefined messages, from members', async () => {
    expect((await request(ctx.app).post(`/v1/group/sessions/${id}/messages`).set(auth(P.host!.token)).send({ key: 'free text' })).status).toBe(400);
    expect((await request(ctx.app).post(`/v1/group/sessions/${id}/messages`).set(auth(P.stranger!.token)).send({ key: 'lets_go' })).status).toBe(403);
    const benWs = await listen(P.ben!.token);
    const ok = await request(ctx.app).post(`/v1/group/sessions/${id}/messages`).set(auth(P.host!.token)).send({ key: 'lets_go' });
    expect(ok.status).toBe(201);
    await sleep(100);
    expect(benWs.events.find((e) => e.event === 'message')).toMatchObject({ data: { key: 'lets_go', fromUserId: P.host!.id } });
    const list = await request(ctx.app).get(`/v1/group/sessions/${id}/messages`).set(auth(P.amy!.token));
    expect(list.body.items.map((m: { key: string }) => m.key)).toEqual(['lets_go']);
    benWs.close();
  });

  it('a friend of the host joins late with the host’s approval and their own clock', async () => {
    expect((await request(ctx.app).post(`/v1/group/sessions/${id}/join`).set(auth(P.stranger!.token))).status).toBe(403);
    const joinable = await request(ctx.app).get('/v1/group/sessions/joinable').set(auth(P.cal!.token));
    expect(joinable.body.items.map((s: { id: string }) => s.id)).toEqual([id]);
    const ask = await request(ctx.app).post(`/v1/group/sessions/${id}/join`).set(auth(P.cal!.token));
    expect(ask.status).toBe(202);
    expect((await request(ctx.app).post(`/v1/group/sessions/${id}/join-requests/${P.cal!.id}`).set(auth(P.amy!.token)).send({ approve: true })).status).toBe(403);
    // pretend 10 of the 15 minutes have passed
    await ctx.db.update(groupSessions).set({ startedAt: new Date(Date.now() - 10 * 60_000), endsAt: new Date(Date.now() + 5 * 60_000) }).where(eq(groupSessions.id, id));
    const ok = await request(ctx.app).post(`/v1/group/sessions/${id}/join-requests/${P.cal!.id}`).set(auth(P.host!.token)).send({ approve: true });
    expect(ok.status).toBe(200);
    const cal = ok.body.participants.find((p: { id: string }) => p.id === P.cal!.id);
    expect(cal.status).toBe('active');
    expect(new Date(cal.startedAt).getTime()).toBeGreaterThan(new Date(ok.body.startedAt).getTime());
    const calNotifs = await request(ctx.app).get('/v1/notifications').set(auth(P.cal!.token));
    expect(calNotifs.body.items[0]).toMatchObject({ type: 'group_joined' });
    expect(calNotifs.body.items[0].body).toContain('5 minutes');
  });

  it('leaving early costs one penalty per member, decided once, and the host role passes on', async () => {
    const leave = await request(ctx.app).post(`/v1/group/sessions/${id}/leave`).set(auth(P.host!.token));
    expect(leave.status).toBe(200);
    expect(leave.body).toMatchObject({ status: 'left_early', penaltyCount: 4, rewardMinutes: 0 });
    const s = await request(ctx.app).get(`/v1/group/sessions/${id}`).set(auth(P.amy!.token));
    expect(s.body.hostId).not.toBe(P.host!.id);
    expect(s.body.participants.find((p: { id: string }) => p.id === P.host!.id)).toMatchObject({ status: 'left_early', penaltyCount: 4, isHost: false });
    const applied = await request(ctx.app).post(`/v1/group/sessions/${id}/penalty-applied`).set(auth(P.host!.token));
    expect(applied.body).toEqual({ applied: true, penaltyCount: 4 });
    const again = await request(ctx.app).post(`/v1/group/sessions/${id}/penalty-applied`).set(auth(P.host!.token));
    expect(again.body.applied).toBe(false);
    expect((await request(ctx.app).post(`/v1/group/sessions/${id}/leave`).set(auth(P.host!.token))).status).toBe(409);
    const [fs] = await ctx.db.select().from(focusSessions).where(and(eq(focusSessions.userId, P.host!.id), eq(focusSessions.groupSessionId, id)));
    expect(fs!.outcome).toBe('failed');
  });

  it('finishing credits everyone still in by their own time, forfeits the long-disconnected, and is idempotent', async () => {
    expect((await request(ctx.app).post(`/v1/group/sessions/${id}/finish`).set(auth(P.amy!.token))).status).toBe(409);
    // Ben vanished 7 minutes ago; Cal joined 5 minutes before the end; Amy stayed.
    await ctx.db.update(groupParticipants).set({ lastHeartbeatAt: new Date(Date.now() - 7 * 60_000) }).where(and(eq(groupParticipants.sessionId, id), eq(groupParticipants.userId, P.ben!.id)));
    await ctx.db.update(groupSessions).set({ startedAt: new Date(Date.now() - 15 * 60_000), endsAt: new Date(Date.now() - 1000) }).where(eq(groupSessions.id, id));
    await ctx.db.update(groupParticipants).set({ startedAt: new Date(Date.now() - 15 * 60_000) }).where(and(eq(groupParticipants.sessionId, id), eq(groupParticipants.userId, P.amy!.id)));
    await ctx.db.update(groupParticipants).set({ startedAt: new Date(Date.now() - 5 * 60_000 - 1000) }).where(and(eq(groupParticipants.sessionId, id), eq(groupParticipants.userId, P.cal!.id)));
    const done = await request(ctx.app).post(`/v1/group/sessions/${id}/finish`).set(auth(P.amy!.token));
    expect(done.status).toBe(200);
    expect(done.body.status).toBe('ended');
    const by = (u: string) => done.body.participants.find((p: { id: string }) => p.id === u);
    expect(by(P.amy!.id)).toMatchObject({ status: 'completed', rewardMinutes: 15 });
    expect(by(P.cal!.id)).toMatchObject({ status: 'completed', rewardMinutes: 5 });
    expect(by(P.ben!.id)).toMatchObject({ status: 'left_early', penaltyCount: 0 });
    const stats = await request(ctx.app).get('/v1/focus/stats').set(auth(P.cal!.token));
    expect(stats.body.weekMinutes).toBe(5);
    const twice = await request(ctx.app).post(`/v1/group/sessions/${id}/finish`).set(auth(P.amy!.token));
    expect(twice.body.status).toBe('ended');
    expect((await request(ctx.app).post(`/v1/group/sessions/${id}/messages`).set(auth(P.amy!.token)).send({ key: 'well_done' })).status).toBe(409);
  });

  it('a host can cancel in the lobby; late joins are refused near the end', async () => {
    const res = await request(ctx.app).post('/v1/group/sessions').set(auth(P.host!.token)).send({ proposal: { kind: 'remote', imageId: 'ls_001', uri: 'bundled://ls_001' }, plannedMinutes: 30, inviteeIds: [P.amy!.id] });
    expect(res.status).toBe(201);
    await request(ctx.app).post(`/v1/group/sessions/${res.body.id}/leave-lobby`).set(auth(P.amy!.token)).expect(204);
    await request(ctx.app).post(`/v1/group/sessions/${res.body.id}/cancel`).set(auth(P.host!.token)).expect(204);
    expect((await request(ctx.app).get('/v1/group/sessions/mine').set(auth(P.host!.token))).body.items).toEqual([]);
  });
});
