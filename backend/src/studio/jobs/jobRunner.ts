import { GenerationJob, GenerationJobType, Prisma, PrismaClient } from "@prisma/client";
import { Queue } from "bullmq";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";

export const STUDIO_QUEUE = "studio";
export const STUDIO_RENDER_QUEUE = "studio-render";

/**
 * Work queues by resource. GPU queues are consumed only by workers on GPU
 * hosts (see gpu worker roles); CPU render queues by render hosts.
 */
export const QUEUES = {
  studio: STUDIO_QUEUE, // LLM, TTS, planning, light work
  imageGeneration: "image-generation",
  segmentation: "segmentation",
  depthGeneration: "depth-generation",
  inpainting: "inpainting",
  i2v: "i2v",
  render25d: "2.5d-render",
  ffmpegRender: STUDIO_RENDER_QUEUE, // FFmpeg assembly (existing render queue)
  qc: "qc",
} as const;
export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];
export const ALL_QUEUES: QueueName[] = Object.values(QUEUES);
export const GPU_QUEUES: QueueName[] = [QUEUES.imageGeneration, QUEUES.segmentation, QUEUES.depthGeneration, QUEUES.inpainting, QUEUES.i2v];

const QUEUE_FOR_TYPE: Partial<Record<GenerationJobType, QueueName>> = {
  RENDER_LANGUAGE: QUEUES.ffmpegRender,
  RENDER_PACKAGE: QUEUES.ffmpegRender,
  ASSEMBLE_MASTER_VISUAL: QUEUES.ffmpegRender,
  GENERATE_LAYER_ASSET: QUEUES.imageGeneration,
  GENERATE_MASK: QUEUES.segmentation,
  GENERATE_DEPTH: QUEUES.depthGeneration,
  INPAINT_ASSET: QUEUES.inpainting,
  RENDER_SHOT_I2V: QUEUES.i2v,
  BUILD_SCENE_PACKAGE: QUEUES.render25d,
  RENDER_SHOT: QUEUES.render25d,
  SHOT_QC: QUEUES.qc,
  FINAL_QC: QUEUES.qc,
};

export function queueForJobType(type: GenerationJobType): QueueName {
  return QUEUE_FOR_TYPE[type] ?? QUEUES.studio;
}

/** Default wall-clock limits per queue (ms); a job can override with timeoutMs. */
const DEFAULT_TIMEOUT: Partial<Record<QueueName, number>> = {
  [QUEUES.imageGeneration]: 15 * 60_000,
  [QUEUES.segmentation]: 10 * 60_000,
  [QUEUES.depthGeneration]: 10 * 60_000,
  [QUEUES.inpainting]: 10 * 60_000,
  [QUEUES.i2v]: 45 * 60_000,
  [QUEUES.render25d]: 60 * 60_000,
  [QUEUES.ffmpegRender]: 60 * 60_000,
  [QUEUES.qc]: 10 * 60_000,
  [QUEUES.studio]: 15 * 60_000,
};

// Kept for callers that only distinguish "render" from "studio" work.
export const RENDER_JOB_TYPES = new Set<GenerationJobType>(["RENDER_LANGUAGE", "RENDER_PACKAGE", "ASSEMBLE_MASTER_VISUAL"]);
const MAX_ATTEMPTS = 3;

export interface JobContext {
  job: GenerationJob;
  log: (message: string, data?: unknown, level?: "info" | "warn" | "error") => Promise<void>;
  /** Report 0-100 progress (throttled DB writes). */
  progress: (percent: number) => Promise<void>;
  /** Aborted when an admin cancels the job or its timeout elapses. Long stages must honour it. */
  signal: AbortSignal;
  /** Record which provider/model/GPU worker did the work (observability). */
  setExecution: (info: { provider?: string; model?: string; gpuWorkerId?: string }) => Promise<void>;
}

export type JobHandler = (prisma: PrismaClient, ctx: JobContext) => Promise<unknown>;

export interface EnqueueOptions {
  storyId: string;
  type: GenerationJobType;
  languageCode?: string;
  sceneId?: string;
  episodeId?: string;
  shotId?: string;
  assetId?: string;
  payload?: Record<string, unknown>;
  requestedBy?: string;
  /** Idempotency key: an identical unit of work that is queued, running or done is not repeated. */
  dedupeKey?: string;
  priority?: number;
  timeoutMs?: number;
}

export class JobCancelledError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "JobCancelledError";
  }
}

const queueCache = new Map<string, Queue>();
function getQueue(name: QueueName): Queue {
  let q = queueCache.get(name);
  if (!q) {
    // Lazy so an API process in inline mode never needs Redis for studio work.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { connection } = require("../../queue/queues") as typeof import("../../queue/queues");
    q = new Queue(name, { connection });
    queueCache.set(name, q);
  }
  return q;
}

// ---------------------------------------------------------------------------
// Inline mode (STUDIO_INLINE_JOBS=true, and tests): jobs run in-process, one
// at a time, in the order they were queued.
// ---------------------------------------------------------------------------
let inlineMode = env.studio.inlineJobs;
let inlineChain: Promise<void> = Promise.resolve();
let inlinePending = 0;
let inlinePrisma: PrismaClient | null = null;

export function setInlineMode(enabled: boolean, prisma?: PrismaClient) {
  inlineMode = enabled;
  if (prisma) inlinePrisma = prisma;
}

export function isInlineMode() {
  return inlineMode;
}

/** Resolves once every inline job (including jobs they enqueue) has finished. */
export async function waitForInlineJobs(): Promise<void> {
  while (inlinePending > 0) await inlineChain;
}

async function dispatch(prisma: PrismaClient, job: GenerationJob) {
  if (inlineMode) {
    inlinePending++;
    const db = inlinePrisma ?? prisma;
    inlineChain = inlineChain.then(async () => {
      try {
        for (let attempt = 0; attempt < job.maxAttempts; attempt++) {
          try {
            await executeJob(db, job.id, attempt, job.maxAttempts);
            break;
          } catch (e) {
            if (e instanceof JobCancelledError) break;
            // executeJob records RETRYING/FAILED; loop retries immediately inline
          }
        }
      } finally {
        inlinePending--;
      }
    });
    return;
  }
  const q = getQueue((job.queue as QueueName | null) ?? queueForJobType(job.type));
  await q.add(job.type, { jobId: job.id }, { jobId: `${job.id}-${job.attempts}-${Date.now()}`, attempts: job.maxAttempts, priority: job.priority, backoff: { type: "exponential", delay: 5000 }, removeOnComplete: 1000, removeOnFail: 2000 });
}

export async function enqueueStudioJob(prisma: PrismaClient, opts: EnqueueOptions): Promise<GenerationJob> {
  if (opts.dedupeKey) {
    const existing = await prisma.generationJob.findUnique({ where: { dedupeKey: opts.dedupeKey } });
    if (existing && existing.status !== "FAILED" && existing.status !== "CANCELLED") return existing;
    if (existing) return retryJob(prisma, existing.id);
  }
  const queue = queueForJobType(opts.type);
  let job: GenerationJob;
  try {
    job = await prisma.generationJob.create({
      data: {
        storyId: opts.storyId,
        type: opts.type,
        languageCode: opts.languageCode,
        sceneId: opts.sceneId,
        episodeId: opts.episodeId,
        shotId: opts.shotId,
        assetId: opts.assetId,
        queue,
        priority: opts.priority ?? 5,
        timeoutMs: opts.timeoutMs ?? DEFAULT_TIMEOUT[queue],
        payload: (opts.payload ?? undefined) as Prisma.InputJsonValue | undefined,
        dedupeKey: opts.dedupeKey,
        requestedBy: opts.requestedBy ?? "pipeline",
        maxAttempts: MAX_ATTEMPTS,
      },
    });
  } catch (err) {
    // Lost a race on the dedupe key: someone else queued the same work.
    if (opts.dedupeKey && (err as { code?: string }).code === "P2002") {
      return prisma.generationJob.findUniqueOrThrow({ where: { dedupeKey: opts.dedupeKey } });
    }
    throw err;
  }
  await dispatch(prisma, job);
  return job;
}

/** Retries exactly one job (granular retry — nothing else is regenerated). */
export async function retryJob(prisma: PrismaClient, jobId: string): Promise<GenerationJob> {
  const job = await prisma.generationJob.update({
    where: { id: jobId },
    data: { status: "PENDING", error: null, attempts: 0, startedAt: null, finishedAt: null, cancelRequested: false, progress: 0 },
  });
  await writeLog(prisma, jobId, "info", "Retry requested");
  await dispatch(prisma, job);
  return job;
}

/**
 * Cancels a job: pending jobs are marked CANCELLED immediately; running jobs
 * get cancelRequested and stop at their next checkpoint (ctx.signal).
 */
export async function cancelJob(prisma: PrismaClient, jobId: string, by?: string): Promise<GenerationJob> {
  const job = await prisma.generationJob.findUniqueOrThrow({ where: { id: jobId } });
  if (job.status === "COMPLETED" || job.status === "FAILED" || job.status === "CANCELLED") return job;
  await writeLog(prisma, jobId, "warn", `Cancellation requested${by ? ` by ${by}` : ""}`);
  if (job.status === "PENDING" || job.status === "RETRYING") {
    return prisma.generationJob.update({ where: { id: jobId }, data: { status: "CANCELLED", cancelRequested: true, finishedAt: new Date() } });
  }
  return prisma.generationJob.update({ where: { id: jobId }, data: { cancelRequested: true } });
}

async function writeLog(prisma: PrismaClient, jobId: string, level: string, message: string, data?: unknown) {
  await prisma.generationLog
    .create({ data: { jobId, level, message: message.slice(0, 2000), data: data === undefined ? undefined : (JSON.parse(JSON.stringify(data)) as Prisma.InputJsonValue) } })
    .catch((err) => logger.warn({ err }, "Failed to write generation log"));
}

/**
 * Runs one GenerationJob: PENDING/RETRYING → PROCESSING → COMPLETED, or
 * RETRYING (attempts left) / FAILED (none left) / CANCELLED. Throws on
 * failure so BullMQ applies its backoff and retries (never for cancellation).
 */
export async function executeJob(prisma: PrismaClient, jobId: string, attemptsMade: number, maxAttempts: number): Promise<void> {
  const before = await prisma.generationJob.findUnique({ where: { id: jobId } });
  if (!before || before.status === "CANCELLED" || before.status === "COMPLETED") return;
  if (before.cancelRequested) {
    await prisma.generationJob.update({ where: { id: jobId }, data: { status: "CANCELLED", finishedAt: new Date() } });
    return;
  }
  const startedAt = new Date();
  const job = await prisma.generationJob.update({
    where: { id: jobId },
    data: { status: "PROCESSING", attempts: attemptsMade + 1, startedAt, error: null, ...(env.gpu.workerId ? { gpuWorkerId: env.gpu.workerId } : {}) },
  });
  const ctrl = new AbortController();
  let abortReason = "";
  const timeoutMs = job.timeoutMs ?? DEFAULT_TIMEOUT[queueForJobType(job.type)] ?? 15 * 60_000;
  const timer = setTimeout(() => {
    abortReason = `Timed out after ${Math.round(timeoutMs / 1000)}s`;
    ctrl.abort();
  }, timeoutMs);
  // Poll for admin cancellation while the job runs.
  const poll = setInterval(async () => {
    const row = await prisma.generationJob.findUnique({ where: { id: jobId }, select: { cancelRequested: true } }).catch(() => null);
    if (row?.cancelRequested && !ctrl.signal.aborted) {
      abortReason = "Cancelled by an administrator";
      ctrl.abort();
    }
  }, 3000);
  let lastProgressWrite = 0;
  const ctx: JobContext = {
    job,
    log: (message, data, level = "info") => writeLog(prisma, jobId, level, message, data),
    progress: async (percent) => {
      const now = Date.now();
      if (now - lastProgressWrite < 1500 && percent < 100) return;
      lastProgressWrite = now;
      await prisma.generationJob.update({ where: { id: jobId }, data: { progress: Math.max(0, Math.min(100, Math.round(percent))) } }).catch(() => undefined);
    },
    signal: ctrl.signal,
    setExecution: async (info) => {
      await prisma.generationJob.update({ where: { id: jobId }, data: info }).catch(() => undefined);
    },
  };
  await ctx.log(`Started ${job.type}${job.languageCode ? ` [${job.languageCode}]` : ""} on ${job.queue ?? queueForJobType(job.type)} (attempt ${attemptsMade + 1}/${maxAttempts})`);
  try {
    const { runStudioJob } = await import("../StudioPipeline");
    const result = await runStudioJob(prisma, ctx);
    if (ctrl.signal.aborted) throw new JobCancelledError(abortReason || "Aborted");
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: "COMPLETED", finishedAt: new Date(), progress: 100, durationMs: Date.now() - startedAt.getTime(), result: (result ?? undefined) as Prisma.InputJsonValue | undefined },
    });
    await ctx.log("Completed");
  } catch (err) {
    const e = err as Error & { stderrTail?: string };
    const cancelled = ctrl.signal.aborted && abortReason.startsWith("Cancelled");
    if (cancelled) {
      await prisma.generationJob.update({ where: { id: jobId }, data: { status: "CANCELLED", error: abortReason, finishedAt: new Date(), durationMs: Date.now() - startedAt.getTime() } });
      await ctx.log(abortReason, undefined, "warn");
      throw new JobCancelledError(abortReason);
    }
    const message = ctrl.signal.aborted && abortReason ? `${abortReason}: ${e.message}` : e.message;
    const willRetry = attemptsMade + 1 < maxAttempts;
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: willRetry ? "RETRYING" : "FAILED", error: message.slice(0, 2000), finishedAt: willRetry ? null : new Date(), durationMs: Date.now() - startedAt.getTime() },
    });
    await ctx.log(`${willRetry ? "Failed, will retry" : "Failed"}: ${message}`, e.stderrTail ? { ffmpeg: e.stderrTail } : undefined, "error");
    throw err;
  } finally {
    clearTimeout(timer);
    clearInterval(poll);
  }
}
