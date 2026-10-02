import { prisma } from "@/lib/db/prisma";
import { sha256 } from "@/lib/documents/checksum";
import type { SourceType } from "@/generated/prisma/enums";
import { fetchUrl, FetchError, type FetchOptions } from "./http";
import { checkRobots } from "./robots";
import { extractCandidates } from "./parsers/html";
import { parseFeed, parseSitemap } from "./parsers/feed";
import { ingestDocument, type IngestResult } from "./ingest";
import { recordPipelineError, resolvePipelineErrors } from "./errors";
import type { CandidateItem } from "./types";

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
}

export interface CheckResult {
  ok: boolean;
  changed: boolean;
  httpStatus: number | null;
  itemsFound: number;
  newItems: number;
  candidates: CandidateItem[];
  ingested: IngestResult[];
  error: string | null;
  robotsStatus: string;
}

type ListingParser = (body: Buffer, url: string, hint: string | null) => CandidateItem[];

/** Adding a source type = one entry here. API/JSON/XML need a per-source
 * schema, so they are deliberately unimplemented rather than guessed. */
const PARSERS: Partial<Record<SourceType, ListingParser>> = {
  HTML: (body, url, hint) => extractCandidates(body.toString("utf8"), url, hint),
  RSS: (body, url) => parseFeed(body.toString("utf8"), url),
  SITEMAP: (body) => parseSitemap(body.toString("utf8")),
  PDF: (_body, url) => [{ url, title: url.split("/").pop() ?? url, isPdf: true }],
};

/**
 * One check of one source: robots → conditional fetch → change detection
 * → parse candidates → ingest the ones not seen before → bookkeeping.
 * Never throws for a per-source failure; the failure is recorded on the
 * source, as a SourceCheck row, and as a retryable PipelineError.
 */
export async function checkSource(sourceId: string, options: CheckOptions = {}): Promise<CheckResult> {
  const source = await prisma.source.findUniqueOrThrow({ where: { id: sourceId } });
  const { dryRun = false, maxNewItems = 25, pipelineRunId = null } = options;
  const startedAt = new Date();
  const result: CheckResult = {
    ok: false,
    changed: false,
    httpStatus: null,
    itemsFound: 0,
    newItems: 0,
    candidates: [],
    ingested: [],
    error: null,
    robotsStatus: "",
  };

  const finish = async () => {
    if (dryRun) return result;
    await prisma.sourceCheck.create({
      data: {
        sourceId,
        pipelineRunId,
        startedAt,
        finishedAt: new Date(),
        ok: result.ok,
        httpStatus: result.httpStatus,
        changed: result.changed,
        itemsFound: result.itemsFound,
        newItems: result.newItems,
        error: result.error,
      },
    });
    await prisma.source.update({
      where: { id: sourceId },
      data: {
        lastCheckedAt: new Date(),
        robotsStatus: result.robotsStatus || undefined,
        ...(result.ok
          ? { lastSuccessAt: new Date(), lastError: null, discoveredCount: { increment: result.newItems } }
          : { lastError: result.error, failureCount: { increment: 1 } }),
      },
    });
    if (result.ok) await resolvePipelineErrors({ sourceId, errorType: "FETCH" });
    return result;
  };

  const fail = async (errorType: "FETCH" | "PARSE", message: string) => {
    result.ok = false;
    result.error = message.slice(0, 1000);
    if (!dryRun) {
      await recordPipelineError({ errorType, message, sourceId, pipelineRunId });
    }
    return finish();
  };

  // 1. robots.txt
  const robots = await checkRobots(source.listingUrl, options.fetchOptions?.fetchImpl);
  result.robotsStatus = robots.status;
  if (!robots.allowed) return fail("FETCH", `Listing URL disallowed by robots.txt (${robots.status})`);

  // 2. conditional fetch of the listing
  let res;
  try {
    res = await fetchUrl(source.listingUrl, {
      ...options.fetchOptions,
      etag: options.force ? null : source.etag,
      lastModified: options.force ? null : source.lastModified,
    });
  } catch (err) {
    const status = err instanceof FetchError ? err.status ?? null : null;
    result.httpStatus = status;
    return fail("FETCH", err instanceof Error ? err.message : String(err));
  }
  result.httpStatus = res.status;

  if (res.notModified) {
    result.ok = true;
    result.changed = false;
    return finish();
  }

  // 3. content-hash change detection (servers that ignore ETags)
  const contentHash = sha256(res.body);
  if (!options.force && source.lastContentHash === contentHash) {
    result.ok = true;
    result.changed = false;
    if (!dryRun) {
      await prisma.source.update({ where: { id: sourceId }, data: { etag: res.etag, lastModified: res.lastModified } });
    }
    return finish();
  }
  result.changed = true;

  // 4. parse candidates
  const parser = PARSERS[source.sourceType];
  if (!parser) {
    return fail("PARSE", `No parser implemented for source type ${source.sourceType}; use HTML, RSS, SITEMAP or PDF.`);
  }
  let candidates: CandidateItem[];
  try {
    candidates = parser(res.body, res.finalUrl, source.parserType);
  } catch (err) {
    return fail("PARSE", `Failed to parse listing: ${err instanceof Error ? err.message : String(err)}`);
  }
  result.candidates = candidates;
  result.itemsFound = candidates.length;

  if (dryRun) {
    result.ok = true;
    return result;
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
  const fetchImpl = options.fetchOptions?.fetchImpl;
  const allowedByRobots = async (url: string) => (await checkRobots(url, fetchImpl)).allowed;
  const fresh = candidates.filter((c) => !known.has(c.url)).slice(0, maxNewItems);

  for (const candidate of fresh) {
    if (!(await allowedByRobots(candidate.url))) continue;
    try {
      const ingested = await ingestDocument({
        url: candidate.url,
        title: candidate.title,
        sourceId,
        pipelineRunId,
        publishedAt: candidate.publishedAt ?? null,
        fetchOptions: options.fetchOptions,
      });
      result.ingested.push(ingested);
      if (ingested.isNew) result.newItems += 1;
    } catch (err) {
      // One bad document never aborts the whole source.
      await recordPipelineError({
        errorType: err instanceof FetchError ? "FETCH" : "PARSE",
        message: `${candidate.url}: ${err instanceof Error ? err.message : String(err)}`,
        sourceId,
        pipelineRunId,
        payload: { url: candidate.url, title: candidate.title },
      });
    }
  }

  // 6. re-fetch already-known documents only when the listing changed —
  // that's how a replaced PDF (deadline extended) becomes a new version.
  const knownCandidates = candidates.filter((c) => known.has(c.url)).slice(0, maxNewItems);
  for (const candidate of knownCandidates) {
    if (!(await allowedByRobots(candidate.url))) continue;
    try {
      const ingested = await ingestDocument({
        url: candidate.url,
        title: candidate.title,
        sourceId,
        pipelineRunId,
        fetchOptions: options.fetchOptions,
      });
      if (ingested.changed) result.ingested.push(ingested);
    } catch (err) {
      await recordPipelineError({
        errorType: "FETCH",
        message: `${candidate.url}: ${err instanceof Error ? err.message : String(err)}`,
        sourceId,
        pipelineRunId,
      });
    }
  }

  await prisma.source.update({
    where: { id: sourceId },
    data: { etag: res.etag, lastModified: res.lastModified, lastContentHash: contentHash },
  });
  result.ok = true;
  return finish();
}
