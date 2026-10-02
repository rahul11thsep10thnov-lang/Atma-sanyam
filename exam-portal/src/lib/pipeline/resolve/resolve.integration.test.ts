import { describe, it, expect, afterAll } from "vitest";
import { ruleExtract } from "../extract/rules";
import { UPPRPB_CONSTABLE_ADVT, ADMIT_CARD_NOTICE, DEADLINE_EXTENSION_NOTICE, SSC_CGL_NOTICE } from "../extract/__fixtures__/notices";

const HAS_DB = !!process.env.DATABASE_URL;
const TAG = `resolve-it-${Date.now()}`;

describe.skipIf(!HAS_DB)("entity resolution (DB integration)", () => {
  const createdOrgIds: string[] = [];

  afterAll(async () => {
    const { prisma } = await import("@/lib/db/prisma");
    const recs = await prisma.recruitment.findMany({ where: { organizationId: { in: createdOrgIds } }, select: { id: true } });
    await prisma.recruitmentNotice.deleteMany({ where: { OR: [{ organizationId: { in: createdOrgIds } }, { recruitmentId: { in: recs.map((r) => r.id) } }] } });
    await prisma.recruitment.deleteMany({ where: { organizationId: { in: createdOrgIds } } });
    await prisma.exam.deleteMany({ where: { organizationId: { in: createdOrgIds } } });
    await prisma.auditLog.deleteMany({ where: { actor: "pipeline", contentType: { in: ["Organization", "Exam", "Recruitment", "Category"] }, createdAt: { gte: new Date(Date.now() - 10 * 60_000) } } });
    await prisma.organization.deleteMany({ where: { id: { in: createdOrgIds } } });
  });

  it("creates the organization/category/exam/recruitment once, then matches by alias and attaches related notices (§42)", async () => {
    const { resolveEntities } = await import("./index");
    const { prisma } = await import("@/lib/db/prisma");

    // Make the fixture organization name unique per run so reruns never collide.
    const orgName = `${TAG.toUpperCase()} POLICE RECRUITMENT AND PROMOTION BOARD`;
    const advtText = UPPRPB_CONSTABLE_ADVT.replace("UTTAR PRADESH POLICE RECRUITMENT AND PROMOTION BOARD", orgName);
    const job = ruleExtract({ text: advtText, title: "Recruitment of Constable (Civil Police) 2027" });
    expect(job.data.organization).toBe(orgName);

    const first = await resolveEntities({ data: job.data, title: "Recruitment of Constable (Civil Police) 2027", sourceDomain: "uppbpb.gov.in" });
    expect(first.organization.method).toBe("created");
    expect(first.createdAny).toBe(true);
    createdOrgIds.push(first.organization.id!);
    const org = await prisma.organization.findUniqueOrThrow({ where: { id: first.organization.id! }, include: { aliases: true, state: true } });
    expect(org.isAutoCreated).toBe(true);
    expect(org.organizationType).toBe("STATE");
    expect(org.aliases.map((a) => a.normalized)).toContain(`${TAG.replace(/[^a-z0-9]/g, "")}policerecruitmentandpromotionboard`);
    expect(first.primaryCategoryId).not.toBeNull();
    expect((await prisma.category.findUniqueOrThrow({ where: { id: first.primaryCategoryId! } })).slug).toBe("police");
    expect(first.exam.method).toBe("created");
    expect(first.recruitment.method).toBe("created");
    const rec = await prisma.recruitment.findUniqueOrThrow({ where: { id: first.recruitment.id! }, include: { categories: true } });
    expect(rec.year).toBe(2027);
    expect(rec.applicationEndDate?.toISOString().slice(0, 10)).toBe("2027-01-16");
    expect(rec.isAutoCreated).toBe(true);
    expect(rec.categories.some((c) => c.isPrimary)).toBe(true);

    // Same notice again, written differently → alias/exact matches, nothing created.
    const again = ruleExtract({ text: advtText.replace(orgName, `${TAG} Police Recruitment & Promotion Board`), title: "Constable (Civil Police) 2027" });
    const second = await resolveEntities({ data: again.data, title: "Constable (Civil Police) 2027", sourceDomain: "uppbpb.gov.in" });
    expect(second.organization.id).toBe(first.organization.id);
    expect(["fuzzy", "alias", "exact"]).toContain(second.organization.method);
    expect(second.recruitment.id).toBe(first.recruitment.id);
    expect(second.createdAny).toBe(false);

    // Deadline extension for the same advertisement → same recruitment, end date moved.
    const ext = ruleExtract({ text: DEADLINE_EXTENSION_NOTICE.replace("UTTAR PRADESH POLICE RECRUITMENT AND PROMOTION BOARD", orgName), title: "Corrigendum: Extension of last date — Constable (Civil Police) 2027" });
    const third = await resolveEntities({ data: ext.data, title: "Corrigendum: Extension of last date — Constable (Civil Police) 2027" });
    expect(third.recruitment.id).toBe(first.recruitment.id);
    expect((await prisma.recruitment.findUniqueOrThrow({ where: { id: first.recruitment.id! } })).applicationEndDate?.toISOString().slice(0, 10)).toBe("2027-01-26");

    // Admit card with no organization line, from a source that has been
    // feeding this organization → same-source fallback, same recruitment.
    const sourceId = (await prisma.source.create({ data: { name: TAG, listingUrl: `http://127.0.0.1/${TAG}`, officialDomain: "127.0.0.1", sourceType: "HTML" } })).id;
    await prisma.recruitmentNotice.create({ data: { title: "seed", noticeType: "JOB", sourceId, organizationId: first.organization.id!, recruitmentId: first.recruitment.id! } });
    const admit = ruleExtract({ text: ADMIT_CARD_NOTICE, title: "Admit Card — Constable (Civil Police) 2027 Written Exam" });
    expect(admit.data.organization).toBeNull();
    const fourth = await resolveEntities({ data: admit.data, title: "Admit Card — Constable (Civil Police) 2027 Written Exam", sourceId });
    expect(fourth.organization.method).toBe("same-source");
    expect(fourth.recruitment.id).toBe(first.recruitment.id);
    expect((await prisma.recruitment.findUniqueOrThrow({ where: { id: first.recruitment.id! } })).examDate?.toISOString().slice(0, 10)).toBe("2027-02-17");
    await prisma.recruitmentNotice.deleteMany({ where: { sourceId } });
    await prisma.source.delete({ where: { id: sourceId } });

    // A different organization never gets glued onto this one.
    const ssc = ruleExtract({ text: SSC_CGL_NOTICE.replace("STAFF SELECTION COMMISSION", `${TAG.toUpperCase()} SELECTION COMMISSION`), title: "Combined Graduate Level Examination, 2027 — Notice" });
    const fifth = await resolveEntities({ data: ssc.data, title: "Combined Graduate Level Examination, 2027 — Notice" });
    expect(fifth.organization.id).not.toBe(first.organization.id);
    createdOrgIds.push(fifth.organization.id!);
    expect(fifth.exam.name).toBe("Combined Graduate Level Examination");
    expect(fifth.recruitment.name).toBe("Combined Graduate Level Examination, 2027");
  });

  it("returns no links (and no crash) when there is nothing to resolve", async () => {
    const { resolveEntities } = await import("./index");
    const r = ruleExtract({ text: "Holiday list for the calendar year 2027.", title: "Holiday list 2027" });
    const res = await resolveEntities({ data: r.data, title: "Holiday list 2027" });
    expect(res.organization.id).toBeNull();
    expect(res.recruitment.id).toBeNull();
    expect(res.createdAny).toBe(false);
  });
});
