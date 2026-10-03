import { describe, it, expect } from "vitest";
import { assertTransition, currentSlot, isEligible, timeStatus, InvalidFelicitationTransition } from "./state";

const t = (iso: string) => new Date(iso);

describe("felicitation state machine", () => {
  it("allows the documented flow and refuses shortcuts", () => {
    expect(() => assertTransition("DRAFT", "PAYMENT_PENDING")).not.toThrow();
    expect(() => assertTransition("PAYMENT_PENDING", "PAID_PENDING_APPROVAL")).not.toThrow();
    expect(() => assertTransition("PAID_PENDING_APPROVAL", "BROADCASTING")).not.toThrow();
    expect(() => assertTransition("DRAFT", "BROADCASTING")).toThrow(InvalidFelicitationTransition);
    expect(() => assertTransition("PAYMENT_FAILED", "APPROVED")).toThrow(InvalidFelicitationTransition);
    expect(() => assertTransition("PAYMENT_PENDING", "APPROVED")).toThrow(InvalidFelicitationTransition);
    expect(() => assertTransition("REJECTED", "BROADCASTING")).toThrow(InvalidFelicitationTransition);
  });
  it("derives time status", () => {
    expect(timeStatus(t("2027-01-01T10:00Z"), t("2027-01-02T10:00Z"), t("2027-01-01T09:00Z"))).toBe("SCHEDULED");
    expect(timeStatus(t("2027-01-01T10:00Z"), t("2027-01-02T10:00Z"), t("2027-01-01T10:00Z"))).toBe("BROADCASTING");
    expect(timeStatus(t("2027-01-01T10:00Z"), t("2027-01-02T10:00Z"), t("2027-01-02T10:00Z"))).toBe("EXPIRED");
  });
  it("eligibility needs paid + approved + live status + inside the window", () => {
    const base = { status: "BROADCASTING" as const, paymentStatus: "PAID", approvedAt: t("2027-01-01T09:00Z"), startAt: t("2027-01-01T10:00Z"), expiresAt: t("2027-01-02T10:00Z") };
    const now = t("2027-01-01T12:00Z");
    expect(isEligible(base, now)).toBe(true);
    expect(isEligible({ ...base, paymentStatus: "CREATED" }, now)).toBe(false);
    expect(isEligible({ ...base, approvedAt: null }, now)).toBe(false);
    expect(isEligible({ ...base, status: "PAUSED" }, now)).toBe(false);
    expect(isEligible({ ...base, status: "REJECTED" }, now)).toBe(false);
    expect(isEligible(base, t("2027-01-01T09:59Z"))).toBe(false);
    expect(isEligible(base, t("2027-01-02T10:00Z"))).toBe(false); // exactly 24 h later: gone
  });
  it("gives every visitor the same 7-second slot from server time", () => {
    const d = 7000;
    expect(currentSlot(4, 0, d)).toMatchObject({ index: 0, msLeft: 7000 });
    expect(currentSlot(4, 6999, d).index).toBe(0);
    expect(currentSlot(4, 7000, d).index).toBe(1);
    expect(currentSlot(4, 27_999, d).index).toBe(3);
    expect(currentSlot(4, 28_000, d).index).toBe(0); // A → B → C → D → A
    const a = currentSlot(3, 1_791_000_123_456, d);
    const b = currentSlot(3, 1_791_000_123_456, d);
    expect(a).toEqual(b);
    expect(currentSlot(0, 123, d).index).toBe(-1);
  });
});
