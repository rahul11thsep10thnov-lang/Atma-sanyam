import { describe, it, expect } from "vitest";
import { normalizeIndianMobile, maskMobile } from "./phone";
import { encryptField, decryptField } from "./security/crypto";

describe("Indian mobile validation", () => {
  it("accepts common formats and rejects invalid numbers", () => {
    for (const ok of ["9876543210", "+91 98765 43210", "09876543210", "91-9876543210", "6000000000"]) expect(normalizeIndianMobile(ok)).toMatch(/^\+91[6-9]\d{9}$/);
    for (const bad of ["5876543210", "987654321", "98765432101", "abcdefghij", "", "+1 9876543210"]) expect(normalizeIndianMobile(bad)).toBeNull();
    expect(maskMobile("+919876543210")).toBe("98XXXXXX10");
  });
  it("encrypts identity fields with authenticated encryption", () => {
    const c = encryptField("1234");
    expect(c).not.toContain("1234");
    expect(decryptField(c)).toBe("1234");
    const parts = c.split(".");
    parts[3] = Buffer.from("9999").toString("base64");
    expect(() => decryptField(parts.join("."))).toThrow();
    expect(encryptField("1234")).not.toBe(c); // random IV
  });
});
