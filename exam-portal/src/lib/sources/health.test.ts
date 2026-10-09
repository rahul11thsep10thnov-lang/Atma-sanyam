import { describe, it, expect } from "vitest";
import { sourceHealth, computeNextCheck, isDue, blockedPauseMs, DAY_MS } from "./health";

const now = new Date("2026-10-09T12:00:00Z");
const minsAgo = (m: number) => new Date(now.getTime() - m * 60_000);
const base = { active: true, approvalStatus: "APPROVED", checkFrequencyMinutes: 60, lastError: null, consecutiveFailures: 0, blockedUntil: null };

describe("sourceHealth", () => {
  it("HTTP 200 with nothing extracted is NOT healthy", () => {
    expect(sourceHealth({ ...base, lastCheckedAt: minsAgo(5), lastSuccessAt: minsAgo(5), lastExtractionAt: null, lastOutcome: "EMPTY", lastError: "no links" }, now)).toBe("attention");
    expect(sourceHealth({ ...base, lastCheckedAt: minsAgo(5), lastSuccessAt: minsAgo(5), lastExtractionAt: minsAgo(500), lastOutcome: "PARSE_ERROR" }, now)).toBe("attention");
  });

  it("healthy only after a successful extraction within three intervals", () => {
    expect(sourceHealth({ ...base, lastCheckedAt: minsAgo(5), lastSuccessAt: minsAgo(5), lastExtractionAt: minsAgo(5), lastOutcome: "OK" }, now)).toBe("healthy");
    expect(sourceHealth({ ...base, lastCheckedAt: minsAgo(5), lastSuccessAt: minsAgo(5), lastExtractionAt: minsAgo(5), lastOutcome: "NOT_MODIFIED" }, now)).toBe("healthy");
    expect(sourceHealth({ ...base, lastCheckedAt: minsAgo(5), lastSuccessAt: minsAgo(5), lastExtractionAt: minsAgo(200), lastOutcome: "UNCHANGED" }, now)).toBe("stale");
  });

  it("blocked, failing, disabled, pending and never", () => {
    expect(sourceHealth({ ...base, lastCheckedAt: minsAgo(5), lastSuccessAt: null, lastOutcome: "BLOCKED", blockedUntil: new Date(now.getTime() + DAY_MS) }, now)).toBe("blocked");
    expect(sourceHealth({ ...base, lastCheckedAt: minsAgo(5), lastSuccessAt: minsAgo(90), lastExtractionAt: minsAgo(90), lastOutcome: "NETWORK", lastError: "reset" }, now)).toBe("failing");
    expect(sourceHealth({ ...base, active: false, lastCheckedAt: null, lastSuccessAt: null }, now)).toBe("disabled");
    expect(sourceHealth({ ...base, approvalStatus: "PENDING", lastCheckedAt: null, lastSuccessAt: null }, now)).toBe("pending");
    expect(sourceHealth({ ...base, lastCheckedAt: null, lastSuccessAt: null }, now)).toBe("never");
  });

  it("legacy rows without an outcome keep the old rules", () => {
    expect(sourceHealth({ ...base, lastCheckedAt: minsAgo(5), lastSuccessAt: minsAgo(5), lastError: null }, now)).toBe("healthy");
    expect(sourceHealth({ ...base, lastCheckedAt: minsAgo(5), lastSuccessAt: minsAgo(60), lastError: "boom" }, now)).toBe("failing");
  });
});

describe("scheduling", () => {
  it("success → one interval (±10 % jitter)", () => {
    const at = (r: number) => computeNextCheck({ now, frequencyMinutes: 240, ok: true, consecutiveFailures: 0, random: () => r }).getTime() - now.getTime();
    expect(at(0.5)).toBe(240 * 60_000);
    expect(at(0)).toBe(0.9 * 240 * 60_000);
    expect(at(1)).toBe(1.1 * 240 * 60_000);
  });

  it("failures back off exponentially, at least 15 min, at most a day", () => {
    const delay = (n: number, freq = 30) => computeNextCheck({ now, frequencyMinutes: freq, ok: false, consecutiveFailures: n, random: () => 0.5 }).getTime() - now.getTime();
    expect(delay(1)).toBe(30 * 60_000);
    expect(delay(2)).toBe(60 * 60_000);
    expect(delay(3)).toBe(120 * 60_000);
    expect(delay(20)).toBe(DAY_MS);
    expect(delay(1, 5)).toBe(15 * 60_000);
  });

  it("a block (403 / Retry-After) wins over the normal schedule", () => {
    const blockedUntil = new Date(now.getTime() + 3 * DAY_MS);
    expect(computeNextCheck({ now, frequencyMinutes: 30, ok: false, consecutiveFailures: 1, blockedUntil, random: () => 0.5 })).toEqual(blockedUntil);
    expect(blockedPauseMs(1)).toBe(DAY_MS);
    expect(blockedPauseMs(2)).toBe(2 * DAY_MS);
    expect(blockedPauseMs(9)).toBe(7 * DAY_MS);
  });

  it("isDue respects approval, the switch, blocks and nextCheckAt", () => {
    const s = { active: true, approvalStatus: "APPROVED", nextCheckAt: minsAgo(1), lastCheckedAt: minsAgo(60), checkFrequencyMinutes: 30, blockedUntil: null };
    expect(isDue(s, now)).toBe(true);
    expect(isDue({ ...s, nextCheckAt: new Date(now.getTime() + 60_000) }, now)).toBe(false);
    expect(isDue({ ...s, approvalStatus: "PENDING" }, now)).toBe(false);
    expect(isDue({ ...s, active: false }, now)).toBe(false);
    expect(isDue({ ...s, blockedUntil: new Date(now.getTime() + 60_000) }, now)).toBe(false);
    expect(isDue({ ...s, nextCheckAt: null, lastCheckedAt: minsAgo(31) }, now)).toBe(true);
  });
});
