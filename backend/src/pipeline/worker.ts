import { hostname } from 'node:os';
import { randomUUID } from 'node:crypto';
import { and, eq, inArray, lt, sql } from 'drizzle-orm';
import { generationBatches } from '../database/schema.js';
import { rowsOf } from '../database/client.js';
import { errorMessage, log } from '../lib/logger.js';
import { getSettings } from '../services/settingsService.js';
import type { AppDeps } from '../types.js';
import { processBatch, refreshJobStatus } from './batchProcessor.js';

type Deps = Pick<AppDeps, 'db' | 'env' | 'ai'>;
type Batch = typeof generationBatches.$inferSelect;

/**
 * Pulls queued batches from Postgres. `FOR UPDATE SKIP LOCKED` lets several
 * worker processes share the queue without ever claiming the same batch.
 */
export class GenerationWorker {
  readonly id = `${hostname()}-${randomUUID().slice(0, 8)}`;
  private running = 0;
  private timer: NodeJS.Timeout | null = null;
  private stopping = false;
  private inFlight = new Set<Promise<void>>();

  constructor(
    private readonly deps: Deps,
    private readonly opts: { concurrency: number; pollMs: number }
  ) {}

  /** Atomically claims the next due batch, or null. */
  async claim(ignoreBackoff = false): Promise<Batch | null> {
    const due = ignoreBackoff ? sql`true` : sql`${generationBatches.nextAttemptAt} <= now()`;
    const result = await this.deps.db.execute(sql`
      update ${generationBatches}
      set status = 'generating', locked_at = now(), locked_by = ${this.id},
          started_at = coalesce(started_at, now()), updated_at = now()
      where id = (
        select id from ${generationBatches}
        where status = 'queued' and ${due}
        order by created_at, batch_index
        limit 1
        for update skip locked
      )
      returning id`);
    const [row] = rowsOf<{ id: string }>(result);
    if (!row) return null;
    const [batch] = await this.deps.db.select().from(generationBatches).where(eq(generationBatches.id, row.id)).limit(1);
    return batch ?? null;
  }

  /** Batches whose worker died (container restart, deploy) go back to the
   * queue; the lock is considered stale after every retry could have timed out. */
  async recoverStale(): Promise<number> {
    const s = await getSettings(this.deps.db, this.deps.env);
    const staleMs = (s.generationTimeoutMs + s.reviewTimeoutMs * 2) * 3 + 60_000;
    const cutoff = new Date(Date.now() - staleMs);
    const stale = await this.deps.db
      .update(generationBatches)
      .set({
        status: 'queued',
        lockedAt: null,
        lockedBy: null,
        retryCount: sql`${generationBatches.retryCount} + 1`,
        errorMessage: 'The worker stopped while processing this batch; it was re-queued.',
        updatedAt: new Date(),
      })
      .where(and(inArray(generationBatches.status, ['generating', 'validating']), lt(generationBatches.lockedAt, cutoff)))
      .returning({ id: generationBatches.id, jobId: generationBatches.jobId });
    for (const b of stale) await refreshJobStatus(this.deps.db, b.jobId);
    if (stale.length) log.warn('worker.recovered_stale_batches', { count: stale.length });
    return stale.length;
  }

  start() {
    this.stopping = false;
    log.info('worker.started', { worker: this.id, concurrency: this.opts.concurrency });
    void this.recoverStale().catch((e) => log.error('worker.recover_failed', { message: errorMessage(e) }));
    const tick = async () => {
      if (this.stopping) return;
      try {
        while (this.running < this.opts.concurrency && !this.stopping) {
          const batch = await this.claim();
          if (!batch) break;
          this.running++;
          const p = processBatch(this.deps, batch)
            .catch((e) => log.error('worker.batch_crashed', { batchId: batch.id, message: errorMessage(e) }))
            .finally(() => {
              this.running--;
              this.inFlight.delete(p);
            });
          this.inFlight.add(p);
        }
      } catch (e) {
        log.error('worker.poll_failed', { message: errorMessage(e) });
      }
      if (!this.stopping) this.timer = setTimeout(() => void tick(), this.opts.pollMs);
    };
    void tick();
  }

  async stop() {
    this.stopping = true;
    if (this.timer) clearTimeout(this.timer);
    await Promise.allSettled([...this.inFlight]);
    log.info('worker.stopped', { worker: this.id });
  }

  /** Processes everything that is queued, one batch at a time (tests, scripts). */
  async drain(opts: { ignoreBackoff?: boolean; maxBatches?: number } = {}): Promise<number> {
    let processed = 0;
    for (;;) {
      if (opts.maxBatches !== undefined && processed >= opts.maxBatches) break;
      const batch = await this.claim(opts.ignoreBackoff);
      if (!batch) break;
      await processBatch(this.deps, batch);
      processed++;
    }
    return processed;
  }
}
