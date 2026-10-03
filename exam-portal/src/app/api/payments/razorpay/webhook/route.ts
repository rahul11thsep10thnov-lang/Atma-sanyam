import { NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payments/provider";
import { confirmPayment, failPayment } from "@/lib/payments/service";

/**
 * Razorpay webhook (configure in the Razorpay dashboard with events
 * payment.captured, order.paid, payment.failed and the secret in
 * RAZORPAY_WEBHOOK_SECRET). The raw body's HMAC is verified before
 * anything is read; processing is idempotent, so retries are safe.
 */
export async function POST(request: Request) {
  const provider = getPaymentProvider();
  if (!provider) return NextResponse.json({ error: "not configured" }, { status: 503 });
  const raw = await request.text();
  const sig = request.headers.get("x-razorpay-signature") ?? "";
  if (!sig || !provider.verifyWebhookSignature(raw, sig)) return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  let evt: { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string; amount?: number; error_description?: string } } } };
  try {
    evt = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const pay = evt.payload?.payment?.entity;
  if (!pay?.order_id || !pay.id) return NextResponse.json({ ok: true, ignored: true });
  if (evt.event === "payment.captured" || evt.event === "order.paid") {
    const r = await confirmPayment({ orderId: pay.order_id, paymentId: pay.id, viaWebhook: true, amountPaise: pay.amount });
    return NextResponse.json({ ok: r.ok, ...(r.ok ? {} : { error: r.error }) }, { status: r.ok ? 200 : 400 });
  }
  if (evt.event === "payment.failed") {
    await failPayment(pay.order_id, pay.error_description ?? "payment.failed");
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: true, ignored: true });
}
