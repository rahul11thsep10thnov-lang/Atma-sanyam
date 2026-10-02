import { describe, it, expect, afterAll } from "vitest";
import type { TranslateFn } from "./translate";

const HAS_DB = !!process.env.DATABASE_URL;
const TAG = `translate-it-${Date.now()}`;

describe.skipIf(!HAS_DB)("translateNotice", () => {
  let orgId: string;
  afterAll(async () => {
    const { prisma } = await import("@/lib/db/prisma");
    await prisma.recruitmentNotice.deleteMany({ where: { organizationId: orgId } });
    await prisma.recruitment.deleteMany({ where: { organizationId: orgId } });
    await prisma.organization.deleteMany({ where: { id: orgId } });
  });

  it("stores machine Hindi labelled as claude, never overwrites a human translation, and does nothing without a translator", async () => {
    const { prisma } = await import("@/lib/db/prisma");
    const { translateNotice } = await import("./translate");
    orgId = (await prisma.organization.create({ data: { name: `${TAG} Board`, slug: TAG } })).id;
    const rec = await prisma.recruitment.create({ data: { title: "Constable Recruitment 2027", slug: `${TAG}-rec`, organizationId: orgId } });
    const n = await prisma.recruitmentNotice.create({ data: { title: "Admit Card — Constable 2027", summary: "Download from 10 Feb.", noticeType: "ADMIT_CARD", organizationId: orgId, recruitmentId: rec.id } });

    const calls: string[] = [];
    const fake: TranslateFn = async (i) => {
      calls.push(i.title);
      return { title_hi: `${i.title} (हिन्दी)`, summary_hi: i.summary ? `${i.summary} (हिन्दी)` : null };
    };
    const r1 = await translateNotice(n.id, { translate: fake });
    expect(r1).toEqual({ translated: true, recruitmentTranslated: true });
    const after = await prisma.recruitmentNotice.findUniqueOrThrow({ where: { id: n.id } });
    expect(after.titleHi).toBe("Admit Card — Constable 2027 (हिन्दी)");
    expect(after.summaryHi).toBe("Download from 10 Feb. (हिन्दी)");
    expect(after.translationSource).toBe("claude");
    expect((await prisma.recruitment.findUniqueOrThrow({ where: { id: rec.id } })).titleHi).toBe("Constable Recruitment 2027 (हिन्दी)");
    expect(calls).toEqual(["Admit Card — Constable 2027", "Constable Recruitment 2027"]);

    // A human edit wins: not re-translated without force.
    await prisma.recruitmentNotice.update({ where: { id: n.id }, data: { titleHi: "एडमिट कार्ड — कांस्टेबल 2027", translationSource: "admin" } });
    const r2 = await translateNotice(n.id, { translate: fake });
    expect(r2.translated).toBe(false);
    expect((await prisma.recruitmentNotice.findUniqueOrThrow({ where: { id: n.id } })).titleHi).toBe("एडमिट कार्ड — कांस्टेबल 2027");

    // No key, no translator → nothing happens, nothing invented.
    const fresh = await prisma.recruitmentNotice.create({ data: { title: "Result — Constable 2027", noticeType: "RESULT", organizationId: orgId, recruitmentId: rec.id } });
    delete process.env.ANTHROPIC_API_KEY;
    const r3 = await translateNotice(fresh.id);
    expect(r3).toEqual({ translated: false, recruitmentTranslated: false });
    expect((await prisma.recruitmentNotice.findUniqueOrThrow({ where: { id: fresh.id } })).titleHi).toBeNull();
  });
});
