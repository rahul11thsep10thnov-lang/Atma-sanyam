import { describe, it, expect } from "vitest";
import { RazorpayProvider, hmacHex } from "./provider";

describe("Razorpay signature checks", () => {
  const p = new RazorpayProvider("rzp_test_key", "secret123", "whsec456");
  it("verifies checkout signatures as HMAC(order|payment) with the key secret", () => {
    const sig = hmacHex("secret123", "order_1|pay_1");
    expect(p.verifyPaymentSignature("order_1", "pay_1", sig)).toBe(true);
    expect(p.verifyPaymentSignature("order_1", "pay_2", sig)).toBe(false);
    expect(p.verifyPaymentSignature("order_1", "pay_1", "0".repeat(64))).toBe(false);
    expect(p.verifyPaymentSignature("order_1", "pay_1", "short")).toBe(false);
  });
  it("verifies webhooks against the raw body with the webhook secret only", () => {
    const body = JSON.stringify({ event: "payment.captured" });
    expect(p.verifyWebhookSignature(body, hmacHex("whsec456", body))).toBe(true);
    expect(p.verifyWebhookSignature(body + " ", hmacHex("whsec456", body))).toBe(false);
    expect(p.verifyWebhookSignature(body, hmacHex("secret123", body))).toBe(false);
    expect(new RazorpayProvider("k", "s", undefined).verifyWebhookSignature(body, hmacHex("", body))).toBe(false);
  });
});
