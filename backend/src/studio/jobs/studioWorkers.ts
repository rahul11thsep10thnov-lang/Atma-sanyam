import { Job, Worker } from "bullmq";
import { env } from "../../config/env";
import { connection } from "../../queue/queues";
import { prisma } from "../../lib/prisma";
import { logger } from "../../lib/logger";
import { ALL_QUEUES, executeJob, GPU_QUEUES, JobCancelledError, QueueName, QUEUES } from "./jobRunner";

/**
 * Studio workers. STUDIO_WORKER_ROLES selects which queues this process
 * consumes, so hosts scale by resource:
 *   all     → every queue (single-box installs)
 *   studio  → LLM / TTS / planning (I/O-bound)
 *   render  → FFmpeg assembly + 2.5D shot renders + QC (CPU-bound)
 *   gpu     → image-generation, segmentation, depth, inpainting, i2v
 *   pipeline → no studio queue; selects the news-ingestion workers in runWorkers
 *   or an explicit comma list of queue names, e.g. "image-generation,depth-generation".
 */
export function queuesForRoles(roles: string): QueueName[] {
  const parts = roles.split(",").map((r) => r.trim()).filter(Boolean);
  const out = new Set<QueueName>();
  for (const p of parts) {
    if (p === "pipeline") continue;
    if (p === "all") ALL_QUEUES.forEach((q) => out.add(q));
    else if (p === "studio") out.add(QUEUES.studio);
    else if (p === "render") [QUEUES.ffmpegRender, QUEUES.render25d, QUEUES.qc].forEach((q) => out.add(q));
    else if (p === "gpu") GPU_QUEUES.forEach((q) => out.add(q));
    else if ((ALL_QUEUES as string[]).includes(p)) out.add(p as QueueName);
    else logger.warn(`Unknown studio worker role/queue "${p}" ignored`);
  }
  return [...out];
}

function concurrencyFor(q: QueueName): number {
  if (q === QUEUES.studio) return env.studio.workerConcurrency;
  if (q === QUEUES.ffmpegRender) return env.studio.renderConcurrency;
  // 2.5D renders parallelise internally across cores; one at a time per host.
  if (q === QUEUES.render25d) return 1;
  // GPU queues: one job per GPU by default (the GPU scheduler hands out slots).
  if ((GPU_QUEUES as string[]).includes(q)) return env.gpu.slotsPerWorker;
  return 2;
}

export function startStudioWorkers(): Worker[] {
  const queues = queuesForRoles(env.studio.workerRoles);
  const processor = async (job: Job<{ jobId: string }>) => {
    try {
      await executeJob(prisma, job.data.jobId, job.attemptsMade, job.opts.attempts ?? 3);
    } catch (e) {
      // A cancelled job must not be retried by BullMQ.
      if (e instanceof JobCancelledError) return;
      throw e;
    }
  };
  const workers = queues.map((q) => new Worker(q, processor, { connection, concurrency: concurrencyFor(q) }));
  for (const w of workers) w.on("failed", (job, err) => logger.error({ jobId: job?.data?.jobId, err: err.message }, `${w.name} job failed`));
  logger.info(`Studio workers started on queues: ${queues.join(", ")}`);
  return workers;
}
