import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { coinTransactions, entitlements, gameSessions, subscriptions } from '../src/database/schema.js';
import { createAdmin, adminToken, setupTestApp } from './helpers.js';
import { addChild, as, birthMonthForAge, playerLogin, registerGuardian, subscribe } from './lojiHelpers.js';

let ctx: Awaited<ReturnType<typeof setupTestApp>>;
let guardianToken = '';
let kid: Awaited<ReturnType<typeof addChild>>;
let token = '';
let n = 0;

async function playAndEnd(gameId: string, difficulty: string, result: { outcome: 'completed' | 'abandoned' | 'failed'; score?: number | null; stars?: number }, seconds = 90) {
  n += 1;
  const start = await request(ctx.app).post('/v1/player/sessions/start').set(as(token)).send({ gameId, clientSessionId: `client-${String(n).padStart(6, '0')}`, difficulty });
  if (start.status !== 201) throw new Error(`start failed ${start.status} ${JSON.stringify(start.body)}`);
  // Pretend the session has been running for a while (the server credits at most 90 s since the last heartbeat).
  await ctx.db.update(gameSessions).set({ lastHeartbeatAt: new Date(Date.now() - seconds * 1000), durationSeconds: Math.max(0, seconds - 90) }).where(eq(gameSessions.id, start.body.sessionId));
  const end = await request(ctx.app).post(`/v1/player/sessions/${start.body.sessionId}/end`).set(as(token)).send({ stars: 0, ...result });
  if (end.status !== 200) throw new Error(`end failed ${end.status} ${JSON.stringify(end.body)}`);
  return { sessionId: start.body.sessionId as string, body: end.body };
}

beforeAll(async () => {
  ctx = await setupTestApp();
  guardianToken = (await registerGuardian(ctx, '+919876540001')).token;
  await subscribe(ctx, guardianToken);
  kid = await addChild(ctx, guardianToken, { displayName: 'Dev', birthMonth: birthMonthForAge(10), pin: '7391', playerOtpRequired: false });
  token = (await playerLogin(ctx, kid.playerId, '7391')).body.token;
});
afterAll(async () => {
  await ctx.close();
});

describe('coins are decided by the server', () => {
  it('starts at zero with the configured reward values and an empty ledger', async () => {
    const w = await request(ctx.app).get('/v1/player/coins').set(as(token));
    expect(w.status).toBe(200);
    expect(w.body.balance).toBe(0);
    expect(w.body.values).toMatchObject({ tutorialCompleted: 5, gameCompleted: 5, gameWon: 10, dailyChallenge: 10, craftCompleted: 10, lessonCompleted: 10, quizCompleted: 5, dailyCap: 150 });
    expect(w.body.items.length).toBeGreaterThanOrEqual(10);
    expect(w.body.shopEnabled).toBe(true);
    const me = await request(ctx.app).get('/v1/player/me').set(as(token));
    expect(me.body.entitlement.adFree).toBe(true);
    expect(me.body.access).toBe('subscriber');
  });

  it('a won board game pays 10, a finished one 5, a puzzle 5–15 by difficulty, an abandoned game nothing', async () => {
    const win = await playAndEnd('ludo', 'easy', { outcome: 'completed', score: 100, stars: 2 });
    expect(win.body.coins.breakdown.map((c: { reason: string; amount: number }) => [c.reason, c.amount])).toContainEqual(['game_won', 10]);
    const draw = await playAndEnd('connect-four', 'normal', { outcome: 'completed', score: 10, stars: 0 });
    expect(draw.body.coins.breakdown[0]).toMatchObject({ reason: 'game_completed', amount: 5 });
    const easyPuzzle = await playAndEnd('jigsaw', 'easy', { outcome: 'completed', score: 100, stars: 3 });
    expect(easyPuzzle.body.coins.breakdown[0]).toMatchObject({ reason: 'puzzle_solved', amount: 5 });
    const hardPuzzle = await playAndEnd('sudoku', 'hard', { outcome: 'completed', score: 300, stars: 3 });
    expect(hardPuzzle.body.coins.breakdown[0]).toMatchObject({ reason: 'puzzle_solved', amount: 15 });
    const quit = await playAndEnd('ludo', 'easy', { outcome: 'abandoned' });
    expect(quit.body.coins.awarded).toBe(0);
    const w = await request(ctx.app).get('/v1/player/coins').set(as(token));
    // 10 + 5 + 5 + 15 (+ possibly today's daily challenge bonus if one of these games was the challenge)
    expect(w.body.balance).toBeGreaterThanOrEqual(35);
    expect(w.body.transactions.every((t: { idempotencyKey?: string }) => !('idempotencyKey' in t))).toBe(true);
  });

  it('ending the same session twice never pays twice', async () => {
    const r = await playAndEnd('checkers', 'normal', { outcome: 'completed', score: 50, stars: 1 });
    const before = (await request(ctx.app).get('/v1/player/coins').set(as(token))).body.balance;
    const again = await request(ctx.app).post(`/v1/player/sessions/${r.sessionId}/end`).set(as(token)).send({ outcome: 'completed', score: 50, stars: 1 });
    expect(again.status).toBe(200);
    expect(again.body.coins.awarded).toBe(0);
    expect((await request(ctx.app).get('/v1/player/coins').set(as(token))).body.balance).toBe(before);
    const rows = await ctx.db.select().from(coinTransactions).where(eq(coinTransactions.idempotencyKey, `session:${r.sessionId}:complete`));
    expect(rows).toHaveLength(1);
  });

  it('the daily challenge is the same all day, pays its bonus once, and is reported as completed', async () => {
    const c1 = await request(ctx.app).get('/v1/player/daily-challenge').set(as(token));
    expect(c1.status).toBe(200);
    const c2 = await request(ctx.app).get('/v1/player/daily-challenge').set(as(token));
    expect(c2.body.gameId).toBe(c1.body.gameId);
    if (!c1.body.completed) {
      const r = await playAndEnd(c1.body.gameId, c1.body.difficulty, { outcome: 'completed', score: 10, stars: 1 });
      expect(r.body.dailyChallengeCompleted).toBe(true);
      expect(r.body.coins.breakdown.some((c: { reason: string }) => c.reason === 'daily_challenge')).toBe(true);
    }
    const r2 = await playAndEnd(c1.body.gameId, c1.body.difficulty, { outcome: 'completed', score: 10, stars: 1 });
    expect(r2.body.dailyChallengeCompleted).toBe(false);
    expect(r2.body.coins.breakdown.some((c: { reason: string }) => c.reason === 'daily_challenge')).toBe(false);
    expect((await request(ctx.app).get('/v1/player/daily-challenge').set(as(token))).body.completed).toBe(true);
  });

  it('finishing a game tutorial pays once and is remembered on the game', async () => {
    const first = await request(ctx.app).post('/v1/player/games/chess/tutorial-complete').set(as(token));
    expect(first.status).toBe(200);
    expect(first.body.coins.awarded).toBe(5);
    const second = await request(ctx.app).post('/v1/player/games/chess/tutorial-complete').set(as(token));
    expect(second.body.coins.awarded).toBe(0);
    expect(second.body.coins.duplicate).toBe(true);
    expect(second.body.tutorialCompletedAt).toBe(first.body.tutorialCompletedAt);
    const games = await request(ctx.app).get('/v1/player/games').set(as(token));
    expect(games.body.games.find((g: { id: string }) => g.id === 'chess').progress.tutorialCompletedAt).toBe(first.body.tutorialCompletedAt);
    expect((await request(ctx.app).post('/v1/player/games/not-a-game/tutorial-complete').set(as(token))).status).toBe(404);
  });

  it('the guardian\'s daily cap limits earning and is reported', async () => {
    await request(ctx.app).put(`/v1/guardian/children/${kid.id}/controls`).set(as(guardianToken)).send({ coinDailyCap: 60 }).expect(200);
    const w = await request(ctx.app).get('/v1/player/coins').set(as(token));
    expect(w.body.dailyCap).toBe(60);
    const earnedToday = w.body.earnedToday as number;
    const r = await playAndEnd('sudoku', 'hard', { outcome: 'completed', score: 300, stars: 3 });
    const awarded = r.body.coins.awarded as number;
    expect(awarded).toBeLessThan(15); // uncapped this would pay 15
    expect(awarded).toBe(Math.max(0, Math.min(15, 60 - earnedToday)));
    const after = await request(ctx.app).get('/v1/player/coins').set(as(token));
    expect(after.body.earnedToday).toBe(earnedToday + awarded);
    expect(after.body.earnedToday).toBeLessThanOrEqual(Math.max(60, earnedToday));
    await request(ctx.app).put(`/v1/guardian/children/${kid.id}/controls`).set(as(guardianToken)).send({ coinDailyCap: null }).expect(200);
  });
});

describe('the reward shop', () => {
  it('buys an affordable item once, refuses what is unaffordable, and equips owned items only', async () => {
    const w = await request(ctx.app).get('/v1/player/coins').set(as(token));
    const balance = w.body.balance as number;
    const cheap = w.body.items.find((i: { price: number; premiumOnly: boolean }) => i.price <= balance && !i.premiumOnly);
    const dear = w.body.items.find((i: { price: number }) => i.price > balance);
    expect(cheap).toBeTruthy();
    const buy = await request(ctx.app).post('/v1/player/coins/purchase').set(as(token)).send({ itemKey: cheap.key, idempotencyKey: 'purchase-0001-abcd' });
    expect(buy.status).toBe(201);
    expect(buy.body.balance).toBe(balance - cheap.price);
    // Retrying the same purchase (same key, or same item) does not charge again.
    const retry = await request(ctx.app).post('/v1/player/coins/purchase').set(as(token)).send({ itemKey: cheap.key, idempotencyKey: 'purchase-0001-abcd' });
    expect(retry.status).toBe(200);
    expect(retry.body.duplicate).toBe(true);
    expect(retry.body.balance).toBe(balance - cheap.price);
    const again = await request(ctx.app).post('/v1/player/coins/purchase').set(as(token)).send({ itemKey: cheap.key, idempotencyKey: 'purchase-0002-abcd' });
    expect(again.body.duplicate).toBe(true);
    if (dear) expect((await request(ctx.app).post('/v1/player/coins/purchase').set(as(token)).send({ itemKey: dear.key, idempotencyKey: 'purchase-0003-abcd' })).status).toBe(409);
    expect((await request(ctx.app).post('/v1/player/coins/purchase').set(as(token)).send({ itemKey: 'no-such-item', idempotencyKey: 'purchase-0004-abcd' })).status).toBe(404);
    const equip = await request(ctx.app).put('/v1/player/rewards/equip').set(as(token)).send({ kind: cheap.kind, itemKey: cheap.key });
    expect(equip.status).toBe(200);
    expect(equip.body.equipped[cheap.kind]).toBe(cheap.key);
    expect((await request(ctx.app).put('/v1/player/rewards/equip').set(as(token)).send({ kind: 'theme', itemKey: 'theme-space' })).status).toBe(404);
    const unequip = await request(ctx.app).put('/v1/player/rewards/equip').set(as(token)).send({ kind: cheap.kind, itemKey: null });
    expect(unequip.body.equipped[cheap.kind]).toBeUndefined();
    const after = await request(ctx.app).get('/v1/player/coins').set(as(token));
    expect(after.body.items.find((i: { key: string }) => i.key === cheap.key).owned).toBe(true);
    expect(after.body.transactions[0]).toMatchObject({ amount: -cheap.price, reason: 'shop_purchase', refId: cheap.key });
  });

  it('a guardian can close the shop for their child', async () => {
    await request(ctx.app).put(`/v1/guardian/children/${kid.id}/controls`).set(as(guardianToken)).send({ rewardShopEnabled: false }).expect(200);
    expect((await request(ctx.app).get('/v1/player/coins').set(as(token))).body.shopEnabled).toBe(false);
    const buy = await request(ctx.app).post('/v1/player/coins/purchase').set(as(token)).send({ itemKey: 'badge-explorer', idempotencyKey: 'purchase-0005-abcd' });
    expect(buy.status).toBe(403);
    expect(buy.body.error.code).toBe('shop_disabled');
    await request(ctx.app).put(`/v1/guardian/children/${kid.id}/controls`).set(as(guardianToken)).send({ rewardShopEnabled: true }).expect(200);
  });

  it('the guardian sees the ledger, owned rewards, tutorials and ad-free status', async () => {
    const res = await request(ctx.app).get(`/v1/guardian/children/${kid.id}/rewards`).set(as(guardianToken));
    expect(res.status).toBe(200);
    expect(res.body.coins.balance).toBeGreaterThan(0);
    expect(res.body.ledger.length).toBeGreaterThan(3);
    expect(res.body.ledger.some((t: { reason: string }) => t.reason === 'shop_purchase')).toBe(true);
    expect(res.body.coins.owned.length).toBe(1);
    expect(res.body.tutorials.map((t: { gameId: string }) => t.gameId)).toEqual(['chess']);
    expect(res.body.adFree).toBe(true);
    expect(res.body.rankings.enabled).toBe(true);
  });

  it('admins manage reward items and values; children see the change immediately', async () => {
    await createAdmin(ctx.db, 'admin');
    const admin = await adminToken(ctx.app, 'admin@example.com');
    const items = await request(ctx.app).get('/admin/v1/reward-items').set(as(admin));
    expect(items.status).toBe(200);
    expect(items.body.economy.earned).toBeGreaterThan(0);
    expect(items.body.items.find((i: { key: string }) => i.key === 'badge-explorer')).toBeTruthy();
    const created = await request(ctx.app).post('/admin/v1/reward-items').set(as(admin)).send({ key: 'hat-wizard', name: 'Wizard Hat', kind: 'avatar_accessory', emoji: '🧙', price: 5 });
    expect(created.status).toBe(201);
    expect((await request(ctx.app).get('/v1/player/coins').set(as(token))).body.items.some((i: { key: string }) => i.key === 'hat-wizard')).toBe(true);
    await request(ctx.app).patch('/admin/v1/reward-items/hat-wizard').set(as(admin)).send({ status: 'archived' }).expect(200);
    expect((await request(ctx.app).get('/v1/player/coins').set(as(token))).body.items.some((i: { key: string }) => i.key === 'hat-wizard')).toBe(false);
    const settings = await request(ctx.app).put('/admin/v1/settings/rewards').set(as(admin)).send({ value: { tutorialCompleted: 7, gameCompleted: 5, gameWon: 10, puzzleSolvedMin: 5, puzzleSolvedMax: 15, dailyChallenge: 10, craftCompleted: 10, lessonCompleted: 10, quizCompleted: 5, factDiscovered: 1, dailyCap: 150, shopEnabled: true } });
    expect(settings.status).toBe(200);
    const paid = await request(ctx.app).post('/v1/player/games/ludo/tutorial-complete').set(as(token));
    expect(paid.body.coins).toMatchObject({ awarded: 7, duplicate: false, capped: false });
    const config = await request(ctx.app).get('/v1/config');
    expect(config.body.rewards.tutorialCompleted).toBe(7);
    expect(config.body.ads).toMatchObject({ childDirected: true, maxAdContentRating: 'G', testMode: true, firstAdTargetSeconds: 15, betweenGamesTargetSeconds: 25 });
    expect(config.body.features).toMatchObject({ studyPlayfully: true, music: true, sports: true, rankings: true, rewardShop: true, adSupportedAccess: false });
  });
});

describe('access without a subscription', () => {
  it('is locked by default and becomes ad-supported only when the admin flag is on', async () => {
    const other = await registerGuardian(ctx, '+919876540002');
    await subscribe(ctx, other.token);
    const child = await addChild(ctx, other.token, { displayName: 'Nia', birthMonth: birthMonthForAge(7), pin: '1357', playerOtpRequired: false });
    const t = (await playerLogin(ctx, child.playerId, '1357')).body.token;
    // Subscription lapses: the period ended a second ago.
    await ctx.db.update(subscriptions).set({ currentPeriodEnd: new Date(Date.now() - 1000) }).where(eq(subscriptions.guardianId, other.guardian.id));
    await ctx.db.update(entitlements).set({ validUntil: new Date(Date.now() - 1000) }).where(eq(entitlements.guardianId, other.guardian.id));
    const me = await request(ctx.app).get('/v1/player/me').set(as(t));
    expect(me.body.entitlement.active).toBe(false);
    expect(me.body.entitlement.adFree).toBe(false);
    expect(me.body.access).toBe('locked');
    expect((await request(ctx.app).get('/v1/player/games').set(as(t))).status).toBe(402);
    const admin = await adminToken(ctx.app, 'admin@example.com');
    const flags = (await request(ctx.app).get('/admin/v1/settings').set(as(admin))).body.find((s: { key: string }) => s.key === 'feature_flags').value;
    await request(ctx.app).put('/admin/v1/settings/feature_flags').set(as(admin)).send({ value: { ...flags, adSupportedAccess: true } }).expect(200);
    expect((await request(ctx.app).get('/v1/player/me').set(as(t))).body.access).toBe('ad_supported');
    expect((await request(ctx.app).get('/v1/player/games').set(as(t))).status).toBe(200);
    expect((await request(ctx.app).get('/v1/config')).body.ads.adSupportedAccess).toBe(true);
    await request(ctx.app).put('/admin/v1/settings/feature_flags').set(as(admin)).send({ value: { ...flags, adSupportedAccess: false } }).expect(200);
    expect((await request(ctx.app).get('/v1/player/games').set(as(t))).status).toBe(402);
  });
});
