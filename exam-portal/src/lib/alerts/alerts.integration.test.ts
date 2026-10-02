import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { EmailMessage, EmailSender } from "./email";

const HAS_DB = !!process.env.DATABASE_URL;
const TAG = `alerts-it-${Date.now()}`;

class FakeSender implements EmailSender {
  readonly name = "fake";
  sent: EmailMessage[] = [];
  fail = false;
  async send(m: EmailMessage) {
    if (this.fail) return { ok: false as const, error: "simulated outage" };
    this.sent.push(m);
    return { ok: true as const, id: `fake-${this.sent.length}` };
  }
}

describe.skipIf(!HAS_DB)("alert subscriptions (DB integration)", () => {
  let orgId: string;
  let recId: string;
  let noticeId: string;
  let otherNoticeId: string;

  beforeAll(async () => {
    const { prisma } = await import("@/lib/db/prisma");
    const { setEmailSender } = await import("./email");
    setEmailSender(null);
    orgId = (await prisma.organization.create({ data: { name: `${TAG} Board`, slug: TAG, isAutoCreated: true } })).id;
    recId = (await prisma.recruitment.create({ data: { title: `${TAG} Constable 2027`, slug: `${TAG}-constable`, status: "PUBLISHED", organizationId: orgId } })).id;
    noticeId = (await prisma.recruitmentNotice.create({ data: { title: `${TAG} Admit card`, noticeType: "ADMIT_CARD", priority: "HIGH", status: "PUBLISHED", organizationId: orgId, recruitmentId: recId, sourceUrl: "https://example.org/admit.pdf" } })).id;
    otherNoticeId = (await prisma.recruitmentNotice.create({ data: { title: `${TAG} Result`, noticeType: "RESULT", priority: "NORMAL", status: "PUBLISHED", organizationId: orgId, recruitmentId: recId } })).id;
  });

  afterAll(async () => {
    const { prisma } = await import("@/lib/db/prisma");
    const { setEmailSender } = await import("./email");
    setEmailSender(undefined);
    await prisma.alertSubscription.deleteMany({ where: { email: { contains: TAG } } });
    await prisma.recruitmentNotice.deleteMany({ where: { organizationId: orgId } });
    await prisma.recruitment.deleteMany({ where: { organizationId: orgId } });
    await prisma.organization.delete({ where: { id: orgId } });
  });

  it("subscribe → verify → dispatch sends one e-mail per matching subscriber, idempotently", async () => {
    const { createSubscription, verifySubscription, dispatchAlertsForNotice } = await import("./subscriptions");
    const { prisma } = await import("@/lib/db/prisma");
    const sender = new FakeSender();
    const a = await createSubscription({ email: `${TAG}-a@example.com`, recruitmentId: recId, noticeTypes: [], minPriority: "LOW", locale: "en" });
    const b = await createSubscription({ email: `${TAG}-b@example.com`, noticeTypes: ["RESULT"], minPriority: "LOW", locale: "hi" });
    const c = await createSubscription({ email: `${TAG}-c@example.com`, noticeTypes: [], minPriority: "LOW", locale: "en" }); // never verified
    expect(a.subscription.verifiedAt).toBeNull();
    expect(a.verifyUrl).toContain("/alerts/verify?token=");
    await verifySubscription(a.subscription.verifyToken);
    await verifySubscription(b.subscription.verifyToken);
    void c;

    const r1 = await dispatchAlertsForNotice(noticeId, { sender });
    expect(r1).toEqual({ matched: 1, sent: 1, failed: 0 }); // a matches (recruitment); b wants RESULT only; c unverified
    expect(sender.sent[0].to).toBe(`${TAG}-a@example.com`);
    expect(sender.sent[0].subject).toContain("Admit card");
    expect(sender.sent[0].text).toContain(`/recruitments/${TAG}-constable`);
    expect(sender.sent[0].text).toContain("/alerts/unsubscribe?token=");

    const again = await dispatchAlertsForNotice(noticeId, { sender });
    expect(again.sent).toBe(0); // already SENT → not re-sent
    expect(await prisma.alertDelivery.count({ where: { recruitmentNoticeId: noticeId } })).toBe(1);

    const r2 = await dispatchAlertsForNotice(otherNoticeId, { sender });
    expect(r2.matched).toBe(2); // a (recruitment scope, all types) + b (RESULT)
    expect(sender.sent.map((m) => m.to).sort()).toEqual([`${TAG}-a@example.com`, `${TAG}-a@example.com`, `${TAG}-b@example.com`].sort());
    const hindi = sender.sent.find((m) => m.to === `${TAG}-b@example.com`)!;
    expect(hindi.subject).toContain("परिणाम");
  });

  it("records FAILED (with the reason) when no provider is configured, and retries later", async () => {
    const { createSubscription, verifySubscription, dispatchAlertsForNotice, retryFailedAlerts } = await import("./subscriptions");
    const { prisma } = await import("@/lib/db/prisma");
    const d = await createSubscription({ email: `${TAG}-d@example.com`, organizationId: orgId, noticeTypes: ["ADMIT_CARD"], minPriority: "HIGH", locale: "en" });
    await verifySubscription(d.subscription.verifyToken);
    const r = await dispatchAlertsForNotice(noticeId, { sender: null });
    expect(r).toEqual({ matched: 2, sent: 0, failed: 1 }); // a already SENT, d fails
    const row = await prisma.alertDelivery.findFirstOrThrow({ where: { subscriptionId: d.subscription.id } });
    expect(row.status).toBe("FAILED");
    expect(row.error).toMatch(/not configured/);
    const sender = new FakeSender();
    const retry = await retryFailedAlerts(100, sender);
    expect(retry.sent).toBeGreaterThanOrEqual(1);
    expect((await prisma.alertDelivery.findUniqueOrThrow({ where: { id: row.id } })).status).toBe("SENT");
  });

  it("unsubscribe stops alerts; re-subscribing the same scope reuses the row", async () => {
    const { createSubscription, unsubscribe, dispatchAlertsForNotice } = await import("./subscriptions");
    const { prisma } = await import("@/lib/db/prisma");
    const a = await prisma.alertSubscription.findFirstOrThrow({ where: { email: `${TAG}-a@example.com` } });
    expect(await unsubscribe(a.unsubscribeToken)).not.toBeNull();
    expect(await unsubscribe("nope")).toBeNull();
    const fresh = await prisma.recruitmentNotice.create({ data: { title: `${TAG} Result 2`, noticeType: "RESULT", status: "PUBLISHED", organizationId: orgId, recruitmentId: recId } });
    const sender = new FakeSender();
    const r = await dispatchAlertsForNotice(fresh.id, { sender });
    expect(sender.sent.map((m) => m.to)).not.toContain(`${TAG}-a@example.com`);
    expect(r.matched).toBe(1); // only b
    const re = await createSubscription({ email: `${TAG}-a@example.com`, recruitmentId: recId, noticeTypes: [], minPriority: "LOW", locale: "en" });
    expect(re.subscription.id).toBe(a.id);
    expect(re.alreadyVerified).toBe(true);
    expect((await prisma.alertSubscription.findUniqueOrThrow({ where: { id: a.id } })).active).toBe(true);
  });
});
