import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import WebSocket from 'ws';
import { eq } from 'drizzle-orm';
import { focusSessions, pokes, users } from '../src/database/schema.js';
import { setupTestApp } from './helpers.js';

let ctx: Awaited<ReturnType<typeof setupTestApp>>;
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

interface Person { id: string; token: string; phone: string; username: string }
const people: Record<string, Person> = {};

async function makePerson(name: string, phone: string): Promise<Person> {
  await request(ctx.app).post('/v1/auth/otp/request').send({ phone }).expect(202);
  const code = ctx.sms.lastCode(phone)!;
  const res = await request(ctx.app).post('/v1/auth/otp/verify').send({ phone, code });
  const token = res.body.token as string;
  await request(ctx.app).post('/v1/me/password').set(auth(token)).send({ newPassword: 'Tame@2026' }).expect(204);
  const me = await request(ctx.app).patch('/v1/me').set(auth(token)).send({ username: name }).expect(200);
  return { id: me.body.id, token, phone, username: name };
}

function connect(token: string): Promise<{ ws: WebSocket; events: Record<string, unknown>[]; next: (type: string, timeoutMs?: number) => Promise<Record<string, unknown>> }> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${ctx.wsUrl}?token=${token}`);
    const events: Record<string, unknown>[] = [];
    const waiters: { type: string; resolve: (e: Record<string, unknown>) => void }[] = [];
    ws.on('message', (raw) => {
      const e = JSON.parse(raw.toString()) as Record<string, unknown>;
      const i = waiters.findIndex((w) => w.type === e.type);
      if (i >= 0) waiters.splice(i, 1)[0]!.resolve(e);
      else events.push(e);
    });
    ws.on('error', reject);
    const next = (type: string, timeoutMs = 3000) =>
      new Promise<Record<string, unknown>>((res, rej) => {
        const found = events.find((e) => e.type === type);
        if (found) {
          events.splice(events.indexOf(found), 1);
          return res(found);
        }
        const timer = setTimeout(() => rej(new Error(`no ${type} event within ${timeoutMs} ms`)), timeoutMs);
        waiters.push({ type, resolve: (e) => { clearTimeout(timer); res(e); } });
      });
    ws.once('open', () => resolve({ ws, events, next }));
  });
}

beforeAll(async () => {
  ctx = await setupTestApp();
  people.asha = await makePerson('Asha', '+919876500001');
  people.bela = await makePerson('Bela', '+919876500002');
  people.chitra = await makePerson('Chitra', '+919876500003');
  people.dev = await makePerson('Dev', '+919876500004');
});
afterAll(async () => {
  await ctx.close();
});

describe('people search', () => {
  it('finds people by part of a username, never itself, with the relation', async () => {
    const res = await request(ctx.app).get('/v1/people/search').query({ q: 'A' }).set(auth(people.asha!.token));
    expect(res.status).toBe(400); // at least two characters
    const two = await request(ctx.app).get('/v1/people/search').query({ q: 'ra' }).set(auth(people.asha!.token));
    expect(two.status).toBe(200);
    expect(two.body.items.map((p: { username: string }) => p.username)).toEqual(['Chitra']);
    const self = await request(ctx.app).get('/v1/people/search').query({ q: '@ash' }).set(auth(people.asha!.token));
    expect(self.body.items).toEqual([]);
    expect(two.body.items[0].relation).toBe('none');
    expect(JSON.stringify(two.body)).not.toContain('+9198765');
  });

  it('finds a person by exact mobile number only when they allow it', async () => {
    const found = await request(ctx.app).get('/v1/people/search').query({ q: '98765 00002' }).set(auth(people.asha!.token));
    expect(found.body.items.map((p: { id: string }) => p.id)).toEqual([people.bela!.id]);
    await request(ctx.app).patch('/v1/me').set(auth(people.bela!.token)).send({ discoverableByPhone: false }).expect(200);
    const hidden = await request(ctx.app).get('/v1/people/search').query({ q: '+919876500002' }).set(auth(people.asha!.token));
    expect(hidden.body.items).toEqual([]);
    await request(ctx.app).patch('/v1/me').set(auth(people.bela!.token)).send({ discoverableByPhone: true }).expect(200);
    expect((await request(ctx.app).get('/v1/people/search').query({ q: 'bel' })).status).toBe(401);
    expect((await request(ctx.app).get('/v1/people/search').query({ q: 'bel' }).set(auth(people.asha!.token))).status).toBe(200);
  });
});

describe('friend requests', () => {
  let requestId = '';

  it('sends a request once, never to oneself, and notifies the other person', async () => {
    const self = await request(ctx.app).post('/v1/friends/requests').set(auth(people.asha!.token)).send({ userId: people.asha!.id });
    expect(self.status).toBe(400);
    const res = await request(ctx.app).post('/v1/friends/requests').set(auth(people.asha!.token)).send({ userId: people.bela!.id });
    expect(res.status).toBe(201);
    requestId = res.body.requestId;
    const dup = await request(ctx.app).post('/v1/friends/requests').set(auth(people.asha!.token)).send({ userId: people.bela!.id });
    expect(dup.status).toBe(409);
    const lists = await request(ctx.app).get('/v1/friends').set(auth(people.bela!.token));
    expect(lists.body.incoming.map((r: { requestId: string }) => r.requestId)).toEqual([requestId]);
    const mine = await request(ctx.app).get('/v1/friends').set(auth(people.asha!.token));
    expect(mine.body.sent.map((r: { requestId: string }) => r.requestId)).toEqual([requestId]);
    const notifs = await request(ctx.app).get('/v1/notifications').set(auth(people.bela!.token));
    expect(notifs.body.unread).toBe(1);
    expect(notifs.body.items[0].type).toBe('friend_request');
    expect(notifs.body.items[0].data.requestId).toBe(requestId);
    // Bela is offline, so the notification went to push as well (she has no device: nothing sent, no error).
    expect(ctx.push.sent).toHaveLength(0);
  });

  it('only the addressee can accept; both become friends and the requester is told', async () => {
    expect((await request(ctx.app).post(`/v1/friends/requests/${requestId}/accept`).set(auth(people.chitra!.token))).status).toBe(404);
    expect((await request(ctx.app).post(`/v1/friends/requests/${requestId}/accept`).set(auth(people.asha!.token))).status).toBe(404);
    const ok = await request(ctx.app).post(`/v1/friends/requests/${requestId}/accept`).set(auth(people.bela!.token));
    expect(ok.status).toBe(200);
    const asha = await request(ctx.app).get('/v1/friends').set(auth(people.asha!.token));
    expect(asha.body.friends.map((f: { id: string }) => f.id)).toEqual([people.bela!.id]);
    expect(asha.body.friends[0].presence).toMatchObject({ online: false, focusing: false, inGroup: false });
    expect(asha.body.friends[0].leadsMe).toBe(false);
    const notifs = await request(ctx.app).get('/v1/notifications').set(auth(people.asha!.token));
    expect(notifs.body.items[0].type).toBe('friend_accepted');
    expect((await request(ctx.app).post('/v1/friends/requests').set(auth(people.asha!.token)).send({ userId: people.bela!.id })).status).toBe(409);
  });

  it('a request to someone who already asked you simply accepts', async () => {
    await request(ctx.app).post('/v1/friends/requests').set(auth(people.chitra!.token)).send({ userId: people.dev!.id }).expect(201);
    const res = await request(ctx.app).post('/v1/friends/requests').set(auth(people.dev!.token)).send({ userId: people.chitra!.id });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('accepted');
  });

  it('declines quietly and allows asking again; cancels a sent request', async () => {
    const r1 = await request(ctx.app).post('/v1/friends/requests').set(auth(people.asha!.token)).send({ userId: people.chitra!.id }).expect(201);
    await request(ctx.app).post(`/v1/friends/requests/${r1.body.requestId}/decline`).set(auth(people.chitra!.token)).expect(200);
    const ashaNotifs = await request(ctx.app).get('/v1/notifications').set(auth(people.asha!.token));
    expect(ashaNotifs.body.items.some((n: { type: string }) => n.type === 'friend_declined')).toBe(false);
    const r2 = await request(ctx.app).post('/v1/friends/requests').set(auth(people.asha!.token)).send({ userId: people.chitra!.id });
    expect(r2.status).toBe(201);
    await request(ctx.app).delete(`/v1/friends/requests/${r2.body.requestId}`).set(auth(people.asha!.token)).expect(204);
    const chitra = await request(ctx.app).get('/v1/friends').set(auth(people.chitra!.token));
    expect(chitra.body.incoming).toEqual([]);
  });

  it('blocking hides the person from search and refuses requests both ways', async () => {
    await request(ctx.app).post(`/v1/people/${people.asha!.id}/block`).set(auth(people.chitra!.token)).expect(204);
    expect((await request(ctx.app).post('/v1/friends/requests').set(auth(people.asha!.token)).send({ userId: people.chitra!.id })).status).toBe(403);
    expect((await request(ctx.app).post('/v1/friends/requests').set(auth(people.chitra!.token)).send({ userId: people.asha!.id })).status).toBe(403);
    const search = await request(ctx.app).get('/v1/people/search').query({ q: 'chitra' }).set(auth(people.asha!.token));
    expect(search.body.items).toEqual([]);
    const blocked = await request(ctx.app).get('/v1/people/blocked').set(auth(people.chitra!.token));
    expect(blocked.body.items.map((p: { id: string }) => p.id)).toEqual([people.asha!.id]);
    await request(ctx.app).delete(`/v1/people/${people.asha!.id}/block`).set(auth(people.chitra!.token)).expect(204);
  });

  it('unfriends', async () => {
    await request(ctx.app).delete(`/v1/friends/${people.chitra!.id}`).set(auth(people.dev!.token)).expect(204);
    const dev = await request(ctx.app).get('/v1/friends').set(auth(people.dev!.token));
    expect(dev.body.friends).toEqual([]);
    expect((await request(ctx.app).delete(`/v1/friends/${people.chitra!.id}`).set(auth(people.dev!.token))).status).toBe(404);
  });
});

describe('notification centre', () => {
  it('marks some and all as read', async () => {
    const before = await request(ctx.app).get('/v1/notifications').set(auth(people.bela!.token));
    expect(before.body.unread).toBeGreaterThan(0);
    const first = before.body.items[0].id;
    const some = await request(ctx.app).post('/v1/notifications/read').set(auth(people.bela!.token)).send({ ids: [first] });
    expect(some.body.unread).toBe(before.body.unread - 1);
    const all = await request(ctx.app).post('/v1/notifications/read').set(auth(people.bela!.token)).send({ all: true });
    expect(all.body.unread).toBe(0);
    expect((await request(ctx.app).post('/v1/notifications/read').set(auth(people.bela!.token)).send({})).status).toBe(400);
  });
});

describe('presence and pokes over WebSocket', () => {
  it('refuses a bad token', async () => {
    const code = await new Promise<number>((resolve) => {
      const ws = new WebSocket(`${ctx.wsUrl}?token=${'x'.repeat(43)}`);
      ws.on('close', (c) => resolve(c));
      ws.on('error', () => undefined);
    });
    expect(code).toBe(4401);
  });

  it('tells friends when someone connects, and when they start and finish focusing', async () => {
    const asha = await connect(people.asha!.token);
    expect((await asha.next('hello')).userId).toBe(people.asha!.id);
    const bela = await connect(people.bela!.token);
    await bela.next('hello');
    const seen = await asha.next('presence');
    expect(seen).toMatchObject({ userId: people.bela!.id, state: { online: true, focusing: false } });
    const list = await request(ctx.app).get('/v1/friends').set(auth(people.asha!.token));
    expect(list.body.friends[0].presence.online).toBe(true);

    // Bela starts a 1-minute session: Asha sees the green dot.
    const started = await request(ctx.app).post('/v1/focus/sessions').set(auth(people.bela!.token)).send({ clientSessionId: 'sess-0001', plannedMinutes: 1 });
    expect(started.status).toBe(201);
    expect((await asha.next('presence')).state).toMatchObject({ focusing: true, online: true });
    expect((await request(ctx.app).get('/v1/friends').set(auth(people.asha!.token))).body.focusingCount).toBe(1);
    // the same client session again is the same server session
    const again = await request(ctx.app).post('/v1/focus/sessions').set(auth(people.bela!.token)).send({ clientSessionId: 'sess-0001', plannedMinutes: 1 });
    expect(again.status).toBe(200);
    expect(again.body.sessionId).toBe(started.body.sessionId);
    await request(ctx.app).post(`/v1/focus/sessions/${started.body.sessionId}/heartbeat`).set(auth(people.bela!.token)).expect(204);

    // Claiming completion after 2 seconds of a 1-minute session is refused: nothing is credited.
    const early = await request(ctx.app).post(`/v1/focus/sessions/${started.body.sessionId}/finish`).set(auth(people.bela!.token)).send({ outcome: 'completed' });
    expect(early.body).toMatchObject({ outcome: 'failed', verifiedMinutes: 0, rejected: true });
    expect(((await asha.next('presence')).state as { focusing: boolean }).focusing).toBe(false);

    // A session the server saw run its full length is credited.
    const s2 = await request(ctx.app).post('/v1/focus/sessions').set(auth(people.bela!.token)).send({ clientSessionId: 'sess-0002', plannedMinutes: 25 });
    await asha.next('presence');
    await ctx.db.update(focusSessions).set({ startedAt: new Date(Date.now() - 26 * 60_000), lastHeartbeatAt: new Date() }).where(eq(focusSessions.id, s2.body.sessionId));
    const done = await request(ctx.app).post(`/v1/focus/sessions/${s2.body.sessionId}/finish`).set(auth(people.bela!.token)).send({ outcome: 'completed' });
    expect(done.body).toMatchObject({ outcome: 'completed', verifiedMinutes: 25 });
    await asha.next('presence');
    const stats = await request(ctx.app).get('/v1/focus/stats').set(auth(people.bela!.token));
    expect(stats.body).toMatchObject({ weekMinutes: 25, totalMinutes: 25, completedSessions: 1 });
    // Bela now leads Asha this week: the V-sign.
    const friends = await request(ctx.app).get('/v1/friends').set(auth(people.asha!.token));
    expect(friends.body.friends[0]).toMatchObject({ weekMinutes: 25, leadsMe: true });
    expect(friends.body.myWeekMinutes).toBe(0);

    // A poke to a connected friend arrives live, exactly once per key.
    const poke = await request(ctx.app).post('/v1/pokes').set(auth(people.asha!.token)).send({ userId: people.bela!.id, key: 'poke-key-0001' });
    expect(poke.status).toBe(201);
    expect(poke.body.delivered).toBe('live');
    const got = await bela.next('poke');
    expect(got.from).toMatchObject({ id: people.asha!.id, username: 'Asha' });
    const repeat = await request(ctx.app).post('/v1/pokes').set(auth(people.asha!.token)).send({ userId: people.bela!.id, key: 'poke-key-0001' });
    expect(repeat.status).toBe(200);
    expect(repeat.body.repeated).toBe(true);
    await expect(bela.next('poke', 500)).rejects.toThrow();
    const tooSoon = await request(ctx.app).post('/v1/pokes').set(auth(people.asha!.token)).send({ userId: people.bela!.id, key: 'poke-key-0002' });
    expect(tooSoon.status).toBe(429);

    asha.ws.close();
    bela.ws.close();
    await new Promise((r) => setTimeout(r, 100));
  });

  it('pokes only friends who allow them; an offline friend gets a notification and a push', async () => {
    expect((await request(ctx.app).post('/v1/pokes').set(auth(people.asha!.token)).send({ userId: people.chitra!.id, key: 'poke-key-0003' })).status).toBe(403);
    await request(ctx.app).patch('/v1/me').set(auth(people.bela!.token)).send({ allowPokes: false }).expect(200);
    expect((await request(ctx.app).post('/v1/pokes').set(auth(people.asha!.token)).send({ userId: people.bela!.id, key: 'poke-key-0004' })).status).toBe(403);
    await request(ctx.app).patch('/v1/me').set(auth(people.bela!.token)).send({ allowPokes: true }).expect(200);
    // Bela registers a phone for push and is offline (sockets closed above).
    await request(ctx.app).post('/v1/devices').set(auth(people.bela!.token)).send({ installId: 'install-bela-0000-0001', platform: 'android', pushToken: 'ExponentPushToken[bela]', pushEnabled: true }).expect(204);
    await ctx.db.update(users).set({ allowPokes: true }).where(eq(users.id, people.bela!.id));
    const res = await request(ctx.app).post('/v1/pokes').set(auth(people.bela!.token)).send({ userId: people.asha!.id, key: 'poke-key-0005' });
    expect(res.status).toBe(201);
    expect(res.body.delivered).toBe('notification');
    const ashaNotifs = await request(ctx.app).get('/v1/notifications').set(auth(people.asha!.token));
    expect(ashaNotifs.body.items[0].type).toBe('poke');
    // Asha has no device, so no push for her; now Asha pokes Bela, who has one.
    // Asha poked Bela minutes ago in the test above: age that poke past the cooldown.
    await ctx.db.update(pokes).set({ createdAt: new Date(Date.now() - 10 * 60_000) }).where(eq(pokes.fromUserId, people.asha!.id));
    const toBela = await request(ctx.app).post('/v1/pokes').set(auth(people.asha!.token)).send({ userId: people.bela!.id, key: 'poke-key-0006' });
    expect(toBela.body.delivered).toBe('notification');
    expect(ctx.push.sent.at(-1)).toMatchObject({ to: 'ExponentPushToken[bela]', title: 'Poke!' });
  });
});
