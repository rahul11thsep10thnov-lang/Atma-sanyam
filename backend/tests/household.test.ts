import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { children, gameSessions, screenTimeRecords } from '../src/database/schema.js';
import { setupTestApp } from './helpers.js';
import { addChild, as, birthMonthForAge, playerLogin, registerGuardian, subscribe } from './lojiHelpers.js';
import { decidePlay, inWindow, localParts } from '../src/services/controlsService.js';
import { DEFAULT_CONTROLS } from '../src/services/controlsService.js';

let ctx: Awaited<ReturnType<typeof setupTestApp>>;
let token = '';
let otherToken = '';

beforeAll(async () => {
  ctx = await setupTestApp();
  token = (await registerGuardian(ctx, '+919876510001')).token;
  otherToken = (await registerGuardian(ctx, '+919876510002')).token;
});
afterAll(async () => {
  await ctx.close();
});

describe('child profiles', () => {
  it('cannot be created without a subscription', async () => {
    const res = await request(ctx.app).post('/v1/guardian/children').set(as(token)).send({ displayName: 'Kiran', avatarId: 'comic_01', birthMonth: birthMonthForAge(7), pin: '2580' });
    expect(res.status).toBe(402);
    expect(res.body.error.code).toBe('subscription_required');
  });

  it('are created with an automatic age bracket and a random player id', async () => {
    await subscribe(ctx, token);
    await subscribe(ctx, otherToken);
    const a = await addChild(ctx, token, { displayName: 'Anu', birthMonth: birthMonthForAge(4) });
    const b = await addChild(ctx, token, { displayName: 'Bela', birthMonth: birthMonthForAge(7) });
    const c = await addChild(ctx, token, { displayName: 'Chetan', birthMonth: birthMonthForAge(9) });
    const d = await addChild(ctx, token, { displayName: 'Dev', birthMonth: birthMonthForAge(12) });
    expect([a.ageBracket, b.ageBracket, c.ageBracket, d.ageBracket]).toEqual(['A', 'B', 'C', 'D']);
    expect(a.playerId).toMatch(/^LOJI-[BCDFGHJKMNPQRSTVWXYZ2-9]{6}$/);
    expect(a.playerId).not.toBe(b.playerId);
    const list = await request(ctx.app).get('/v1/guardian/children').set(as(token));
    expect(list.body).toHaveLength(4);
    expect(JSON.stringify(list.body)).not.toContain('pinHash');
  });

  it('rejects ages outside 3–12, weak PINs and bad avatars', async () => {
    const tooYoung = await request(ctx.app).post('/v1/guardian/children').set(as(token)).send({ displayName: 'Baby', avatarId: 'comic_01', birthMonth: birthMonthForAge(2), pin: '2580' });
    expect(tooYoung.status).toBe(400);
    const tooOld = await request(ctx.app).post('/v1/guardian/children').set(as(token)).send({ displayName: 'Teen', avatarId: 'comic_01', birthMonth: birthMonthForAge(13), pin: '2580' });
    expect(tooOld.status).toBe(400);
    const weak = await request(ctx.app).post('/v1/guardian/children').set(as(token)).send({ displayName: 'W', avatarId: 'comic_01', birthMonth: birthMonthForAge(7), pin: '1234' });
    expect(weak.status).toBe(400);
  });

  it('another guardian cannot see, edit or control my child', async () => {
    const [mine] = (await request(ctx.app).get('/v1/guardian/children').set(as(token))).body;
    expect((await request(ctx.app).get(`/v1/guardian/children/${mine.id}`).set(as(otherToken))).status).toBe(404);
    expect((await request(ctx.app).patch(`/v1/guardian/children/${mine.id}`).set(as(otherToken)).send({ displayName: 'Hacked' })).status).toBe(404);
    expect((await request(ctx.app).put(`/v1/guardian/children/${mine.id}/controls`).set(as(otherToken)).send({ dailyLimitMinutes: 300 })).status).toBe(404);
    expect((await request(ctx.app).post(`/v1/guardian/children/${mine.id}/session/end`).set(as(otherToken))).status).toBe(404);
    expect((await request(ctx.app).delete(`/v1/guardian/children/${mine.id}`).set(as(otherToken))).status).toBe(404);
  });

  it('a bracket override and a changed birth month reassign content', async () => {
    const kids = (await request(ctx.app).get('/v1/guardian/children').set(as(token))).body as { id: string; displayName: string }[];
    const anu = kids.find((k) => k.displayName === 'Anu')!;
    const res = await request(ctx.app).patch(`/v1/guardian/children/${anu.id}`).set(as(token)).send({ bracketOverride: 'B' });
    expect(res.body.effectiveBracket).toBe('B');
    const res2 = await request(ctx.app).patch(`/v1/guardian/children/${anu.id}`).set(as(token)).send({ bracketOverride: null, birthMonth: birthMonthForAge(10) });
    expect(res2.body.ageBracket).toBe('C');
    expect(res2.body.effectiveBracket).toBe('C');
    await request(ctx.app).patch(`/v1/guardian/children/${anu.id}`).set(as(token)).send({ birthMonth: birthMonthForAge(4) }).expect(200);
  });

  it('PIN reset needs step-up and signs the player out', async () => {
    const kids = (await request(ctx.app).get('/v1/guardian/children').set(as(token))).body as { id: string; playerId: string; displayName: string }[];
    const bela = kids.find((k) => k.displayName === 'Bela')!;
    const login = await playerLogin(ctx, bela.playerId, '2580');
    expect(login.status).toBe(200);
    await request(ctx.app).post(`/v1/guardian/children/${bela.id}/pin`).set(as(token)).send({ pin: '7391' }).expect(204);
    expect((await request(ctx.app).get('/v1/player/me').set(as(login.body.token))).status).toBe(401);
    expect((await playerLogin(ctx, bela.playerId, '2580')).status).toBe(401);
    expect((await playerLogin(ctx, bela.playerId, '7391')).status).toBe(200);
  });

  it('removing a child schedules deletion and can be restored during cooling-off', async () => {
    const kids = (await request(ctx.app).get('/v1/guardian/children').set(as(token))).body as { id: string; displayName: string }[];
    const dev = kids.find((k) => k.displayName === 'Dev')!;
    const del = await request(ctx.app).delete(`/v1/guardian/children/${dev.id}`).set(as(token));
    expect(del.status).toBe(200);
    expect((await request(ctx.app).get('/v1/guardian/children').set(as(token))).body).toHaveLength(3);
    const [row] = await ctx.db.select().from(children).where(eq(children.id, dev.id));
    expect(row!.status).toBe('removed');
    await request(ctx.app).post(`/v1/guardian/children/${dev.id}/restore`).set(as(token)).expect(200);
    expect((await request(ctx.app).get('/v1/guardian/children').set(as(token))).body).toHaveLength(4);
  });

  it('exports a child\'s data', async () => {
    const [kid] = (await request(ctx.app).get('/v1/guardian/children').set(as(token))).body;
    const res = await request(ctx.app).get(`/v1/guardian/children/${kid.id}/export`).set(as(token));
    expect(res.status).toBe(200);
    expect(res.body.child.id).toBe(kid.id);
    expect(res.body).toHaveProperty('screenTime');
  });
});

describe('parental controls', () => {
  it('validates and stores controls, and the player sees them', async () => {
    const kids = (await request(ctx.app).get('/v1/guardian/children').set(as(token))).body as { id: string; playerId: string; displayName: string }[];
    const bela = kids.find((k) => k.displayName === 'Bela')!;
    expect((await request(ctx.app).put(`/v1/guardian/children/${bela.id}/controls`).set(as(token)).send({ dailyLimitMinutes: 1 })).status).toBe(400);
    expect((await request(ctx.app).put(`/v1/guardian/children/${bela.id}/controls`).set(as(token)).send({ bedtimeStart: '25:00', bedtimeEnd: '07:00' })).status).toBe(400);
    const res = await request(ctx.app).put(`/v1/guardian/children/${bela.id}/controls`).set(as(token)).send({ dailyLimitMinutes: 45, sessionLimitMinutes: 15, blockedCategories: ['board'], blockedGames: ['bubble-shooter'], favouritesEnabled: false, timezone: 'Asia/Kolkata' });
    expect(res.status).toBe(200);
    expect(res.body.dailyLimitMinutes).toBe(45);
    const login = await playerLogin(ctx, bela.playerId, '7391');
    const me = await request(ctx.app).get('/v1/player/me').set(as(login.body.token));
    expect(me.body.controls.favouritesEnabled).toBe(false);
    expect(me.body.playtime.allowed).toBe(true);
    const games = await request(ctx.app).get('/v1/player/games').set(as(login.body.token));
    const ids = games.body.games.map((g: { id: string }) => g.id);
    expect(ids).not.toContain('connect-four'); // board category blocked
    expect(ids).not.toContain('bubble-shooter'); // bracket C/D anyway
    expect(ids).toContain('memory-cards');
    // Blocked game cannot be started by calling the API directly.
    const start = await request(ctx.app).post('/v1/player/sessions/start').set(as(login.body.token)).send({ gameId: 'connect-four', clientSessionId: 'client-session-0001', difficulty: 'easy' });
    expect(start.status).toBe(404);
    // Favourites are off.
    expect((await request(ctx.app).put('/v1/player/games/memory-cards/favourite').set(as(login.body.token))).status).toBe(403);
  });

  it('daily limit blocks play once used up', async () => {
    const kids = (await request(ctx.app).get('/v1/guardian/children').set(as(token))).body as { id: string; playerId: string; displayName: string }[];
    const bela = kids.find((k) => k.displayName === 'Bela')!;
    const login = await playerLogin(ctx, bela.playerId, '7391');
    const controls = (await request(ctx.app).get(`/v1/guardian/children/${bela.id}/controls`).set(as(token))).body;
    const day = localParts(new Date(), controls.timezone).day;
    await ctx.db.insert(screenTimeRecords).values({ childId: bela.id, day, minutes: 45, sessions: 3 }).onConflictDoUpdate({ target: [screenTimeRecords.childId, screenTimeRecords.day], set: { minutes: 45 } });
    const me = await request(ctx.app).get('/v1/player/me').set(as(login.body.token));
    expect(me.body.playtime.allowed).toBe(false);
    expect(me.body.playtime.reason).toBe('daily_limit');
    const start = await request(ctx.app).post('/v1/player/sessions/start').set(as(login.body.token)).send({ gameId: 'memory-cards', clientSessionId: 'client-session-0002', difficulty: 'easy' });
    expect(start.status).toBe(403);
    expect(start.body.error.code).toBe('play_blocked:daily_limit');
    await ctx.db.delete(screenTimeRecords).where(eq(screenTimeRecords.childId, bela.id));
    const dash = await request(ctx.app).get('/v1/guardian/dashboard').set(as(token));
    expect(dash.status).toBe(200);
    expect(dash.body.children.length).toBe(4);
  });

  it('bedtime and play windows are evaluated in the child\'s timezone', () => {
    const base = { ...DEFAULT_CONTROLS, childId: 'x', updatedAt: new Date() };
    // 21:30 IST = 16:00 UTC
    const night = new Date('2026-06-01T16:00:00Z');
    expect(decidePlay({ ...base, bedtimeStart: '21:00', bedtimeEnd: '07:00' }, 0, night)).toMatchObject({ allowed: false, reason: 'bedtime' });
    expect(decidePlay({ ...base, bedtimeStart: '21:00', bedtimeEnd: '07:00' }, 0, new Date('2026-06-01T10:00:00Z')).allowed).toBe(true); // 15:30 IST
    const monday = new Date('2026-06-01T11:00:00Z'); // Monday 16:30 IST
    expect(decidePlay({ ...base, playWindows: [{ days: [0, 6], start: '09:00', end: '18:00' }] }, 0, monday)).toMatchObject({ allowed: false, reason: 'outside_play_window' });
    expect(decidePlay({ ...base, playWindows: [{ days: [1], start: '16:00', end: '18:00' }] }, 0, monday)).toMatchObject({ allowed: true, remainingTodaySeconds: 3600, sessionLimitSeconds: 1200 });
    expect(decidePlay(base, 50, monday)).toMatchObject({ allowed: true, remainingTodaySeconds: 600, sessionLimitSeconds: 600 });
    expect(inWindow(23 * 60, '22:00', '06:00')).toBe(true);
    expect(inWindow(12 * 60, '22:00', '06:00')).toBe(false);
  });

  it('guardian can end a running session; the player is told on its next heartbeat', async () => {
    const kids = (await request(ctx.app).get('/v1/guardian/children').set(as(token))).body as { id: string; playerId: string; displayName: string }[];
    const bela = kids.find((k) => k.displayName === 'Bela')!;
    const login = await playerLogin(ctx, bela.playerId, '7391');
    const start = await request(ctx.app).post('/v1/player/sessions/start').set(as(login.body.token)).send({ gameId: 'memory-cards', clientSessionId: 'client-session-0003', difficulty: 'easy' });
    expect(start.status).toBe(201);
    const dash = await request(ctx.app).get(`/v1/guardian/children/${bela.id}`).set(as(token));
    expect(dash.body.live.currentSession.gameId).toBe('memory-cards');
    const end = await request(ctx.app).post(`/v1/guardian/children/${bela.id}/session/end`).set(as(token));
    expect(end.body.ended).toBe(1);
    const hb = await request(ctx.app).post(`/v1/player/sessions/${start.body.sessionId}/heartbeat`).set(as(login.body.token));
    expect(hb.body.mustEnd).toBe(true);
    const [s] = await ctx.db.select().from(gameSessions).where(eq(gameSessions.id, start.body.sessionId));
    expect(s!.outcome).toBe('ended_by_guardian');
  });
});
