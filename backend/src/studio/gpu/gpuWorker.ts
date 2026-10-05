// GPU worker process: `npm run worker:gpu` on each GPU host.
//
// Runs next to the host's local inference services (ComfyUI and/or the
// internal inference API, bound to localhost or the private network), pulls
// jobs from the GPU queues, registers itself in gpu_workers and heartbeats.
// Scale out by adding hosts; each worker uses its own local GPU service.
import { randomUUID } from "node:crypto";
import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { logger } from "../../lib/logger";
import { startStudioWorkers, queuesForRoles } from "../jobs/studioWorkers";
import { detectGpus, heartbeat, registerGpuWorker, setWorkerStatus } from "./gpuRegistry";

async function main() {
  const roles = process.env.STUDIO_WORKER_ROLES && process.env.STUDIO_WORKER_ROLES !== "all" ? process.env.STUDIO_WORKER_ROLES : "gpu";
  process.env.STUDIO_WORKER_ROLES = roles;
  env.studio.workerRoles = roles;
  const workerId = env.gpu.workerId || `gpu-${randomUUID().slice(0, 8)}`;
  env.gpu.workerId = workerId;
  const gpus = await detectGpus();
  const gpu = gpus[0];
  if (!gpu) logger.warn("nvidia-smi not available — registering without GPU telemetry");
  const queues = queuesForRoles(roles);
  await registerGpuWorker(prisma, {
    workerId,
    queues,
    endpoint: env.localAi.comfyBaseUrl || env.localAi.inferenceBaseUrl || undefined,
    loadedModels: [],
    maxConcurrentJobs: env.gpu.slotsPerWorker,
    gpu,
    vramGbOverride: env.gpu.vramGb || undefined,
  });
  const workers = startStudioWorkers();
  logger.info(`GPU worker ${workerId} online (${gpu?.name ?? "no GPU telemetry"}) serving ${queues.join(", ")}`);
  const timer = setInterval(async () => {
    const g = (await detectGpus())[0];
    await heartbeat(prisma, workerId, g).catch((err) => logger.warn({ err }, "heartbeat failed"));
  }, env.gpu.heartbeatSeconds * 1000);

  const shutdown = async (signal: string) => {
    logger.info(`${signal}: draining GPU worker ${workerId}`);
    clearInterval(timer);
    await setWorkerStatus(prisma, workerId, "DRAINING");
    await Promise.all(workers.map((w) => w.close()));
    await setWorkerStatus(prisma, workerId, "OFFLINE");
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
