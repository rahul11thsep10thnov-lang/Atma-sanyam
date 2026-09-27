import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDatabase, type Db } from './client.js';
import { syncRbac } from './syncRbac.js';

const here = path.dirname(fileURLToPath(import.meta.url));
// Works from both src/database (tsx) and dist/database (compiled).
export const MIGRATIONS_FOLDER = path.resolve(here, '../../drizzle');

export async function runMigrations(db: Db): Promise<void> {
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  await syncRbac(db);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }
  const database = createDatabase(url, 1);
  runMigrations(database.db)
    .then(() => {
      console.log('Migrations applied and roles/permissions synced.');
      return database.close();
    })
    .catch(async (err) => {
      console.error('Migration failed:', err instanceof Error ? err.message : err);
      await database.close();
      process.exit(1);
    });
}
