// Puts the code-defined catalogue into the database: age brackets, game
// categories, games and achievements. Runs on every start and migration;
// it only inserts what is missing (admins edit the rest from the console),
// except brackets and categories whose names it keeps in sync.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sql } from 'drizzle-orm';
import { createDatabase, type Db } from './client.js';
import { achievements, ageBrackets, craftTutorials, factSources, facts, gameCategories, games, lessons, quizQuestions, rewardItems, type CurriculumMapping } from './schema.js';
import { eq, inArray } from 'drizzle-orm';
import { BRACKETS } from '../lib/age.js';
import { ACHIEVEMENT_SEEDS, GAME_CATEGORIES, GAME_SEEDS } from '../catalogue/games.js';
import { CRAFT_SEEDS } from '../catalogue/crafts.js';
import { FACT_SEEDS, SOURCE_SEEDS } from '../catalogue/facts.js';
import { canonicalizeUrl } from '../lib/url.js';
import { seedSourceRegistry } from '../services/sourceRegistryService.js';
import { LESSON_SEEDS } from '../catalogue/lessons/index.js';
import { REWARD_ITEM_SEEDS } from '../services/coinService.js';

export async function seedCatalogue(db: Db): Promise<{ gamesInserted: number; craftsInserted: number; factsInserted: number; lessonsInserted: number; lessonsUpdated: number }> {
  await db
    .insert(ageBrackets)
    .values(BRACKETS.map((b, i) => ({ key: b.key, name: b.name, minAge: b.minAge, maxAge: b.maxAge, description: b.description, sortOrder: i })))
    .onConflictDoUpdate({ target: ageBrackets.key, set: { name: sql`excluded.name`, minAge: sql`excluded.min_age`, maxAge: sql`excluded.max_age`, description: sql`excluded.description`, sortOrder: sql`excluded.sort_order` } });

  await db
    .insert(gameCategories)
    .values(GAME_CATEGORIES.map((c, i) => ({ id: c.id, name: c.name, icon: c.icon, color: c.color, sortOrder: i })))
    .onConflictDoUpdate({ target: gameCategories.id, set: { name: sql`excluded.name`, icon: sql`excluded.icon`, color: sql`excluded.color`, sortOrder: sql`excluded.sort_order` } });

  const inserted = await db
    .insert(games)
    .values(
      GAME_SEEDS.map((g) => ({
        id: g.id,
        name: g.name,
        tagline: g.tagline,
        description: g.description,
        instructions: g.instructions,
        categoryId: g.categoryId,
        brackets: g.brackets,
        difficulties: g.difficulties,
        skills: g.skills,
        estimatedMinutes: g.estimatedMinutes,
        offlineCapable: g.offlineCapable ?? true,
        status: g.implementation === 'playable' ? ('published' as const) : ('in_development' as const),
        sortOrder: g.sortOrder,
      }))
    )
    .onConflictDoNothing()
    .returning({ id: games.id });

  await db
    .insert(achievements)
    .values(ACHIEVEMENT_SEEDS.map((a, i) => ({ key: a.key, name: a.name, description: a.description, icon: a.icon, rule: a.rule as Record<string, unknown>, sortOrder: i })))
    .onConflictDoNothing();

  const crafts = await db
    .insert(craftTutorials)
    .values(CRAFT_SEEDS.map((c) => ({ ...c, status: 'published' as const })))
    .onConflictDoNothing()
    .returning({ id: craftTutorials.id });

  // Earlier installs recorded the starter sources with an "accessed on" date
  // although nobody had fetched the pages. Reclassify exactly those untouched
  // rows as editorial references with no access date (rows an admin edited
  // no longer carry the original note and are left alone).
  await db
    .update(factSources)
    .set({ origin: 'editorial', accessedOn: null, notes: 'Editorial reference: the starter facts were written by editors with this page as a reference. No content is copied or ingested from it, and its licence has not been reviewed.', updatedAt: new Date() })
    .where(eq(factSources.notes, 'Starter library source'));
  // The source registry first: editorial facts may cite a registry source.
  await seedSourceRegistry(db);
  const factsInserted = await seedFacts(db);
  // Reward shop items: insert what is missing; admins edit prices from the console.
  await db.insert(rewardItems).values(REWARD_ITEM_SEEDS).onConflictDoNothing();
  const lessonsResult = await seedLessons(db);
  return { gamesInserted: inserted.length, craftsInserted: crafts.length, factsInserted, ...lessonsResult };
}

/**
 * Seeds the learning academy's lessons. New lessons are inserted as
 * published (they are the editorial starter set; every curriculum mapping is
 * still pending_review until a fact checker verifies it). Lessons that came
 * from the seed and were never edited in the console are refreshed with the
 * latest seed content so corrections ship with the code — keeping any
 * verification an admin already recorded on a matching mapping. A lesson an
 * admin edited is left alone.
 */
export async function seedLessons(db: Db): Promise<{ lessonsInserted: number; lessonsUpdated: number }> {
  const existing = await db.select({ id: lessons.id, origin: lessons.origin, adminEdited: lessons.adminEdited, curriculum: lessons.curriculum, status: lessons.status }).from(lessons).where(inArray(lessons.id, LESSON_SEEDS.map((l) => l.id)));
  const byId = new Map(existing.map((e) => [e.id, e]));
  const now = new Date();
  let inserted = 0;
  let updated = 0;
  for (const l of LESSON_SEEDS) {
    const row = {
      section: l.section,
      subject: l.subject,
      topic: l.topic,
      subtopic: l.subtopic ?? '',
      title: l.title,
      summary: l.summary,
      recommendedAge: l.recommendedAge,
      minAge: l.minAge ?? Math.max(3, l.recommendedAge - 2),
      maxAge: l.maxAge ?? Math.min(12, l.recommendedAge + 2),
      difficulty: l.difficulty ?? 'beginner',
      level: l.level ?? 1,
      learningObjective: l.learningObjective,
      prerequisites: l.prerequisites ?? [],
      steps: l.steps,
      estimatedMinutes: l.estimatedMinutes ?? 8,
      curriculum: l.curriculum ?? [],
      sources: l.sources,
      safetyNotes: l.safetyNotes ?? [],
      adultAssisted: l.adultAssisted ?? false,
      sortOrder: l.sortOrder ?? 0,
    };
    const prev = byId.get(l.id);
    if (!prev) {
      await db.insert(lessons).values({ id: l.id, ...row, status: 'published', publishedAt: now, origin: 'seed' }).onConflictDoNothing();
      inserted += 1;
      continue;
    }
    if (prev.origin !== 'seed' || prev.adminEdited) continue;
    // Carry verification forward for mappings that still exist (same framework + grade + topic).
    const curriculum: CurriculumMapping[] = row.curriculum.map((m) => {
      const old = prev.curriculum.find((o) => o.framework === m.framework && o.grade === m.grade && o.syllabusTopic === m.syllabusTopic);
      return old ? { ...m, verificationStatus: old.verificationStatus, lastReviewedAt: old.lastReviewedAt } : m;
    });
    await db.update(lessons).set({ ...row, curriculum, updatedAt: now }).where(eq(lessons.id, l.id));
    updated += 1;
  }
  return { lessonsInserted: inserted, lessonsUpdated: updated };
}

/**
 * Inserts the starter facts that are not in the database yet (by slug), each
 * linked to its publisher source and with its quiz questions. Seeded facts
 * are published: they are the editorial starter set, every one with a source
 * an editor can re-check from the admin console.
 */
export async function seedFacts(db: Db): Promise<number> {
  const existing = new Set((await db.select({ slug: facts.slug }).from(facts).where(inArray(facts.slug, FACT_SEEDS.map((f) => f.slug)))).map((r) => r.slug));
  const missing = FACT_SEEDS.filter((f) => !existing.has(f.slug));
  if (missing.length === 0) return 0;
  // Sources: reuse by canonical URL so re-seeding (or a registry source with
  // the same page) never creates a duplicate. Editorial references are not
  // licence-checked sources: the editors wrote these facts and cite the page.
  const sourceIds = new Map<string, string>();
  for (const s of SOURCE_SEEDS) {
    const canonical = canonicalizeUrl(s.url);
    const [found] = canonical ? await db.select({ id: factSources.id }).from(factSources).where(eq(factSources.canonicalUrl, canonical)) : await db.select({ id: factSources.id }).from(factSources).where(eq(factSources.url, s.url));
    if (found) sourceIds.set(s.key, found.id);
    else {
      const [row] = await db
        .insert(factSources)
        .values({ title: s.title, publisher: s.publisher, url: s.url, canonicalUrl: canonical, origin: 'editorial', accessedOn: null, notes: 'Editorial reference: the starter facts were written by editors with this page as a reference. No content is copied or ingested from it, and its licence has not been reviewed.', verificationStatus: 'pending_review' })
        .returning({ id: factSources.id });
      sourceIds.set(s.key, row!.id);
    }
  }
  const now = new Date();
  for (const f of missing) {
    const sourceId = sourceIds.get(f.source);
    if (!sourceId) throw new Error(`Fact ${f.slug} names unknown source ${f.source}`);
    const [row] = await db
      .insert(facts)
      .values({ slug: f.slug, category: f.category, headline: f.headline, body: f.body, whyText: f.whyText, followUpQuestion: f.followUpQuestion, brackets: f.brackets, readingLevel: f.readingLevel, illustration: f.illustration, sourceId, status: 'published', verifiedAt: now, publishedAt: now })
      .onConflictDoNothing()
      .returning({ id: facts.id });
    if (!row) continue;
    if (f.quiz.length) await db.insert(quizQuestions).values(f.quiz.map((qq, i) => ({ factId: row.id, question: qq.question, options: qq.options, correctIndex: qq.correctIndex, explanation: qq.explanation, sortOrder: i })));
  }
  return missing.length;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }
  const database = createDatabase(url, 1);
  seedCatalogue(database.db)
    .then((r) => {
      console.log(`Catalogue seeded (${r.gamesInserted} new games, ${r.craftsInserted} new crafts, ${r.factsInserted} new facts, ${r.lessonsInserted} new lessons, ${r.lessonsUpdated} refreshed).`);
      return database.close();
    })
    .catch(async (err) => {
      console.error('Seeding failed:', err instanceof Error ? err.message : err);
      await database.close();
      process.exit(1);
    });
}
