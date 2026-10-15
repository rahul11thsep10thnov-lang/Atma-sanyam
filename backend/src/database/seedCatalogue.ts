// Puts the code-defined catalogue into the database: age brackets, game
// categories, games and achievements. Runs on every start and migration;
// it only inserts what is missing (admins edit the rest from the console),
// except brackets and categories whose names it keeps in sync.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sql } from 'drizzle-orm';
import { createDatabase, type Db } from './client.js';
import { achievements, ageBrackets, craftTutorials, gameCategories, games } from './schema.js';
import { BRACKETS } from '../lib/age.js';
import { ACHIEVEMENT_SEEDS, GAME_CATEGORIES, GAME_SEEDS } from '../catalogue/games.js';
import { CRAFT_SEEDS } from '../catalogue/crafts.js';

export async function seedCatalogue(db: Db): Promise<{ gamesInserted: number; craftsInserted: number }> {
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

  return { gamesInserted: inserted.length, craftsInserted: crafts.length };
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
      console.log(`Catalogue seeded (${r.gamesInserted} new games, ${r.craftsInserted} new crafts).`);
      return database.close();
    })
    .catch(async (err) => {
      console.error('Seeding failed:', err instanceof Error ? err.message : err);
      await database.close();
      process.exit(1);
    });
}
