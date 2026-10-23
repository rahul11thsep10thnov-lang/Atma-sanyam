// Rankings. Only games with a scoring rule take part; the rule says how a
// completed session turns into points (and, for chess, a rating change).
// Results are written by the server when a session ends, once per session,
// after validation against the rule's limits — never from an arbitrary
// client-reported total.
import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import type { Db } from '../database/client.js';
import { children, gameSessions, playerRatings, rankingEvents } from '../database/schema.js';

export type ScoringKind = 'wins' | 'score' | 'rating' | 'time';

export interface ScoringRule {
  kind: ScoringKind;
  /** Points for a win (phase won) and for merely finishing. */
  win: number;
  complete: number;
  /** For score games: validated upper bound of a legitimate score. */
  maxScore?: number;
  /** Minimum session length that counts (stops instant "wins"). */
  minSeconds: number;
  /** For rating games: computer strength per difficulty. */
  opponentRating?: Record<string, number>;
  label: string;
}

export const SCORING_RULES: Record<string, ScoringRule> = {
  ludo: { kind: 'wins', win: 30, complete: 5, minSeconds: 60, label: 'Win = 30 points, finishing a game = 5 points. Four-player games count 1.5×.' },
  'snakes-and-ladders': { kind: 'wins', win: 20, complete: 5, minSeconds: 30, label: 'Win = 20 points, finishing = 5 points.' },
  chess: { kind: 'rating', win: 40, complete: 10, minSeconds: 60, opponentRating: { tutorial: 600, easy: 800, normal: 1100, hard: 1400 }, label: 'A chess rating (Elo-style) against the computer\'s level, plus 40 points per win.' },
  'chess-tactics': { kind: 'score', win: 10, complete: 5, maxScore: 300, minSeconds: 15, label: 'Validated puzzle score; 10 points per solved set.' },
  'memory-cards': { kind: 'score', win: 10, complete: 5, maxScore: 400, minSeconds: 10, label: 'Validated score (fewer moves = more); 10 points per finished board.' },
  jigsaw: { kind: 'score', win: 10, complete: 5, maxScore: 400, minSeconds: 15, label: 'Validated score and difficulty; 10 points per finished puzzle.' },
  sudoku: { kind: 'score', win: 15, complete: 5, maxScore: 500, minSeconds: 60, label: 'Validated score and difficulty; 15 points per solved grid.' },
  'word-search': { kind: 'score', win: 10, complete: 5, maxScore: 400, minSeconds: 20, label: 'Validated score; 10 points per finished grid.' },
  'anagram-builder': { kind: 'score', win: 10, complete: 5, maxScore: 400, minSeconds: 20, label: 'Validated score; 10 points per round.' },
  'connect-four': { kind: 'wins', win: 20, complete: 5, minSeconds: 20, label: 'Win = 20 points, finishing = 5 points.' },
  checkers: { kind: 'wins', win: 25, complete: 5, minSeconds: 60, label: 'Win = 25 points, finishing = 5 points.' },
  'science-quiz': { kind: 'score', win: 10, complete: 5, maxScore: 100, minSeconds: 30, label: 'Accuracy (score out of 100); 10 points per perfect round.' },
  'geography-quiz': { kind: 'score', win: 10, complete: 5, maxScore: 100, minSeconds: 30, label: 'Accuracy (score out of 100); 10 points per perfect round.' },
  'maze-runner': { kind: 'score', win: 10, complete: 5, maxScore: 400, minSeconds: 10, label: 'Validated score; 10 points per solved maze.' },
  'match-3': { kind: 'score', win: 10, complete: 5, maxScore: 5000, minSeconds: 30, label: 'Validated score; 10 points per level cleared.' },
  'block-puzzle': { kind: 'score', win: 10, complete: 5, maxScore: 5000, minSeconds: 30, label: 'Validated score.' },
  cricket: { kind: 'score', win: 10, complete: 5, maxScore: 400, minSeconds: 30, label: 'Runs scored (validated); 10 points per innings won.' },
  bowling: { kind: 'score', win: 10, complete: 5, maxScore: 300, minSeconds: 30, label: 'Pins (max 300); 10 points per game.' },
  'football-penalty': { kind: 'score', win: 10, complete: 5, maxScore: 100, minSeconds: 15, label: 'Goals scored (validated).' },
};

export const COMPETITIVE_GAME_IDS = Object.keys(SCORING_RULES);

const DIFFICULTY_MULT: Record<string, number> = { tutorial: 0.5, mini: 0.6, easy: 0.8, normal: 1, hard: 1.3, expert: 1.6 };

export interface ResultInput {
  sessionId: string;
  childId: string;
  gameId: string;
  bracket: string;
  difficulty: string;
  outcome: 'completed' | 'abandoned' | 'failed';
  score: number | null;
  stars: number;
  durationSeconds: number;
}

/** Validates and records a competitive result. Returns null when the result does not count. */
export async function recordRankingResult(db: Db, r: ResultInput): Promise<{ points: number; won: boolean; ratingDelta: number } | null> {
  const rule = SCORING_RULES[r.gameId];
  if (!rule) return null;
  if (r.outcome !== 'completed' && r.outcome !== 'failed') return null; // abandoned games never count
  if (r.durationSeconds < rule.minSeconds) return null; // too short to be a real game
  const won = r.outcome === 'completed' && r.stars >= 1;
  const mult = DIFFICULTY_MULT[r.difficulty] ?? 1;
  let points = 0;
  let score: number | null = null;
  let ratingDelta = 0;
  if (rule.kind === 'score') {
    if (r.outcome !== 'completed' || r.score === null) return null;
    if (r.score < 0 || (rule.maxScore !== undefined && r.score > rule.maxScore)) return null; // out of the game's range: rejected
    score = r.score;
    points = Math.round((won ? rule.win : rule.complete) * mult + (rule.maxScore ? (r.score / rule.maxScore) * 10 : 0));
  } else if (rule.kind === 'wins') {
    if (r.outcome !== 'completed' && r.outcome !== 'failed') return null;
    points = Math.round((won ? rule.win : rule.complete) * (r.gameId === 'ludo' && r.difficulty !== 'easy' ? 1.5 : 1));
  } else if (rule.kind === 'rating') {
    points = won ? rule.win : rule.complete;
  }
  return db.transaction(async (tx) => {
    const [existing] = await tx.select({ id: rankingEvents.id }).from(rankingEvents).where(eq(rankingEvents.sessionId, r.sessionId));
    if (existing) return null; // a session can only ever count once
    const [session] = await tx.select({ outcome: gameSessions.outcome, childId: gameSessions.childId }).from(gameSessions).where(eq(gameSessions.id, r.sessionId));
    if (!session || session.childId !== r.childId) return null;
    const [cur] = await tx.select().from(playerRatings).where(and(eq(playerRatings.childId, r.childId), eq(playerRatings.gameId, r.gameId))).for('update');
    let rating = cur?.rating ?? 1000;
    if (rule.kind === 'rating') {
      const opp = rule.opponentRating?.[r.difficulty] ?? 1000;
      const expected = 1 / (1 + 10 ** ((opp - rating) / 400));
      const actual = won ? 1 : r.outcome === 'completed' ? 0.5 : 0; // completed-without-stars = draw
      ratingDelta = Math.round(32 * (actual - expected));
      rating = Math.max(100, rating + ratingDelta);
    }
    await tx.insert(rankingEvents).values({ childId: r.childId, gameId: r.gameId, sessionId: r.sessionId, bracket: r.bracket, points, won, score, ratingDelta });
    await tx
      .insert(playerRatings)
      .values({ childId: r.childId, gameId: r.gameId, rating, points, played: 1, wins: won ? 1 : 0 })
      .onConflictDoUpdate({ target: [playerRatings.childId, playerRatings.gameId], set: { rating, points: sql`${playerRatings.points} + ${points}`, played: sql`${playerRatings.played} + 1`, wins: sql`${playerRatings.wins} + ${won ? 1 : 0}`, updatedAt: new Date() } });
    return { points, won, ratingDelta };
  });
}

export type Window = 'week' | 'month' | 'all';

export interface LeaderboardRow {
  rank: number;
  childId: string;
  displayName: string;
  avatarId: string;
  bracket: string;
  points: number;
  rating: number | null;
  played: number;
  wins: number;
  winRate: number | null;
  improvement: number;
  isMe: boolean;
}

/** Leaderboard for one game over a window. Children whose guardian turned rankings off are excluded. */
export async function leaderboard(db: Db, gameId: string, window: Window, meId: string, opts: { bracket?: string; limit?: number } = {}): Promise<{ rows: LeaderboardRow[]; me: LeaderboardRow | null; rule: string }> {
  const rule = SCORING_RULES[gameId];
  if (!rule) return { rows: [], me: null, rule: 'This game has no leaderboard.' };
  const since = window === 'week' ? new Date(Date.now() - 7 * 86_400_000) : window === 'month' ? new Date(Date.now() - 30 * 86_400_000) : null;
  const conds = [eq(rankingEvents.gameId, gameId), sql`exists (select 1 from parental_controls pc where pc.child_id = ${rankingEvents.childId} and pc.rankings_enabled)`, sql`exists (select 1 from children c where c.id = ${rankingEvents.childId} and c.status = 'active')`];
  if (since) conds.push(gte(rankingEvents.createdAt, since));
  if (opts.bracket) conds.push(eq(rankingEvents.bracket, opts.bracket));
  const agg = await db
    .select({
      childId: rankingEvents.childId,
      points: sql<number>`sum(${rankingEvents.points})::int`,
      played: sql<number>`count(*)::int`,
      wins: sql<number>`count(*) filter (where ${rankingEvents.won})::int`,
      recent: sql<number>`coalesce(sum(${rankingEvents.points}) filter (where ${rankingEvents.createdAt} >= now() - interval '7 days'), 0)::int`,
      previous: sql<number>`coalesce(sum(${rankingEvents.points}) filter (where ${rankingEvents.createdAt} < now() - interval '7 days' and ${rankingEvents.createdAt} >= now() - interval '14 days'), 0)::int`,
    })
    .from(rankingEvents)
    .where(and(...conds))
    .groupBy(rankingEvents.childId);
  const ids = agg.map((a) => a.childId);
  const kids = ids.length ? await db.select({ id: children.id, displayName: children.displayName, avatarId: children.avatarId, bracket: sql<string>`coalesce(${children.bracketOverride}, ${children.ageBracket})` }).from(children).where(inArray(children.id, ids)) : [];
  const ratings = rule.kind === 'rating' && ids.length ? await db.select().from(playerRatings).where(and(eq(playerRatings.gameId, gameId), inArray(playerRatings.childId, ids))) : [];
  const kidById = new Map(kids.map((k) => [k.id, k]));
  const ratingById = new Map(ratings.map((x) => [x.childId, x.rating]));
  const rows = agg
    .map((a) => {
      const k = kidById.get(a.childId);
      return {
        childId: a.childId,
        displayName: k?.displayName ?? 'Player',
        avatarId: k?.avatarId ?? 'comic_01',
        bracket: k?.bracket ?? 'B',
        points: a.points,
        rating: rule.kind === 'rating' ? (ratingById.get(a.childId) ?? 1000) : null,
        played: a.played,
        wins: a.wins,
        winRate: rule.kind === 'score' ? null : a.played ? Math.round((a.wins / a.played) * 100) : null,
        improvement: a.recent - a.previous,
        isMe: a.childId === meId,
      };
    })
    .sort((x, y) => (rule.kind === 'rating' ? (y.rating ?? 0) - (x.rating ?? 0) || y.points - x.points : y.points - x.points || y.wins - x.wins))
    .map((r, i) => ({ ...r, rank: i + 1 }));
  const me = rows.find((r) => r.isMe) ?? null;
  return { rows: rows.slice(0, opts.limit ?? 50), me, rule: rule.label };
}

export async function myRankingSummary(db: Db, childId: string) {
  const rows = await db.select().from(playerRatings).where(eq(playerRatings.childId, childId)).orderBy(desc(playerRatings.points));
  return rows.map((r) => ({ gameId: r.gameId, rating: SCORING_RULES[r.gameId]?.kind === 'rating' ? r.rating : null, points: r.points, played: r.played, wins: r.wins }));
}
