import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { sha256 } from "@/lib/documents/checksum";
import type { Prisma, Source } from "@/generated/prisma/client";
import type { SourceType } from "@/generated/prisma/enums";
import { fetchUrl, FetchError, type FetchOptions, type FetchResult } from "./http";
import { checkRobots } from "./robots";
import { extractConfiguredCandidates, findNextPageUrl } from "./parsers/html";
import { parseFeed, parseSitemap } from "./parsers/feed";
import { parseJsonListing } from "./parsers/json";
import { readPaginationConfig, readParserConfig, type ParserConfig } from "./parsers/config";
import { ingestDocument, type IngestResult } from "./ingest";
import { recordPipelineError, resolvePipelineErrors } from "./errors";
import { createNoticeFromIngest, type NoticeResult } from "./notices";
import { isOfficialHost, redactUrl, sameSite, validateFetchUrl } from "./netguard";
import type { CandidateItem } from "./types";
import { ALERT_AFTER_FAILURES, EXTRACTION_BROKEN, EXTRACTION_OK, blockedPauseMs, computeNextCheck, type SourceOutcome } from "@/lib/sources/health";

export interface CheckOptions {
  pipelineRunId?: string | null;
  /** Parse and list candidates without storing anything ("Test source"). */
  dryRun?: boolean;
  /** Cap on new documents ingested per check, so one noisy page can't
   * monopolise a run. */
  maxNewItems?: number;
  fetchOptions?: FetchOptions;
  /** Ignore ETag/hash short-circuits and re-parse the listing. */
  force?: boolean;
  now?: () => Date;
}

export interface CheckResult {
  /** Fetch *and* extraction worked. An HTTP 200 with nothing parsed is not ok. */
  ok: boolean;
  outcome: SourceOutcome | "LOCKED";
  changed: boolean;
  httpStatus: number | null;
  itemsFound: number;
  newItems: number;
  pagesFetched: number;
  durationMs: number;
  candidates: CandidateItem[];
  ingested: IngestResult[];
  /** Notices created or updated from the ingested documents. */
  notices: NoticeResult[];
  newNotices: number;
  duplicatesSkipped: number;
  error: string | null;
  robotsStatus: string;
  finalUrl: string | null;
  redirects: string[];
  warnings: string[];
}

type ListingParser = (body: Buffer, url: string, hint: string | null, config: ParserConfig) => CandidateItem[];

/** Adding a source type = one entry here. XML is ambiguous, so it is
 * deliberately unimplemented rather than guessed; JSON/API work once
 * parserConfig names the fields. */
const PARSERS: Partial<Record<SourceType, ListingParser>> = {
  HTML: (body, url, hint, config) => extractConfiguredCandidates(body.toString("utf8"), url, config, hint),
  RSS: (body, url) => parseFeed(body.toString("utf8"), url),
  ATOM: (body, url) => parseFeed(body.toString("utf8"), url),
  SITEMAP: (body) => parseSitemap(body.toString("utf8")),
  JSON: (body, url, _hint, config) => parseJsonListing(body.toString("utf8"), url, config),
  API: (body, url, _hint, config) => parseJsonListing(body.toString("utf8"), url, config),
  PDF: (_body, url) => [{ url, title: decodeURIComponent(url.split("/").pop() ?? url), isPdf: true }],
};

const LOCK_MS = 10 * 60 * 1000;
const MAX_DIAG_BYTES = 4000;

function boundedDiagnostics(d: Record<string, unknown>): Prisma.InputJsonValue {
  const json = JSON.stringify(d);
  if (json.length <= MAX_DIAG_BYTES) return d as Prisma.InputJsonValue;
  return { truncated: true, summary: json.slice(0, MAX_DIAG_BYTES - 100) } as Prisma.InputJsonValue;
}

/** Listing redirects may stay on the source's site or move to another
 * official government host; anything else is refused. Aggregators must
 * stay on their own site. */
export function redirectPolicy(source: Pick<Source, "listingUrl" | "isAggregator">) {
  return (_from: URL, to: URL): string | null => {
    if (sameSite(source.listingUrl, to.toString())) return null;
    if (!source.isAggregator && isOfficialHost(to.hostname)) return null;
    return `it leaves ${new URL(source.listingUrl).hostname} for ${to.hostname}`;
  };
}

function outcomeForFetchError(err: FetchError): SourceOutcome {
  switch (err.kind) {
    case "blocked":
      return "BLOCKED";
    case "rate_limited":
      return "RATE_LIMITED";
    case "invalid_url":
    case "redirect":
      return "INVALID_URL";
    case "network":
    case "timeout":
      return "NETWORK";
    default:
      return "HTTP_ERROR";
  }
}

/**
 * One check of one source: lock → robots → conditional fetch → change
 * detection → parse (+ pagination) → ingest new documents → notices →
 * bookkeeping. Never throws for a per-source failure; the failure is
 * recorded on the source, as a SourceCheck row, and as a PipelineError.
 */
export async function checkSource(sourceId: string, options: CheckOptions = {}): Promise<CheckResult> {
  const nowFn = options.now ?? (() => new Date());
  const source = await prisma.source.findUniqueOrThrow({ where: { id: sourceId } });
  const { dryRun = false } = options;
  const startedAt = nowFn();
  const t0 = Date.now();
  const result: CheckResult = {
    ok: false,
    outcome: "OK",
    changed: false,
    httpStatus: null,
    itemsFound: 0,
    newItems: 0,
    pagesFetched: 0,
    durationMs: 0,
    candidates: [],
    ingested: [],
    notices: [],
    newNotices: 0,
    duplicatesSkipped: 0,
    error: null,
    robotsStatus: "",
    finalUrl: null,
    redirects: [],
    warnings: [],
  };

  if (!dryRun && source.approvalStatus !== "APPROVED") {
    // Not a failure of the source — nothing is recorded against it.
    result.outcome = "NOT_APPROVED";
    result.error = "Source is awaiting approval; approve it before it is checked (Test works without approval).";
    return result;
  }

  // Per-source lock: a second worker (or an admin "Run now" during a
  // scheduled run) skips instead of processing the same source twice.
  // An expired lock (crashed process) is simply taken over.
  const lockToken = randomUUID();
  if (!dryRun) {
    const claimed = await prisma.source.updateMany({
      where: { id: sourceId, OR: [{ lockedUntil: null }, { lockedUntil: { lt: startedAt } }] },
      data: { lockedUntil: new Date(startedAt.getTime() + LOCK_MS), lockedBy: lockToken },
    });
    if (claimed.count === 0) {
      result.outcome = "LOCKED";
      result.error = "This source is already being checked by another run.";
      return result;
    }
  }

  try {
    return await runCheck(source, options, result, startedAt, t0, nowFn);
  } finally {
    if (!dryRun) {
      await prisma.source.updateMany({ where: { id: sourceId, lockedBy: lockToken }, data: { lockedUntil: null, lockedBy: null } });
    }
  }
}

async function runCheck(source: Source, options: CheckOptions, result: CheckResult, startedAt: Date, t0: number, nowFn: () => Date): Promise<CheckResult> {
  const sourceId = source.id;
  const { dryRun = false, maxNewItems = 25, pipelineRunId = null } = options;
  let blockedUntil: Date | null = null;
  let contentHashToSave: string | null = null;
  let etagToSave: { etag: string | null; lastModified: string | null } | null = null;

  const finish = async () => {
    result.durationMs = Date.now() - t0;
    const extractionOk = (EXTRACTION_OK as string[]).includes(result.outcome);
    result.ok = extractionOk;
    if (dryRun) return result;
    const now = nowFn();
    const fetchOk = result.httpStatus !== null && ((result.httpStatus >= 200 && result.httpStatus < 300) || result.httpStatus === 304);
    const consecutiveFailures = extractionOk ? 0 : source.consecutiveFailures + 1;
    if (result.outcome === "BLOCKED") blockedUntil = new Date(now.getTime() + blockedPauseMs(consecutiveFailures));
    const nextCheckAt = computeNextCheck({ now, frequencyMinutes: source.checkFrequencyMinutes, ok: extractionOk, consecutiveFailures, blockedUntil });

    const check = await prisma.sourceCheck.create({
      data: {
        sourceId,
        pipelineRunId,
        startedAt,
        finishedAt: now,
        ok: extractionOk,
        httpStatus: result.httpStatus,
        changed: result.changed,
        itemsFound: result.itemsFound,
        newItems: result.newItems,
        error: result.error,
        outcome: result.outcome,
        durationMs: result.durationMs,
        pagesFetched: result.pagesFetched,
        noticesExtracted: result.notices.length,
        duplicatesSkipped: result.duplicatesSkipped,
        diagnostics: boundedDiagnostics({
          finalUrl: result.finalUrl ? redactUrl(result.finalUrl) : null,
          redirects: result.redirects.map(redactUrl).slice(0, 5),
          robots: result.robotsStatus,
          warnings: result.warnings.slice(0, 10),
          sample: result.candidates.slice(0, 8).map((c) => ({ title: c.title.slice(0, 120), url: redactUrl(c.url) })),
          newNotices: result.newNotices,
        }),
      },
      select: { id: true },
    });

    const shouldAlert = !extractionOk && !source.alertedAt && (consecutiveFailures >= ALERT_AFTER_FAILURES || result.outcome === "BLOCKED");
    await prisma.source.update({
      where: { id: sourceId },
      data: {
        lastCheckedAt: now,
        lastHttpStatus: result.httpStatus,
        lastDurationMs: result.durationMs,
        lastOutcome: result.outcome,
        robotsStatus: result.robotsStatus || undefined,
        nextCheckAt,
        blockedUntil,
        consecutiveFailures,
        ...(fetchOk ? { lastSuccessAt: now } : {}),
        ...(extractionOk
          ? {
              lastExtractionAt: now,
              lastError: null,
              alertedAt: null,
              discoveredCount: { increment: result.newItems },
              noticesInserted: { increment: result.newNotices },
              ...(contentHashToSave ? { lastContentHash: contentHashToSave } : {}),
              ...(etagToSave ?? {}),
            }
          : { lastError: result.error, failureCount: { increment: 1 }, ...(shouldAlert ? { alertedAt: now } : {}) }),
      },
    });
    if (extractionOk) {
      await resolvePipelineErrors({ sourceId, errorType: "FETCH", documentId: null });
      await resolvePipelineErrors({ sourceId, errorType: "PARSE", documentId: null });
    }
    if (shouldAlert) {
      // Failure alert: lands in Automation → Failed items, and in the logs.
      const message = `ALERT: source "${source.name}" needs attention — ${result.outcome}${result.outcome === "BLOCKED" ? "" : ` (${consecutiveFailures} failed checks in a row)`}: ${result.error ?? ""}`.slice(0, 1000);
      console.warn(`[pipeline] ${message}`);
      await recordPipelineError({ errorType: "UNKNOWN", message, sourceId, pipelineRunId, payload: { alert: true, outcome: result.outcome, checkId: check.id } });
    }
    return result;
  };

  const fail = async (outcome: SourceOutcome, errorType: "FETCH" | "PARSE", message: string) => {
    result.outcome = outcome;
    result.error = message.slice(0, 1000);
    // A 403 is not a retryable item: it's recorded on the source and the
    // scheduler pauses it; the error queue would only hammer it again.
    if (!dryRun && outcome !== "BLOCKED") {
      await recordPipelineError({ errorType, message: result.error, sourceId, pipelineRunId });
    }
    return finish();
  };

  // 0. URL policy and configuration
  try {
    validateFetchUrl(source.listingUrl);
  } catch (err) {
    return fail("INVALID_URL", "FETCH", err instanceof Error ? err.message : String(err));
  }
  const { config: parserConfig, error: parserConfigError } = readParserConfig(source.parserConfig);
  if (parserConfigError) return fail("PARSE_ERROR", "PARSE", parserConfigError);
  const { config: pagination, error: paginationError } = readPaginationConfig(source.paginationConfig);
  if (paginationError) return fail("PARSE_ERROR", "PARSE", paginationError);

  // 1. robots.txt (Crawl-delay raises the per-host interval)
  const fetchImpl = options.fetchOptions?.fetchImpl;
  const robots = await checkRobots(source.listingUrl, fetchImpl);
  result.robotsStatus = robots.status;
  if (!robots.allowed) return fail("ROBOTS", "FETCH", `Listing URL disallowed by robots.txt (${robots.status})`);
  const fetchOptions: FetchOptions = {
    timeoutMs: source.requestTimeoutMs,
    allowRedirect: redirectPolicy(source),
    ...options.fetchOptions,
    minHostIntervalMs: Math.max(options.fetchOptions?.minHostIntervalMs ?? source.minRequestIntervalMs, robots.crawlDelayMs ?? 0),
  };

  // 2. conditional fetch of the listing
  let res: FetchResult;
  try {
    res = await fetchUrl(source.listingUrl, {
      ...fetchOptions,
      etag: options.force ? null : source.etag,
      lastModified: options.force ? null : source.lastModified,
    });
  } catch (err) {
    if (err instanceof FetchError) {
      result.httpStatus = err.status ?? null;
      const outcome = outcomeForFetchError(err);
      if (outcome === "RATE_LIMITED" && err.retryAfterMs) {
        blockedUntil = new Date(nowFn().getTime() + Math.min(err.retryAfterMs, 24 * 60 * 60 * 1000));
      }
      return fail(outcome, "FETCH", err.message);
    }
    return fail("NETWORK", "FETCH", err instanceof Error ? err.message : String(err));
  }
  result.httpStatus = res.status;
  result.finalUrl = res.finalUrl;
  result.redirects = res.redirects;
  result.pagesFetched = 1;

  // An unchanged page keeps whatever the last parse concluded: if that was
  // "no notices found", it is still broken, not healthy.
  const previousBroken = (EXTRACTION_BROKEN as string[]).includes(source.lastOutcome ?? "");
  if (res.notModified) {
    result.outcome = previousBroken ? (source.lastOutcome as SourceOutcome) : "NOT_MODIFIED";
    if (previousBroken) result.error = source.lastError;
    return finish();
  }

  // 3. content-hash change detection (servers that ignore ETags)
  const contentHash = sha256(res.body);
  if (!options.force && source.lastContentHash === contentHash) {
    result.outcome = previousBroken ? (source.lastOutcome as SourceOutcome) : "UNCHANGED";
    if (previousBroken) result.error = source.lastError;
    else etagToSave = { etag: res.etag, lastModified: res.lastModified };
    return finish();
  }
  result.changed = true;

  // 4. parse candidates (+ pagination)
  const parser = PARSERS[source.sourceType];
  if (!parser) {
    return fail("PARSE_ERROR", "PARSE", `No parser implemented for source type ${source.sourceType}; use HTML, RSS, ATOM, JSON (with parserConfig), SITEMAP or PDF.`);
  }
  let candidates: CandidateItem[];
  try {
    candidates = parser(res.body, res.finalUrl, source.parserType, parserConfig);
  } catch (err) {
    return fail("PARSE_ERROR", "PARSE", `Failed to parse listing: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (pagination && source.sourceType === "HTML") {
    const seen = new Set(candidates.map((c) => c.url));
    let pageHtml = res.body.toString("utf8");
    let pageUrl = res.finalUrl;
    for (let page = 2; page <= pagination.maxPages; page++) {
      const next =
        pagination.type === "pattern"
          ? pagination.urlTemplate!.replace("{page}", String((pagination.startPage ?? 2) + page - 2))
          : findNextPageUrl(pageHtml, pageUrl, pagination.nextSelector);
      if (!next || next === pageUrl) break;
      if (!sameSite(source.listingUrl, next)) {
        result.warnings.push(`Pagination stopped: next page ${redactUrl(next)} is on another site`);
        break;
      }
      if (!(await checkRobots(next, fetchImpl)).allowed) {
        result.warnings.push(`Pagination stopped: ${redactUrl(next)} disallowed by robots.txt`);
        break;
      }
      try {
        const pageRes = await fetchUrl(next, fetchOptions);
        result.pagesFetched += 1;
        pageHtml = pageRes.body.toString("utf8");
        pageUrl = pageRes.finalUrl;
        const more = parser(pageRes.body, pageRes.finalUrl, source.parserType, parserConfig).filter((c) => !seen.has(c.url));
        if (more.length === 0) break;
        for (const c of more) seen.add(c.url);
        candidates = candidates.concat(more);
      } catch (err) {
        result.warnings.push(`Pagination page ${page} failed: ${err instanceof Error ? err.message.slice(0, 200) : String(err)}`);
        break;
      }
    }
  }

  result.candidates = candidates;
  result.itemsFound = candidates.length;

  if (candidates.length === 0) {
    return fail(
      "EMPTY",
      "PARSE",
      `Page fetched (HTTP ${res.status}) but no notice links were found. The layout may have changed, the page may be rendered by JavaScript, or the parser configuration needs adjusting.`,
    );
  }

  if (dryRun) {
    result.outcome = "OK";
    return finish();
  }

  // 5. ingest the ones we haven't stored before (same URL = same document)
  const known = new Set(
    (
      await prisma.document.findMany({
        where: { sourceUrl: { in: candidates.map((c) => c.url) } },
        select: { sourceUrl: true },
      })
    ).map((d) => d.sourceUrl),
  );
  const allowedByRobots = async (url: string) => (await checkRobots(url, fetchImpl)).allowed;
  const safeUrl = (url: string) => {
    try {
      validateFetchUrl(url);
      return true;
    } catch {
      result.warnings.push(`Skipped unsafe link ${redactUrl(url)}`);
      return false;
    }
  };
  const fresh = candidates.filter((c) => !known.has(c.url)).slice(0, maxNewItems);
  const collectOfficialLinks = source.isAggregator;

  // Extraction failures are recorded, never fatal: the document is stored
  // and the retry loop picks the error up later.
  const extractInto = async (ingested: IngestResult) => {
    try {
      const notice = await createNoticeFromIngest(ingested, { sourceId, pipelineRunId });
      if (notice) {
        result.notices.push(notice);
        if (notice.status === "DUPLICATE") result.duplicatesSkipped += 1;
        else if (notice.created) result.newNotices += 1;
      }
    } catch (err) {
      await recordPipelineError({
        errorType: "EXTRACTION",
        message: `${ingested.title}: ${err instanceof Error ? err.message : String(err)}`,
        sourceId,
        documentId: ingested.documentId,
        pipelineRunId,
      });
    }
  };

  for (const candidate of fresh) {
    if (!safeUrl(candidate.url) || !(await allowedByRobots(candidate.url))) continue;
    try {
      const ingested = await ingestDocument({
        url: candidate.url,
        title: candidate.title,
        sourceId,
        pipelineRunId,
        publishedAt: candidate.publishedAt ?? null,
        fetchOptions,
        collectOfficialLinks,
      });
      result.ingested.push(ingested);
      if (ingested.isNew) result.newItems += 1;
      await extractInto(ingested);
    } catch (err) {
      // One bad document never aborts the whole source.
      await recordPipelineError({
        errorType: err instanceof FetchError ? "FETCH" : "PARSE",
        message: `${redactUrl(candidate.url)}: ${err instanceof Error ? err.message : String(err)}`,
        sourceId,
        pipelineRunId,
        payload: { url: redactUrl(candidate.url), title: candidate.title.slice(0, 300) },
      });
    }
  }

  // 6. re-fetch already-known documents only when the listing changed —
  // that's how a replaced PDF (deadline extended) becomes a new version.
  const knownCandidates = candidates.filter((c) => known.has(c.url)).slice(0, maxNewItems);
  for (const candidate of knownCandidates) {
    if (!safeUrl(candidate.url) || !(await allowedByRobots(candidate.url))) continue;
    try {
      const ingested = await ingestDocument({ url: candidate.url, title: candidate.title, sourceId, pipelineRunId, fetchOptions, collectOfficialLinks });
      if (ingested.changed) {
        result.ingested.push(ingested);
        await extractInto(ingested);
      }
    } catch (err) {
      await recordPipelineError({
        errorType: "FETCH",
        message: `${redactUrl(candidate.url)}: ${err instanceof Error ? err.message : String(err)}`,
        sourceId,
        pipelineRunId,
      });
    }
  }

  contentHashToSave = contentHash;
  etagToSave = { etag: res.etag, lastModified: res.lastModified };
  result.outcome = "OK";
  return finish();
}
