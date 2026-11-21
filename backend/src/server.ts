import { createApp } from './app.js';
import { bootstrap } from './bootstrap.js';
import { configureAlertsFromProcessEnv, flushAlerts, installCrashHandlers } from './lib/alerts.js';
import { errorMessage, log } from './lib/logger.js';
import { GenerationWorker } from './pipeline/worker.js';
import { finalizeExpiredAttempts } from './services/attemptService.js';

async function main() {
  installCrashHandlers();
  const { env, deps, close } = await bootstrap();
  const app = createApp(deps);
  const worker = env.WORKER_ENABLED
    ? new GenerationWorker(deps, { concurrency: env.DATABASE_URL ? env.WORKER_CONCURRENCY : 1, pollMs: env.WORKER_POLL_MS })
    : null;

  const server = app.listen(env.PORT, () => {
    log.info('api.listening', { port: env.PORT, env: env.NODE_ENV, ai: deps.ai.name, worker: !!worker });
    worker?.start();
  });

  // Finalise exam attempts whose time (plus grace) ran out while the browser
  // was closed, from the answers autosaved so far. Idempotent; safe on
  // several instances.
  const sweep = setInterval(() => {
    finalizeExpiredAttempts(deps.db, env.ATTEMPT_GRACE_SECONDS)
      .then((n) => n && log.info('attempts.auto_finalised', { count: n }))
      .catch((e) => log.warn('attempts.sweep_failed', { message: errorMessage(e) }));
  }, 60_000);
  sweep.unref();

  async function shutdown(signal: string) {
    log.info('api.shutdown', { signal });
    clearInterval(sweep);
    server.close();
    await worker?.stop();
    await close();
    process.exit(0);
  }
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch(async (e) => {
  configureAlertsFromProcessEnv();
  log.error('api.start_failed', { message: errorMessage(e) });
  await flushAlerts();
  process.exit(1);
});
