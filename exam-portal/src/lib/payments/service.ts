import { prisma } from "@/lib/db/prisma";
import type { PaymentPurpose } from "@/generated/prisma/enums";
import { getPaymentProvider, hmacHex, MOCK_SECRET } from "./provider";
import { onFelicitationPaid, onFelicitationPaymentFailed, markEntryPaymentPending } from "@/lib/felicitation/service";

export const MEMBERSHIP_PRICE_RUPEES = Number(process.env.MEMBERSHIP_PRICE_RUPEES ?? 10);
export const MEMBERSHIP_DAYS = 30;

export class PaymentsNotConfigured extends Error {
  constructor() {
    super("Online payments are not configured yet.");
  }
}

export interface CheckoutInfo {
  provider: "razorpay" | "mock";
  keyId: string;
  orderId: string;
  amountPaise: number;
  currency: string;
}

export async function createCheckout(input: { purpose: PaymentPurpose; amountRupees: number; userId?: string | null; felicitationEntryId?: string | null; receipt: string }): Promise<CheckoutInfo> {
  const provider = getPaymentProvider();
  if (!provider) throw new PaymentsNotConfigured();
  // Reuse an open order for the same thing instead of creating duplicates.
  const open = await prisma.payment.findFirst({
    where: { purpose: input.purpose, status: "CREATED", provider: provider.name, amountPaise: input.amountRupees * 100, ...(input.felicitationEntryId ? { felicitationEntryId: input.felicitationEntryId } : { userId: input.userId ?? undefined }), createdAt: { gt: new Date(Date.now() - 30 * 60_000) } },
    orderBy: { createdAt: "desc" },
  });
  if (open) return { provider: provider.name, keyId: provider.publicKey, orderId: open.orderId, amountPaise: open.amountPaise, currency: open.currency };
  if (input.felicitationEntryId) {
    const already = await prisma.payment.findFirst({ where: { felicitationEntryId: input.felicitationEntryId, status: "PAID" } });
    if (already) throw new Error("This entry has already been paid for.");
  }
  const order = await provider.createOrder({ amountPaise: input.amountRupees * 100, receipt: input.receipt, notes: { purpose: input.purpose } });
  await prisma.payment.create({ data: { provider: provider.name, purpose: input.purpose, orderId: order.orderId, amountPaise: order.amountPaise, currency: order.currency, userId: input.userId ?? null, felicitationEntryId: input.felicitationEntryId ?? null } });
  if (input.felicitationEntryId) await markEntryPaymentPending(input.felicitationEntryId);
  return { provider: provider.name, keyId: provider.publicKey, orderId: order.orderId, amountPaise: order.amountPaise, currency: order.currency };
}

export type ConfirmResult = { ok: true; alreadyPaid: boolean; paymentId: string; purpose: PaymentPurpose } | { ok: false; error: string };

/** The ONLY way a payment becomes PAID: a provider signature verified on
 * the server (checkout callback) or a verified webhook. Idempotent. */
export async function confirmPayment(input: { orderId: string; paymentId: string; signature?: string; viaWebhook?: boolean; amountPaise?: number }): Promise<ConfirmResult> {
  const provider = getPaymentProvider();
  if (!provider) return { ok: false, error: "Payments not configured." };
  const p = await prisma.payment.findUnique({ where: { orderId: input.orderId } });
  if (!p) return { ok: false, error: "Unknown order." };
  if (p.status === "PAID") return p.paymentId === input.paymentId ? { ok: true, alreadyPaid: true, paymentId: p.id, purpose: p.purpose } : { ok: false, error: "Order already paid with a different payment." };
  if (!input.viaWebhook && !(input.signature && provider.verifyPaymentSignature(input.orderId, input.paymentId, input.signature))) {
    return { ok: false, error: "Payment signature could not be verified." };
  }
  if (input.amountPaise !== undefined && input.amountPaise !== p.amountPaise) return { ok: false, error: "Amount mismatch." };
  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    const claimed = await tx.payment.updateMany({ where: { id: p.id, status: { not: "PAID" } }, data: { status: "PAID", paymentId: input.paymentId, paidAt: now, failureReason: null } });
    if (claimed.count === 0) return false;
    if (p.purpose === "MEMBERSHIP" && p.userId) {
      const u = await tx.user.findUniqueOrThrow({ where: { id: p.userId } });
      const base = u.membershipUntil && u.membershipUntil > now ? u.membershipUntil : now;
      await tx.user.update({ where: { id: u.id }, data: { membershipUntil: new Date(base.getTime() + MEMBERSHIP_DAYS * 86_400_000) } });
    }
    if (p.purpose === "FELICITATION" && p.felicitationEntryId) await onFelicitationPaid(p.felicitationEntryId, tx);
    return true;
  });
  return { ok: true, alreadyPaid: !result, paymentId: p.id, purpose: p.purpose };
}

export async function failPayment(orderId: string, reason: string) {
  const p = await prisma.payment.findUnique({ where: { orderId } });
  if (!p || p.status === "PAID") return;
  await prisma.payment.update({ where: { id: p.id }, data: { status: "FAILED", failureReason: reason.slice(0, 300) } });
  if (p.felicitationEntryId) await onFelicitationPaymentFailed(p.felicitationEntryId, reason);
}

/** Dev-only: simulates what Razorpay Checkout returns, signed with the
 * mock secret, so the same server-side verification runs. */
export function mockCheckoutResult(orderId: string) {
  if (getPaymentProvider()?.name !== "mock") throw new Error("Mock payments are disabled.");
  const paymentId = `mock_pay_${Date.now().toString(36)}`;
  return { orderId, paymentId, signature: hmacHex(MOCK_SECRET, `${orderId}|${paymentId}`) };
}
