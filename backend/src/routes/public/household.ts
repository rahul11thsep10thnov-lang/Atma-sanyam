// A guardian's household: children, their PINs, parental controls, the
// dashboard, activity history, live-session controls, devices and the
// per-child deletion/export. Everything here checks that the child belongs
// to the signed-in guardian; most of it also needs an active subscription.
import { Router } from 'express';
import { z } from 'zod';
import { and, desc, eq, gte, inArray, isNull, sql } from 'drizzle-orm';
import {
  accountDeletionRequests,
  childAchievements,
  children,
  craftProgress,
  devices,
  factViews,
  gameProgress,
  gameSessions,
  games,
  parentalControls,
  playerSessions,
  quizAttempts,
  type AgeBracketKey,
  type PlayWindow,
} from '../../database/schema.js';
import type { Auth } from '../../middleware/auth.js';
import { parse } from '../../middleware/validate.js';
import { badRequest, notFound } from '../../lib/httpError.js';
import { hashPassword } from '../../lib/password.js';
import { generatePlayerId } from '../../lib/ids.js';
import { ageFromBirthMonth, birthMonthProblem, bracketForBirthMonth, BRACKETS } from '../../lib/age.js';
import { creditScreenTime, getControls, localParts, publicControls, screenTimeSince, todaysMinutes } from '../../services/controlsService.js';
import { createPlayerSession, revokeAllPlayerSessions } from '../../services/sessionService.js';
import { getEntitlement, publicEntitlement } from '../../services/entitlementService.js';
import { learningReport } from '../../services/learningService.js';
import { wallet } from '../../services/coinService.js';
import { myRankingSummary, SCORING_RULES } from '../../services/rankingService.js';
import { loadSettings } from '../../services/settingsService.js';
import { SUBJECT_BY_KEY } from '../../catalogue/learning.js';
import { coinTransactions, lessonProgress } from '../../database/schema.js';
import type { AppDeps } from '../../types.js';

const idParam = z.string().uuid();
const pinField = z.string().regex(/^\d{4,6}$/, 'The PIN is 4 to 6 digits');
const bracketField = z.enum(['A', 'B', 'C', 'D']);
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM');

// Weak PINs a child (or sibling) would guess first.
const WEAK_PINS = new Set(['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '4321', '0123', '000000', '111111', '123456', '654321']);

export function publicChild(c: typeof children.$inferSelect) {
  return {
    id: c.id,
    displayName: c.displayName,
    avatarId: c.avatarId,
    age: ageFromBirthMonth(c.birthMonth),
    ageBracket: c.ageBracket,
    bracketOverride: c.bracketOverride,
    effectiveBracket: c.bracketOverride ?? c.ageBracket,
    bracketName: BRACKETS.find((b) => b.key === (c.bracketOverride ?? c.ageBracket))?.name ?? '',
    playerId: c.playerId,
    playerOtpRequired: c.playerOtpRequired,
    status: c.status,
    lastActiveAt: c.lastActiveAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
  };
}

export function householdRouter(deps: AppDeps, auth: Auth) {
  const { db, env, realtime } = deps;
  const r = Router();
  r.use(auth.requireGuardian);

  async function ownChild(guardianId: string, childId: string, includeRemoved = false) {
    const [c] = await db.select().from(children).where(and(eq(children.id, childId), eq(children.guardianId, guardianId)));
    if (!c || (!includeRemoved && c.status === 'removed')) throw notFound('Child profile not found');
    return c;
  }

  async function liveStatus(childId: string) {
    const [running] = await db
      .select({ id: gameSessions.id, gameId: gameSessions.gameId, gameName: games.name, startedAt: gameSessions.startedAt, lastHeartbeatAt: gameSessions.lastHeartbeatAt, difficulty: gameSessions.difficulty, pausedByGuardianAt: gameSessions.pausedByGuardianAt, snapshotAt: gameSessions.snapshotAt })
      .from(gameSessions)
      .innerJoin(games, eq(games.id, gameSessions.gameId))
      .where(and(eq(gameSessions.childId, childId), eq(gameSessions.outcome, 'running')))
      .orderBy(desc(gameSessions.startedAt))
      .limit(1);
    const online = realtime.isPlayerOnline(childId);
    const fresh = running && Date.now() - running.lastHeartbeatAt.getTime() < 90_000;
    return {
      online,
      currentSession: running && fresh
        ? {
            id: running.id,
            gameId: running.gameId,
            gameName: running.gameName,
            difficulty: running.difficulty,
            startedAt: running.startedAt.toISOString(),
            durationSeconds: Math.round((Date.now() - running.startedAt.getTime()) / 1000),
            lastActivityAt: running.lastHeartbeatAt.toISOString(),
            paused: !!running.pausedByGuardianAt,
            mirrorAvailable: online,
          }
        : null,
      lastActivityAt: running?.lastHeartbeatAt.toISOString() ?? null,
    };
  }

  // ---- children ----------------------------------------------------------
  r.get('/children', async (req, res) => {
    const kids = await db.select().from(children).where(and(eq(children.guardianId, req.guardian!.id), sql`${children.status} <> 'removed'`)).orderBy(children.createdAt);
    res.json(kids.map(publicChild));
  });

  r.post('/children', auth.requireEntitlement, async (req, res) => {
    const body = parse(
      z.object({
        displayName: z.string().trim().min(1).max(30),
        avatarId: z.string().regex(/^[a-z0-9_-]{1,40}$/),
        birthMonth: z.string(),
        pin: pinField,
        playerOtpRequired: z.boolean().default(true),
      }),
      req.body
    );
    const problem = birthMonthProblem(body.birthMonth);
    if (problem) throw badRequest(problem);
    if (WEAK_PINS.has(body.pin)) throw badRequest('Choose a PIN that is harder to guess');
    const [count] = await db.select({ n: sql<number>`count(*)::int` }).from(children).where(and(eq(children.guardianId, req.guardian!.id), sql`${children.status} <> 'removed'`));
    if ((count?.n ?? 0) >= 8) throw badRequest('A household can have up to 8 child profiles');
    const pinHash = await hashPassword(body.pin);
    let child: typeof children.$inferSelect | undefined;
    for (let attempt = 0; attempt < 5 && !child; attempt++) {
      try {
        [child] = await db
          .insert(children)
          .values({ guardianId: req.guardian!.id, displayName: body.displayName, avatarId: body.avatarId, birthMonth: body.birthMonth, ageBracket: bracketForBirthMonth(body.birthMonth), playerId: generatePlayerId(), pinHash, playerOtpRequired: body.playerOtpRequired })
          .returning();
      } catch (err) {
        if ((err as { cause?: { code?: string } })?.cause?.code !== '23505') throw err;
      }
    }
    if (!child) throw new Error('Could not allocate a player id');
    await db.insert(parentalControls).values({ childId: child.id }).onConflictDoNothing();
    res.status(201).json(publicChild(child));
  });

  r.get('/children/:id', async (req, res) => {
    const c = await ownChild(req.guardian!.id, parse(idParam, req.params.id));
    const controls = await getControls(db, c.id);
    const today = localParts(new Date(), controls.timezone).day;
    const [progress, earned, minutesToday] = await Promise.all([
      db.select().from(gameProgress).where(eq(gameProgress.childId, c.id)),
      db.select({ key: childAchievements.achievementKey, earnedAt: childAchievements.earnedAt }).from(childAchievements).where(eq(childAchievements.childId, c.id)),
      todaysMinutes(db, c.id, today),
    ]);
    res.json({
      child: publicChild(c),
      controls: publicControls(controls),
      live: await liveStatus(c.id),
      today: { day: today, minutes: minutesToday, limitMinutes: controls.dailyLimitMinutes },
      progress: { gamesPlayed: progress.filter((p) => p.plays > 0).length, completions: progress.reduce((n, p) => n + p.completions, 0), stars: progress.reduce((n, p) => n + p.stars, 0), achievements: earned.map((e) => ({ key: e.key, earnedAt: e.earnedAt.toISOString() })) },
    });
  });

  r.patch('/children/:id', auth.requireEntitlement, async (req, res) => {
    const c = await ownChild(req.guardian!.id, parse(idParam, req.params.id));
    const body = parse(
      z.object({
        displayName: z.string().trim().min(1).max(30).optional(),
        avatarId: z.string().regex(/^[a-z0-9_-]{1,40}$/).optional(),
        birthMonth: z.string().optional(),
        bracketOverride: bracketField.nullable().optional(),
        playerOtpRequired: z.boolean().optional(),
        status: z.enum(['active', 'paused']).optional(),
      }),
      req.body
    );
    if (body.birthMonth) {
      const problem = birthMonthProblem(body.birthMonth);
      if (problem) throw badRequest(problem);
    }
    const birthMonth = body.birthMonth ?? c.birthMonth;
    const [updated] = await db
      .update(children)
      .set({ ...body, birthMonth, ageBracket: bracketForBirthMonth(birthMonth), updatedAt: new Date() })
      .where(eq(children.id, c.id))
      .returning();
    // Pausing a profile ends what it is doing right now.
    if (body.status === 'paused') {
      await revokeAllPlayerSessions(db, c.id);
      await endRunningSessions(c.id, 'ended_by_guardian');
    }
    // Any change of bracket reaches a signed-in player at once.
    realtime.sendToPlayer(c.id, { type: 'profile_changed' });
    res.json(publicChild(updated!));
  });

  r.post('/children/:id/pin', auth.requireStepUp, async (req, res) => {
    const c = await ownChild(req.guardian!.id, parse(idParam, req.params.id));
    const body = parse(z.object({ pin: pinField }), req.body);
    if (WEAK_PINS.has(body.pin)) throw badRequest('Choose a PIN that is harder to guess');
    await db.update(children).set({ pinHash: await hashPassword(body.pin), pinFailedCount: 0, pinLockedUntil: null, updatedAt: new Date() }).where(eq(children.id, c.id));
    await revokeAllPlayerSessions(db, c.id);
    res.status(204).end();
  });

  // Ends every player session on every device (lost phone, sibling snooping).
  r.post('/children/:id/revoke-sessions', async (req, res) => {
    const c = await ownChild(req.guardian!.id, parse(idParam, req.params.id));
    await revokeAllPlayerSessions(db, c.id);
    await endRunningSessions(c.id, 'ended_by_guardian');
    realtime.sendToPlayer(c.id, { type: 'session_control', action: 'signed_out' });
    res.status(204).end();
  });

  // Profile switcher: the signed-in guardian opens a child's console on this
  // device without the child re-typing a PIN (the guardian is the approval).
  r.post('/children/:id/player-session', auth.requireEntitlement, async (req, res) => {
    const c = await ownChild(req.guardian!.id, parse(idParam, req.params.id));
    const body = parse(z.object({ installId: z.string().regex(/^[A-Za-z0-9-]{16,64}$/).optional() }), req.body ?? {});
    let deviceId: string | null = null;
    if (body.installId) {
      const [d] = await db.select({ id: devices.id }).from(devices).where(eq(devices.installId, body.installId));
      deviceId = d?.id ?? null;
      if (d) await db.update(devices).set({ childId: c.id, approvedAt: new Date() }).where(eq(devices.id, d.id));
    }
    const session = await createPlayerSession(db, c.id, env.PLAYER_SESSION_TTL_DAYS, deviceId);
    res.json({ token: session.token, expiresAt: session.expiresAt.toISOString(), child: publicChild(c) });
  });

  r.delete('/children/:id', auth.requireStepUp, async (req, res) => {
    const c = await ownChild(req.guardian!.id, parse(idParam, req.params.id));
    const scheduledFor = new Date(Date.now() + env.DELETION_COOLING_OFF_DAYS * 86_400_000);
    await db.update(children).set({ status: 'removed', updatedAt: new Date() }).where(eq(children.id, c.id));
    await revokeAllPlayerSessions(db, c.id);
    await endRunningSessions(c.id, 'ended_by_guardian');
    await db.insert(accountDeletionRequests).values({ guardianId: req.guardian!.id, childId: c.id, scope: 'child', scheduledFor });
    res.json({ scheduledFor: scheduledFor.toISOString() });
  });

  r.post('/children/:id/restore', async (req, res) => {
    const c = await ownChild(req.guardian!.id, parse(idParam, req.params.id), true);
    if (c.status !== 'removed') throw badRequest('This profile is not removed');
    const [pending] = await db
      .update(accountDeletionRequests)
      .set({ cancelledAt: new Date() })
      .where(and(eq(accountDeletionRequests.childId, c.id), isNull(accountDeletionRequests.completedAt), isNull(accountDeletionRequests.cancelledAt)))
      .returning();
    if (!pending) throw badRequest('This profile can no longer be restored');
    const [restored] = await db.update(children).set({ status: 'active', updatedAt: new Date() }).where(eq(children.id, c.id)).returning();
    res.json(publicChild(restored!));
  });

  r.get('/children/:id/export', auth.requireStepUp, async (req, res) => {
    const c = await ownChild(req.guardian!.id, parse(idParam, req.params.id), true);
    const [progress, sessions, crafts, viewed, quizzes, earned, screen] = await Promise.all([
      db.select().from(gameProgress).where(eq(gameProgress.childId, c.id)),
      db.select({ gameId: gameSessions.gameId, difficulty: gameSessions.difficulty, startedAt: gameSessions.startedAt, endedAt: gameSessions.endedAt, outcome: gameSessions.outcome, score: gameSessions.score, durationSeconds: gameSessions.durationSeconds }).from(gameSessions).where(eq(gameSessions.childId, c.id)).orderBy(desc(gameSessions.startedAt)).limit(2000),
      db.select().from(craftProgress).where(eq(craftProgress.childId, c.id)),
      db.select().from(factViews).where(eq(factViews.childId, c.id)),
      db.select().from(quizAttempts).where(eq(quizAttempts.childId, c.id)),
      db.select().from(childAchievements).where(eq(childAchievements.childId, c.id)),
      screenTimeSince(db, c.id, '2000-01-01'),
    ]);
    res.set('Cache-Control', 'no-store');
    res.json({ exportedAt: new Date().toISOString(), child: { ...publicChild(c), birthMonth: c.birthMonth }, progress, sessions, crafts, factsViewed: viewed, quizAttempts: quizzes, achievements: earned, screenTime: screen });
  });

  // ---- parental controls ---------------------------------------------------
  r.get('/children/:id/controls', async (req, res) => {
    const c = await ownChild(req.guardian!.id, parse(idParam, req.params.id));
    res.json(publicControls(await getControls(db, c.id)));
  });

  r.put('/children/:id/controls', auth.requireEntitlement, async (req, res) => {
    const c = await ownChild(req.guardian!.id, parse(idParam, req.params.id));
    const body = parse(
      z.object({
        dailyLimitMinutes: z.number().int().min(5).max(360).optional(),
        sessionLimitMinutes: z.number().int().min(5).max(120).optional(),
        playWindows: z.array(z.object({ days: z.array(z.number().int().min(0).max(6)).min(1).max(7), start: hhmm, end: hhmm })).max(14).optional(),
        bedtimeStart: hhmm.nullable().optional(),
        bedtimeEnd: hhmm.nullable().optional(),
        timezone: z.string().min(1).max(64).optional(),
        blockedCategories: z.array(z.string().max(40)).max(50).optional(),
        blockedGames: z.array(z.string().max(60)).max(200).optional(),
        allowedBrackets: z.array(bracketField).max(4).optional(),
        soundEnabled: z.boolean().optional(),
        narrationEnabled: z.boolean().optional(),
        favouritesEnabled: z.boolean().optional(),
        mirroringEnabled: z.boolean().optional(),
        newDeviceApproval: z.boolean().optional(),
        // Learning academy, rankings and rewards.
        curriculumFramework: z.enum(['ncert', 'cbse', 'cisce', 'state', 'ib_pyp', 'ib_myp']).nullable().optional(),
        curriculumBoard: z.string().trim().max(80).nullable().optional(),
        schoolGrade: z.string().trim().max(40).nullable().optional(),
        learningGoals: z.array(z.object({ subject: z.string().regex(/^[a-z0-9-]{2,40}$/), lessonsPerWeek: z.number().int().min(1).max(21) })).max(30).optional(),
        blockedSubjects: z.array(z.string().regex(/^[a-z0-9-]{2,40}$/)).max(40).optional(),
        rankingsEnabled: z.boolean().optional(),
        rewardShopEnabled: z.boolean().optional(),
        coinDailyCap: z.number().int().min(0).max(10_000).nullable().optional(),
        reducedMotion: z.boolean().optional(),
      }),
      req.body
    );
    for (const key of [...(body.blockedSubjects ?? []), ...(body.learningGoals ?? []).map((g) => g.subject)]) if (!SUBJECT_BY_KEY.has(key)) throw badRequest(`Unknown subject ${key}`);
    if (body.timezone) {
      try {
        new Intl.DateTimeFormat('en', { timeZone: body.timezone });
      } catch {
        throw badRequest('Unknown timezone');
      }
    }
    if ((body.bedtimeStart && !body.bedtimeEnd && body.bedtimeEnd !== undefined) || (body.bedtimeEnd && body.bedtimeStart === null)) throw badRequest('Set both bedtime start and end');
    await getControls(db, c.id);
    const [row] = await db
      .update(parentalControls)
      .set({ ...body, playWindows: body.playWindows as PlayWindow[] | undefined, updatedAt: new Date() })
      .where(eq(parentalControls.childId, c.id))
      .returning();
    realtime.sendToPlayer(c.id, { type: 'controls_changed' });
    res.json(publicControls(row!));
  });

  // ---- dashboard and activity ------------------------------------------
  r.get('/dashboard', async (req, res) => {
    const kids = await db.select().from(children).where(and(eq(children.guardianId, req.guardian!.id), sql`${children.status} <> 'removed'`)).orderBy(children.createdAt);
    const out = [];
    for (const c of kids) {
      const controls = await getControls(db, c.id);
      const now = new Date();
      const today = localParts(now, controls.timezone).day;
      const weekAgo = localParts(new Date(now.getTime() - 6 * 86_400_000), controls.timezone).day;
      const week = await screenTimeSince(db, c.id, weekAgo);
      const recent = await db
        .select({ gameId: gameSessions.gameId, gameName: games.name, startedAt: gameSessions.startedAt, endedAt: gameSessions.endedAt, outcome: gameSessions.outcome, score: gameSessions.score, durationSeconds: gameSessions.durationSeconds })
        .from(gameSessions)
        .innerJoin(games, eq(games.id, gameSessions.gameId))
        .where(eq(gameSessions.childId, c.id))
        .orderBy(desc(gameSessions.startedAt))
        .limit(5);
      const [prog] = await db
        .select({ played: sql<number>`count(*) filter (where ${gameProgress.plays} > 0)::int`, completions: sql<number>`coalesce(sum(${gameProgress.completions}), 0)::int`, stars: sql<number>`coalesce(sum(${gameProgress.stars}), 0)::int` })
        .from(gameProgress)
        .where(eq(gameProgress.childId, c.id));
      const [ach] = await db.select({ n: sql<number>`count(*)::int` }).from(childAchievements).where(eq(childAchievements.childId, c.id));
      out.push({
        child: publicChild(c),
        live: await liveStatus(c.id),
        today: { day: today, minutes: week.find((d) => d.day === today)?.minutes ?? 0, limitMinutes: controls.dailyLimitMinutes },
        week: { days: week, totalMinutes: week.reduce((n, d) => n + d.minutes, 0) },
        progress: { gamesPlayed: prog?.played ?? 0, completions: prog?.completions ?? 0, stars: prog?.stars ?? 0, achievements: ach?.n ?? 0 },
        recent: recent.map((s) => ({ ...s, startedAt: s.startedAt.toISOString(), endedAt: s.endedAt?.toISOString() ?? null })),
        mirroringEnabled: controls.mirroringEnabled,
      });
    }
    res.json({
      entitlement: publicEntitlement(req.entitlement ?? (await (await import('../../services/entitlementService.js')).getEntitlement(db, req.guardian!.id))),
      children: out,
      activePlayers: out.filter((o) => o.live.currentSession).length,
    });
  });

  // ---- learning management -------------------------------------------------
  // What the child learned: per section and subject, levels, quiz accuracy,
  // streaks, time, goals and the next recommended lessons.
  r.get('/children/:id/learning', async (req, res) => {
    const c = await ownChild(req.guardian!.id, parse(idParam, req.params.id));
    const controls = await getControls(db, c.id);
    res.json(await learningReport(db, c.id, ageFromBirthMonth(c.birthMonth), controls));
  });

  // Coins (balance, ledger, owned rewards), rankings participation and the
  // tutorials the child has finished.
  r.get('/children/:id/rewards', async (req, res) => {
    const c = await ownChild(req.guardian!.id, parse(idParam, req.params.id));
    const [controls, { values }, ent] = await Promise.all([getControls(db, c.id), loadSettings(db), getEntitlement(db, req.guardian!.id)]);
    const w = await wallet(db, c.id, { shopEnabled: values.feature_flags.rewardShop && values.rewards.shopEnabled && controls.rewardShopEnabled, premium: ent.active, timezone: controls.timezone, dailyCap: controls.coinDailyCap ?? values.rewards.dailyCap });
    const ledger = await db.select().from(coinTransactions).where(eq(coinTransactions.childId, c.id)).orderBy(desc(coinTransactions.createdAt)).limit(200);
    const tutorials = await db.select({ gameId: gameProgress.gameId, name: games.name, tutorialCompletedAt: gameProgress.tutorialCompletedAt }).from(gameProgress).innerJoin(games, eq(games.id, gameProgress.gameId)).where(and(eq(gameProgress.childId, c.id), sql`${gameProgress.tutorialCompletedAt} is not null`));
    const [lessonsDone] = await db.select({ n: sql<number>`count(*) filter (where ${lessonProgress.completedAt} is not null)::int` }).from(lessonProgress).where(eq(lessonProgress.childId, c.id));
    res.json({
      coins: { balance: w.balance, earnedToday: w.earnedToday, dailyCap: controls.coinDailyCap ?? values.rewards.dailyCap, defaultDailyCap: values.rewards.dailyCap, shopEnabled: w.shopEnabled, equipped: w.equipped, owned: w.items.filter((i) => i.owned), values: values.rewards },
      ledger: ledger.map((t) => ({ id: t.id, amount: t.amount, balanceAfter: t.balanceAfter, reason: t.reason, refType: t.refType, refId: t.refId, note: t.note, createdAt: t.createdAt.toISOString() })),
      rankings: { enabled: controls.rankingsEnabled && values.feature_flags.rankings, globallyEnabled: values.feature_flags.rankings, mine: (await myRankingSummary(db, c.id)).map((m) => ({ ...m, rule: SCORING_RULES[m.gameId]?.label ?? '' })) },
      tutorials: tutorials.map((t) => ({ ...t, tutorialCompletedAt: t.tutorialCompletedAt!.toISOString() })),
      lessonsCompleted: lessonsDone?.n ?? 0,
      adFree: ent.active,
      entitlement: publicEntitlement(ent),
    });
  });

  r.get('/children/:id/activity', async (req, res) => {
    const c = await ownChild(req.guardian!.id, parse(idParam, req.params.id));
    const q = parse(z.object({ days: z.coerce.number().int().min(1).max(90).default(30), limit: z.coerce.number().int().min(1).max(200).default(50) }), req.query);
    const controls = await getControls(db, c.id);
    const since = new Date(Date.now() - q.days * 86_400_000);
    const sessions = await db
      .select({ id: gameSessions.id, gameId: gameSessions.gameId, gameName: games.name, difficulty: gameSessions.difficulty, startedAt: gameSessions.startedAt, endedAt: gameSessions.endedAt, outcome: gameSessions.outcome, score: gameSessions.score, durationSeconds: gameSessions.durationSeconds })
      .from(gameSessions)
      .innerJoin(games, eq(games.id, gameSessions.gameId))
      .where(and(eq(gameSessions.childId, c.id), gte(gameSessions.startedAt, since)))
      .orderBy(desc(gameSessions.startedAt))
      .limit(q.limit);
    const fromDay = localParts(since, controls.timezone).day;
    res.json({
      sessions: sessions.map((s) => ({ ...s, startedAt: s.startedAt.toISOString(), endedAt: s.endedAt?.toISOString() ?? null })),
      screenTime: await screenTimeSince(db, c.id, fromDay),
    });
  });

  // ---- live session controls -------------------------------------------
  async function endRunningSessions(childId: string, outcome: 'ended_by_guardian' | 'timed_out') {
    const now = new Date();
    const running = await db.select().from(gameSessions).where(and(eq(gameSessions.childId, childId), eq(gameSessions.outcome, 'running')));
    for (const s of running) {
      const seconds = Math.min(Math.round((s.lastHeartbeatAt.getTime() - s.startedAt.getTime()) / 1000), 6 * 3600);
      await db.update(gameSessions).set({ outcome, endedAt: now, durationSeconds: seconds, snapshot: null }).where(eq(gameSessions.id, s.id));
    }
    return running.length;
  }

  r.post('/children/:id/session/pause', async (req, res) => {
    const c = await ownChild(req.guardian!.id, parse(idParam, req.params.id));
    const [s] = await db.update(gameSessions).set({ pausedByGuardianAt: new Date() }).where(and(eq(gameSessions.childId, c.id), eq(gameSessions.outcome, 'running'))).returning({ id: gameSessions.id });
    const delivered = realtime.sendToPlayer(c.id, { type: 'session_control', action: 'pause' });
    res.json({ sessionId: s?.id ?? null, delivered });
  });

  r.post('/children/:id/session/resume', async (req, res) => {
    const c = await ownChild(req.guardian!.id, parse(idParam, req.params.id));
    await db.update(gameSessions).set({ pausedByGuardianAt: null }).where(and(eq(gameSessions.childId, c.id), eq(gameSessions.outcome, 'running')));
    res.json({ delivered: realtime.sendToPlayer(c.id, { type: 'session_control', action: 'resume' }) });
  });

  r.post('/children/:id/session/end', async (req, res) => {
    const c = await ownChild(req.guardian!.id, parse(idParam, req.params.id));
    const ended = await endRunningSessions(c.id, 'ended_by_guardian');
    const delivered = realtime.sendToPlayer(c.id, { type: 'session_control', action: 'end' });
    res.json({ ended, delivered });
  });

  // ---- devices ------------------------------------------------------------
  r.get('/devices', async (req, res) => {
    const kids = await db.select({ id: children.id }).from(children).where(eq(children.guardianId, req.guardian!.id));
    const ids = kids.map((k) => k.id);
    const rows = await db
      .select({ id: devices.id, label: devices.label, platform: devices.platform, appVersion: devices.appVersion, childId: devices.childId, guardianId: devices.guardianId, approvedAt: devices.approvedAt, lastSeenAt: devices.lastSeenAt })
      .from(devices)
      .where(ids.length ? sql`${devices.guardianId} = ${req.guardian!.id} or ${devices.childId} in ${ids}` : eq(devices.guardianId, req.guardian!.id));
    res.json(rows.map((d) => ({ ...d, approvedAt: d.approvedAt?.toISOString() ?? null, lastSeenAt: d.lastSeenAt.toISOString(), isThisGuardian: d.guardianId === req.guardian!.id })));
  });

  r.post('/devices/:id/approve', async (req, res) => {
    const id = parse(idParam, req.params.id);
    const kids = await db.select({ id: children.id }).from(children).where(eq(children.guardianId, req.guardian!.id));
    const [d] = await db.update(devices).set({ approvedAt: new Date() }).where(and(eq(devices.id, id), kids.length ? inArray(devices.childId, kids.map((k) => k.id)) : sql`false`)).returning({ id: devices.id });
    if (!d) throw notFound('Device not found');
    res.status(204).end();
  });

  r.delete('/devices/:id', async (req, res) => {
    const id = parse(idParam, req.params.id);
    const kids = await db.select({ id: children.id }).from(children).where(eq(children.guardianId, req.guardian!.id));
    const [d] = await db.select().from(devices).where(and(eq(devices.id, id), sql`${devices.guardianId} = ${req.guardian!.id} or ${devices.childId} in ${kids.length ? kids.map((k) => k.id) : ['00000000-0000-0000-0000-000000000000']}`));
    if (!d) throw notFound('Device not found');
    await db.update(playerSessions).set({ revokedAt: new Date() }).where(and(eq(playerSessions.deviceId, d.id), isNull(playerSessions.revokedAt)));
    await db.update(devices).set({ childId: null, approvedAt: null }).where(eq(devices.id, d.id));
    res.status(204).end();
  });

  return r;
}

export { creditScreenTime };
export type { AgeBracketKey };
