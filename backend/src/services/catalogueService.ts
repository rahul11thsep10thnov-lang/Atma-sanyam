// Which games, crafts and facts a child may see: published, in a bracket at
// or below the child's (or one the guardian explicitly allowed), and not
// blocked by the guardian. Used by the player routes and by the game-session
// start so a blocked game cannot be started by calling the API directly.
import { and, asc, eq, inArray } from 'drizzle-orm';
import type { Db } from '../database/client.js';
import { craftTutorials, facts, favouriteGames, gameProgress, games, type AgeBracketKey } from '../database/schema.js';
import { bracketsUpTo } from '../lib/age.js';
import type { Controls } from './controlsService.js';

export function visibleBrackets(effective: AgeBracketKey, controls: Pick<Controls, 'allowedBrackets'>): AgeBracketKey[] {
  const set = new Set<AgeBracketKey>(bracketsUpTo(effective));
  for (const b of controls.allowedBrackets) if (['A', 'B', 'C', 'D'].includes(b)) set.add(b as AgeBracketKey);
  return [...set];
}

export function gameAllowed(game: { id: string; categoryId: string | null; brackets: string[]; status: string }, allowed: AgeBracketKey[], controls: Pick<Controls, 'blockedCategories' | 'blockedGames'>): boolean {
  if (game.status !== 'published') return false;
  if (!game.brackets.some((b) => allowed.includes(b as AgeBracketKey))) return false;
  if (controls.blockedGames.includes(game.id)) return false;
  if (game.categoryId && controls.blockedCategories.includes(game.categoryId)) return false;
  return true;
}

export function publicGame(g: typeof games.$inferSelect, effective: AgeBracketKey) {
  // Difficulties limited to a bracket are hidden from younger players.
  const difficulties = g.difficulties.filter((d) => !d.brackets || d.brackets.includes(effective));
  return {
    id: g.id,
    name: g.name,
    tagline: g.tagline,
    description: g.description,
    instructions: g.instructions,
    categoryId: g.categoryId,
    brackets: g.brackets,
    difficulties: difficulties.length ? difficulties : g.difficulties.slice(0, 1),
    skills: g.skills,
    contentRating: g.contentRating,
    estimatedMinutes: g.estimatedMinutes,
    offlineCapable: g.offlineCapable,
    accessibility: g.accessibility,
    translations: g.translations,
    version: g.updatedAt.getTime(),
  };
}

export async function listGamesForChild(db: Db, childId: string, effective: AgeBracketKey, controls: Controls) {
  const allowed = visibleBrackets(effective, controls);
  const rows = await db.select().from(games).where(eq(games.status, 'published')).orderBy(asc(games.sortOrder));
  const visible = rows.filter((g) => gameAllowed(g, allowed, controls));
  const ids = visible.map((g) => g.id);
  const [favs, progress] = ids.length
    ? await Promise.all([
        db.select({ gameId: favouriteGames.gameId }).from(favouriteGames).where(and(eq(favouriteGames.childId, childId), inArray(favouriteGames.gameId, ids))),
        db.select().from(gameProgress).where(and(eq(gameProgress.childId, childId), inArray(gameProgress.gameId, ids))),
      ])
    : [[], []];
  const favSet = new Set(favs.map((f) => f.gameId));
  const progMap = new Map(progress.map((p) => [p.gameId, p]));
  return visible.map((g) => {
    const p = progMap.get(g.id);
    return {
      ...publicGame(g, effective),
      favourite: favSet.has(g.id),
      progress: p
        ? { plays: p.plays, completions: p.completions, bestScore: p.bestScore, bestTimeSeconds: p.bestTimeSeconds, stars: p.stars, highestDifficulty: p.highestDifficulty, lastPlayedAt: p.lastPlayedAt?.toISOString() ?? null }
        : null,
    };
  });
}

export async function getGameForChild(db: Db, gameId: string, effective: AgeBracketKey, controls: Controls) {
  const [g] = await db.select().from(games).where(eq(games.id, gameId));
  if (!g || !gameAllowed(g, visibleBrackets(effective, controls), controls)) return null;
  return g;
}

export function publicCraft(c: typeof craftTutorials.$inferSelect, full = false) {
  return {
    id: c.id,
    title: c.title,
    kind: c.kind,
    description: c.description,
    brackets: c.brackets,
    difficulty: c.difficulty,
    estimatedMinutes: c.estimatedMinutes,
    materials: c.materials,
    hazards: c.hazards,
    adultSupervision: c.adultSupervision,
    physical: c.physical,
    stepCount: c.steps.length,
    ...(full ? { steps: c.steps, finalPreview: c.finalPreview, checklist: c.checklist } : {}),
    translations: c.translations,
  };
}

export async function listCraftsForChild(db: Db, effective: AgeBracketKey, controls: Controls) {
  const allowed = visibleBrackets(effective, controls);
  const rows = await db.select().from(craftTutorials).where(eq(craftTutorials.status, 'published')).orderBy(asc(craftTutorials.sortOrder));
  return rows.filter((c) => c.brackets.some((b) => allowed.includes(b as AgeBracketKey)));
}

export function publicFact(f: typeof facts.$inferSelect, source: { title: string; publisher: string; url: string } | null, questions: { id: string; question: string; options: string[] }[] = []) {
  return {
    id: f.id,
    slug: f.slug,
    category: f.category,
    headline: f.headline,
    body: f.body,
    whyText: f.whyText,
    followUpQuestion: f.followUpQuestion,
    brackets: f.brackets,
    readingLevel: f.readingLevel,
    illustration: f.illustration,
    audioUrl: f.audioUrl,
    source,
    questions,
    translations: f.translations,
    publishedAt: f.publishedAt?.toISOString() ?? null,
  };
}

export async function listFactsForChild(db: Db, effective: AgeBracketKey, controls: Controls, category?: string) {
  const allowed = visibleBrackets(effective, controls);
  const conds = [eq(facts.status, 'published')];
  if (category) conds.push(eq(facts.category, category));
  const rows = await db.select().from(facts).where(and(...conds)).orderBy(asc(facts.publishedAt));
  return rows.filter((f) => f.brackets.some((b) => allowed.includes(b as AgeBracketKey)));
}
