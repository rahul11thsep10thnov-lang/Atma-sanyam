import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { buildMinimalPdf } from "./__fixtures__/minimalPdf";

const HAS_DB = !!process.env.DATABASE_URL;
const noWait = { minHostIntervalMs: 0, sleep: async () => {} };
const TAG = `runner-it-${Date.now()}`;

describe.skipIf(!HAS_DB)("runPipeline (loopback integration)", () => {
  let server: http.Server;
  let base: string;
  let dueId: string;
  let notDueId: string;
  let inactiveId: string;
  const runIds: string[] = [];

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      if (req.url === "/robots.txt") res.writeHead(200, { "content-type": "text/plain" }).end("User-agent: *\nAllow: /\n");
      else if (req.url?.startsWith("/list")) res.writeHead(200, { "content-type": "text/html" }).end(`<html><body><ul><li><a href="/advt.pdf">Recruitment of Junior Engineer 2027 — Notification</a></li></ul></body></html>`);
      else if (req.url === "/advt.pdf") res.writeHead(200, { "content-type": "application/pdf" }).end(buildMinimalPdf([`${TAG.toUpperCase()} ELECTRICITY BOARD`, "Recruitment of Junior Engineer 2027", "Last date of application: 15-03-2027", "Vacancies: 120"]));
      else res.writeHead(404).end();
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const { prisma } = await import("@/lib/db/prisma");
    dueId = (await prisma.source.create({ data: { name: `${TAG} due`, listingUrl: `${base}/list?a`, officialDomain: "127.0.0.1", sourceType: "HTML", priority: "HIGH", checkFrequencyMinutes: 30 } })).id;
    notDueId = (await prisma.source.create({ data: { name: `${TAG} not due`, listingUrl: `${base}/list?b`, officialDomain: "127.0.0.1", sourceType: "HTML", checkFrequencyMinutes: 360, lastCheckedAt: new Date() } })).id;
    inactiveId = (await prisma.source.create({ data: { name: `${TAG} inactive`, listingUrl: `${base}/list?c`, officialDomain: "127.0.0.1", sourceType: "HTML", active: false } })).id;
  });

  afterAll(async () => {
    const { prisma } = await import("@/lib/db/prisma");
    const { setPipelinePaused } = await import("./settings");
    await setPipelinePaused(false);
    const ids = [dueId, notDueId, inactiveId];
    const docs = await prisma.document.findMany({ where: { sourceId: { in: ids } }, select: { id: true } });
    await prisma.pipelineError.deleteMany({ where: { OR: [{ sourceId: { in: ids } }, { documentId: { in: docs.map((d) => d.id) } }] } });
    const notices = await prisma.recruitmentNotice.findMany({ where: { sourceId: { in: ids } }, select: { id: true, organizationId: true } });
    await prisma.auditLog.deleteMany({ where: { contentType: "RecruitmentNotice", contentId: { in: notices.map((n) => n.id) } } });
    await prisma.recruitmentNotice.deleteMany({ where: { sourceId: { in: ids } } });
    await prisma.document.deleteMany({ where: { sourceId: { in: ids } } });
    const orgIds = [...new Set(notices.map((n) => n.organizationId).filter((x): x is string => !!x))];
    await prisma.recruitment.deleteMany({ where: { organizationId: { in: orgIds }, isAutoCreated: true } });
    await prisma.exam.deleteMany({ where: { organizationId: { in: orgIds }, isAutoCreated: true } });
    await prisma.organization.deleteMany({ where: { id: { in: orgIds }, isAutoCreated: true } });
    await prisma.source.deleteMany({ where: { id: { in: ids } } });
    await prisma.pipelineRun.deleteMany({ where: { id: { in: runIds } } });
    await new Promise<void>((r) => server.close(() => r()));
  });

  it("checks only due, active sources and records a run with counters", async () => {
    const { runPipeline } = await import("./runner");
    const { prisma } = await import("@/lib/db/prisma");
    const s = await runPipeline({ trigger: "CRON", fetchOptions: noWait, sourceIds: [dueId, notDueId, inactiveId] });
    runIds.push(s.runId!);
    expect(s.status).toBe("COMPLETED");
    expect(s.sourcesChecked).toBe(1);
    expect(s.newDocuments).toBe(1);
    expect(s.newNotices).toBe(1);
    expect(s.failures).toBe(0);
    const run = await prisma.pipelineRun.findUniqueOrThrow({ where: { id: s.runId! } });
    expect(run.status).toBe("COMPLETED");
    expect(run.trigger).toBe("CRON");
    expect(run.sourcesChecked).toBe(1);
    expect(run.newNotices).toBe(1);
    expect((run.log as { sources: Array<{ id: string }> }).sources.map((x) => x.id)).toEqual([dueId]);
    expect(await prisma.sourceCheck.count({ where: { pipelineRunId: run.id } })).toBe(1);
    expect(await prisma.sourceCheck.count({ where: { sourceId: { in: [notDueId, inactiveId] } } })).toBe(0);
  });

  it("does nothing when nothing is due, and forces a re-check on request", async () => {
    const { runPipeline } = await import("./runner");
    const quiet = await runPipeline({ trigger: "CRON", fetchOptions: noWait, sourceIds: [dueId, notDueId, inactiveId] });
    runIds.push(quiet.runId!);
    expect(quiet.sourcesChecked).toBe(0);
    const forced = await runPipeline({ trigger: "MANUAL", fetchOptions: noWait, sourceIds: [dueId], force: true });
    runIds.push(forced.runId!);
    expect(forced.sourcesChecked).toBe(1);
    expect(forced.newDocuments).toBe(0); // same listing, same PDF → nothing new
  });

  it("pause stops scheduled runs but not a manual one; a live run blocks a parallel run; stale runs are closed", async () => {
    const { runPipeline } = await import("./runner");
    const { setPipelinePaused } = await import("./settings");
    const { prisma } = await import("@/lib/db/prisma");
    await setPipelinePaused(true);
    const paused = await runPipeline({ trigger: "CRON", fetchOptions: noWait, sourceIds: [dueId] });
    expect(paused.skipped).toBe("paused");
    expect(paused.runId).toBeNull();
    const manual = await runPipeline({ trigger: "MANUAL", fetchOptions: noWait, sourceIds: [dueId], force: true });
    runIds.push(manual.runId!);
    expect(manual.skipped).toBeNull();
    await setPipelinePaused(false);

    const live = await prisma.pipelineRun.create({ data: { trigger: "MANUAL", status: "RUNNING" } });
    runIds.push(live.id);
    const blocked = await runPipeline({ trigger: "CRON", fetchOptions: noWait, sourceIds: [dueId] });
    expect(blocked.skipped).toBe("running");
    expect(blocked.runId).toBe(live.id);

    await prisma.pipelineRun.update({ where: { id: live.id }, data: { startedAt: new Date(Date.now() - 45 * 60_000) } });
    const after = await runPipeline({ trigger: "CRON", fetchOptions: noWait, sourceIds: [dueId] });
    runIds.push(after.runId!);
    expect(after.skipped).toBeNull();
    expect((await prisma.pipelineRun.findUniqueOrThrow({ where: { id: live.id } })).status).toBe("FAILED");
  });

  it("retries a failed extraction from the stored document once its backoff has elapsed", async () => {
    const { runPipeline } = await import("./runner");
    const { prisma } = await import("@/lib/db/prisma");
    const doc = await prisma.document.findFirstOrThrow({ where: { sourceId: dueId } });
    const err = await prisma.pipelineError.create({ data: { errorType: "EXTRACTION", message: "simulated", sourceId: dueId, documentId: doc.id, retryCount: 1, nextRetryAt: new Date(Date.now() - 1000) } });
    const s = await runPipeline({ trigger: "CRON", fetchOptions: noWait, sourceIds: [dueId] });
    runIds.push(s.runId!);
    expect(s.retried).toBe(1);
    expect(s.updatedNotices).toBe(1); // the existing notice was re-extracted, not duplicated
    expect((await prisma.pipelineError.findUniqueOrThrow({ where: { id: err.id } })).resolvedAt).not.toBeNull();
    expect(await prisma.recruitmentNotice.count({ where: { documentId: doc.id } })).toBe(1);
    const log = (await prisma.pipelineRun.findUniqueOrThrow({ where: { id: s.runId! } })).log as { retries: Array<{ ok: boolean }> };
    expect(log.retries).toEqual([{ errorId: err.id, ok: true }]);
  });

  it("gives up on an item after the retry cap", async () => {
    const { runPipeline, MAX_ERROR_RETRIES } = await import("./runner");
    const { prisma } = await import("@/lib/db/prisma");
    const doc = await prisma.document.findFirstOrThrow({ where: { sourceId: dueId } });
    const err = await prisma.pipelineError.create({ data: { errorType: "RESOLUTION", message: "exhausted", sourceId: dueId, documentId: doc.id, retryCount: MAX_ERROR_RETRIES, nextRetryAt: new Date(Date.now() - 1000) } });
    const s = await runPipeline({ trigger: "CRON", fetchOptions: noWait, sourceIds: [dueId] });
    runIds.push(s.runId!);
    expect(s.retried).toBe(0);
    expect((await prisma.pipelineError.findUniqueOrThrow({ where: { id: err.id } })).resolvedAt).toBeNull();
    await prisma.pipelineError.delete({ where: { id: err.id } });
  });
});
