// The Player Console API: a child's sign-in (player id + PIN, then a code to
// the guardian's phone when the guardian wants that), the games they may see,
// play sessions with server-side time limits, progress, crafts and facts.
// Every route below /me needs a player session AND the household's active
// subscription; the child's identity comes from the token, never the body.
import { Router } from 'express';
import { z } from 'zod';
import { and, asc, desc, eq, gte, inArray, isNull, sql } from 'drizzle-orm';
import {
  achievements,
  childAchievements,
  children,
  craftProgress,
  craftTutorials,
  devices,
  factSources,
  factViews,
  facts,
  favouriteGames,
  gameProgress,
  gameSessions,
  guardians,
  playerSessions,
  quizAttempts,
  quizQuestions,
} from '../../database/schema.js';
import type { Auth } from '../../middleware/auth.js';
import type { createRateLimits } from '../../middleware/rateLimits.js';
import { parse } from '../../middleware/validate.js';
import { badRequest, HttpError, notFound, unauthorized } from '../../lib/httpError.js';
import { burnPasswordCheck, verifyPassword } from '../../lib/password.js';
import { normalizePlayerId, PLAYER_ID_RE } from '../../lib/ids.js';
import { consumeOtp, issueOtp } from '../../lib/otp.js';
import { maskPhone } from '../../lib/phone.js';
import { BRACKETS } from '../../lib/age.js';
import { createPlayerSession } from '../../services/sessionService.js';
import { getEntitlement, publicEntitlement } from '../../services/entitlementService.js';
import { creditScreenTime, decidePlay, getControls, localParts, publicControls, todaysMinutes } from '../../services/controlsService.js';
import { getGameForChild, listCraftsForChild, listFactsForChild, listGamesForChild, publicCraft, publicFact, visibleBrackets } from '../../services/catalogueService.js';
import { evaluateAchievements, recordCompletion, saveProgressData } from '../../services/progressService.js';
import { FACT_CATEGORIES } from '../../catalogue/factCategories.js';
import type { AppDeps } from '../../types.js';

const PIN_MAX_FAILURES = 5;
const PIN_LOCK_MIN = 15;
const HEARTBEAT_STALE_S = 90;
const installIdField = z.string().regex(/^[A-Za-z0-9-]{16,64}$/);
const gameIdField = z.string().regex(/^[a-z0-9-]{2,60}$/);

export function playerRouter(deps: AppDeps, auth: Auth, limits: ReturnType<typeof createRateLimits>) {
  const { db, env, realtime } = deps;
  const r = Router();

  async function playerResponse(c: typeof children.$inferSelect, deviceId: string | null) {
    const session = await createPlayerSession(db, c.id, env.PLAYER_SESSION_TTL_DAYS, deviceId);
    await db.update(children).set({ lastActiveAt: new Date() }).where(eq(children.id, c.id));
    return { token: session.token, expiresAt: session.expiresAt.toISOString(), ...(await meFor(c)) };
  }

  async function meFor(c: typeof children.$inferSelect) {
    const controls = await getControls(db, c.id);
    const ent = await getEntitlement(db, c.guardianId);
    const effective = c.bracketOverride ?? c.ageBracket;
    const today = localParts(new Date(), controls.timezone).day;
    const used = await todaysMinutes(db, c.id, today);
    const decision = decidePlay(controls, used);
    return {
      child: { id: c.id, displayName: c.displayName, avatarId: c.avatarId, ageBracket: c.ageBracket, effectiveBracket: effective, bracketName: BRACKETS.find((b) => b.key === effective)?.name ?? '', playerId: c.playerId },
      entitlement: publicEntitlement(ent),
      controls: { soundEnabled: controls.soundEnabled, narrationEnabled: controls.narrationEnabled, favouritesEnabled: controls.favouritesEnabled, mirroringEnabled: controls.mirroringEnabled, dailyLimitMinutes: controls.dailyLimitMinutes, sessionLimitMinutes: controls.sessionLimitMinutes, visibleBrackets: visibleBrackets(effective, controls) },
      playtime: decision.allowed ? { allowed: true, usedMinutesToday: used, remainingSeconds: decision.remainingTodaySeconds, sessionLimitSeconds: decision.sessionLimitSeconds } : { allowed: false, usedMinutesToday: used, reason: decision.reason, message: decision.message },
    };
  }

  // ---- sign-in -------------------------------------------------------------
  r.post('/login', limits.playerLogin, async (req, res) => {
    const body = parse(z.object({ playerId: z.string().trim().min(4).max(20), pin: z.string().regex(/^\d{4,6}$/), installId: installIdField.optional() }), req.body);
    const wrong = unauthorized('That player ID or PIN is not right. Ask your grown-up to check.');
    const playerId = normalizePlayerId(body.playerId);
    if (!PLAYER_ID_RE.test(playerId)) throw wrong;
    const [c] = await db.select().from(children).where(eq(children.playerId, playerId));
    if (!c) {
      await burnPasswordCheck(body.pin);
      throw wrong;
    }
    if (c.pinLockedUntil && c.pinLockedUntil.getTime() > Date.now()) {
      throw new HttpError(423, 'Too many tries. Ask your grown-up and try again in a few minutes.', 'locked');
    }
    if (!(await verifyPassword(body.pin, c.pinHash))) {
      const failures = c.pinFailedCount + 1;
      await db.update(children).set({ pinFailedCount: failures, pinLockedUntil: failures >= PIN_MAX_FAILURES ? new Date(Date.now() + PIN_LOCK_MIN * 60_000) : null }).where(eq(children.id, c.id));
      throw wrong;
    }
    if (c.status !== 'active') throw unauthorized('This player is paused. Ask your grown-up.');
    const [g] = await db.select().from(guardians).where(eq(guardians.id, c.guardianId));
    if (!g || g.status !== 'active') throw unauthorized('This player is not available right now. Ask your grown-up.');
    if (c.pinFailedCount > 0) await db.update(children).set({ pinFailedCount: 0, pinLockedUntil: null }).where(eq(children.id, c.id));

    // Device: register the install against this child; approval if the guardian asked for it.
    let deviceId: string | null = null;
    const controls = await getControls(db, c.id);
    if (body.installId) {
      const [d] = await db.select().from(devices).where(eq(devices.installId, body.installId));
      if (d) {
        deviceId = d.id;
        if (d.childId !== c.id) await db.update(devices).set({ childId: c.id, approvedAt: controls.newDeviceApproval ? null : new Date(), lastSeenAt: new Date() }).where(eq(devices.id, d.id));
        else if (!d.approvedAt && !controls.newDeviceApproval) await db.update(devices).set({ approvedAt: new Date() }).where(eq(devices.id, d.id));
        const [fresh] = await db.select({ approvedAt: devices.approvedAt, guardianId: devices.guardianId }).from(devices).where(eq(devices.id, d.id));
        const guardianDevice = fresh?.guardianId === c.guardianId;
        if (controls.newDeviceApproval && !fresh?.approvedAt && !guardianDevice) {
          throw new HttpError(403, 'This phone needs your grown-up\'s approval first. They can approve it in the LoJi guardian app.', 'device_approval_required');
        }
      }
    }

    if (!c.playerOtpRequired) {
      res.json({ otpRequired: false, ...(await playerResponse(c, deviceId)) });
      return;
    }
    const issued = await issueOtp(deps, { purpose: 'player_login', phone: g.phone, guardianId: g.id, childId: c.id, context: { deviceId }, text: `{code} is the LoJi code to let ${c.displayName} start playing. It expires in 10 minutes.` });
    res.status(202).json({ otpRequired: true, ...issued, guardianPhoneMasked: maskPhone(g.phone), childName: c.displayName });
  });

  r.post('/login/verify', limits.otpVerify, async (req, res) => {
    const body = parse(z.object({ challengeId: z.string().uuid(), code: z.string().regex(/^\d{6}$/) }), req.body);
    const challenge = await consumeOtp(db, body.challengeId, body.code, 'player_login');
    const [c] = await db.select().from(children).where(and(eq(children.id, challenge.childId!), eq(children.status, 'active')));
    if (!c) throw unauthorized();
    const deviceId = ((challenge.context ?? {}) as { deviceId?: string | null }).deviceId ?? null;
    res.json({ otpRequired: false, ...(await playerResponse(c, deviceId)) });
  });

  // ---- signed-in player ----------------------------------------------------
  r.use(auth.requirePlayer);

  async function child(req: { player?: { childId: string } }) {
    const [c] = await db.select().from(children).where(eq(children.id, req.player!.childId));
    if (!c) throw unauthorized();
    return c;
  }

  r.get('/me', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json(await meFor(await child(req)));
  });

  r.post('/logout', async (req, res) => {
    await db.update(playerSessions).set({ revokedAt: new Date() }).where(eq(playerSessions.id, req.player!.sessionId));
    res.status(204).end();
  });

  // Everything from here is paid content.
  r.use(auth.requireEntitlement);

  // ---- games ---------------------------------------------------------------
  r.get('/games', async (req, res) => {
    const controls = await getControls(db, req.player!.childId);
    res.json({ games: await listGamesForChild(db, req.player!.childId, req.player!.effectiveBracket, controls), visibleBrackets: visibleBrackets(req.player!.effectiveBracket, controls) });
  });

  r.get('/games/:id', async (req, res) => {
    const controls = await getControls(db, req.player!.childId);
    const g = await getGameForChild(db, parse(gameIdField, req.params.id), req.player!.effectiveBracket, controls);
    if (!g) throw notFound('Game not found');
    const all = await listGamesForChild(db, req.player!.childId, req.player!.effectiveBracket, controls);
    res.json(all.find((x) => x.id === g.id));
  });

  r.put('/games/:id/favourite', async (req, res) => {
    const controls = await getControls(db, req.player!.childId);
    if (!controls.favouritesEnabled) throw new HttpError(403, 'Favourites are turned off', 'forbidden');
    const g = await getGameForChild(db, parse(gameIdField, req.params.id), req.player!.effectiveBracket, controls);
    if (!g) throw notFound('Game not found');
    await db.insert(favouriteGames).values({ childId: req.player!.childId, gameId: g.id }).onConflictDoNothing();
    res.status(204).end();
  });

  r.delete('/games/:id/favourite', async (req, res) => {
    await db.delete(favouriteGames).where(and(eq(favouriteGames.childId, req.player!.childId), eq(favouriteGames.gameId, parse(gameIdField, req.params.id))));
    res.status(204).end();
  });

  // ---- play sessions (server-timed) ----------------------------------------
  r.post('/sessions/start', async (req, res) => {
    const body = parse(z.object({ gameId: gameIdField, clientSessionId: z.string().regex(/^[A-Za-z0-9-]{8,64}$/), difficulty: z.string().regex(/^[a-z0-9_-]{1,20}$/).default('normal') }), req.body);
    const controls = await getControls(db, req.player!.childId);
    const g = await getGameForChild(db, body.gameId, req.player!.effectiveBracket, controls);
    if (!g) throw notFound('This game is not available for you');
    const difficultyOk = g.difficulties.some((d) => d.key === body.difficulty && (!d.brackets || d.brackets.includes(req.player!.effectiveBracket)));
    if (!difficultyOk) throw badRequest('That level is not available for you');
    const now = new Date();
    const today = localParts(now, controls.timezone).day;
    const decision = decidePlay(controls, await todaysMinutes(db, req.player!.childId, today), now);
    if (!decision.allowed) throw new HttpError(403, decision.message, `play_blocked:${decision.reason}`);
    // One running session per child: starting a new game ends the old one.
    const running = await db.select().from(gameSessions).where(and(eq(gameSessions.childId, req.player!.childId), eq(gameSessions.outcome, 'running')));
    for (const s of running) {
      if (s.clientSessionId === body.clientSessionId) {
        res.json({ sessionId: s.id, resumed: true, remainingSeconds: decision.remainingTodaySeconds, sessionLimitSeconds: decision.sessionLimitSeconds });
        return;
      }
      await db.update(gameSessions).set({ outcome: 'abandoned', endedAt: now, snapshot: null }).where(eq(gameSessions.id, s.id));
    }
    const [s] = await db
      .insert(gameSessions)
      .values({ childId: req.player!.childId, gameId: g.id, clientSessionId: body.clientSessionId, difficulty: body.difficulty, deviceId: req.player!.deviceId })
      .returning({ id: gameSessions.id });
    await creditScreenTime(db, req.player!.childId, today, 0, true);
    await db.update(children).set({ lastActiveAt: now }).where(eq(children.id, req.player!.childId));
    realtime.notifyGuardians(req.player!.guardianId, { type: 'child_status', childId: req.player!.childId, online: true, session: { id: s!.id, gameId: g.id, gameName: g.name, startedAt: now.toISOString() } });
    res.status(201).json({ sessionId: s!.id, resumed: false, remainingSeconds: decision.remainingTodaySeconds, sessionLimitSeconds: decision.sessionLimitSeconds });
  });

  // The app heartbeats every 30 s (over WebSocket when connected, else here).
  // Minutes are credited from the server clock between heartbeats, capped so
  // a device that slept cannot claim the gap.
  r.post('/sessions/:id/heartbeat', limits.heartbeat, async (req, res) => {
    const id = parse(z.string().uuid(), req.params.id);
    const [s] = await db.select().from(gameSessions).where(and(eq(gameSessions.id, id), eq(gameSessions.childId, req.player!.childId)));
    if (!s) throw notFound('Session not found');
    if (s.outcome !== 'running') {
      res.json({ running: false, outcome: s.outcome, mustEnd: true, reason: s.outcome });
      return;
    }
    const result = await heartbeat(deps, s, req.player!);
    res.json(result);
  });

  r.post('/sessions/:id/end', async (req, res) => {
    const id = parse(z.string().uuid(), req.params.id);
    const body = parse(
      z.object({
        outcome: z.enum(['completed', 'abandoned', 'failed']),
        score: z.number().int().min(0).max(1_000_000).nullable().optional(),
        stars: z.number().int().min(0).max(3).default(0),
        progress: z.object({ data: z.record(z.string(), z.unknown()), version: z.number().int().min(0) }).optional(),
      }),
      req.body
    );
    const [s] = await db.select().from(gameSessions).where(and(eq(gameSessions.id, id), eq(gameSessions.childId, req.player!.childId)));
    if (!s) throw notFound('Session not found');
    const now = new Date();
    let durationSeconds = s.durationSeconds;
    if (s.outcome === 'running') {
      const since = Math.min(Math.round((now.getTime() - s.lastHeartbeatAt.getTime()) / 1000), HEARTBEAT_STALE_S);
      durationSeconds += Math.max(0, since);
      await db.update(gameSessions).set({ outcome: body.outcome, endedAt: now, score: body.score ?? null, durationSeconds, snapshot: null, lastHeartbeatAt: now }).where(eq(gameSessions.id, s.id));
      const controls = await getControls(db, req.player!.childId);
      await creditScreenTime(db, req.player!.childId, localParts(now, controls.timezone).day, Math.floor(since / 60));
      await recordCompletion(db, req.player!.childId, s.gameId, { completed: body.outcome === 'completed', score: body.score ?? null, durationSeconds, difficulty: s.difficulty, stars: body.stars });
    }
    let progress: { accepted: boolean; version: number; data: Record<string, unknown> } | null = null;
    if (body.progress) progress = await saveProgressData(db, req.player!.childId, s.gameId, body.progress.data, body.progress.version);
    const newAchievements = await evaluateAchievements(db, req.player!.childId, req.player!.effectiveBracket);
    realtime.notifyGuardians(req.player!.guardianId, { type: 'child_status', childId: req.player!.childId, online: true, session: null, lastOutcome: body.outcome });
    res.json({ durationSeconds, newAchievements, progress });
  });

  // ---- progress --------------------------------------------------------------
  r.get('/progress', async (req, res) => {
    const childId = req.player!.childId;
    const [progress, earned, all, crafts, factsRead, quiz] = await Promise.all([
      db.select().from(gameProgress).where(eq(gameProgress.childId, childId)),
      db.select().from(childAchievements).where(eq(childAchievements.childId, childId)),
      db.select().from(achievements).orderBy(asc(achievements.sortOrder)),
      db.select({ tutorialId: craftProgress.tutorialId, title: craftTutorials.title, stepsDone: craftProgress.stepsDone, stepCount: sql<number>`jsonb_array_length(${craftTutorials.steps})`, completedAt: craftProgress.completedAt }).from(craftProgress).innerJoin(craftTutorials, eq(craftTutorials.id, craftProgress.tutorialId)).where(eq(craftProgress.childId, childId)),
      db.select({ n: sql<number>`count(*)::int` }).from(factViews).where(eq(factViews.childId, childId)),
      db.select({ total: sql<number>`count(*)::int`, correct: sql<number>`count(*) filter (where ${quizAttempts.correct})::int` }).from(quizAttempts).where(eq(quizAttempts.childId, childId)),
    ]);
    const earnedMap = new Map(earned.map((e) => [e.achievementKey, e.earnedAt]));
    res.json({
      games: progress.map((p) => ({ gameId: p.gameId, plays: p.plays, completions: p.completions, bestScore: p.bestScore, bestTimeSeconds: p.bestTimeSeconds, highestDifficulty: p.highestDifficulty, stars: p.stars, data: p.data, version: p.version, lastPlayedAt: p.lastPlayedAt?.toISOString() ?? null })),
      achievements: all.filter((a) => a.brackets.includes(req.player!.effectiveBracket)).map((a) => ({ key: a.key, name: a.name, description: a.description, icon: a.icon, earnedAt: earnedMap.get(a.key)?.toISOString() ?? null })),
      crafts: crafts.map((c) => ({ ...c, completedAt: c.completedAt?.toISOString() ?? null })),
      factsRead: factsRead[0]?.n ?? 0,
      quiz: { total: quiz[0]?.total ?? 0, correct: quiz[0]?.correct ?? 0 },
    });
  });

  r.put('/progress/:gameId', async (req, res) => {
    const gameId = parse(gameIdField, req.params.gameId);
    const body = parse(z.object({ data: z.record(z.string(), z.unknown()), version: z.number().int().min(0) }), req.body);
    if (JSON.stringify(body.data).length > 20_000) throw badRequest('Saved progress is too large');
    res.json(await saveProgressData(db, req.player!.childId, gameId, body.data, body.version));
  });

  // ---- crafts ----------------------------------------------------------------
  r.get('/crafts', async (req, res) => {
    const controls = await getControls(db, req.player!.childId);
    const list = await listCraftsForChild(db, req.player!.effectiveBracket, controls);
    const prog = await db.select().from(craftProgress).where(eq(craftProgress.childId, req.player!.childId));
    const pm = new Map(prog.map((p) => [p.tutorialId, p]));
    res.json(list.map((c) => ({ ...publicCraft(c), progress: pm.get(c.id) ? { stepsDone: pm.get(c.id)!.stepsDone, completedAt: pm.get(c.id)!.completedAt?.toISOString() ?? null } : null })));
  });

  r.get('/crafts/:id', async (req, res) => {
    const controls = await getControls(db, req.player!.childId);
    const id = parse(z.string().regex(/^[a-z0-9-]{2,60}$/), req.params.id);
    const c = (await listCraftsForChild(db, req.player!.effectiveBracket, controls)).find((x) => x.id === id);
    if (!c) throw notFound('Craft not found');
    const [p] = await db.select().from(craftProgress).where(and(eq(craftProgress.childId, req.player!.childId), eq(craftProgress.tutorialId, id)));
    res.json({ ...publicCraft(c, true), progress: p ? { stepsDone: p.stepsDone, checklistDone: p.checklistDone, completedAt: p.completedAt?.toISOString() ?? null } : null });
  });

  r.put('/crafts/:id/progress', async (req, res) => {
    const id = parse(z.string().regex(/^[a-z0-9-]{2,60}$/), req.params.id);
    const body = parse(z.object({ stepsDone: z.number().int().min(0).max(100), checklistDone: z.array(z.boolean()).max(20).optional(), completed: z.boolean().optional() }), req.body);
    const [c] = await db.select().from(craftTutorials).where(and(eq(craftTutorials.id, id), eq(craftTutorials.status, 'published')));
    if (!c) throw notFound('Craft not found');
    const completedAt = body.completed && body.stepsDone >= c.steps.length ? new Date() : null;
    await db
      .insert(craftProgress)
      .values({ childId: req.player!.childId, tutorialId: id, stepsDone: body.stepsDone, checklistDone: body.checklistDone ?? [], completedAt })
      .onConflictDoUpdate({ target: [craftProgress.childId, craftProgress.tutorialId], set: { stepsDone: body.stepsDone, checklistDone: body.checklistDone ?? [], completedAt: completedAt ?? sql`${craftProgress.completedAt}`, updatedAt: new Date() } });
    res.json({ newAchievements: await evaluateAchievements(db, req.player!.childId, req.player!.effectiveBracket) });
  });

  // ---- Did You Know? ------------------------------------------------------------
  async function hydrate(rows: (typeof facts.$inferSelect)[]) {
    if (rows.length === 0) return [];
    const sourceIds = [...new Set(rows.map((f) => f.sourceId).filter((x): x is string => !!x))];
    const sources = sourceIds.length ? await db.select().from(factSources).where(inArray(factSources.id, sourceIds)) : [];
    const sm = new Map(sources.map((s) => [s.id, { title: s.title, publisher: s.publisher, url: s.url }]));
    const qs = await db.select().from(quizQuestions).where(inArray(quizQuestions.factId, rows.map((f) => f.id))).orderBy(asc(quizQuestions.sortOrder));
    return rows.map((f) => publicFact(f, f.sourceId ? sm.get(f.sourceId) ?? null : null, qs.filter((q) => q.factId === f.id).map((q) => ({ id: q.id, question: q.question, options: q.options }))));
  }

  r.get('/facts/categories', async (_req, res) => {
    res.json(FACT_CATEGORIES);
  });

  r.get('/facts', async (req, res) => {
    const q = parse(z.object({ category: z.string().max(40).optional(), limit: z.coerce.number().int().min(1).max(100).default(50), offset: z.coerce.number().int().min(0).default(0) }), req.query);
    const controls = await getControls(db, req.player!.childId);
    const rows = await listFactsForChild(db, req.player!.effectiveBracket, controls, q.category);
    const views = await db.select().from(factViews).where(eq(factViews.childId, req.player!.childId));
    const vm = new Map(views.map((v) => [v.factId, v]));
    const page = await hydrate(rows.slice(q.offset, q.offset + q.limit));
    res.json({ total: rows.length, facts: page.map((f) => ({ ...f, viewed: vm.has(f.id), favourite: vm.get(f.id)?.favourite ?? false })) });
  });

  // The same fact for everyone in a bracket on a given day.
  r.get('/facts/daily', async (req, res) => {
    const controls = await getControls(db, req.player!.childId);
    const rows = await listFactsForChild(db, req.player!.effectiveBracket, controls);
    if (rows.length === 0) throw notFound('No facts yet');
    const day = localParts(new Date(), controls.timezone).day;
    const seed = [...day].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
    res.json((await hydrate([rows[seed % rows.length]!]))[0]);
  });

  r.get('/facts/random', async (req, res) => {
    const controls = await getControls(db, req.player!.childId);
    const rows = await listFactsForChild(db, req.player!.effectiveBracket, controls);
    if (rows.length === 0) throw notFound('No facts yet');
    const views = new Set((await db.select({ factId: factViews.factId }).from(factViews).where(eq(factViews.childId, req.player!.childId))).map((v) => v.factId));
    const unseen = rows.filter((f) => !views.has(f.id));
    const pool = unseen.length ? unseen : rows;
    res.json((await hydrate([pool[Math.floor(Math.random() * pool.length)]!]))[0]);
  });

  r.get('/facts/history', async (req, res) => {
    const views = await db.select().from(factViews).where(eq(factViews.childId, req.player!.childId)).orderBy(desc(factViews.viewedAt)).limit(100);
    const ids = views.map((v) => v.factId);
    const rows = ids.length ? await db.select().from(facts).where(and(inArray(facts.id, ids), eq(facts.status, 'published'))) : [];
    const hydrated = await hydrate(rows);
    const hm = new Map(hydrated.map((f) => [f.id, f]));
    res.json(views.filter((v) => hm.has(v.factId)).map((v) => ({ ...hm.get(v.factId)!, viewed: true, favourite: v.favourite, viewedAt: v.viewedAt.toISOString() })));
  });

  r.get('/facts/:id', async (req, res) => {
    const id = parse(z.string().uuid(), req.params.id);
    const controls = await getControls(db, req.player!.childId);
    const f = (await listFactsForChild(db, req.player!.effectiveBracket, controls)).find((x) => x.id === id);
    if (!f) throw notFound('Fact not found');
    const [v] = await db.select().from(factViews).where(and(eq(factViews.childId, req.player!.childId), eq(factViews.factId, id)));
    res.json({ ...(await hydrate([f]))[0], viewed: !!v, favourite: v?.favourite ?? false });
  });

  r.post('/facts/:id/view', async (req, res) => {
    const id = parse(z.string().uuid(), req.params.id);
    const [f] = await db.select({ id: facts.id }).from(facts).where(and(eq(facts.id, id), eq(facts.status, 'published')));
    if (!f) throw notFound('Fact not found');
    await db.insert(factViews).values({ childId: req.player!.childId, factId: id }).onConflictDoUpdate({ target: [factViews.childId, factViews.factId], set: { viewedAt: new Date() } });
    res.json({ newAchievements: await evaluateAchievements(db, req.player!.childId, req.player!.effectiveBracket) });
  });

  r.put('/facts/:id/favourite', async (req, res) => {
    const controls = await getControls(db, req.player!.childId);
    if (!controls.favouritesEnabled) throw new HttpError(403, 'Favourites are turned off', 'forbidden');
    const id = parse(z.string().uuid(), req.params.id);
    const body = parse(z.object({ favourite: z.boolean() }), req.body);
    await db.insert(factViews).values({ childId: req.player!.childId, factId: id, favourite: body.favourite }).onConflictDoUpdate({ target: [factViews.childId, factViews.factId], set: { favourite: body.favourite } });
    res.status(204).end();
  });

  r.post('/quiz/answer', async (req, res) => {
    const body = parse(z.object({ questionId: z.string().uuid(), chosenIndex: z.number().int().min(0).max(10) }), req.body);
    const [q] = await db.select().from(quizQuestions).where(eq(quizQuestions.id, body.questionId));
    if (!q) throw notFound('Question not found');
    const correct = q.correctIndex === body.chosenIndex;
    await db.insert(quizAttempts).values({ childId: req.player!.childId, factId: q.factId, questionId: q.id, chosenIndex: body.chosenIndex, correct });
    res.json({ correct, correctIndex: q.correctIndex, explanation: q.explanation, newAchievements: await evaluateAchievements(db, req.player!.childId, req.player!.effectiveBracket) });
  });

  r.get('/quiz/history', async (req, res) => {
    const rows = await db
      .select({ id: quizAttempts.id, factId: quizAttempts.factId, headline: facts.headline, question: quizQuestions.question, correct: quizAttempts.correct, createdAt: quizAttempts.createdAt })
      .from(quizAttempts)
      .innerJoin(quizQuestions, eq(quizQuestions.id, quizAttempts.questionId))
      .innerJoin(facts, eq(facts.id, quizAttempts.factId))
      .where(and(eq(quizAttempts.childId, req.player!.childId), gte(quizAttempts.createdAt, new Date(Date.now() - 90 * 86_400_000))))
      .orderBy(desc(quizAttempts.createdAt))
      .limit(200);
    res.json(rows.map((x) => ({ ...x, createdAt: x.createdAt.toISOString() })));
  });

  r.get('/controls', async (req, res) => {
    res.json(publicControls(await getControls(db, req.player!.childId)));
  });

  return r;
}

/**
 * Credits time since the last heartbeat and reports the limits. Shared by the
 * REST heartbeat and the WebSocket hub.
 */
export async function heartbeat(deps: AppDeps, s: typeof gameSessions.$inferSelect, player: { childId: string; guardianId: string }) {
  const { db, realtime } = deps;
  const now = new Date();
  const controls = await getControls(db, player.childId);
  const gapSeconds = Math.max(0, Math.round((now.getTime() - s.lastHeartbeatAt.getTime()) / 1000));
  const credited = Math.min(gapSeconds, HEARTBEAT_STALE_S);
  const durationSeconds = s.durationSeconds + credited;
  const day = localParts(now, controls.timezone).day;
  // Minutes are credited whole: carry the remainder in duration_seconds.
  const beforeMin = Math.floor(s.durationSeconds / 60);
  const afterMin = Math.floor(durationSeconds / 60);
  if (afterMin > beforeMin) await creditScreenTime(db, player.childId, day, afterMin - beforeMin);
  const used = await todaysMinutes(db, player.childId, day);
  const decision = decidePlay(controls, used, now);
  const sessionLimitHit = durationSeconds >= controls.sessionLimitMinutes * 60;
  const mustEnd = !decision.allowed || sessionLimitHit;
  if (mustEnd) {
    await db.update(gameSessions).set({ outcome: 'timed_out', endedAt: now, durationSeconds, lastHeartbeatAt: now, snapshot: null }).where(eq(gameSessions.id, s.id));
    realtime.notifyGuardians(player.guardianId, { type: 'child_status', childId: player.childId, online: true, session: null, lastOutcome: 'timed_out' });
    return { running: false, mustEnd: true, reason: decision.allowed ? 'session_limit' : decision.reason, message: decision.allowed ? 'Time for a break! This play session has ended.' : decision.message, durationSeconds };
  }
  await db.update(gameSessions).set({ lastHeartbeatAt: now, durationSeconds }).where(eq(gameSessions.id, s.id));
  await db.update(children).set({ lastActiveAt: now }).where(eq(children.id, player.childId));
  const remainingToday = decision.remainingTodaySeconds - (durationSeconds % 60);
  return {
    running: true,
    mustEnd: false,
    durationSeconds,
    remainingSeconds: Math.max(0, Math.min(remainingToday, controls.sessionLimitMinutes * 60 - durationSeconds)),
    pausedByGuardian: !!s.pausedByGuardianAt,
  };
}

export { isNull };
