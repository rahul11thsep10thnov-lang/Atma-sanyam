import { loadDotEnv } from './config/dotenv.js';
import { loadEnv, type Env } from './config/env.js';
import { createDatabase } from './database/client.js';
import { seedTaxonomy } from './database/seedTaxonomy.js';
import { setLogLevel, log } from './lib/logger.js';
import { createSupabaseVerifier } from './lib/supabase.js';
import { createAiProvider } from './pipeline/ai/index.js';
import type { AppDeps } from './types.js';

/** Shared start-up for the API and the standalone worker. */
export async function bootstrap(): Promise<{ env: Env; deps: AppDeps; close: () => Promise<void> }> {
  loadDotEnv();
  const env = loadEnv();
  setLogLevel(env.LOG_LEVEL);
  const database = createDatabase(env.DATABASE_URL, env.DATABASE_POOL_MAX);
  if (database.driver === 'pglite') {
    // Zero-setup development: migrate and seed the embedded database on start.
    await database.migrate();
    const { created } = await seedTaxonomy(database.db);
    log.info('db.embedded_ready', { driver: 'pglite', seeded: created });
  }
  const deps: AppDeps = {
    db: database.db,
    env,
    ai: createAiProvider(env),
    verifySupabaseToken: env.SUPABASE_URL && env.SUPABASE_ANON_KEY ? createSupabaseVerifier(env.SUPABASE_URL, env.SUPABASE_ANON_KEY) : null,
  };
  if (env.MOCK_AI) log.warn('ai.mock_mode', { message: 'MOCK_AI=true: questions are generated locally, no AI provider is called.' });
  return { env, deps, close: database.close };
}
