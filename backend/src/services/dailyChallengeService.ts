// One daily challenge per child: a game picked from what they may play,
// the same for the whole day (seeded by date and bracket), worth a fixed
// coin reward once. Completion is recognised by the ledger entry the
// session end writes, so a retried request never pays twice.
import { eq } from 'drizzle-orm';
import type { Db } from '../database/client.js';
import { coinTransactions, type AgeBracketKey } from '../database/schema.js';
import { localParts, type Controls } from './controlsService.js';
import { listGamesForChild } from './catalogueService.js';

export function dailyKey(childId: string, day: string) {
  return `daily:${childId}:${day}`;
}

function hash(s: string): number {
  return [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 17);
}

export interface DailyChallenge {
  day: string;
  gameId: string;
  gameName: string;
  difficulty: string;
  reward: number;
  completed: boolean;
  completedAt: string | null;
}

/** Deterministic pick for the day; null when the child has no playable game. */
export async function dailyChallengeFor(db: Db, childId: string, bracket: AgeBracketKey, controls: Controls, reward: number): Promise<DailyChallenge | null> {
  const day = localParts(new Date(), controls.timezone).day;
  const games = (await listGamesForChild(db, childId, bracket, controls)).filter((g) => g.id !== 'drawing-canvas' && g.id !== 'colouring-book' && g.id !== 'origami-studio');
  if (games.length === 0) return null;
  const pick = games[hash(`${day}:${bracket}`) % games.length]!;
  const options = pick.difficulties.filter((d) => !d.brackets || d.brackets.includes(bracket));
  const difficulty = (options.find((d) => d.key === 'normal') ?? options[0] ?? pick.difficulties[0])!.key;
  const [tx] = await db.select({ createdAt: coinTransactions.createdAt }).from(coinTransactions).where(eq(coinTransactions.idempotencyKey, dailyKey(childId, day)));
  return { day, gameId: pick.id, gameName: pick.name, difficulty, reward, completed: !!tx, completedAt: tx?.createdAt.toISOString() ?? null };
}
