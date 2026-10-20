// Scheduling for the source registry. Two entry points share one cycle:
//   * startSourceMaintenance(): an in-process timer (the API is a long-lived
//     container, like the rest of this backend);
//   * `npm run sources:maintain`: a one-shot for a cron job (render.yaml
//     schedules it daily), for hosts that stop idle processes.
// The cycle only fetches sources whose last check is older than
// SOURCE_CHECK_INTERVAL_HOURS, so running it more often than needed is cheap
// and two instances cannot double-fetch for long.
import type { Db } from '../database/client.js';
import type { Env } from '../config/env.js';
import { runIngestion, type IngestReport } from './factIngestService.js';
import { runMaintenance, runtimeFromEnv, type MaintenanceReport, type RegistryRuntime, type Trigger } from './sourceRegistryService.js';

export interface CycleReport {
  maintenance: MaintenanceReport;
  ingestion: IngestReport | null;
}

export async function maintenanceCycle(db: Db, env: Env, trigger: Trigger, overrides: Partial<RegistryRuntime> = {}): Promise<CycleReport> {
  const rt = runtimeFromEnv(env, overrides);
  const maintenance = await runMaintenance(db, rt, { trigger });
  let ingestion: IngestReport | null = null;
  if (env.FACT_INGEST_ENABLED) {
    ingestion = await runIngestion(db, rt, { maxPerRun: env.FACT_INGEST_MAX_PER_RUN, autoPublish: env.FACT_INGEST_AUTO_PUBLISH }).catch((err) => {
      rt.log(`ingestion failed: ${err instanceof Error ? err.message : 'error'}`);
      return null;
    });
    if (ingestion) rt.log(`ingestion created ${ingestion.created} fact(s)`);
  }
  return { maintenance, ingestion };
}

/** Starts the in-process schedule. Returns a function that stops it. */
export function startSourceMaintenance(db: Db, env: Env): () => void {
  if (!env.SOURCE_MAINTENANCE_ENABLED || env.NODE_ENV === 'test') return () => undefined;
  let running = false;
  let first = true;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await maintenanceCycle(db, env, first ? 'startup' : 'scheduled');
    } catch (err) {
      console.error('[sources] maintenance cycle failed:', err instanceof Error ? err.message : err);
    } finally {
      first = false;
      running = false;
    }
  };
  const startup = setTimeout(() => void tick(), 20_000);
  const timer = setInterval(() => void tick(), 3_600_000);
  startup.unref();
  timer.unref();
  return () => {
    clearTimeout(startup);
    clearInterval(timer);
  };
}
