import { execFile } from "node:child_process";
import { hostname } from "node:os";
import { promisify } from "node:util";
import { GpuWorker, PrismaClient } from "@prisma/client";
import { GPU_QUEUES, QueueName } from "../jobs/jobRunner";

const execFileAsync = promisify(execFile);

export interface GpuInfo {
  index: number;
  name: string;
  memoryTotalGb: number;
  memoryFreeGb: number;
  utilization: number;
}

/** Reads NVIDIA GPUs via nvidia-smi; [] when there is no driver (CPU host, CI). */
export async function detectGpus(): Promise<GpuInfo[]> {
  try {
    const { stdout } = await execFileAsync("nvidia-smi", ["--query-gpu=index,name,memory.total,memory.free,utilization.gpu", "--format=csv,noheader,nounits"], { timeout: 5000 });
    return stdout
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [index, name, total, free, util] = line.split(",").map((s) => s.trim());
        return { index: Number(index), name, memoryTotalGb: Number(total) / 1024, memoryFreeGb: Number(free) / 1024, utilization: Number(util) };
      });
  } catch {
    return [];
  }
}

export interface RegisterInput {
  workerId: string;
  queues: QueueName[];
  endpoint?: string;
  loadedModels?: string[];
  maxConcurrentJobs: number;
  gpu?: GpuInfo;
  vramGbOverride?: number;
}

export async function registerGpuWorker(db: PrismaClient, input: RegisterInput): Promise<GpuWorker> {
  const vram = input.gpu?.memoryTotalGb ?? input.vramGbOverride ?? 0;
  const data = {
    hostname: hostname(),
    gpuName: input.gpu?.name ?? "unknown (no nvidia-smi)",
    gpuIndex: input.gpu?.index ?? 0,
    vramTotalGb: vram,
    vramFreeGb: input.gpu?.memoryFreeGb ?? vram,
    loadedModels: input.loadedModels ?? [],
    queues: input.queues,
    endpoint: input.endpoint ?? null,
    status: "ONLINE" as const,
    runningJobs: 0,
    maxConcurrentJobs: input.maxConcurrentJobs,
    lastHeartbeatAt: new Date(),
    startedAt: new Date(),
  };
  return db.gpuWorker.upsert({ where: { workerId: input.workerId }, create: { workerId: input.workerId, ...data }, update: data });
}

export async function heartbeat(db: PrismaClient, workerId: string, gpu?: GpuInfo): Promise<void> {
  const running = await db.generationJob.count({ where: { gpuWorkerId: workerId, status: "PROCESSING" } });
  await db.gpuWorker.update({
    where: { workerId },
    data: { lastHeartbeatAt: new Date(), runningJobs: running, ...(gpu ? { vramFreeGb: gpu.memoryFreeGb } : {}), status: "ONLINE" },
  });
}

export async function setWorkerStatus(db: PrismaClient, workerId: string, status: "ONLINE" | "DRAINING" | "OFFLINE"): Promise<void> {
  await db.gpuWorker.update({ where: { workerId }, data: { status } }).catch(() => undefined);
}

/** Workers that stopped heartbeating are marked OFFLINE (their in-flight jobs are retried by the queue). */
export async function markStaleWorkers(db: PrismaClient, staleAfterSeconds: number): Promise<number> {
  const cutoff = new Date(Date.now() - staleAfterSeconds * 1000);
  const res = await db.gpuWorker.updateMany({ where: { status: { in: ["ONLINE", "DRAINING"] }, lastHeartbeatAt: { lt: cutoff } }, data: { status: "OFFLINE" } });
  return res.count;
}

export interface SchedulerSnapshot {
  workers: GpuWorker[];
  queues: { queue: string; waiting: number; running: number; onlineWorkers: number; slots: number; warning?: string }[];
}

/**
 * GPU scheduler view: per GPU queue, how much work waits, how many online
 * workers serve it and with how many slots. Jobs are pulled from the queues
 * by whichever online worker serves them (work-stealing across hosts); this
 * snapshot surfaces queues nobody is serving.
 */
export async function schedulerSnapshot(db: PrismaClient, staleAfterSeconds: number): Promise<SchedulerSnapshot> {
  await markStaleWorkers(db, staleAfterSeconds);
  const workers = await db.gpuWorker.findMany({ orderBy: [{ status: "asc" }, { workerId: "asc" }] });
  const queues = [];
  for (const q of GPU_QUEUES) {
    const waiting = await db.generationJob.count({ where: { queue: q, status: { in: ["PENDING", "RETRYING"] } } });
    const running = await db.generationJob.count({ where: { queue: q, status: "PROCESSING" } });
    const serving = workers.filter((w) => w.status === "ONLINE" && w.queues.includes(q));
    const slots = serving.reduce((s, w) => s + w.maxConcurrentJobs, 0);
    queues.push({ queue: q, waiting, running, onlineWorkers: serving.length, slots, warning: waiting > 0 && serving.length === 0 ? "Jobs are waiting but no online GPU worker serves this queue" : undefined });
  }
  return { workers, queues };
}
