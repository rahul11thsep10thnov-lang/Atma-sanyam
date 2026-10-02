import { createDatabase } from './client.js';
import { loadDotEnv } from '../config/dotenv.js';
import { isMainModule } from '../lib/isMain.js';

if (isMainModule(import.meta.url)) {
  loadDotEnv();
  let database: ReturnType<typeof createDatabase>;
  try {
    database = createDatabase(process.env.DATABASE_URL, 1);
  } catch (err) {
    console.error(`\n${err instanceof Error ? err.message : err}\n`);
    process.exit(1);
  }
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
