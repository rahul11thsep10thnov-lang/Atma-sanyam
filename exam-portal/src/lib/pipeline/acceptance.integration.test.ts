import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { buildMinimalPdf } from "./__fixtures__/minimalPdf";
import type { EmailMessage, EmailSender } from "@/lib/alerts/email";

/**
 * Spec §42 acceptance run, end to end through the real pipeline against a
 * loopback "official site" and the real database:
 *   1. a job advertisement appears → ingested, extracted, organization /
 *      category / exam / recruitment created, notice NEEDS_REVIEW
 *   2. an admit card appears → attaches to the SAME recruitment
 *   3. the advertisement PDF is replaced (deadline extended) → the same
 *      notice is UPDATED (new version, diff), never duplicated, and the
 *      recruitment's closing date moves
 *   4. a mirror site serves the same PDF → DUPLICATE of the original
 *   5. publishing → Job + AdmitCard rows, recruitment public, timeline,
 *      subscriber alerted exactly once
 */
const HAS_DB = !!process.env.DATABASE_URL;
const noWait = { minHostIntervalMs: 0, sleep: async () => {} };
const TAG = `accept-${Date.now()}`;
const ORG = `${TAG.toUpperCase()} POLICE RECRUITMENT AND PROMOTION BOARD`;

class FakeSender implements EmailSender {
  readonly name = "fake";
  sent: EmailMessage[] = [];
  async send(m: EmailMessage) {
    this.sent.push(m);
    return { ok: true as const };
  }
}

describe.skipIf(!HAS_DB)("acceptance: official site → pipeline → review → public site → alerts", () => {
  let server: http.Server;
  let base: string;
  let sourceId: string;
  let mirrorId: string;
  let lastDate = "16-01-2027";
  let showAdmit = false;
  const runIds: string[] = [];
  const advt = () => buildMinimalPdf([ORG, "Advertisement No. PRPB-01/2027", "Recruitment of Constable (Civil Police) - 2027", "Total number of vacancies: 60244", "Online application starts: 27-12-2026", `Last date of application: ${lastDate}`, "Application fee: Rs. 400/-", "Age limit: 18 to 22 years", "Apply online at https://uppbpb.gov.in/apply"]);

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      if (req.url === "/robots.txt") res.writeHead(200, { "content-type": "text/plain" }).end("User-agent: *\nAllow: /\n");
      else if (req.url === "/notices") res.writeHead(200, { "content-type": "text/html" }).end(`<html><body><ul><li>27-12-2026 <a href="/files/advt.pdf">Recruitment of Constable (Civil Police) 2027 — Advertisement</a></li>${showAdmit ? `<li>10-02-2027 <a href="/files/admit.pdf">Admit Card — Constable (Civil Police) 2027 Written Exam</a></li>` : ""}</ul></body></html>`);
      else if (req.url === "/mirror") res.writeHead(200, { "content-type": "text/html" }).end(`<html><body><a href="/mirror/advt-copy.pdf">Constable Recruitment 2027 Notification (copy)</a></body></html>`);
      else if (req.url === "/files/advt.pdf" || req.url === "/mirror/advt-copy.pdf") res.writeHead(200, { "content-type": "application/pdf" }).end(advt());
      else if (req.url === "/files/admit.pdf") res.writeHead(200, { "content-type": "application/pdf" }).end(buildMinimalPdf(["Admit Card", "Constable (Civil Police) 2027 - Written Examination", "Admit cards are available for download from 10-02-2027", "Examination date: 17-02-2027"]));
      else res.writeHead(404).end();
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const { prisma } = await import("@/lib/db/prisma");
    sourceId = (await prisma.source.create({ data: { name: `${TAG} official`, listingUrl: `${base}/notices`, officialDomain: "127.0.0.1", sourceType: "HTML", priority: "HIGH", checkFrequencyMinutes: 1 } })).id;
    mirrorId = (await prisma.source.create({ data: { name: `${TAG} mirror`, listingUrl: `${base}/mirror`, officialDomain: "127.0.0.1", sourceType: "HTML", active: false } })).id;
  });

  afterAll(async () => {
    const { prisma } = await import("@/lib/db/prisma");
    const ids = [sourceId, mirrorId];
    const docs = await prisma.document.findMany({ where: { sourceId: { in: ids } }, select: { id: true } });
    await prisma.pipelineError.deleteMany({ where: { OR: [{ sourceId: { in: ids } }, { documentId: { in: docs.map((d) => d.id) } }] } });
    const notices = await prisma.recruitmentNotice.findMany({ where: { sourceId: { in: ids } }, select: { id: true, organizationId: true, recruitmentId: true } });
    const orgIds = [...new Set(notices.map((n) => n.organizationId).filter((x): x is string => !!x))];
    await prisma.alertSubscription.deleteMany({ where: { email: { contains: TAG } } });
    await prisma.notification.deleteMany({ where: { title: { contains: "Constable" }, createdAt: { gte: new Date(Date.now() - 10 * 60_000) } } });
    await prisma.auditLog.deleteMany({ where: { contentType: "RecruitmentNotice", contentId: { in: notices.map((n) => n.id) } } });
    await prisma.recruitmentNotice.deleteMany({ where: { sourceId: { in: ids } } });
    await prisma.job.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.admitCard.deleteMany({ where: { recruitment: { organizationId: { in: orgIds } } } });
    await prisma.document.deleteMany({ where: { sourceId: { in: ids } } });
    await prisma.recruitment.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.exam.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
    await prisma.source.deleteMany({ where: { id: { in: ids } } });
    await prisma.pipelineRun.deleteMany({ where: { id: { in: runIds } } });
    await new Promise<void>((r) => server.close(() => r()));
  });

  it("runs the whole §42 scenario", async () => {
    const { prisma } = await import("@/lib/db/prisma");
    const { runPipeline } = await import("./runner");
    const { publishNotice } = await import("./publish");
    const { approveNotice } = await import("./review");
    const { getPublishedRecruitmentBySlug } = await import("@/lib/services/recruitments");
    const { createSubscription, verifySubscription } = await import("@/lib/alerts/subscriptions");
    const { setEmailSender } = await import("@/lib/alerts/email");
    const sender = new FakeSender();
    setEmailSender(sender);

    // 1. job advertisement
    const r1 = await runPipeline({ trigger: "CRON", sourceIds: [sourceId], fetchOptions: noWait });
    runIds.push(r1.runId!);
    expect(r1).toMatchObject({ status: "COMPLETED", sourcesChecked: 1, newDocuments: 1, newNotices: 1, duplicates: 0, failures: 0 });
    const job = await prisma.recruitmentNotice.findFirstOrThrow({ where: { sourceId, noticeType: "JOB" }, include: { organization: true, recruitment: { include: { categories: { include: { category: true } } } }, exam: true } });
    expect(["NEW", "NEEDS_REVIEW"]).toContain(job.status); // never auto-approved: a new organization was created
    expect(job.organization?.isAutoCreated).toBe(true);
    expect(job.organization?.organizationType).toBe("STATE");
    expect(job.recruitment?.year).toBe(2027);
    expect(job.recruitment?.applicationEndDate?.toISOString().slice(0, 10)).toBe("2027-01-16");
    expect(job.recruitment?.categories.map((c) => c.category.slug)).toContain("police");
    expect(job.exam?.isAutoCreated).toBe(true);
    expect((job.extracted as { vacancies: number }).vacancies).toBe(60244);

    // a reader subscribes to this recruitment
    const sub = await createSubscription({ email: `${TAG}@example.com`, recruitmentId: job.recruitmentId!, noticeTypes: [], minPriority: "LOW", locale: "en" });
    await verifySubscription(sub.subscription.verifyToken);
    expect(sender.sent.at(-1)?.subject).toMatch(/confirm/i); // double opt-in mail went out
    const sentBefore = sender.sent.length;

    // 2. admit card appears → same recruitment
    showAdmit = true;
    await prisma.source.update({ where: { id: sourceId }, data: { lastCheckedAt: new Date(Date.now() - 3_600_000), nextCheckAt: new Date(Date.now() - 1000), etag: null, lastContentHash: null } });
    const r2 = await runPipeline({ trigger: "CRON", sourceIds: [sourceId], fetchOptions: noWait });
    runIds.push(r2.runId!);
    expect(r2).toMatchObject({ newDocuments: 1, newNotices: 1, duplicates: 0 });
    const admit = await prisma.recruitmentNotice.findFirstOrThrow({ where: { sourceId, noticeType: "ADMIT_CARD" } });
    expect(admit.recruitmentId).toBe(job.recruitmentId);
    expect(admit.organizationId).toBe(job.organizationId);
    expect(admit.priority).toBe("HIGH");
    expect((await prisma.recruitment.findUniqueOrThrow({ where: { id: job.recruitmentId! } })).examDate?.toISOString().slice(0, 10)).toBe("2027-02-17");

    // 3. deadline extended in the SAME PDF → update, not duplicate
    lastDate = "26-01-2027";
    await prisma.source.update({ where: { id: sourceId }, data: { lastCheckedAt: new Date(Date.now() - 3_600_000), nextCheckAt: new Date(Date.now() - 1000), etag: null, lastContentHash: null } });
    const r3 = await runPipeline({ trigger: "CRON", sourceIds: [sourceId], fetchOptions: noWait, force: true });
    runIds.push(r3.runId!);
    expect(r3).toMatchObject({ newDocuments: 0, newNotices: 0, updatedNotices: 1, duplicates: 0 });
    expect(await prisma.recruitmentNotice.count({ where: { sourceId, noticeType: "JOB" } })).toBe(1);
    const jobV2 = await prisma.recruitmentNotice.findUniqueOrThrow({ where: { id: job.id }, include: { document: { include: { versions: true } } } });
    expect(jobV2.document?.versions.map((v) => v.versionNumber).sort()).toEqual([1, 2]);
    expect((jobV2.extracted as { application_end_date: string }).application_end_date).toBe("2027-01-26");
    expect((jobV2.changeSummary as { diff: Array<{ new: string | null }> }).diff.some((d) => d.new?.includes("26-01-2027"))).toBe(true);
    expect((await prisma.recruitment.findUniqueOrThrow({ where: { id: job.recruitmentId! } })).applicationEndDate?.toISOString().slice(0, 10)).toBe("2027-01-26");

    // 4. mirror site with the same bytes → DUPLICATE
    await prisma.source.update({ where: { id: mirrorId }, data: { active: true } });
    const r4 = await runPipeline({ trigger: "CRON", sourceIds: [mirrorId], fetchOptions: noWait });
    runIds.push(r4.runId!);
    expect(r4).toMatchObject({ newDocuments: 1, newNotices: 1, duplicates: 1 });
    const dup = await prisma.recruitmentNotice.findFirstOrThrow({ where: { sourceId: mirrorId } });
    expect(dup.status).toBe("DUPLICATE");
    expect(dup.duplicateOfId).toBe(job.id);
    expect(await prisma.recruitmentNotice.count({ where: { recruitmentId: job.recruitmentId, noticeType: "JOB", status: { not: "DUPLICATE" } } })).toBe(1);

    // 5. review + publish → public site + alert
    const admin = await prisma.adminUser.findFirst({ select: { id: true } });
    if (admin) await approveNotice(job.id, admin.id);
    const pubJob = await publishNotice(job.id, { adminId: admin?.id ?? null });
    expect(pubJob.contentType).toBe("Job");
    const pubAdmit = await publishNotice(admit.id, { adminId: admin?.id ?? null });
    expect(pubAdmit.contentType).toBe("AdmitCard");
    const jobRow = await prisma.job.findUniqueOrThrow({ where: { id: pubJob.contentId } });
    expect(jobRow.status).toBe("PUBLISHED");
    expect(jobRow.applicationEndDate?.toISOString().slice(0, 10)).toBe("2027-01-26");
    expect(jobRow.vacancies).toBe(60244);
    const rec = await prisma.recruitment.findUniqueOrThrow({ where: { id: job.recruitmentId! } });
    const page = await getPublishedRecruitmentBySlug(rec.slug);
    expect(page).not.toBeNull();
    expect(page!.recruitment.status).toBe("PUBLISHED");
    expect(page!.recruitment.notices.map((n) => n.noticeType).sort()).toEqual(["ADMIT_CARD", "JOB"]);
    expect(page!.recruitment.jobs).toHaveLength(1);
    expect(page!.recruitment.admitCards).toHaveLength(1);
    const mine = sender.sent.slice(sentBefore).filter((m) => m.to === `${TAG}@example.com`); // other (dev) subscribers may exist in the DB
    expect(mine).toHaveLength(2); // one for the job, one for the admit card
    expect(mine[0].text).toContain(`/recruitments/${rec.slug}`);
    expect(mine.map((m) => m.subject).join(" ")).toMatch(/recruitment/i);
    expect(mine.map((m) => m.subject).join(" ")).toMatch(/admit card/i);
    setEmailSender(undefined);
  }, 120_000);
});
