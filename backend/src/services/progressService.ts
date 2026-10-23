// Progress and achievements. Scores come with the session end; totals are
// kept per child per game; achievements are awarded here from server counts.
import { and, count, eq, sql } from 'drizzle-orm';
import type { Db } from '../database/client.js';
import { achievements, childAchievements, coinTransactions, craftProgress, factViews, gameProgress, lessonProgress, lessons, quizAttempts, rankingEvents, type AgeBracketKey } from '../database/schema.js';

export async function recordCompletion(db: Db, childId: string, gameId: string, r: { completed: boolean; score: number | null; durationSeconds: number; difficulty: string; stars: number }) {
  const now = new Date();
  await db
    .insert(gameProgress)
    .values({
      childId,
      gameId,
      plays: 1,
      completions: r.completed ? 1 : 0,
      bestScore: r.completed ? r.score : null,
      bestTimeSeconds: r.completed ? r.durationSeconds : null,
      highestDifficulty: r.completed ? r.difficulty : null,
      stars: r.completed ? r.stars : 0,
      lastPlayedAt: now,
    })
    .onConflictDoUpdate({
      target: [gameProgress.childId, gameProgress.gameId],
      set: {
        plays: sql`${gameProgress.plays} + 1`,
        completions: sql`${gameProgress.completions} + ${r.completed ? 1 : 0}`,
        bestScore: r.completed && r.score !== null ? sql`greatest(coalesce(${gameProgress.bestScore}, ${r.score}), ${r.score})` : gameProgress.bestScore,
        bestTimeSeconds: r.completed ? sql`least(coalesce(${gameProgress.bestTimeSeconds}, ${r.durationSeconds}), ${r.durationSeconds})` : gameProgress.bestTimeSeconds,
        highestDifficulty: r.completed ? sql`coalesce(${r.difficulty}, ${gameProgress.highestDifficulty})` : gameProgress.highestDifficulty,
        stars: r.completed ? sql`greatest(${gameProgress.stars}, ${r.stars})` : gameProgress.stars,
        lastPlayedAt: now,
        updatedAt: now,
      },
    });
}

/** Saves a game's own progress bag unless the server already has a newer version. */
export async function saveProgressData(db: Db, childId: string, gameId: string, data: Record<string, unknown>, version: number) {
  const [row] = await db.select({ version: gameProgress.version, data: gameProgress.data }).from(gameProgress).where(and(eq(gameProgress.childId, childId), eq(gameProgress.gameId, gameId)));
  if (row && row.version > version) return { accepted: false, version: row.version, data: row.data };
  const next = (row?.version ?? 0) + 1;
  await db
    .insert(gameProgress)
    .values({ childId, gameId, data, version: next })
    .onConflictDoUpdate({ target: [gameProgress.childId, gameProgress.gameId], set: { data, version: next, updatedAt: new Date() } });
  return { accepted: true, version: next, data };
}

interface Rule {
  type: 'completions' | 'games_played' | 'facts_read' | 'quiz_correct' | 'crafts_done' | 'lessons_completed' | 'tutorials_completed' | 'coins_earned' | 'ranked_wins';
  count: number;
  gameId?: string;
  difficulty?: string;
  section?: 'study' | 'music' | 'sports';
  subject?: string;
}

export async function evaluateAchievements(db: Db, childId: string, bracket: AgeBracketKey): Promise<string[]> {
  const all = await db.select().from(achievements);
  const earned = new Set((await db.select({ key: childAchievements.achievementKey }).from(childAchievements).where(eq(childAchievements.childId, childId))).map((r) => r.key));
  const candidates = all.filter((a) => !earned.has(a.key) && a.brackets.includes(bracket));
  if (candidates.length === 0) return [];

  const progress = await db.select().from(gameProgress).where(eq(gameProgress.childId, childId));
  const totals = {
    completions: progress.reduce((n, p) => n + p.completions, 0),
    gamesPlayed: progress.filter((p) => p.plays > 0).length,
  };
  const [factsRead] = await db.select({ n: count() }).from(factViews).where(eq(factViews.childId, childId));
  const [quizCorrect] = await db.select({ n: count() }).from(quizAttempts).where(and(eq(quizAttempts.childId, childId), eq(quizAttempts.correct, true)));
  const [craftsDone] = await db.select({ n: count() }).from(craftProgress).where(and(eq(craftProgress.childId, childId), sql`${craftProgress.completedAt} is not null`));
  const lessonsDone = candidates.some((a) => (a.rule as unknown as Rule).type === 'lessons_completed')
    ? await db.select({ section: lessons.section, subject: lessons.subject }).from(lessonProgress).innerJoin(lessons, eq(lessons.id, lessonProgress.lessonId)).where(and(eq(lessonProgress.childId, childId), sql`${lessonProgress.completedAt} is not null`))
    : [];
  const tutorialsDone = progress.filter((p) => p.tutorialCompletedAt).length;
  const [coinsEarned] = candidates.some((a) => (a.rule as unknown as Rule).type === 'coins_earned')
    ? await db.select({ n: sql<number>`coalesce(sum(${coinTransactions.amount}) filter (where ${coinTransactions.amount} > 0), 0)::int` }).from(coinTransactions).where(eq(coinTransactions.childId, childId))
    : [{ n: 0 }];
  const [rankedWins] = candidates.some((a) => (a.rule as unknown as Rule).type === 'ranked_wins')
    ? await db.select({ n: count() }).from(rankingEvents).where(and(eq(rankingEvents.childId, childId), eq(rankingEvents.won, true)))
    : [{ n: 0 }];

  const newlyEarned: string[] = [];
  for (const a of candidates) {
    const rule = a.rule as unknown as Rule;
    let ok = false;
    switch (rule.type) {
      case 'completions': {
        if (rule.gameId) {
          const p = progress.find((x) => x.gameId === rule.gameId);
          ok = !!p && p.completions >= rule.count && (!rule.difficulty || p.highestDifficulty === rule.difficulty || ['hard', 'expert'].includes(p.highestDifficulty ?? ''));
        } else ok = totals.completions >= rule.count;
        break;
      }
      case 'games_played':
        ok = totals.gamesPlayed >= rule.count;
        break;
      case 'facts_read':
        ok = (factsRead?.n ?? 0) >= rule.count;
        break;
      case 'quiz_correct':
        ok = (quizCorrect?.n ?? 0) >= rule.count;
        break;
      case 'crafts_done':
        ok = (craftsDone?.n ?? 0) >= rule.count;
        break;
      case 'lessons_completed':
        ok = lessonsDone.filter((l) => (!rule.section || l.section === rule.section) && (!rule.subject || l.subject === rule.subject)).length >= rule.count;
        break;
      case 'tutorials_completed':
        ok = tutorialsDone >= rule.count;
        break;
      case 'coins_earned':
        ok = (coinsEarned?.n ?? 0) >= rule.count;
        break;
      case 'ranked_wins':
        ok = (rankedWins?.n ?? 0) >= rule.count;
        break;
    }
    if (ok) newlyEarned.push(a.key);
  }
  if (newlyEarned.length) {
    await db.insert(childAchievements).values(newlyEarned.map((k) => ({ childId, achievementKey: k }))).onConflictDoNothing();
  }
  return newlyEarned;
}
