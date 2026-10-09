import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { buildMinimalPdf } from "./__fixtures__/minimalPdf";
import { fixture } from "./__fixtures__/sources/load";

// The registry service is written for Next.js server code.
vi.mock("server-only", () => ({}));

/**
 * Source registry + scheduler behaviour against a loopback server serving
 * saved fixtures, and the real database. Covers: 403 never retried and
 * paused, Retry-After honoured, HTTP 200 with nothing parsed ≠ healthy,
 * per-site parser + pagination, idempotent re-runs, per-source locking,
 * approval gate, off-site redirect refusal, JSON sources, controlled
 * discovery, and the registry's duplicate/enable rules.
 */
const HAS_DB = !!process.env.DATABASE_URL;
const noWait = { minHostIntervalMs: 0, sleep: async () => {} };
const TAG = `registry-it-${Date.now()}`;

describe.skipIf(!HAS_DB)("source registry (loopback integration)", () => {
  let server: http.Server;
  let base: string;
  const hits: Record<string, number> = {};
  const sourceIds: string[] = [];
  let adminId: string;

  const page = (name: string) => fixture(name).replaceAll("https://psc.example.gov.in", base).replaceAll("https://health.example.gov.in", base);

  async function makeSource(path: string, extra: Record<string, unknown> = {}) {
    const { prisma } = await import("@/lib/db/prisma");
    const s = await prisma.source.create({
      data: { name: `${TAG} ${path}`, listingUrl: `${base}${path}`, canonicalUrl: `${TAG}${path}`, officialDomain: "127.0.0.1", sourceType: "HTML", checkFrequencyMinutes: 60, ...extra },
    });
    sourceIds.push(s.id);
    return s;
  }

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      const url = req.url ?? "";
      hits[url] = (hits[url] ?? 0) + 1;
      const html = (body: string) => res.writeHead(200, { "content-type": "text/html" }).end(body);
      if (url === "/robots.txt") res.writeHead(200, { "content-type": "text/plain" }).end("User-agent: *\nAllow: /\nSitemap: /sitemap.xml\n");
      else if (url === "/blocked") res.writeHead(403).end("Forbidden");
      else if (url === "/limited") res.writeHead(429, { "retry-after": "3600" }).end();
      else if (url === "/slow") setTimeout(() => html(fixture("empty-js-app.html")), 400);
      else if (url.split("?")[0] === "/empty") html(fixture("empty-js-app.html"));
      else if (url === "/notices") html(page("psc-notice-board-page1.html"));
      else if (url === "/notices?page=2") html(page("psc-notice-board-page2.html"));
      else if (url === "/offsite") res.writeHead(302, { location: "http://evil.example.com/steal" }).end();
      else if (url === "/api/notices.json") res.writeHead(200, { "content-type": "application/json" }).end(page("notices.json"));
      else if (url === "/home") html(fixture("official-homepage.html"));
      else if (url === "/agg/") html(`<html><body><ul class="post"><li><a href="/agg/ssc-cgl-2026/">SSC CGL 2026 Online Form — Recruitment</a></li><li><a href="https://t.me/x">Telegram</a></li></ul></body></html>`);
      else if (url === "/agg/ssc-cgl-2026/") html(fixture("aggregator-post.html"));
      else if (url.endsWith(".pdf")) {
        const name = url.split("/").pop()!;
        res.writeHead(200, { "content-type": "application/pdf" }).end(
          buildMinimalPdf([`${TAG.toUpperCase()} PUBLIC SERVICE COMMISSION`, `Notice ${name}`, "Recruitment of Assistant Engineer 2026", "Last date of application: 15-11-2026", "Vacancies: 42"]),
        );
      } else if (url.startsWith("/admit-card/")) html(`<html><body><h1>Admit card</h1><p>${TAG} Admit Card for Combined State Services Prelims 2026 is available.</p></body></html>`);
      else res.writeHead(404).end();
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const { prisma } = await import("@/lib/db/prisma");
    adminId = (await prisma.adminUser.create({ data: { name: TAG, email: `${TAG}@example.com`, passwordHash: "x", role: "EDITOR" } })).id;
  });

  afterAll(async () => {
    const { prisma } = await import("@/lib/db/prisma");
    const all = await prisma.source.findMany({ where: { OR: [{ id: { in: sourceIds } }, { discoveredFromId: { in: sourceIds } }, { name: { startsWith: TAG } }] }, select: { id: true } });
    const ids = all.map((s) => s.id);
    const docs = await prisma.document.findMany({ where: { sourceId: { in: ids } }, select: { id: true } });
    await prisma.pipelineError.deleteMany({ where: { OR: [{ sourceId: { in: ids } }, { documentId: { in: docs.map((d) => d.id) } }] } });
    const notices = await prisma.recruitmentNotice.findMany({ where: { sourceId: { in: ids } }, select: { id: true, organizationId: true } });
    await prisma.auditLog.deleteMany({ where: { OR: [{ contentType: "RecruitmentNotice", contentId: { in: notices.map((n) => n.id) } }, { adminUserId: adminId }] } });
    await prisma.recruitmentNotice.deleteMany({ where: { sourceId: { in: ids } } });
    await prisma.document.deleteMany({ where: { sourceId: { in: ids } } });
    const orgIds = [...new Set(notices.map((n) => n.organizationId).filter((x): x is string => !!x))];
    await prisma.recruitment.deleteMany({ where: { organizationId: { in: orgIds }, isAutoCreated: true } });
    await prisma.exam.deleteMany({ where: { organizationId: { in: orgIds }, isAutoCreated: true } });
    await prisma.organization.deleteMany({ where: { id: { in: orgIds }, isAutoCreated: true } });
    await prisma.source.updateMany({ where: { id: { in: ids } }, data: { discoveredFromId: null } });
    await prisma.source.deleteMany({ where: { id: { in: ids } } });
    await prisma.adminUser.delete({ where: { id: adminId } });
    await new Promise<void>((r) => server.close(() => r()));
  });

  it("HTTP 403: one request, no retries, source paused for a day, no retry-queue entry", async () => {
    const { checkSource } = await import("./sourceCheck");
    const { dueSources } = await import("./runner");
    const { prisma } = await import("@/lib/db/prisma");
    const s = await makeSource("/blocked");
    const r = await checkSource(s.id, { fetchOptions: { ...noWait, retries: 3 } });
    expect(r.outcome).toBe("BLOCKED");
    expect(r.ok).toBe(false);
    expect(hits["/blocked"]).toBe(1);
    const after = await prisma.source.findUniqueOrThrow({ where: { id: s.id } });
    expect(after.blockedUntil!.getTime()).toBeGreaterThan(Date.now() + 23 * 3_600_000);
    expect(after.lastHttpStatus).toBe(403);
    expect(await prisma.pipelineError.count({ where: { sourceId: s.id, errorType: "FETCH", resolvedAt: null } })).toBe(0);
    // ...but an admin alert was raised.
    expect(await prisma.pipelineError.count({ where: { sourceId: s.id, errorType: "UNKNOWN", message: { startsWith: "ALERT" } } })).toBe(1);
    expect((await dueSources(new Date(), 50, [s.id])).length).toBe(0);
  });

  it("HTTP 429 with a long Retry-After pauses the source until then", async () => {
    const { checkSource } = await import("./sourceCheck");
    const { prisma } = await import("@/lib/db/prisma");
    const s = await makeSource("/limited");
    const r = await checkSource(s.id, { fetchOptions: noWait });
    expect(r.outcome).toBe("RATE_LIMITED");
    expect(hits["/limited"]).toBe(1);
    const after = await prisma.source.findUniqueOrThrow({ where: { id: s.id } });
    const delta = after.blockedUntil!.getTime() - Date.now();
    expect(delta).toBeGreaterThan(3_500_000);
    expect(delta).toBeLessThanOrEqual(3_600_000);
  });

  it("an HTTP 200 page with no notices is EMPTY: fetch recorded, but not healthy", async () => {
    const { checkSource } = await import("./sourceCheck");
    const { sourceHealth } = await import("@/lib/sources/health");
    const { prisma } = await import("@/lib/db/prisma");
    const s = await makeSource("/empty");
    const r = await checkSource(s.id, { fetchOptions: noWait });
    expect(r.httpStatus).toBe(200);
    expect(r.outcome).toBe("EMPTY");
    expect(r.ok).toBe(false);
    const after = await prisma.source.findUniqueOrThrow({ where: { id: s.id } });
    expect(after.lastSuccessAt).not.toBeNull();
    expect(after.lastExtractionAt).toBeNull();
    expect(sourceHealth(after)).toBe("attention");
    // Unchanged on the next pass → still broken, not "unchanged = fine".
    const again = await checkSource(s.id, { fetchOptions: noWait });
    expect(again.outcome).toBe("EMPTY");
  });

  it("per-site parser + pagination collects every page once; a second run adds nothing (idempotent)", async () => {
    const { checkSource } = await import("./sourceCheck");
    const { sourceHealth } = await import("@/lib/sources/health");
    const { prisma } = await import("@/lib/db/prisma");
    const s = await makeSource("/notices", {
      parserConfig: { itemSelector: "table.notices tbody tr", titleSelector: "td:nth-child(2)", dateSelector: "td:first-child", excludeUrlPattern: "/tender/", keywordFilter: false },
      paginationConfig: { type: "nextLink", maxPages: 3 },
      stateCode: "UP",
    });
    const r = await checkSource(s.id, { fetchOptions: noWait });
    expect(r.outcome).toBe("OK");
    expect(r.pagesFetched).toBe(2);
    expect(r.itemsFound).toBe(5); // 3 on page 1 (tender excluded) + 2 new on page 2 (one repeat dropped)
    expect(r.candidates.some((c) => c.url.includes("tender"))).toBe(false);
    expect(r.newItems).toBe(5);
    const after = await prisma.source.findUniqueOrThrow({ where: { id: s.id } });
    expect(sourceHealth(after)).toBe("healthy");
    expect(after.lastExtractionAt).not.toBeNull();
    const check = await prisma.sourceCheck.findFirstOrThrow({ where: { sourceId: s.id }, orderBy: { startedAt: "desc" } });
    expect(check.pagesFetched).toBe(2);
    expect(JSON.stringify(check.diagnostics).length).toBeLessThanOrEqual(4000);

    const notices = await prisma.recruitmentNotice.findMany({ where: { sourceId: s.id } });
    expect(notices.length).toBeGreaterThan(0);
    expect(notices.every((n) => n.sections.length > 0)).toBe(true);

    const docsBefore = await prisma.document.count({ where: { sourceId: s.id } });
    const second = await checkSource(s.id, { force: true, fetchOptions: noWait });
    expect(second.newItems).toBe(0);
    expect(second.newNotices).toBe(0);
    expect(await prisma.document.count({ where: { sourceId: s.id } })).toBe(docsBefore);
    expect(await prisma.recruitmentNotice.count({ where: { sourceId: s.id } })).toBe(notices.length);
  });

  it("a source locked by another run is skipped, and an expired lock is taken over", async () => {
    const { checkSource } = await import("./sourceCheck");
    const { prisma } = await import("@/lib/db/prisma");
    const s = await makeSource("/empty?locked", { lockedUntil: new Date(Date.now() + 60_000), lockedBy: "other-worker" });
    const r = await checkSource(s.id, { fetchOptions: noWait });
    expect(r.outcome).toBe("LOCKED");
    expect(await prisma.sourceCheck.count({ where: { sourceId: s.id } })).toBe(0);
    await prisma.source.update({ where: { id: s.id }, data: { lockedUntil: new Date(Date.now() - 1000) } });
    const r2 = await checkSource(s.id, { fetchOptions: noWait });
    expect(r2.outcome).not.toBe("LOCKED");
    expect((await prisma.source.findUniqueOrThrow({ where: { id: s.id } })).lockedBy).toBeNull();
  });

  it("overlapping runs: two checks of the same source at once process it once", async () => {
    const { checkSource } = await import("./sourceCheck");
    const s = await makeSource("/slow");
    const [a, b] = await Promise.all([checkSource(s.id, { fetchOptions: noWait }), checkSource(s.id, { fetchOptions: noWait })]);
    expect([a.outcome, b.outcome].filter((o) => o === "LOCKED")).toHaveLength(1);
  });

  it("an unapproved source is never fetched by a run, but can be tested", async () => {
    const { checkSource } = await import("./sourceCheck");
    const s = await makeSource("/empty?pending", { approvalStatus: "PENDING", active: false });
    const before = hits["/empty?pending"] ?? 0;
    const r = await checkSource(s.id, { fetchOptions: noWait });
    expect(r.outcome).toBe("NOT_APPROVED");
    expect(hits["/empty?pending"] ?? 0).toBe(before);
    const dry = await checkSource(s.id, { dryRun: true, fetchOptions: noWait });
    expect(dry.outcome).toBe("EMPTY");
  });

  it("refuses a listing redirect that leaves the site for a non-official host", async () => {
    const { checkSource } = await import("./sourceCheck");
    const s = await makeSource("/offsite");
    const r = await checkSource(s.id, { fetchOptions: noWait });
    expect(r.outcome).toBe("INVALID_URL");
    expect(r.error).toMatch(/refused.*evil\.example\.com/);
  });

  it("JSON sources parse with the configured fields", async () => {
    const { checkSource } = await import("./sourceCheck");
    const s = await makeSource("/api/notices.json", { sourceType: "JSON", parserConfig: { itemsPath: "data.notices", urlField: "link", titleField: "heading" } });
    const r = await checkSource(s.id, { dryRun: true, fetchOptions: noWait });
    expect(r.outcome).toBe("OK");
    expect(r.candidates.map((c) => c.title)).toEqual(["Recruitment of Staff Nurse 2026", "Result of Lab Technician Exam"]);
  });

  it("discovery: proposes same-site sections and feeds as PENDING, once; never from a discovered source", async () => {
    const { discoverFromSource } = await import("./discovery");
    const { prisma } = await import("@/lib/db/prisma");
    const root = await makeSource("/home", { verificationStatus: "VERIFIED" });
    const r = await discoverFromSource(root.id, { fetchOptions: noWait });
    expect(r.error).toBeNull();
    const created = await prisma.source.findMany({ where: { discoveredFromId: root.id } });
    const urls = created.map((c) => c.listingUrl);
    expect(urls).toEqual(expect.arrayContaining([`${base}/recruitment`, `${base}/results`, `${base}/admit-card`, `${base}/notice-board`, `${base}/rss/notices.xml`]));
    expect(created.every((c) => c.approvalStatus === "PENDING" && !c.active)).toBe(true);
    expect(created.find((c) => c.listingUrl.endsWith("/rss/notices.xml"))?.sourceType).toBe("RSS");
    expect(urls.some((u) => u.includes("example-jobs-blog") || u.includes("169.254"))).toBe(false);

    const again = await discoverFromSource(root.id, { fetchOptions: noWait });
    expect(again.created).toHaveLength(0);
    expect(again.skipped.filter((s) => s.reason === "already a source").length).toBeGreaterThanOrEqual(created.length - 1);

    await prisma.source.update({ where: { id: created[0].id }, data: { approvalStatus: "APPROVED" } });
    const nested = await discoverFromSource(created[0].id, { fetchOptions: noWait });
    expect(nested.error).toMatch(/root sources/);
  });

  it("the retry loop never re-hits a source paused after a 403", async () => {
    const { runPipeline } = await import("./runner");
    const { prisma } = await import("@/lib/db/prisma");
    const s = await makeSource("/blocked?retry", { blockedUntil: new Date(Date.now() + 86_400_000), lastOutcome: "BLOCKED" });
    await prisma.pipelineError.create({ data: { errorType: "FETCH", message: "old failure", sourceId: s.id, retryCount: 0, nextRetryAt: new Date(Date.now() - 1000) } });
    const r = await runPipeline({ trigger: "CRON", sourceIds: [s.id], fetchOptions: noWait });
    expect(r.sourcesChecked).toBe(0);
    expect(hits["/blocked?retry"] ?? 0).toBe(0);
    await prisma.pipelineRun.delete({ where: { id: r.runId! } });
  });

  it("aggregator notices: same-site links only, official notice link recovered, always sent to review", async () => {
    const { checkSource } = await import("./sourceCheck");
    const { prisma } = await import("@/lib/db/prisma");
    const s = await makeSource("/agg/", { isAggregator: true, category: "AGGREGATOR", parserConfig: { sameSiteOnly: true } });
    const r = await checkSource(s.id, { fetchOptions: noWait });
    expect(r.outcome).toBe("OK");
    expect(r.candidates.map((c) => c.url)).toEqual([`${base}/agg/ssc-cgl-2026/`]);
    const notice = await prisma.recruitmentNotice.findFirstOrThrow({ where: { sourceId: s.id } });
    expect(notice.status).not.toBe("AUTO_APPROVED");
    expect(notice.status).not.toBe("PUBLISHED");
    expect(notice.discoveredViaUrl).toBe(`${base}/agg/ssc-cgl-2026/`);
    expect((notice.extracted as { official_notification_url: string | null }).official_notification_url).toMatch(/^https:\/\/ssc\.gov\.in\//);
    expect(JSON.stringify(notice.validationErrors)).toMatch(/aggregator/);
  });

  it("registry rules: one source per canonical URL; approval before enabling; aggregators need verification", async () => {
    const svc = await import("@/lib/services/sources");
    const { prisma } = await import("@/lib/db/prisma");
    const input = {
      name: `${TAG} canonical`,
      listingUrl: "https://WWW.Example-Board.gov.in/Notices/?utm_source=x",
      sourceType: "HTML" as const,
      category: "STATE" as const,
      stateCode: "BR",
      priority: "NORMAL" as const,
      checkFrequencyMinutes: 240,
      requestTimeoutMs: 20000,
      minRequestIntervalMs: 1500,
      isAggregator: false,
      active: false,
    };
    const created = await svc.createSource(input, adminId);
    sourceIds.push(created.id);
    expect(created.canonicalUrl).toBe("example-board.gov.in/Notices");
    await expect(svc.createSource({ ...input, name: `${TAG} dup`, listingUrl: "http://example-board.gov.in/Notices" }, adminId)).rejects.toThrow(/already exists/);

    await prisma.source.update({ where: { id: created.id }, data: { approvalStatus: "PENDING" } });
    await expect(svc.setSourceActive(created.id, true, adminId)).rejects.toThrow(/Approve this source/);
    await svc.setSourceApproval(created.id, "APPROVED", adminId);
    expect((await svc.setSourceActive(created.id, true, adminId)).active).toBe(true);

    const agg = await svc.createSource({ ...input, name: `${TAG} aggregator`, listingUrl: "https://www.aggregator-example.com.cm/", isAggregator: true, active: true }, adminId);
    sourceIds.push(agg.id);
    expect(agg.active).toBe(false);
    expect(agg.approvalStatus).toBe("PENDING");
    expect(agg.category).toBe("AGGREGATOR");
    await svc.setSourceApproval(agg.id, "APPROVED", adminId);
    const bulk = await svc.bulkSourceUpdate([agg.id, created.id], "enable", adminId);
    expect(bulk.refused.map((r) => r.id)).toEqual([agg.id]);
    expect(bulk.refused[0].reason).toMatch(/verified/);
  });
});
