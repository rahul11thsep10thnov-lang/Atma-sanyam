import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { gameSessions, rankingEvents } from '../src/database/schema.js';
import { createAdmin, adminToken, setupTestApp } from './helpers.js';
import { addChild, as, birthMonthForAge, playerLogin, registerGuardian, subscribe } from './lojiHelpers.js';

let ctx: Awaited<ReturnType<typeof setupTestApp>>;
let g1 = '';
let g2 = '';
let a: Awaited<ReturnType<typeof addChild>>;
let b: Awaited<ReturnType<typeof addChild>>;
let c: Awaited<ReturnType<typeof addChild>>;
let ta = '';
let tb = '';
let tc = '';
let n = 0;

async function play(token: string, gameId: string, difficulty: string, result: { outcome: 'completed' | 'abandoned' | 'failed'; score?: number | null; stars?: number }, seconds = 90) {
  n += 1;
  const start = await request(ctx.app).post('/v1/player/sessions/start').set(as(token)).send({ gameId, clientSessionId: `rank-${String(n).padStart(6, '0')}`, difficulty });
  if (start.status !== 201) throw new Error(`start failed ${start.status} ${JSON.stringify(start.body)}`);
  await ctx.db.update(gameSessions).set({ lastHeartbeatAt: new Date(Date.now() - Math.min(seconds, 90) * 1000), durationSeconds: Math.max(0, seconds - 90) }).where(eq(gameSessions.id, start.body.sessionId));
  const end = await request(ctx.app).post(`/v1/player/sessions/${start.body.sessionId}/end`).set(as(token)).send({ stars: 0, ...result });
  if (end.status !== 200) throw new Error(`end failed ${end.status} ${JSON.stringify(end.body)}`);
  return end.body;
}

beforeAll(async () => {
  ctx = await setupTestApp();
  g1 = (await registerGuardian(ctx, '+919876550001')).token;
  await subscribe(ctx, g1);
  g2 = (await registerGuardian(ctx, '+919876550002')).token;
  await subscribe(ctx, g2);
  a = await addChild(ctx, g1, { displayName: 'Aarav', birthMonth: birthMonthForAge(9), pin: '4826', playerOtpRequired: false });
  b = await addChild(ctx, g1, { displayName: 'Bina', birthMonth: birthMonthForAge(12), pin: '9137', playerOtpRequired: false });
  c = await addChild(ctx, g2, { displayName: 'Chitra', birthMonth: birthMonthForAge(9), pin: '7391', playerOtpRequired: false });
  ta = (await playerLogin(ctx, a.playerId, '4826')).body.token;
  tb = (await playerLogin(ctx, b.playerId, '9137')).body.token;
  tc = (await playerLogin(ctx, c.playerId, '7391')).body.token;
});
afterAll(async () => {
  await ctx.close();
});

describe('ranking results are validated and recorded once per session', () => {
  it('counts wins and completions for board games, ignores abandoned and too-short games', async () => {
    const win = await play(ta, 'ludo', 'normal', { outcome: 'completed', score: 100, stars: 3 });
    expect(win.ranking).toEqual({ points: 45, won: true, ratingDelta: 0 }); // 30 × 1.5 for a four-player game
    const lost = await play(ta, 'ludo', 'normal', { outcome: 'failed', score: 20, stars: 0 });
    expect(lost.ranking).toEqual({ points: 8, won: false, ratingDelta: 0 }); // 5 × 1.5 rounded
    const quit = await play(ta, 'ludo', 'normal', { outcome: 'abandoned' });
    expect(quit.ranking).toBeNull();
    const instant = await play(tb, 'ludo', 'normal', { outcome: 'completed', score: 100, stars: 3 }, 5);
    expect(instant.ranking).toBeNull(); // 5 seconds is not a real game of Ludo
    const rows = await ctx.db.select().from(rankingEvents).where(eq(rankingEvents.childId, a.id));
    expect(rows).toHaveLength(2);
  });

  it('rejects impossible scores for score games and never records a game without a scoring rule', async () => {
    const ok = await play(tb, 'sudoku', 'hard', { outcome: 'completed', score: 400, stars: 3 });
    expect(ok.ranking.won).toBe(true);
    expect(ok.ranking.points).toBeGreaterThan(15);
    const cheat = await play(tb, 'sudoku', 'hard', { outcome: 'completed', score: 999_999, stars: 3 });
    expect(cheat.ranking).toBeNull();
    const noRule = await play(tb, 'colouring-book', 'normal', { outcome: 'completed', score: 10, stars: 3 });
    expect(noRule.ranking).toBeNull();
  });

  it('chess keeps an Elo-style rating against the computer\'s level', async () => {
    const win = await play(tc, 'chess', 'normal', { outcome: 'completed', score: 150, stars: 3 });
    expect(win.ranking.won).toBe(true);
    expect(win.ranking.ratingDelta).toBeGreaterThan(16); // beating an 1100-rated opponent from 1000 is worth more than half of K
    const loss = await play(tc, 'chess', 'easy', { outcome: 'failed', score: 0, stars: 0 });
    expect(loss.ranking.ratingDelta).toBeLessThan(0);
    const mine = await request(ctx.app).get('/v1/player/rankings').set(as(tc));
    const chess = mine.body.mine.find((m: { gameId: string }) => m.gameId === 'chess');
    expect(chess.rating).toBe(1000 + win.ranking.ratingDelta + loss.ranking.ratingDelta);
    expect(chess.played).toBe(2);
    expect(chess.wins).toBe(1);
  });
});

describe('leaderboards', () => {
  it('ranks by points for the window, shows the child\'s own row, and filters by bracket', async () => {
    await play(tc, 'ludo', 'easy', { outcome: 'completed', score: 100, stars: 2 }); // 30 points (two-player game)
    const board = await request(ctx.app).get('/v1/player/rankings/ludo').set(as(ta)).query({ window: 'week' });
    expect(board.status).toBe(200);
    expect(board.body.rule).toMatch(/Win = 30 points/);
    expect(board.body.rows[0]).toMatchObject({ rank: 1, displayName: 'Aarav', points: 53, played: 2, wins: 1, winRate: 50, isMe: true });
    expect(board.body.rows[1]).toMatchObject({ rank: 2, displayName: 'Chitra', points: 30 });
    expect(board.body.me.rank).toBe(1);
    // Rows carry only display name and avatar: no ids of other children's households, no real names.
    expect(Object.keys(board.body.rows[1]).sort()).toEqual(['avatarId', 'bracket', 'childId', 'displayName', 'improvement', 'isMe', 'played', 'points', 'rank', 'rating', 'winRate', 'wins']);
    const bracketC = await request(ctx.app).get('/v1/player/rankings/ludo').set(as(tb)).query({ window: 'all', bracket: 'C' });
    expect(bracketC.body.rows.map((r: { displayName: string }) => r.displayName)).toEqual(['Aarav', 'Chitra']);
    expect(bracketC.body.me).toBeNull();
    const list = await request(ctx.app).get('/v1/player/rankings').set(as(ta));
    expect(list.body.enabled).toBe(true);
    expect(list.body.games.map((g: { gameId: string }) => g.gameId)).toContain('chess');
    expect(list.body.games.some((g: { gameId: string }) => g.gameId === 'colouring-book')).toBe(false);
    expect((await request(ctx.app).get('/v1/player/rankings/colouring-book').set(as(ta))).status).toBe(404);
  });

  it('a guardian can take a child out of rankings: no new results, hidden from boards, boards hidden from them', async () => {
    await request(ctx.app).put(`/v1/guardian/children/${c.id}/controls`).set(as(g2)).send({ rankingsEnabled: false }).expect(200);
    const board = await request(ctx.app).get('/v1/player/rankings/ludo').set(as(ta)).query({ window: 'all' });
    expect(board.body.rows.some((r: { displayName: string }) => r.displayName === 'Chitra')).toBe(false);
    expect((await request(ctx.app).get('/v1/player/rankings/ludo').set(as(tc))).status).toBe(403);
    const list = await request(ctx.app).get('/v1/player/rankings').set(as(tc));
    expect(list.body.enabled).toBe(false);
    expect(list.body.reason).toMatch(/grown-up/);
    const r = await play(tc, 'ludo', 'easy', { outcome: 'completed', score: 100, stars: 2 });
    expect(r.ranking).toBeNull();
    expect(r.coins.awarded).toBeGreaterThan(0); // coins are unaffected by the rankings choice
    await request(ctx.app).put(`/v1/guardian/children/${c.id}/controls`).set(as(g2)).send({ rankingsEnabled: true }).expect(200);
    expect((await request(ctx.app).get('/v1/player/rankings/ludo').set(as(ta)).query({ window: 'all' })).body.rows.some((r: { displayName: string }) => r.displayName === 'Chitra')).toBe(true);
  });

  it('admins can switch rankings off globally and see the overview', async () => {
    await createAdmin(ctx.db, 'admin');
    const admin = await adminToken(ctx.app, 'admin@example.com');
    const overview = await request(ctx.app).get('/admin/v1/rankings/overview').set(as(admin));
    expect(overview.status).toBe(200);
    expect(overview.body.games.find((g: { gameId: string }) => g.gameId === 'ludo').events).toBeGreaterThanOrEqual(3);
    const flags = (await request(ctx.app).get('/admin/v1/settings').set(as(admin))).body.find((s: { key: string }) => s.key === 'feature_flags').value;
    await request(ctx.app).put('/admin/v1/settings/feature_flags').set(as(admin)).send({ value: { ...flags, rankings: false } }).expect(200);
    expect((await request(ctx.app).get('/v1/player/rankings').set(as(ta))).body.enabled).toBe(false);
    expect((await request(ctx.app).get('/v1/player/rankings/ludo').set(as(ta))).status).toBe(403);
    expect((await request(ctx.app).get('/v1/player/me').set(as(ta))).body.controls.rankingsEnabled).toBe(false);
    await request(ctx.app).put('/admin/v1/settings/feature_flags').set(as(admin)).send({ value: { ...flags, rankings: true } }).expect(200);
  });
});
