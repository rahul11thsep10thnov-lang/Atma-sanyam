// One-shot source maintenance for cron hosts: seed the registry, verify the
// sources that are due, discover candidates, ingest facts from approved sources.
//   npm run sources:maintain        (tsx)     node dist/database/maintainSources.js (production)
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from '../config/env.js';
import { maintenanceCycle } from '../services/sourceScheduler.js';
import { createDatabase } from './client.js';
import { seedCatalogue } from './seedCatalogue.js';

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const env = loadEnv();
  const database = createDatabase(env.DATABASE_URL, 2);
  seedCatalogue(database.db)
    .then(() => maintenanceCycle(database.db, env, 'scheduled'))
    .then((r) => {
      const m = r.maintenance;
      console.log(`Sources: checked ${m.checked}, approved ${m.approved}, restricted ${m.restricted}, pending ${m.pending}, failed ${m.failed}, discovered ${m.discovered}; facts created ${r.ingestion?.created ?? 0}.`);
      return database.close();
    })
    .catch(async (err) => {
      console.error('Source maintenance failed:', err instanceof Error ? err.message : err);
      await database.close();
      process.exit(1);
    });
}
