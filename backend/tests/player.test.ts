import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { children, craftTutorials, gameProgress } from '../src/database/schema.js';
import { setupTestApp } from './helpers.js';
import { addChild, as, birthMonthForAge, playerLogin, registerGuardian, subscribe } from './lojiHelpers.js';

let ctx: Awaited<ReturnType<typeof setupTestApp>>;
let token = '';
let little: Awaited<ReturnType<typeof addChild>>;
let big: Awaited<ReturnType<typeof addChild>>;
const GUARDIAN_PHONE = '+919876520001';

beforeAll(async () => {
  ctx = await setupTestApp();
  token = (await registerGuardian(ctx, GUARDIAN_PHONE)).token;
  await subscribe(ctx, token);
  little = await addChild(ctx, token, { displayName: 'Little', birthMonth: birthMonthForAge(4), pin: '4826', playerOtpRequired: true });
  big = await addChild(ctx, token, { displayName: 'Big', birthMonth: birthMonthForAge(11), pin: '9137', playerOtpRequired: false });
});
afterAll(async () => {
  await ctx.close();
});

describe('player sign-in', () => {
  it('needs the player id AND the PIN; knowing a name is not enough', async () => {
    expect((await request(ctx.app).post('/v1/player/login').send({ playerId: 'Little', pin: '4826' })).status).toBe(401);
    expect((await request(ctx.app).post('/v1/player/login').send({ playerId: little.playerId, pin: '0000' })).status).toBe(401);
    expect((await request(ctx.app).post('/v1/player/login').send({ playerId: 'LOJI-ZZZZZZ', pin: '4826' })).status).toBe(401);
  });

  it('sends the code to the guardian\'s phone when the guardian requires it', async () => {
    const res = await request(ctx.app).post('/v1/player/login').send({ playerId: little.playerId.toLowerCase(), pin: '4826' });
    expect(res.status).toBe(202);
    expect(res.body.otpRequired).toBe(true);
    expect(res.body).not.toHaveProperty('token');
    expect(ctx.sms.sent.at(-1)!.to).toBe(GUARDIAN_PHONE);
    const code = ctx.sms.lastCode(GUARDIAN_PHONE)!;
    const ok = await request(ctx.app).post('/v1/player/login/verify').send({ challengeId: res.body.challengeId, code });
    expect(ok.status).toBe(200);
    expect(ok.body.child.displayName).toBe('Little');
    expect(ok.body.child.effectiveBracket).toBe('A');
    expect(ok.body.entitlement.active).toBe(true);
  });

  it('skips the code when the guardian turned it off', async () => {
    const res = await request(ctx.app).post('/v1/player/login').send({ playerId: big.playerId, pin: '9137' });
    expect(res.status).toBe(200);
    expect(res.body.otpRequired).toBe(false);
    expect(res.body.token).toBeTruthy();
  });

  it('locks the PIN after 5 wrong tries', async () => {
    for (let i = 0; i < 5; i++) expect((await request(ctx.app).post('/v1/player/login').send({ playerId: big.playerId, pin: '0001' })).status).toBe(401);
    expect((await request(ctx.app).post('/v1/player/login').send({ playerId: big.playerId, pin: '9137' })).status).toBe(423);
    await ctx.db.update(children).set({ pinLockedUntil: null, pinFailedCount: 0 }).where(eq(children.id, big.id));
  });

  it('a player token is not a guardian token and vice versa', async () => {
    const p = await playerLogin(ctx, big.playerId, '9137');
    expect((await request(ctx.app).get('/v1/guardian/me').set(as(p.body.token))).status).toBe(401);
    expect((await request(ctx.app).get('/v1/player/me').set(as(token))).status).toBe(401);
  });

  it('a paused profile cannot sign in and loses its sessions', async () => {
    const p = await playerLogin(ctx, big.playerId, '9137');
    await request(ctx.app).patch(`/v1/guardian/children/${big.id}`).set(as(token)).send({ status: 'paused' }).expect(200);
    expect((await request(ctx.app).get('/v1/player/me').set(as(p.body.token))).status).toBe(401);
    expect((await request(ctx.app).post('/v1/player/login').send({ playerId: big.playerId, pin: '9137' })).status).toBe(401);
    await request(ctx.app).patch(`/v1/guardian/children/${big.id}`).set(as(token)).send({ status: 'active' }).expect(200);
  });

  it('the guardian can open a child\'s console directly (profile switcher)', async () => {
    const res = await request(ctx.app).post(`/v1/guardian/children/${little.id}/player-session`).set(as(token)).send({});
    expect(res.status).toBe(200);
    expect((await request(ctx.app).get('/v1/player/me').set(as(res.body.token))).body.child.id).toBe(little.id);
  });

  it('new-device approval blocks unknown phones until the guardian approves', async () => {
    await request(ctx.app).put(`/v1/guardian/children/${big.id}/controls`).set(as(token)).send({ newDeviceApproval: true }).expect(200);
    await request(ctx.app).post('/v1/devices').send({ installId: 'install-kid-phone-00000001', platform: 'android' }).expect(200);
    const blocked = await request(ctx.app).post('/v1/player/login').send({ playerId: big.playerId, pin: '9137', installId: 'install-kid-phone-00000001' });
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('device_approval_required');
    const devices = await request(ctx.app).get('/v1/guardian/devices').set(as(token));
    const d = devices.body.find((x: { childId: string }) => x.childId === big.id);
    await request(ctx.app).post(`/v1/guardian/devices/${d.id}/approve`).set(as(token)).expect(204);
    expect((await request(ctx.app).post('/v1/player/login').send({ playerId: big.playerId, pin: '9137', installId: 'install-kid-phone-00000001' })).status).toBe(200);
    await request(ctx.app).put(`/v1/guardian/children/${big.id}/controls`).set(as(token)).send({ newDeviceApproval: false }).expect(200);
  });
});

describe('catalogue by age bracket', () => {
  it('a 4-year-old sees only bracket A games; an 11-year-old sees A–D', async () => {
    const l = await playerLogin(ctx, little.playerId, '4826');
    const b = await playerLogin(ctx, big.playerId, '9137');
    const lg = (await request(ctx.app).get('/v1/player/games').set(as(l.body.token))).body;
    const bg = (await request(ctx.app).get('/v1/player/games').set(as(b.body.token))).body;
    expect(lg.visibleBrackets).toEqual(['A']);
    expect(bg.visibleBrackets).toEqual(['A', 'B', 'C', 'D']);
    const lIds = lg.games.map((g: { id: string }) => g.id);
    expect(lIds).toContain('shape-sorting');
    expect(lIds).not.toContain('chess');
    expect(lIds).not.toContain('sudoku');
    expect(bg.games.map((g: { id: string }) => g.id)).toContain('chess');
    // Difficulty levels restricted to older brackets are hidden from the little one.
    const memory = lg.games.find((g: { id: string }) => g.id === 'memory-cards');
    expect(memory.difficulties.map((d: { key: string }) => d.key)).not.toContain('expert');
    // And cannot be started by naming them.
    const start = await request(ctx.app).post('/v1/player/sessions/start').set(as(l.body.token)).send({ gameId: 'memory-cards', clientSessionId: 'client-session-0100', difficulty: 'expert' });
    expect(start.status).toBe(400);
    expect((await request(ctx.app).post('/v1/player/sessions/start').set(as(l.body.token)).send({ gameId: 'chess', clientSessionId: 'client-session-0101', difficulty: 'easy' })).status).toBe(404);
  });

  it('the guardian can allow an older bracket explicitly', async () => {
    await request(ctx.app).put(`/v1/guardian/children/${little.id}/controls`).set(as(token)).send({ allowedBrackets: ['B'] }).expect(200);
    const l = await playerLogin(ctx, little.playerId, '4826');
    const lg = (await request(ctx.app).get('/v1/player/games').set(as(l.body.token))).body;
    expect(lg.visibleBrackets.sort()).toEqual(['A', 'B']);
    expect(lg.games.map((g: { id: string }) => g.id)).toContain('sudoku');
    await request(ctx.app).put(`/v1/guardian/children/${little.id}/controls`).set(as(token)).send({ allowedBrackets: [] }).expect(200);
  });

  it('in-development and archived games never reach the console', async () => {
    const { games } = await import('../src/database/schema.js');
    await ctx.db.update(games).set({ status: 'in_development' }).where(eq(games.id, 'bowling'));
    const b = await playerLogin(ctx, big.playerId, '9137');
    const ids = (await request(ctx.app).get('/v1/player/games').set(as(b.body.token))).body.games.map((g: { id: string }) => g.id);
    expect(ids).not.toContain('bowling');
    expect((await request(ctx.app).get('/v1/player/games/bowling').set(as(b.body.token))).status).toBe(404);
    await ctx.db.update(games).set({ status: 'published' }).where(eq(games.id, 'bowling'));
  });
});

describe('play sessions and progress', () => {
  it('starts, heartbeats, ends with a score and records progress + achievements', async () => {
    const b = await playerLogin(ctx, big.playerId, '9137');
    const t = b.body.token as string;
    const start = await request(ctx.app).post('/v1/player/sessions/start').set(as(t)).send({ gameId: 'memory-cards', clientSessionId: 'client-session-0200', difficulty: 'hard' });
    expect(start.status).toBe(201);
    expect(start.body.sessionLimitSeconds).toBe(1200);
    // Same client session id resumes rather than duplicating.
    const again = await request(ctx.app).post('/v1/player/sessions/start').set(as(t)).send({ gameId: 'memory-cards', clientSessionId: 'client-session-0200', difficulty: 'hard' });
    expect(again.body.resumed).toBe(true);
    expect(again.body.sessionId).toBe(start.body.sessionId);
    const hb = await request(ctx.app).post(`/v1/player/sessions/${start.body.sessionId}/heartbeat`).set(as(t));
    expect(hb.body.running).toBe(true);
    const end = await request(ctx.app).post(`/v1/player/sessions/${start.body.sessionId}/end`).set(as(t)).send({ outcome: 'completed', score: 120, stars: 3, progress: { data: { unlocked: 2 }, version: 0 } });
    expect(end.status).toBe(200);
    expect(end.body.newAchievements).toContain('first_game');
    expect(end.body.newAchievements).toContain('memory_master');
    const prog = await request(ctx.app).get('/v1/player/progress').set(as(t));
    const mem = prog.body.games.find((g: { gameId: string }) => g.gameId === 'memory-cards');
    expect(mem).toMatchObject({ plays: 1, completions: 1, bestScore: 120, stars: 3, highestDifficulty: 'hard', data: { unlocked: 2 }, version: 1 });
    expect(prog.body.achievements.find((a: { key: string }) => a.key === 'first_game').earnedAt).toBeTruthy();
  });

  it('progress sync refuses older versions', async () => {
    const b = await playerLogin(ctx, big.playerId, '9137');
    const stale = await request(ctx.app).put('/v1/player/progress/memory-cards').set(as(b.body.token)).send({ data: { unlocked: 1 }, version: 0 });
    expect(stale.body.accepted).toBe(false);
    expect(stale.body.data).toEqual({ unlocked: 2 });
    const fresh = await request(ctx.app).put('/v1/player/progress/memory-cards').set(as(b.body.token)).send({ data: { unlocked: 3 }, version: 1 });
    expect(fresh.body).toMatchObject({ accepted: true, version: 2 });
    const [row] = await ctx.db.select().from(gameProgress).where(eq(gameProgress.childId, big.id));
    expect(row!.data).toEqual({ unlocked: 3 });
  });

  it('a child cannot touch another child\'s session', async () => {
    const b = await playerLogin(ctx, big.playerId, '9137');
    const l = await playerLogin(ctx, little.playerId, '4826');
    const start = await request(ctx.app).post('/v1/player/sessions/start').set(as(b.body.token)).send({ gameId: 'jigsaw', clientSessionId: 'client-session-0300', difficulty: 'easy' });
    expect((await request(ctx.app).post(`/v1/player/sessions/${start.body.sessionId}/heartbeat`).set(as(l.body.token))).status).toBe(404);
    expect((await request(ctx.app).post(`/v1/player/sessions/${start.body.sessionId}/end`).set(as(l.body.token)).send({ outcome: 'completed' })).status).toBe(404);
    await request(ctx.app).post(`/v1/player/sessions/${start.body.sessionId}/end`).set(as(b.body.token)).send({ outcome: 'abandoned' }).expect(200);
  });

  it('favourites work when allowed', async () => {
    const b = await playerLogin(ctx, big.playerId, '9137');
    await request(ctx.app).put('/v1/player/games/chess/favourite').set(as(b.body.token)).expect(204);
    const games = (await request(ctx.app).get('/v1/player/games').set(as(b.body.token))).body.games;
    expect(games.find((g: { id: string }) => g.id === 'chess').favourite).toBe(true);
    await request(ctx.app).delete('/v1/player/games/chess/favourite').set(as(b.body.token)).expect(204);
  });
});

describe('craft library seed', () => {
  it('seeds published tutorials with materials, hazards and diagrams, filtered by bracket', async () => {
    const playerToken = (await playerLogin(ctx, big.playerId, '9137')).body.token as string;
    const littleToken = (await request(ctx.app).post('/v1/player/login/verify').send({ challengeId: (await request(ctx.app).post('/v1/player/login').send({ playerId: little.playerId, pin: '4826' })).body.challengeId, code: ctx.sms.lastCode(GUARDIAN_PHONE)! })).body.token as string;
    const all = await ctx.db.select().from(craftTutorials);
    expect(all.length).toBeGreaterThanOrEqual(10);
    for (const c of all) {
      expect(c.status).toBe('published');
      expect(c.materials.length).toBeGreaterThan(0);
      expect(c.steps.length).toBeGreaterThan(0);
      if (c.hazards.length) expect(c.adultSupervision).toBe(true);
      if (c.kind === 'digital') expect(c.physical).toBe(false);
    }
    const list = await request(ctx.app).get('/v1/player/crafts').set(as(playerToken)).expect(200);
    const ids = list.body.map((c: { id: string }) => c.id);
    expect(ids).toContain('dog-face');
    expect(ids).toContain('paper-crane');
    const littleList = await request(ctx.app).get('/v1/player/crafts').set(as(littleToken)).expect(200);
    const littleIds = littleList.body.map((c: { id: string }) => c.id);
    expect(littleIds).toContain('dog-face');
    expect(littleIds).not.toContain('paper-crane');
    const detail = await request(ctx.app).get('/v1/player/crafts/dog-face').set(as(playerToken)).expect(200);
    expect(detail.body.steps[0].diagram.paper).toBeDefined();
    expect(detail.body.checklist.length).toBeGreaterThan(0);
  });
});
