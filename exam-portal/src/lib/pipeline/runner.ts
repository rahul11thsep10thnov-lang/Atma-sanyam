import { prisma } from "@/lib/db/prisma";
import type { PipelineTrigger, SourcePriority } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { checkSource, type CheckResult } from "./sourceCheck";
import type { FetchOptions } from "./http";
import { reprocessDocument } from "./notices";
import { resolvePipelineErrors } from "./errors";
import { isPipelinePaused } from "./settings";

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
    where: { active: true, ...(sourceIds?.length ? { id: { in: sourceIds } } : {}) },
    select: { id: true, name: true, priority: true, checkFrequencyMinutes: true, lastCheckedAt: true },
  });
  const due = sources.filter((s) => !s.lastCheckedAt || s.lastCheckedAt.getTime() + s.checkFrequencyMinutes * 60_000 <= now.getTime());
  due.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || (a.lastCheckedAt?.getTime() ?? 0) - (b.lastCheckedAt?.getTime() ?? 0));
  return due.slice(0, limit);
}

function tally(summary: RunSummary, r: CheckResult) {
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

  const run = await prisma.pipelineRun.create({ data: { trigger, status: "RUNNING", startedAt: now }, select: { id: true } });
  summary.runId = run.id;
  const log: { sources: Array<{ id: string; name: string; ok: boolean; newItems: number; notices: number; error: string | null }>; retries: Array<{ errorId: string; ok: boolean; message?: string }>; error?: string } = { sources: [], retries: [] };

  try {
    const sources = options.force && options.sourceIds?.length
      ? await prisma.source.findMany({ where: { id: { in: options.sourceIds } }, select: { id: true, name: true, priority: true, checkFrequencyMinutes: true, lastCheckedAt: true } })
      : await dueSources(now, options.maxSources ?? 20, options.sourceIds);

    for (const source of sources) {
      const r = await checkSource(source.id, { pipelineRunId: run.id, force: options.force, fetchOptions: options.fetchOptions });
      tally(summary, r);
      log.sources.push({ id: source.id, name: source.name, ok: r.ok, newItems: r.newItems, notices: r.notices.length, error: r.error });
    }

    // Retry failed items whose backoff has elapsed (spec §19 "retry failed").
    const checkedIds = new Set(sources.map((s) => s.id));
    const retryable = await prisma.pipelineError.findMany({
      where: { resolvedAt: null, nextRetryAt: { lte: now }, retryCount: { lt: options.maxRetries ?? MAX_ERROR_RETRIES } },
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
        } else if (err.sourceId && !checkedIds.has(err.sourceId)) {
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

/** Latest runs for the admin dashboard / status endpoint. */
export function listPipelineRuns(take = 20) {
  return prisma.pipelineRun.findMany({ orderBy: { startedAt: "desc" }, take });
}
