import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * The site's single payment architecture. Razorpay in production
 * (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET / RAZORPAY_WEBHOOK_SECRET); a
 * "mock" provider for local development only (PAYMENT_PROVIDER=mock,
 * refused when NODE_ENV=production). Both verify with the same HMAC
 * scheme, so the verification path is identical.
 */
export interface CreatedOrder {
  orderId: string;
  amountPaise: number;
  currency: string;
}
export interface PaymentProvider {
  readonly name: "razorpay" | "mock";
  readonly publicKey: string;
  createOrder(input: { amountPaise: number; receipt: string; notes: Record<string, string> }): Promise<CreatedOrder>;
  verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean;
  verifyWebhookSignature(rawBody: string, signature: string): boolean;
}

export function hmacHex(secret: string, data: string) {
  return createHmac("sha256", secret).update(data).digest("hex");
}
function safeEqualHex(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export class RazorpayProvider implements PaymentProvider {
  readonly name = "razorpay" as const;
  constructor(readonly publicKey: string, private secret: string, private webhookSecret: string | undefined, private fetchImpl: typeof fetch = fetch) {}
  async createOrder(input: { amountPaise: number; receipt: string; notes: Record<string, string> }) {
    const res = await this.fetchImpl("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { authorization: "Basic " + Buffer.from(`${this.publicKey}:${this.secret}`).toString("base64"), "content-type": "application/json" },
      body: JSON.stringify({ amount: input.amountPaise, currency: "INR", receipt: input.receipt.slice(0, 40), notes: input.notes }),
    });
    if (!res.ok) throw new Error(`Razorpay order failed: HTTP ${res.status}`);
    const o = (await res.json()) as { id: string; amount: number; currency: string };
    return { orderId: o.id, amountPaise: o.amount, currency: o.currency };
  }
  verifyPaymentSignature(orderId: string, paymentId: string, signature: string) {
    return safeEqualHex(hmacHex(this.secret, `${orderId}|${paymentId}`), signature);
  }
  verifyWebhookSignature(rawBody: string, signature: string) {
    if (!this.webhookSecret) return false;
    return safeEqualHex(hmacHex(this.webhookSecret, rawBody), signature);
  }
}

export const MOCK_SECRET = "mock-payment-secret-dev-only";
export class MockProvider implements PaymentProvider {
  readonly name = "mock" as const;
  readonly publicKey = "mock_key";
  private n = 0;
  async createOrder(input: { amountPaise: number }) {
    this.n += 1;
    return { orderId: `mock_order_${Date.now().toString(36)}${this.n}${Math.random().toString(36).slice(2, 6)}`, amountPaise: input.amountPaise, currency: "INR" };
  }
  verifyPaymentSignature(orderId: string, paymentId: string, signature: string) {
    return safeEqualHex(hmacHex(MOCK_SECRET, `${orderId}|${paymentId}`), signature);
  }
  verifyWebhookSignature(rawBody: string, signature: string) {
    return safeEqualHex(hmacHex(MOCK_SECRET, rawBody), signature);
  }
}

let override: PaymentProvider | null | undefined;
let mockSingleton: MockProvider | null = null;
export function setPaymentProvider(p: PaymentProvider | null | undefined) {
  override = p;
}

export function getPaymentProvider(): PaymentProvider | null {
  if (override !== undefined) return override;
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (id && secret) return new RazorpayProvider(id, secret, process.env.RAZORPAY_WEBHOOK_SECRET);
  if (process.env.PAYMENT_PROVIDER === "mock" && process.env.NODE_ENV !== "production") return (mockSingleton ??= new MockProvider());
  return null;
}
