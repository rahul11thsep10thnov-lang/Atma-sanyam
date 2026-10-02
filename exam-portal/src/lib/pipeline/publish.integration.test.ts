import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { ruleExtract } from "./extract/rules";
import { UPPRPB_CONSTABLE_ADVT, DEADLINE_EXTENSION_NOTICE, ADMIT_CARD_NOTICE } from "./extract/__fixtures__/notices";

const HAS_DB = !!process.env.DATABASE_URL;
const TAG = `publish-it-${Date.now()}`;

describe.skipIf(!HAS_DB)("publishNotice (DB integration)", () => {
  let orgId: string;
  let jobNoticeId: string;
  let extNoticeId: string;
  let admitNoticeId: string;
  let recruitmentId: string;

  beforeAll(async () => {
    const { prisma } = await import("@/lib/db/prisma");
    const { resolveEntities } = await import("./resolve");
    const orgName = `${TAG.toUpperCase()} POLICE RECRUITMENT AND PROMOTION BOARD`;
    const mk = async (text: string, title: string) => {
      const r = ruleExtract({ text, title });
      const res = await resolveEntities({ data: r.data, title, sourceDomain: "uppbpb.gov.in" });
      const n = await prisma.recruitmentNotice.create({
        data: {
          title,
          noticeType: r.data.notice_type,
          status: "APPROVED",
          extracted: r.data as object,
          sourceUrl: `https://uppbpb.gov.in/${TAG}/${r.data.notice_type.toLowerCase()}.pdf`,
          organizationId: res.organization.id,
          examId: res.exam.id,
          recruitmentId: res.recruitment.id,
        },
      });
      return { id: n.id, res };
    };
    const job = await mk(UPPRPB_CONSTABLE_ADVT.replace("UTTAR PRADESH POLICE RECRUITMENT AND PROMOTION BOARD", orgName), "Recruitment of Constable (Civil Police) 2027");
    orgId = job.res.organization.id!;
    recruitmentId = job.res.recruitment.id!;
    jobNoticeId = job.id;
    extNoticeId = (await mk(DEADLINE_EXTENSION_NOTICE.replace("UTTAR PRADESH POLICE RECRUITMENT AND PROMOTION BOARD", orgName), "Corrigendum: Extension of last date — Constable (Civil Police) 2027")).id;
    admitNoticeId = (await mk(ADMIT_CARD_NOTICE.replace("UPPRPB", orgName), "Admit Card — Constable (Civil Police) 2027 Written Exam")).id;
    // the admit card text has no organization line: attach it by hand as the same-source rule would
    await prisma.recruitmentNotice.update({ where: { id: admitNoticeId }, data: { organizationId: orgId, recruitmentId, examId: job.res.exam.id } });
  });

  afterAll(async () => {
    const { prisma } = await import("@/lib/db/prisma");
    await prisma.notification.deleteMany({ where: { targetType: { in: ["Job", "AdmitCard", "Recruitment"] }, createdAt: { gte: new Date(Date.now() - 10 * 60_000) }, title: { contains: "Constable" } } });
    await prisma.recruitmentNotice.deleteMany({ where: { organizationId: orgId } });
    await prisma.job.deleteMany({ where: { organizationId: orgId } });
    await prisma.admitCard.deleteMany({ where: { recruitmentId } });
    await prisma.recruitment.deleteMany({ where: { organizationId: orgId } });
    await prisma.exam.deleteMany({ where: { organizationId: orgId } });
    await prisma.organization.deleteMany({ where: { id: orgId } });
  });

  it("publishes a JOB notice as a published Job and publishes its recruitment + auto-created exam", async () => {
    const { publishNotice } = await import("./publish");
    const { prisma } = await import("@/lib/db/prisma");
    const res = await publishNotice(jobNoticeId, { adminId: undefined });
    expect(res.contentType).toBe("Job");
    const job = await prisma.job.findUniqueOrThrow({ where: { id: res.contentId } });
    expect(job.status).toBe("PUBLISHED");
    expect(job.publishedAt).not.toBeNull();
    expect(job.vacancies).toBe(60244);
    expect(job.advertisementNumber).toBe("PRPB-01/2027");
    expect(job.applicationEndDate?.toISOString().slice(0, 10)).toBe("2027-01-16");
    expect(job.applyUrl).toBe("https://uppbpb.gov.in/apply");
    expect(Number(job.applicationFee)).toBe(400);
    expect(job.recruitmentId).toBe(recruitmentId);
    expect(job.createdBy).toBe("pipeline");
    const rec = await prisma.recruitment.findUniqueOrThrow({ where: { id: recruitmentId } });
    expect(rec.status).toBe("PUBLISHED");
    const exam = await prisma.exam.findUniqueOrThrow({ where: { id: job.examId } });
    expect(exam.status).toBe("PUBLISHED");
    const notice = await prisma.recruitmentNotice.findUniqueOrThrow({ where: { id: jobNoticeId } });
    expect(notice.status).toBe("PUBLISHED");
    expect(notice.publishedContentType).toBe("Job");
    expect(notice.publishedContentId).toBe(job.id);
    // idempotent
    const again = await publishNotice(jobNoticeId);
    expect(again.contentId).toBe(job.id);
    expect(await prisma.job.count({ where: { recruitmentId } })).toBe(1);
  });

  it("publishes a DEADLINE_EXTENSION by updating the recruitment's job, not creating a second one", async () => {
    const { publishNotice } = await import("./publish");
    const { prisma } = await import("@/lib/db/prisma");
    const res = await publishNotice(extNoticeId);
    expect(res.contentType).toBe("Job");
    expect(await prisma.job.count({ where: { recruitmentId } })).toBe(1);
    const job = await prisma.job.findFirstOrThrow({ where: { recruitmentId } });
    expect(job.applicationEndDate?.toISOString().slice(0, 10)).toBe("2027-01-26");
    expect(await prisma.notification.count({ where: { type: "DEADLINE_UPDATE", targetId: job.id } })).toBe(1);
  });

  it("publishes an ADMIT_CARD as an AdmitCard attached to the same recruitment", async () => {
    const { publishNotice } = await import("./publish");
    const { prisma } = await import("@/lib/db/prisma");
    const res = await publishNotice(admitNoticeId);
    expect(res.contentType).toBe("AdmitCard");
    const card = await prisma.admitCard.findUniqueOrThrow({ where: { id: res.contentId } });
    expect(card.status).toBe("PUBLISHED");
    expect(card.recruitmentId).toBe(recruitmentId);
    expect(card.examDate?.toISOString().slice(0, 10)).toBe("2027-02-17");
    expect(card.releaseDate?.toISOString().slice(0, 10)).toBe("2027-02-10");
  });

  it("refuses to publish duplicates, rejected notices and notices without a recruitment", async () => {
    const { publishNotice, PublishError } = await import("./publish");
    const { prisma } = await import("@/lib/db/prisma");
    const dup = await prisma.recruitmentNotice.create({ data: { title: "dup", noticeType: "JOB", status: "DUPLICATE", duplicateOfId: jobNoticeId, organizationId: orgId, recruitmentId } });
    await expect(publishNotice(dup.id)).rejects.toBeInstanceOf(PublishError);
    const rej = await prisma.recruitmentNotice.create({ data: { title: "rej", noticeType: "JOB", status: "REJECTED", organizationId: orgId, recruitmentId } });
    await expect(publishNotice(rej.id)).rejects.toBeInstanceOf(PublishError);
    const orphan = await prisma.recruitmentNotice.create({ data: { title: "orphan", noticeType: "JOB", status: "APPROVED", organizationId: orgId } });
    await expect(publishNotice(orphan.id)).rejects.toThrow(/recruitment/);
  });
});
