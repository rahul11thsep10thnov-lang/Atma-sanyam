import { Job, Worker } from "bullmq";
import { env } from "../../config/env";
import { connection } from "../../queue/queues";
import { prisma } from "../../lib/prisma";
import { logger } from "../../lib/logger";
import { executeJob, STUDIO_QUEUE, STUDIO_RENDER_QUEUE } from "./jobRunner";

/**
 * Studio workers. `studio` runs AI/voice/visual jobs (I/O-bound, higher
 * concurrency); `studio-render` runs FFmpeg (CPU-bound, ~1 per core).
 * STUDIO_WORKER_ROLES=studio|render|all lets render hosts scale separately.
 */
export function startStudioWorkers(): Worker[] {
  const roles = env.studio.workerRoles;
  const workers: Worker[] = [];
  const processor = async (job: Job<{ jobId: string }>) => {
    await executeJob(prisma, job.data.jobId, job.attemptsMade, job.opts.attempts ?? 3);
  };
  if (roles === "all" || roles === "studio") {
    workers.push(new Worker(STUDIO_QUEUE, processor, { connection, concurrency: env.studio.workerConcurrency }));
  }
  if (roles === "all" || roles === "render") {
    workers.push(new Worker(STUDIO_RENDER_QUEUE, processor, { connection, concurrency: env.studio.renderConcurrency }));
  }
  for (const w of workers) w.on("failed", (job, err) => logger.error({ jobId: job?.data?.jobId, err: err.message }, `${w.name} job failed`));
  logger.info(`Studio workers started (roles: ${roles})`);
  return workers;
}
