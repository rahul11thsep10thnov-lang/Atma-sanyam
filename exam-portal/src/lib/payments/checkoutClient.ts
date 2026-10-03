"use client";

import type { CheckoutInfo } from "@/lib/payments/service";
import { mockCheckoutAction, reportCheckoutFailureAction, verifyCheckoutAction } from "@/app/(public)/account/actions";

type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open(): void; on(evt: string, cb: (r: { error?: { description?: string } }) => void): void };
  }
}

function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load the payment window. Check your connection."));
    document.body.appendChild(s);
  });
}

export type CheckoutOutcome = { status: "paid" } | { status: "failed"; reason: string } | { status: "dismissed" };

/** Opens the provider's checkout. Success is reported to the server, which
 * verifies the signature — the browser never decides that a payment
 * succeeded. */
export async function runCheckout(c: CheckoutInfo, opts: { name: string; description: string; prefill?: { name?: string; contact?: string } }): Promise<CheckoutOutcome> {
  const verify = async (r: { orderId: string; paymentId: string; signature: string }): Promise<CheckoutOutcome> => {
    const v = await verifyCheckoutAction(r);
    return v.ok ? { status: "paid" } : { status: "failed", reason: v.error };
  };
  if (c.provider === "mock") {
    // Development only: OK = successful payment, Cancel = failed payment.
    if (!window.confirm(`MOCK PAYMENT (development)\n${opts.description}\nAmount: ₹${c.amountPaise / 100}\n\nOK = pay successfully, Cancel = payment fails`)) {
      await reportCheckoutFailureAction(c.orderId, "mock: declined");
      return { status: "failed", reason: "Payment failed (mock)." };
    }
    const m = await mockCheckoutAction(c.orderId);
    return m.ok ? verify(m) : { status: "failed", reason: m.error };
  }
  await loadRazorpay();
  return new Promise<CheckoutOutcome>((resolve) => {
    let settled = false;
    const rzp = new window.Razorpay!({
      key: c.keyId,
      order_id: c.orderId,
      amount: c.amountPaise,
      currency: c.currency,
      name: opts.name,
      description: opts.description,
      prefill: opts.prefill ?? {},
      theme: { color: "#6b3412" },
      handler: async (r: RazorpayResponse) => {
        settled = true;
        resolve(await verify({ orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature }));
      },
      modal: { ondismiss: () => !settled && resolve({ status: "dismissed" }) },
    });
    rzp.on("payment.failed", async (r) => {
      settled = true;
      const reason = r.error?.description ?? "Payment failed.";
      await reportCheckoutFailureAction(c.orderId, reason);
      resolve({ status: "failed", reason });
    });
    rzp.open();
  });
}
