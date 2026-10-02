import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { buildMinimalPdf } from "./__fixtures__/minimalPdf";

/**
 * End-to-end check of the fetch → parse → ingest → version path against a
 * loopback HTTP server (this sandbox can't reach government sites) and
 * the real database. Skipped when DATABASE_URL is not configured so a
 * DB-less CI still passes the unit tests.
 */
const HAS_DB = !!process.env.DATABASE_URL;

const noWait = { minHostIntervalMs: 0, sleep: async () => {} };

describe.skipIf(!HAS_DB)("checkSource (loopback integration)", () => {
  let server: http.Server;
  let base: string;
  let sourceId: string;
  let listingVersion = 1;
  let noticeLines = ["UP POLICE RECRUITMENT AND PROMOTION BOARD", "Constable Recruitment 2027", "Last date of application: 10-01-2027", "Vacancies: 60244"];
  const hits: string[] = [];

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      hits.push(req.url ?? "");
      if (req.url === "/robots.txt") {
        res.writeHead(200, { "content-type": "text/plain" }).end("User-agent: *\nDisallow: /secret/\n");
      } else if (req.url === "/notices") {
        res.writeHead(200, { "content-type": "text/html", etag: `"v${listingVersion}"` }).end(`
          <html><body><h1>Notice Board</h1><ul>
            <li>10-01-2027 <a href="/files/constable-2027.pdf">Constable Recruitment 2027 — Notification</a></li>
            <li><a href="/files/admit.pdf">Admit Card — Constable 2027</a></li>
            <li><a href="/about">About the Board</a></li>
            <li><a href="/secret/hidden.pdf">Hidden</a></li>
          </ul><!-- listing v${listingVersion} --></body></html>`);
      } else if (req.url === "/files/constable-2027.pdf") {
        res.writeHead(200, { "content-type": "application/pdf" }).end(buildMinimalPdf(noticeLines));
      } else if (req.url === "/files/admit.pdf") {
        res.writeHead(200, { "content-type": "application/pdf" }).end(buildMinimalPdf(["Admit card for Constable 2027", "Download from 01-03-2027"]));
      } else if (req.url === "/secret/hidden.pdf") {
        res.writeHead(200, { "content-type": "application/pdf" }).end(buildMinimalPdf(["should never be fetched"]));
      } else {
        res.writeHead(404).end();
      }
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    const { prisma } = await import("@/lib/db/prisma");
    const source = await prisma.source.create({
      data: { name: "Loopback test board", listingUrl: `${base}/notices`, officialDomain: "127.0.0.1", sourceType: "HTML", priority: "HIGH", checkFrequencyMinutes: 30 },
    });
    sourceId = source.id;
  });

  afterAll(async () => {
    const { prisma } = await import("@/lib/db/prisma");
    const docs = await prisma.document.findMany({ where: { sourceId }, select: { id: true } });
    await prisma.pipelineError.deleteMany({ where: { OR: [{ sourceId }, { documentId: { in: docs.map((d) => d.id) } }] } });
    const notices = await prisma.recruitmentNotice.findMany({ where: { sourceId }, select: { id: true } });
    await prisma.auditLog.deleteMany({ where: { contentType: "RecruitmentNotice", contentId: { in: notices.map((n) => n.id) } } });
    await prisma.recruitmentNotice.deleteMany({ where: { sourceId } });
    await prisma.document.deleteMany({ where: { sourceId } });
    await prisma.source.delete({ where: { id: sourceId } });
    await new Promise<void>((r) => server.close(() => r()));
  });

  it("ingests new PDFs with extracted text, skips noise, obeys robots", async () => {
    const { checkSource } = await import("./sourceCheck");
    const { prisma } = await import("@/lib/db/prisma");
    const { _resetRobotsCache } = await import("./robots");
    _resetRobotsCache();

    const result = await checkSource(sourceId, { fetchOptions: noWait });
    expect(result.ok).toBe(true);
    expect(result.changed).toBe(true);
    expect(result.itemsFound).toBe(3); // 2 PDFs + hidden PDF link; "About" is noise
    expect(result.newItems).toBe(2); // hidden.pdf blocked? no — robots applies to the listing; per-doc robots is checked below
    expect(hits).not.toContain("/secret/hidden.pdf");

    const docs = await prisma.document.findMany({ where: { sourceId }, include: { versions: true }, orderBy: { filename: "asc" } });
    expect(docs.map((d) => d.filename).sort()).toEqual(["admit.pdf", "constable-2027.pdf"]);
    const notice = docs.find((d) => d.filename === "constable-2027.pdf")!;
    expect(notice.extractedText).toContain("Vacancies: 60244");
    expect(notice.documentType).toBe("JOB_NOTIFICATION");
    expect(notice.uploadedBy).toBeNull();
    expect(notice.mimeType).toBe("application/pdf");
    expect(notice.versions).toHaveLength(1);
    expect(docs.find((d) => d.filename === "admit.pdf")!.documentType).toBe("ADMIT_CARD");

    // Phase 4: every ingested document gets a structured notice.
    expect(result.notices).toHaveLength(2);
    const job = await prisma.recruitmentNotice.findFirstOrThrow({ where: { sourceId, documentId: notice.id } });
    expect(job.noticeType).toBe("JOB");
    // Loopback host is not an official domain and the rules extractor
    // alone is never trusted blindly: queued for a human, never auto-approved.
    expect(["NEW", "NEEDS_REVIEW"]).toContain(job.status);
    expect(job.overallConfidence).toBeGreaterThan(0.5);
    expect(job.sourceDomain).toBe("127.0.0.1");
    const extracted = job.extracted as { vacancies: number; application_end_date: string; organization: string };
    expect(extracted.vacancies).toBe(60244);
    expect(extracted.application_end_date).toBe("2027-01-10");
    expect(extracted.organization).toBe("UP POLICE RECRUITMENT AND PROMOTION BOARD");
    expect((job.fieldConfidence as Record<string, { verified: boolean }>).vacancies.verified).toBe(true);
    const admit = await prisma.recruitmentNotice.findFirstOrThrow({ where: { sourceId, document: { filename: "admit.pdf" } } });
    expect(admit.noticeType).toBe("ADMIT_CARD");
    expect(admit.priority).toBe("HIGH");
    expect(await prisma.auditLog.count({ where: { actor: "pipeline", action: "CREATE", contentType: "RecruitmentNotice", contentId: job.id } })).toBe(1);

    const source = await prisma.source.findUniqueOrThrow({ where: { id: sourceId } });
    expect(source.lastSuccessAt).not.toBeNull();
    expect(source.etag).toBe('"v1"');
    expect(source.discoveredCount).toBe(2);
    expect(await prisma.sourceCheck.count({ where: { sourceId, ok: true } })).toBe(1);
  });

  it("is a cheap no-op when nothing changed (304 via ETag)", async () => {
    const { checkSource } = await import("./sourceCheck");
    const before = hits.length;
    const result = await checkSource(sourceId, { fetchOptions: noWait });
    expect(result.ok).toBe(true);
    expect(result.changed).toBe(false);
    // Only the listing (and maybe robots) was requested — no document re-fetches.
    expect(hits.slice(before).filter((h) => h.startsWith("/files/"))).toHaveLength(0);
  });

  it("records a new DocumentVersion with a diff when a PDF changes", async () => {
    const { checkSource } = await import("./sourceCheck");
    const { prisma } = await import("@/lib/db/prisma");
    noticeLines = noticeLines.map((l) => l.replace("10-01-2027", "20-01-2027"));
    listingVersion = 2; // listing changes too (a corrigendum line appears in practice)

    const result = await checkSource(sourceId, { fetchOptions: noWait });
    expect(result.ok).toBe(true);
    expect(result.newItems).toBe(0);
    const changed = result.ingested.filter((i) => i.changed);
    expect(changed).toHaveLength(1);
    expect(changed[0].diff).toEqual([
      { old: "Last date of application: 10-01-2027", new: "Last date of application: 20-01-2027" },
    ]);

    const notice = await prisma.document.findFirstOrThrow({ where: { sourceId, filename: "constable-2027.pdf" }, include: { versions: { orderBy: { versionNumber: "asc" } } } });
    expect(notice.versions.map((v) => v.versionNumber)).toEqual([1, 2]);
    expect(notice.versions[0].checksum).not.toBe(notice.versions[1].checksum);
    expect(notice.extractedText).toContain("20-01-2027");

    // Phase 4: the changed PDF updates the same notice (an UPDATE, not a duplicate).
    expect(result.notices).toHaveLength(1);
    expect(result.notices[0].created).toBe(false);
    expect(await prisma.recruitmentNotice.count({ where: { documentId: notice.id } })).toBe(1);
    const updated = await prisma.recruitmentNotice.findFirstOrThrow({ where: { documentId: notice.id } });
    expect(updated.documentVersionId).toBe(notice.versions[1].id);
    expect((updated.extracted as { application_end_date: string }).application_end_date).toBe("2027-01-20");
    const change = updated.changeSummary as { versionNumber: number; diff: Array<{ old: string | null; new: string | null }> };
    expect(change.versionNumber).toBe(2);
    expect(change.diff[0].new).toBe("Last date of application: 20-01-2027");
  });

  it("dry-run lists candidates without storing anything", async () => {
    const { checkSource } = await import("./sourceCheck");
    const { prisma } = await import("@/lib/db/prisma");
    const checksBefore = await prisma.sourceCheck.count({ where: { sourceId } });
    const result = await checkSource(sourceId, { dryRun: true, force: true, fetchOptions: noWait });
    expect(result.ok).toBe(true);
    expect(result.candidates.length).toBe(3);
    expect(await prisma.sourceCheck.count({ where: { sourceId } })).toBe(checksBefore);
  });

  it("turns a dead listing into a failing source + retryable error, not a crash", async () => {
    const { checkSource } = await import("./sourceCheck");
    const { prisma } = await import("@/lib/db/prisma");
    const dead = await prisma.source.create({
      data: { name: "Dead board", listingUrl: `${base}/gone`, officialDomain: "127.0.0.1", sourceType: "HTML" },
    });
    try {
      const result = await checkSource(dead.id, { fetchOptions: { ...noWait, retries: 0 } });
      expect(result.ok).toBe(false);
      expect(result.httpStatus).toBe(404);
      const src = await prisma.source.findUniqueOrThrow({ where: { id: dead.id } });
      expect(src.failureCount).toBe(1);
      expect(src.lastError).toMatch(/404/);
      const err = await prisma.pipelineError.findFirstOrThrow({ where: { sourceId: dead.id } });
      expect(err.errorType).toBe("FETCH");
      expect(err.nextRetryAt!.getTime()).toBeGreaterThan(Date.now());
    } finally {
      await prisma.pipelineError.deleteMany({ where: { sourceId: dead.id } });
      await prisma.source.delete({ where: { id: dead.id } });
    }
  });
});
