import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDatabase } from './client.js';

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const database = createDatabase(process.env.DATABASE_URL, 1);
  database
    .migrate()
    .then(async () => {
      console.log(`Migrations applied (${database.driver}).`);
      await database.close();
    })
    .catch(async (err) => {
      console.error('Migration failed:', err instanceof Error ? err.message : err);
      await database.close();
      process.exit(1);
    });
}
