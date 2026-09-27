import { GenerationJob, GenerationJobType, Prisma, PrismaClient } from "@prisma/client";
import { Queue } from "bullmq";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";

export const STUDIO_QUEUE = "studio";
export const STUDIO_RENDER_QUEUE = "studio-render";
export const RENDER_JOB_TYPES = new Set<GenerationJobType>(["RENDER_LANGUAGE", "RENDER_PACKAGE"]);
const MAX_ATTEMPTS = 3;

export interface JobContext {
  job: GenerationJob;
  log: (message: string, data?: unknown, level?: "info" | "warn" | "error") => Promise<void>;
}

export type JobHandler = (prisma: PrismaClient, ctx: JobContext) => Promise<unknown>;

export interface EnqueueOptions {
  storyId: string;
  type: GenerationJobType;
  languageCode?: string;
  sceneId?: string;
  payload?: Record<string, unknown>;
  requestedBy?: string;
  /** Idempotency key: an identical unit of work that is queued, running or done is not repeated. */
  dedupeKey?: string;
}

let queues: { studio: Queue; render: Queue } | null = null;
function getQueues() {
  if (!queues) {
    // Lazy so an API process in inline mode never needs Redis for studio work.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { connection } = require("../../queue/queues") as typeof import("../../queue/queues");
    queues = { studio: new Queue(STUDIO_QUEUE, { connection }), render: new Queue(STUDIO_RENDER_QUEUE, { connection }) };
  }
  return queues;
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
          } catch {
            // executeJob records RETRYING/FAILED; loop retries immediately inline
          }
        }
      } finally {
        inlinePending--;
      }
    });
    return;
  }
  const q = RENDER_JOB_TYPES.has(job.type) ? getQueues().render : getQueues().studio;
  await q.add(job.type, { jobId: job.id }, { jobId: `${job.id}-${job.attempts}-${Date.now()}`, attempts: job.maxAttempts, backoff: { type: "exponential", delay: 5000 }, removeOnComplete: 1000, removeOnFail: 2000 });
}

export async function enqueueStudioJob(prisma: PrismaClient, opts: EnqueueOptions): Promise<GenerationJob> {
  if (opts.dedupeKey) {
    const existing = await prisma.generationJob.findUnique({ where: { dedupeKey: opts.dedupeKey } });
    if (existing && existing.status !== "FAILED") return existing;
    if (existing) return retryJob(prisma, existing.id);
  }
  let job: GenerationJob;
  try {
    job = await prisma.generationJob.create({
      data: {
        storyId: opts.storyId,
        type: opts.type,
        languageCode: opts.languageCode,
        sceneId: opts.sceneId,
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
    data: { status: "PENDING", error: null, attempts: 0, startedAt: null, finishedAt: null },
  });
  await writeLog(prisma, jobId, "info", "Retry requested");
  await dispatch(prisma, job);
  return job;
}

async function writeLog(prisma: PrismaClient, jobId: string, level: string, message: string, data?: unknown) {
  await prisma.generationLog
    .create({ data: { jobId, level, message: message.slice(0, 2000), data: data === undefined ? undefined : (JSON.parse(JSON.stringify(data)) as Prisma.InputJsonValue) } })
    .catch((err) => logger.warn({ err }, "Failed to write generation log"));
}

/**
 * Runs one GenerationJob: PENDING/RETRYING → PROCESSING → COMPLETED, or
 * RETRYING (attempts left) / FAILED (none left). Throws on failure so
 * BullMQ applies its backoff and retries.
 */
export async function executeJob(prisma: PrismaClient, jobId: string, attemptsMade: number, maxAttempts: number): Promise<void> {
  const job = await prisma.generationJob.update({
    where: { id: jobId },
    data: { status: "PROCESSING", attempts: attemptsMade + 1, startedAt: new Date(), error: null },
  });
  const ctx: JobContext = {
    job,
    log: (message, data, level = "info") => writeLog(prisma, jobId, level, message, data),
  };
  await ctx.log(`Started ${job.type}${job.languageCode ? ` [${job.languageCode}]` : ""} (attempt ${attemptsMade + 1}/${maxAttempts})`);
  try {
    const { runStudioJob } = await import("../StudioPipeline");
    const result = await runStudioJob(prisma, ctx);
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: "COMPLETED", finishedAt: new Date(), result: (result ?? undefined) as Prisma.InputJsonValue | undefined },
    });
    await ctx.log("Completed");
  } catch (err) {
    const e = err as Error & { stderrTail?: string };
    const willRetry = attemptsMade + 1 < maxAttempts;
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: willRetry ? "RETRYING" : "FAILED", error: e.message.slice(0, 2000), finishedAt: willRetry ? null : new Date() },
    });
    await ctx.log(`${willRetry ? "Failed, will retry" : "Failed"}: ${e.message}`, e.stderrTail ? { ffmpeg: e.stderrTail } : undefined, "error");
    throw err;
  }
}
