// Standalone generation worker: `npm run worker`. Run it next to the API
// (with WORKER_ENABLED=false on the API) to scale generation separately.
import { bootstrap } from './bootstrap.js';
import { configureAlertsFromProcessEnv, flushAlerts, installCrashHandlers } from './lib/alerts.js';
import { errorMessage, log } from './lib/logger.js';
import { GenerationWorker } from './pipeline/worker.js';

async function main() {
  installCrashHandlers();
  const { env, deps, close } = await bootstrap();
  if (!env.DATABASE_URL) {
    throw new Error('The standalone worker needs DATABASE_URL (the embedded database cannot be shared between processes).');
  }
  const worker = new GenerationWorker(deps, { concurrency: env.WORKER_CONCURRENCY, pollMs: env.WORKER_POLL_MS });
  worker.start();
  const shutdown = async () => {
    await worker.stop();
    await close();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown());
  process.on('SIGINT', () => void shutdown());
}

main().catch(async (e) => {
  configureAlertsFromProcessEnv('PoliceExams worker');
  log.error('worker.start_failed', { message: errorMessage(e) });
  await flushAlerts();
  process.exit(1);
});
