import { describe, it, expect, beforeAll, afterAll } from "vitest";

const HAS_DB = !!process.env.DATABASE_URL;
const TAG = `fb-it-${Date.now()}`;

describe.skipIf(!HAS_DB)("Felicitation Board end to end (DB)", () => {
  let adminId: string;
  const mobiles = ["+919000000001", "+919000000002", "+919000000003"].map((m, i) => m.replace(/\d{4}$/, String(Date.now() % 10000 + i).padStart(4, "0")));

  beforeAll(async () => {
    const { prisma } = await import("@/lib/db/prisma");
    const { setPaymentProvider, MockProvider } = await import("@/lib/payments/provider");
    setPaymentProvider(new MockProvider());
    adminId = (await prisma.adminUser.findFirstOrThrow({ select: { id: true } })).id;
  });

  afterAll(async () => {
    const { prisma } = await import("@/lib/db/prisma");
    const { setPaymentProvider } = await import("@/lib/payments/provider");
    setPaymentProvider(undefined);
    const ids = (await prisma.felicitationEntry.findMany({ where: { candidateName: { startsWith: TAG } }, select: { id: true } })).map((e) => e.id);
    await prisma.payment.deleteMany({ where: { felicitationEntryId: { in: ids } } });
    await prisma.auditLog.deleteMany({ where: { contentType: "FelicitationEntry", contentId: { in: ids } } });
    await prisma.felicitationEntry.deleteMany({ where: { id: { in: ids } } });
  });

  async function submitAndPay(i: number, pay: "success" | "fail" | "none") {
    const { createDraftEntry } = await import("./service");
    const { createCheckout, confirmPayment, failPayment, mockCheckoutResult } = await import("@/lib/payments/service");
    const { encryptField } = await import("@/lib/security/crypto");
    const entry = await createDraftEntry({ candidateName: `${TAG} Candidate ${i}`, examName: "UP Police SI", mobile: mobiles[i], locality: "Civil Lines", city: "Prayagraj", state: "Uttar Pradesh", identityLast4Enc: encryptField("1234") });
    const checkout = await createCheckout({ purpose: "FELICITATION", amountRupees: 100, felicitationEntryId: entry.id, receipt: entry.refCode });
    if (pay === "success") {
      const r = mockCheckoutResult(checkout.orderId);
      expect((await confirmPayment(r)).ok).toBe(true);
    } else if (pay === "fail") await failPayment(checkout.orderId, "card declined");
    return { entry, checkout };
  }

  it("never shows unpaid, failed, unapproved, paused or expired entries; shows approved paid ones in order", async () => {
    const { prisma } = await import("@/lib/db/prisma");
    const svc = await import("./service");
    const { confirmPayment, mockCheckoutResult } = await import("@/lib/payments/service");
    const now = new Date();

    const a = await submitAndPay(0, "success");
    const b = await submitAndPay(1, "fail");
    const c = await submitAndPay(2, "none");

    const ea = await prisma.felicitationEntry.findUniqueOrThrow({ where: { id: a.entry.id } });
    expect(ea).toMatchObject({ status: "PAID_PENDING_APPROVAL", paymentStatus: "PAID" });
    expect((await prisma.felicitationEntry.findUniqueOrThrow({ where: { id: b.entry.id } })).status).toBe("PAYMENT_FAILED");
    expect((await prisma.felicitationEntry.findUniqueOrThrow({ where: { id: c.entry.id } })).status).toBe("PAYMENT_PENDING");

    // Paid but not approved → not public.
    let board = await svc.getBoardState(now);
    expect(board.entries.find((e) => e.id === a.entry.id)).toBeUndefined();

    // Forged / wrong signature never marks paid; replay of a good one is idempotent.
    expect((await confirmPayment({ orderId: c.checkout.orderId, paymentId: "pay_x", signature: "deadbeef" })).ok).toBe(false);
    const good = mockCheckoutResult(a.checkout.orderId);
    const replay = await confirmPayment({ ...good, paymentId: (await prisma.payment.findUniqueOrThrow({ where: { orderId: a.checkout.orderId } })).paymentId! });
    expect(replay.ok && replay.alreadyPaid).toBe(true);
    expect(await prisma.payment.count({ where: { felicitationEntryId: a.entry.id, status: "PAID" } })).toBe(1);

    // Failed payment cannot be approved.
    await expect(svc.approveEntry(b.entry.id, adminId)).rejects.toThrow(/paid/);

    // Approve → broadcasting now for 24 h; public payload has public fields only.
    await svc.approveEntry(a.entry.id, adminId, null, now);
    const approved = await prisma.felicitationEntry.findUniqueOrThrow({ where: { id: a.entry.id } });
    expect(approved.status).toBe("BROADCASTING");
    expect(approved.expiresAt!.getTime() - approved.startAt!.getTime()).toBe(24 * 3_600_000);
    board = await svc.getBoardState(new Date(now.getTime() + 1000));
    const pub = board.entries.find((e) => e.id === a.entry.id)!;
    expect(pub).toEqual({ id: a.entry.id, candidateName: `${TAG} Candidate 0`, locality: "Civil Lines", city: "Prayagraj", examName: "UP Police SI" });
    // No private data: exact field whitelist, and none of the real values anywhere.
    for (const e of board.entries) expect(Object.keys(e).sort()).toEqual(["candidateName", "city", "examName", "id", "locality"]);
    const json = JSON.stringify(board);
    for (const m of mobiles) expect(json).not.toContain(m.replace("+91", ""));
    expect(json).not.toMatch(/"(mobile|identity\w*|payment\w*|state|refCode)"\s*:/);

    // Pause hides it; resume restores the remaining time (pause is not charged).
    await svc.pauseEntry(a.entry.id, adminId, new Date(now.getTime() + 3_600_000));
    expect((await svc.getBoardState(new Date(now.getTime() + 3_600_000 + 1000))).entries.find((e) => e.id === a.entry.id)).toBeUndefined();
    const resumeAt = new Date(now.getTime() + 5 * 3_600_000);
    await svc.resumeEntry(a.entry.id, adminId, resumeAt);
    const resumed = await prisma.felicitationEntry.findUniqueOrThrow({ where: { id: a.entry.id } });
    expect(resumed.expiresAt!.getTime()).toBe(resumeAt.getTime() + 23 * 3_600_000);

    // Expiry is enforced by the server (sweep), not the browser.
    const after = new Date(resumed.expiresAt!.getTime() + 1);
    board = await svc.getBoardState(after);
    expect(board.entries.find((e) => e.id === a.entry.id)).toBeUndefined();
    expect((await prisma.felicitationEntry.findUniqueOrThrow({ where: { id: a.entry.id } })).status).toBe("EXPIRED");

    // Extend brings it back for 24 h from now.
    await svc.extendEntry(a.entry.id, adminId, 24, after);
    expect((await prisma.felicitationEntry.findUniqueOrThrow({ where: { id: a.entry.id } })).status).toBe("BROADCASTING");

    // Rejection is final for broadcasting.
    await svc.rejectEntry(a.entry.id, adminId, "test");
    expect((await svc.getBoardState(new Date(after.getTime() + 1000))).entries.find((e) => e.id === a.entry.id)).toBeUndefined();

    // Late success for c (e.g. via webhook) still works once.
    const late = mockCheckoutResult(c.checkout.orderId);
    expect((await confirmPayment({ orderId: late.orderId, paymentId: late.paymentId, viaWebhook: true, amountPaise: 9900 })).ok).toBe(false); // amount mismatch
    expect((await confirmPayment({ orderId: late.orderId, paymentId: late.paymentId, viaWebhook: true, amountPaise: 10000 })).ok).toBe(true);
    expect((await prisma.felicitationEntry.findUniqueOrThrow({ where: { id: c.entry.id } })).status).toBe("PAID_PENDING_APPROVAL");
  });

  it("re-submitting the same mobile reuses the unpaid entry and the open order (no duplicates)", async () => {
    const { prisma } = await import("@/lib/db/prisma");
    const { createDraftEntry } = await import("./service");
    const { createCheckout } = await import("@/lib/payments/service");
    const m = mobiles[1].replace(/\d$/, "9");
    const e1 = await createDraftEntry({ candidateName: `${TAG} Dup`, examName: "SSC CGL", mobile: m, locality: "A", city: "B", state: "Bihar", identityLast4Enc: null });
    const o1 = await createCheckout({ purpose: "FELICITATION", amountRupees: 100, felicitationEntryId: e1.id, receipt: e1.refCode });
    const e2 = await createDraftEntry({ candidateName: `${TAG} Dup`, examName: "SSC CGL", mobile: m, locality: "A", city: "B", state: "Bihar", identityLast4Enc: null });
    const o2 = await createCheckout({ purpose: "FELICITATION", amountRupees: 100, felicitationEntryId: e2.id, receipt: e2.refCode });
    expect(e2.id).toBe(e1.id);
    expect(o2.orderId).toBe(o1.orderId);
    expect(await prisma.payment.count({ where: { felicitationEntryId: e1.id } })).toBe(1);
  });
});
