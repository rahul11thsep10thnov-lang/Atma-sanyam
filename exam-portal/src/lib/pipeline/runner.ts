import { prisma } from "@/lib/db/prisma";
import type { PipelineTrigger, SourcePriority } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { checkSource, type CheckResult } from "./sourceCheck";
import type { FetchOptions } from "./http";
import { reprocessDocument } from "./notices";
import { resolvePipelineErrors } from "./errors";
import { isPipelinePaused } from "./settings";
import { isDue } from "@/lib/sources/health";

/**
 * One scheduled pass (spec §19/§20): check every source that is due,
 * retry failed items whose backoff has elapsed, and record the whole
 * thing as a PipelineRun with counters. Safe to call from a cron hit, the
 * worker loop, or an admin button; a second caller while a run is in
 * progress gets `skipped: "running"` instead of a parallel run.
 */
export interface RunOptions {
  trigger?: PipelineTrigger;
  /** Restrict to these sources (admin "run now" on a subset). */
  sourceIds?: string[];
  /** Check even sources that are not due yet / ignore ETag short-circuits. */
  force?: boolean;
  /** Upper bound on sources per run so a cron tick stays inside its timeout. */
  maxSources?: number;
  maxRetries?: number;
  fetchOptions?: FetchOptions;
  now?: Date;
}

export interface RunSummary {
  runId: string | null;
  skipped: "paused" | "running" | null;
  status: "COMPLETED" | "FAILED" | "SKIPPED";
  sourcesChecked: number;
  pagesScanned: number;
  newDocuments: number;
  newNotices: number;
  updatedNotices: number;
  duplicates: number;
  needsReview: number;
  autoPublished: number;
  failures: number;
  retried: number;
  durationMs: number;
}

const PRIORITY_ORDER: Record<SourcePriority, number> = { HIGH: 0, NORMAL: 1, LOW: 2 };
/** A RUNNING run older than this is a crashed process, not a live one. */
const STALE_RUN_MS = 30 * 60 * 1000;
export const MAX_ERROR_RETRIES = 6;

export async function dueSources(now = new Date(), limit = 20, sourceIds?: string[]) {
  const sources = await prisma.source.findMany({
    where: {
      active: true,
      approvalStatus: "APPROVED",
      OR: [{ blockedUntil: null }, { blockedUntil: { lte: now } }],
      ...(sourceIds?.length ? { id: { in: sourceIds } } : {}),
    },
    select: { id: true, name: true, active: true, approvalStatus: true, priority: true, checkFrequencyMinutes: true, lastCheckedAt: true, nextCheckAt: true, blockedUntil: true },
  });
  const due = sources.filter((s) => isDue(s, now));
  const waitingSince = (s: (typeof due)[number]) => (s.nextCheckAt ?? s.lastCheckedAt)?.getTime() ?? 0;
  due.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || waitingSince(a) - waitingSince(b));
  return due.slice(0, limit);
}

/** Runs `worker` over `items` with at most `limit` in flight. */
export async function mapLimit<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const lanes = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i]);
    }
  });
  await Promise.all(lanes);
  return results;
}

export function runConcurrency(): number {
  const n = Number(process.env.PIPELINE_CONCURRENCY ?? 3);
  return Number.isFinite(n) && n >= 1 ? Math.min(Math.floor(n), 10) : 3;
}

/** Diagnostics are bounded in time as well as size. */
export async function pruneSourceChecks(now = new Date()) {
  const days = Number(process.env.SOURCE_CHECK_RETENTION_DAYS ?? 30);
  const cutoff = new Date(now.getTime() - (Number.isFinite(days) && days > 0 ? days : 30) * 86_400_000);
  const { count } = await prisma.sourceCheck.deleteMany({ where: { startedAt: { lt: cutoff } } });
  return count;
}

function tally(summary: RunSummary, r: CheckResult) {
  if (r.outcome === "LOCKED" || r.outcome === "NOT_APPROVED") return;
  summary.sourcesChecked += 1;
  if (r.httpStatus !== null) summary.pagesScanned += 1;
  summary.newDocuments += r.newItems;
  if (!r.ok) summary.failures += 1;
  for (const n of r.notices) {
    if (n.created) summary.newNotices += 1;
    else summary.updatedNotices += 1;
    if (n.status === "DUPLICATE") summary.duplicates += 1;
    else if (n.status === "NEEDS_REVIEW") summary.needsReview += 1;
    else if (n.status === "AUTO_APPROVED") summary.autoPublished += 1;
  }
}

export async function runPipeline(options: RunOptions = {}): Promise<RunSummary> {
  const now = options.now ?? new Date();
  const started = Date.now();
  const trigger = options.trigger ?? "MANUAL";
  const summary: RunSummary = {
    runId: null,
    skipped: null,
    status: "SKIPPED",
    sourcesChecked: 0,
    pagesScanned: 0,
    newDocuments: 0,
    newNotices: 0,
    updatedNotices: 0,
    duplicates: 0,
    needsReview: 0,
    autoPublished: 0,
    failures: 0,
    retried: 0,
    durationMs: 0,
  };

  if (trigger !== "MANUAL" && (await isPipelinePaused())) {
    summary.skipped = "paused";
    summary.durationMs = Date.now() - started;
    return summary;
  }

  // Crashed runs are closed out; a live one blocks a parallel run.
  await prisma.pipelineRun.updateMany({
    where: { status: "RUNNING", startedAt: { lt: new Date(now.getTime() - STALE_RUN_MS) } },
    data: { status: "FAILED", finishedAt: now, log: { error: "Run did not finish (process stopped); marked stale." } },
  });
  const live = await prisma.pipelineRun.findFirst({ where: { status: "RUNNING" }, select: { id: true } });
  if (live) {
    summary.skipped = "running";
    summary.runId = live.id;
    summary.durationMs = Date.now() - started;
    return summary;
  }

  // Felicitation Board expiry is enforced in the database on every pass too.
  try {
    const { syncFelicitationStatuses } = await import("@/lib/felicitation/service");
    await syncFelicitationStatuses(now);
  } catch (e) {
    console.error("felicitation sweep failed", e);
  }

  const run = await prisma.pipelineRun.create({ data: { trigger, status: "RUNNING", startedAt: now }, select: { id: true } });
  summary.runId = run.id;
  const log: { sources: Array<{ id: string; name: string; ok: boolean; newItems: number; notices: number; error: string | null }>; retries: Array<{ errorId: string; ok: boolean; message?: string }>; error?: string } = { sources: [], retries: [] };

  try {
    const sources = options.force && options.sourceIds?.length
      ? await prisma.source.findMany({ where: { id: { in: options.sourceIds } }, select: { id: true, name: true, priority: true, checkFrequencyMinutes: true, lastCheckedAt: true } })
      : await dueSources(now, options.maxSources ?? 20, options.sourceIds);

    // Several sources at once (PIPELINE_CONCURRENCY); the fetcher's
    // per-domain limit keeps any one site to a single connection.
    const results = await mapLimit(sources, runConcurrency(), async (source) => {
      try {
        return await checkSource(source.id, { pipelineRunId: run.id, force: options.force, fetchOptions: options.fetchOptions });
      } catch (e) {
        return { error: e instanceof Error ? e.message : String(e) };
      }
    });
    sources.forEach((source, i) => {
      const r = results[i];
      if ("outcome" in r) {
        tally(summary, r);
        log.sources.push({ id: source.id, name: source.name, ok: r.ok, newItems: r.newItems, notices: r.notices.length, error: r.error });
      } else {
        summary.sourcesChecked += 1;
        summary.failures += 1;
        log.sources.push({ id: source.id, name: source.name, ok: false, newItems: 0, notices: 0, error: r.error });
      }
    });

    // Retry failed items whose backoff has elapsed (spec §19 "retry failed").
    const checkedIds = new Set(sources.map((s) => s.id));
    // A run restricted to specific sources only retries their own items.
    const scope = options.sourceIds?.length ? { sourceId: { in: options.sourceIds } } : {};
    const retryable = await prisma.pipelineError.findMany({
      where: { resolvedAt: null, nextRetryAt: { lte: now }, retryCount: { lt: options.maxRetries ?? MAX_ERROR_RETRIES }, ...scope },
      orderBy: { nextRetryAt: "asc" },
      take: 25,
    });
    for (const err of retryable) {
      summary.retried += 1;
      try {
        if (err.documentId) {
          // Extraction / resolution / OCR / validation problems: re-run the
          // notice stage from the stored document (no re-download).
          const res = await reprocessDocument(err.documentId, { sourceId: err.sourceId, pipelineRunId: run.id });
          if (res) {
            await resolvePipelineErrors({ documentId: err.documentId, errorType: err.errorType });
            if (res.created) summary.newNotices += 1;
            else summary.updatedNotices += 1;
            if (res.status === "NEEDS_REVIEW") summary.needsReview += 1;
            if (res.status === "AUTO_APPROVED") summary.autoPublished += 1;
            log.retries.push({ errorId: err.id, ok: true });
          } else {
            log.retries.push({ errorId: err.id, ok: false, message: "still no notice" });
          }
        } else if (err.sourceId && !checkedIds.has(err.sourceId) && (err.errorType === "FETCH" || err.errorType === "PARSE") && (await sourceRetryable(err.sourceId, now))) {
          const r = await checkSource(err.sourceId, { pipelineRunId: run.id, force: true, fetchOptions: options.fetchOptions });
          tally(summary, r);
          checkedIds.add(err.sourceId);
          log.retries.push({ errorId: err.id, ok: r.ok, message: r.error ?? undefined });
        } else {
          // Already re-checked in this run (success resolved it, failure bumped it).
          summary.retried -= 1;
        }
      } catch (e) {
        log.retries.push({ errorId: err.id, ok: false, message: e instanceof Error ? e.message : String(e) });
      }
    }

    try {
      await pruneSourceChecks(now);
    } catch (e) {
      console.error("source-check pruning failed", e);
    }
    summary.status = "COMPLETED";
  } catch (e) {
    summary.status = "FAILED";
    log.error = e instanceof Error ? e.message : String(e);
  }

  summary.durationMs = Date.now() - started;
  await prisma.pipelineRun.update({
    where: { id: run.id },
    data: {
      status: summary.status === "FAILED" ? "FAILED" : "COMPLETED",
      finishedAt: new Date(),
      sourcesChecked: summary.sourcesChecked,
      pagesScanned: summary.pagesScanned,
      newDocuments: summary.newDocuments,
      newNotices: summary.newNotices,
      updatedNotices: summary.updatedNotices,
      duplicates: summary.duplicates,
      needsReview: summary.needsReview,
      autoPublished: summary.autoPublished,
      failures: summary.failures,
      log: log as unknown as Prisma.InputJsonValue,
    },
  });
  return summary;
}

/** Source-level retries respect the same gates as scheduling: never for a
 * disabled, unapproved or blocked (403 / Retry-After) source. */
async function sourceRetryable(sourceId: string, now: Date) {
  const s = await prisma.source.findUnique({ where: { id: sourceId }, select: { active: true, approvalStatus: true, blockedUntil: true } });
  return !!s && s.active && s.approvalStatus === "APPROVED" && !(s.blockedUntil && s.blockedUntil > now);
}

/** Latest runs for the admin dashboard / status endpoint. */
export function listPipelineRuns(take = 20) {
  return prisma.pipelineRun.findMany({ orderBy: { startedAt: "desc" }, take });
}
