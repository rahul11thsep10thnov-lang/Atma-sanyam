import { describe, it, expect, beforeAll, afterAll } from "vitest";

const HAS_DB = !!process.env.DATABASE_URL;
const TAG = `dedup-it-${Date.now()}`;

describe.skipIf(!HAS_DB)("findDuplicate (DB integration)", () => {
  let orgId: string;
  let otherOrgId: string;
  let docA: string;
  let docB: string;
  let docC: string;
  let original: string;

  beforeAll(async () => {
    const { prisma } = await import("@/lib/db/prisma");
    orgId = (await prisma.organization.create({ data: { name: `${TAG} Board`, slug: TAG, isAutoCreated: true } })).id;
    otherOrgId = (await prisma.organization.create({ data: { name: `${TAG} Other`, slug: `${TAG}-other`, isAutoCreated: true } })).id;
    const mkDoc = async (n: string, checksum: string) =>
      (await prisma.document.create({ data: { filename: `${TAG}-${n}.pdf`, storageUrl: `mem://${TAG}/${n}`, checksum, documentType: "JOB_NOTIFICATION", sourceUrl: `https://example.org/${TAG}/${n}.pdf` } })).id;
    docA = await mkDoc("a", `${TAG}-hash-1`);
    docB = await mkDoc("b", `${TAG}-hash-1`); // same bytes as A, different URL
    docC = await mkDoc("c", `${TAG}-hash-2`);
    original = (
      await prisma.recruitmentNotice.create({
        data: {
          title: "Recruitment of Constable (Civil Police) 2027",
          noticeType: "JOB",
          status: "NEEDS_REVIEW",
          organizationId: orgId,
          documentId: docA,
          sourceUrl: `https://example.org/${TAG}/a.pdf`,
          canonicalUrl: `example.org/${TAG}/a.pdf`,
          extracted: { advertisement_number: "PRPB-01/2027", application_end_date: "2027-01-16", exam_date: null },
        },
      })
    ).id;
  });

  afterAll(async () => {
    const { prisma } = await import("@/lib/db/prisma");
    await prisma.recruitmentNotice.deleteMany({ where: { organizationId: { in: [orgId, otherOrgId] } } });
    await prisma.document.deleteMany({ where: { id: { in: [docA, docB, docC] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [orgId, otherOrgId] } } });
  });

  const base = () => ({
    documentId: docC,
    documentChecksum: `${TAG}-hash-2`,
    canonicalUrl: `example.org/${TAG}/c.pdf`,
    sourceUrl: `https://example.org/${TAG}/c.pdf`,
    organizationId: orgId,
    recruitmentId: null,
    noticeType: "JOB" as const,
    title: "Something else entirely",
    advertisementNumber: null,
    applicationEndDate: null,
    examDate: null,
  });

  it("matches the same URL even with tracking noise", async () => {
    const { findDuplicate } = await import("./dedup");
    const m = await findDuplicate({ ...base(), canonicalUrl: `example.org/${TAG}/a.pdf`, sourceUrl: `HTTPS://EXAMPLE.ORG/${TAG}/a.pdf?utm_source=whatsapp` });
    expect(m).toMatchObject({ duplicateOfId: original, reason: "url" });
  });

  it("matches the same file bytes under a different URL", async () => {
    const { findDuplicate } = await import("./dedup");
    const m = await findDuplicate({ ...base(), documentId: docB, documentChecksum: `${TAG}-hash-1` });
    expect(m).toMatchObject({ duplicateOfId: original, reason: "checksum" });
  });

  it("matches the same advertisement number for the same organization and type only", async () => {
    const { findDuplicate } = await import("./dedup");
    expect(await findDuplicate({ ...base(), advertisementNumber: "PRPB-01/2027" })).toMatchObject({ duplicateOfId: original, reason: "advertisement" });
    expect(await findDuplicate({ ...base(), advertisementNumber: "PRPB-01/2027", noticeType: "ADMIT_CARD" })).toBeNull();
    expect(await findDuplicate({ ...base(), advertisementNumber: "PRPB-01/2027", organizationId: otherOrgId })).toBeNull();
  });

  it("matches a near-identical title when the dates agree, and not otherwise", async () => {
    const { findDuplicate } = await import("./dedup");
    expect(await findDuplicate({ ...base(), title: "Recruitment of Constable (Civil Police) - 2027", applicationEndDate: "2027-01-16" })).toMatchObject({ duplicateOfId: original, reason: "title" });
    expect(await findDuplicate({ ...base(), title: "Recruitment of Constable (Civil Police) - 2027", applicationEndDate: "2027-02-28" })).toBeNull(); // different closing date → a different round
    expect(await findDuplicate({ ...base(), title: "Recruitment of Sub Inspector 2027" })).toBeNull();
    expect(await findDuplicate({ ...base(), title: "Recruitment of Constable (Civil Police) 2027", noticeType: "ADMIT_CARD" })).toBeNull();
  });

  it("never reports a notice as a duplicate of itself or of another duplicate", async () => {
    const { prisma } = await import("@/lib/db/prisma");
    const { findDuplicate } = await import("./dedup");
    expect(await findDuplicate({ ...base(), noticeId: original, documentId: docA, canonicalUrl: `example.org/${TAG}/a.pdf` })).toBeNull();
    const dup = await prisma.recruitmentNotice.create({ data: { title: "copy", noticeType: "JOB", status: "DUPLICATE", duplicateOfId: original, organizationId: orgId, documentId: docB, canonicalUrl: `example.org/${TAG}/b.pdf` } });
    const m = await findDuplicate({ ...base(), canonicalUrl: `example.org/${TAG}/b.pdf` });
    expect(m).toBeNull(); // the DUPLICATE row itself is never a target…
    const m2 = await findDuplicate({ ...base(), documentId: docC, documentChecksum: `${TAG}-hash-1` });
    expect(m2?.duplicateOfId).toBe(original); // …the canonical one is
    await prisma.recruitmentNotice.delete({ where: { id: dup.id } });
  });
});
