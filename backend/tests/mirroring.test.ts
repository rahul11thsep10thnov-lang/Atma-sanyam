import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import WebSocket from 'ws';
import { eq } from 'drizzle-orm';
import { gameSessions, mirrorSessions } from '../src/database/schema.js';
import { setupTestApp, waitFor } from './helpers.js';
import { addChild, as, playerLogin, registerGuardian, subscribe } from './lojiHelpers.js';

let ctx: Awaited<ReturnType<typeof setupTestApp>>;
let token = '';
let otherToken = '';
let kid: Awaited<ReturnType<typeof addChild>>;
let playerToken = '';

function connect(t: string): Promise<{ ws: WebSocket; events: Record<string, unknown>[]; next: (type: string) => Promise<Record<string, unknown>> }> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${ctx.wsUrl}?token=${t}`);
    const events: Record<string, unknown>[] = [];
    const next = (type: string) => waitFor(async () => events.find((e) => e.type === type), (e) => !!e).then((e) => e!);
    ws.on('message', (raw) => {
      events.push(JSON.parse(raw.toString()));
      if (events.length === 1) resolve({ ws, events, next });
    });
    open.add(ws);
    ws.on('error', reject);
  });
}

const open = new Set<WebSocket>();
afterEach(() => {
  for (const ws of open) ws.close();
  open.clear();
});

function closeCode(t: string): Promise<number> {
  return new Promise((resolve) => {
    const ws = new WebSocket(`${ctx.wsUrl}?token=${t}`);
    ws.on('close', (code) => resolve(code));
    ws.on('error', () => undefined);
  });
}

beforeAll(async () => {
  ctx = await setupTestApp();
  token = (await registerGuardian(ctx, '+919876540001')).token;
  otherToken = (await registerGuardian(ctx, '+919876540002')).token;
  await subscribe(ctx, token);
  kid = await addChild(ctx, token, { displayName: 'Mira', pin: '3691' });
  playerToken = (await playerLogin(ctx, kid.playerId, '3691')).body.token;
});
afterAll(async () => {
  await ctx.close();
});

describe('real-time mirroring', () => {
  it('rejects unauthenticated sockets', async () => {
    expect(await closeCode('x'.repeat(43))).toBe(4401);
  });

  it('a guardian sees the child come online and may only watch their own child', async () => {
    const g = await connect(token);
    const hello = await g.next('hello');
    expect(hello.role).toBe('guardian');
    const p = await connect(playerToken);
    expect((await p.next('hello')).role).toBe('player');
    const status = await g.next('child_status');
    expect(status).toMatchObject({ childId: kid.id, online: true });

    const stranger = await connect(otherToken);
    stranger.ws.send(JSON.stringify({ type: 'watch', childId: kid.id }));
    const err = await stranger.next('error');
    expect(err.code).toBe('forbidden');
    stranger.ws.close();
    g.ws.close();
    p.ws.close();
  });

  it('relays game state from the child to the watching guardian, with a privacy indicator, and stops on disconnect', async () => {
    const start = await request(ctx.app).post('/v1/player/sessions/start').set(as(playerToken)).send({ gameId: 'memory-cards', clientSessionId: 'client-session-7001', difficulty: 'easy' });
    expect(start.status).toBe(201);
    const p = await connect(playerToken);
    await p.next('hello');
    const g = await connect(token);
    await g.next('hello');
    g.ws.send(JSON.stringify({ type: 'watch', childId: kid.id }));
    const watching = await g.next('watching');
    expect(watching.childId).toBe(kid.id);
    // The child is told someone is watching.
    const ind = await p.next('mirror_status');
    expect(ind.watchers).toBe(1);

    p.ws.send(JSON.stringify({ type: 'mirror', sessionId: start.body.sessionId, seq: 1, state: { board: [1, 2, 3], moves: 4 } }));
    const frame = await g.next('mirror_frame');
    expect(frame).toMatchObject({ childId: kid.id, sessionId: start.body.sessionId, gameId: 'memory-cards', seq: 1, state: { board: [1, 2, 3], moves: 4 } });
    // The snapshot is kept on the running session so a late guardian catches up.
    await waitFor(async () => (await ctx.db.select().from(gameSessions).where(eq(gameSessions.id, start.body.sessionId)))[0]!.snapshot, (s) => !!s);
    const late = await connect(token);
    await late.next('hello');
    late.ws.send(JSON.stringify({ type: 'watch', childId: kid.id }));
    const catchUp = await late.next('mirror_frame');
    expect(catchUp.seq).toBe(1);
    late.ws.close();

    // A frame for a session that is not the child's own is dropped.
    const before = g.events.filter((e) => e.type === 'mirror_frame').length;
    p.ws.send(JSON.stringify({ type: 'mirror', sessionId: '00000000-0000-0000-0000-000000000000', seq: 2, state: {} }));
    await new Promise((r) => setTimeout(r, 300));
    expect(g.events.filter((e) => e.type === 'mirror_frame').length).toBe(before);

    // Guardian heartbeat over the socket is answered.
    p.ws.send(JSON.stringify({ type: 'heartbeat', sessionId: start.body.sessionId }));
    const hb = await p.next('heartbeat_result');
    expect((hb.result as { running: boolean }).running).toBe(true);

    // Guardian pause reaches the player.
    await request(ctx.app).post(`/v1/guardian/children/${kid.id}/session/pause`).set(as(token)).expect(200);
    const control = await p.next('session_control');
    expect(control.action).toBe('pause');

    // Child disconnects → mirror ends, status offline; audit row closed.
    p.ws.close();
    const ended = await g.next('mirror_ended');
    expect(ended.reason).toBe('offline');
    await waitFor(async () => g.events.find((e) => e.type === 'child_status' && e.online === false), (e) => !!e);
    g.ws.close();
    await waitFor(async () => (await ctx.db.select().from(mirrorSessions).where(eq(mirrorSessions.childId, kid.id))).filter((m) => m.endedAt).length, (n) => n >= 2);
    // Nothing of the game is stored once the session ends.
    await request(ctx.app).post(`/v1/player/sessions/${start.body.sessionId}/end`).set(as(playerToken)).send({ outcome: 'abandoned' }).expect(200);
    const [s] = await ctx.db.select().from(gameSessions).where(eq(gameSessions.id, start.body.sessionId));
    expect(s!.snapshot).toBeNull();
  });

  it('a guardian who turned mirroring off cannot watch', async () => {
    await request(ctx.app).put(`/v1/guardian/children/${kid.id}/controls`).set(as(token)).send({ mirroringEnabled: false }).expect(200);
    const g = await connect(token);
    await g.next('hello');
    g.ws.send(JSON.stringify({ type: 'watch', childId: kid.id }));
    const err = await g.next('error');
    expect(err.code).toBe('mirroring_disabled');
    g.ws.close();
  });
});
