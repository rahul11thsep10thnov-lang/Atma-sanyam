import { describe, it, expect } from "vitest";
import { deadlineInfo } from "./deadline";

const now = new Date("2027-01-10T09:30:00Z");

describe("deadlineInfo", () => {
  it("counts days left on calendar days, today being the last day", () => {
    expect(deadlineInfo(new Date("2027-01-10T00:00:00Z"), now)).toMatchObject({ state: "last-day", daysLeft: 0 });
    expect(deadlineInfo(new Date("2027-01-11T00:00:00Z"), now)).toMatchObject({ state: "closing", daysLeft: 1, label: "1 day left to apply" });
    expect(deadlineInfo(new Date("2027-01-17T00:00:00Z"), now)).toMatchObject({ state: "closing", daysLeft: 7 });
    expect(deadlineInfo(new Date("2027-01-18T00:00:00Z"), now)).toMatchObject({ state: "open", daysLeft: 8, label: "8 days left to apply" });
    expect(deadlineInfo(new Date("2027-01-09T00:00:00Z"), now)).toMatchObject({ state: "closed", daysLeft: -1 });
    expect(deadlineInfo(null, now)).toMatchObject({ state: "unknown", daysLeft: null });
  });
  it("gives a Hindi label too", () => {
    expect(deadlineInfo(new Date("2027-01-15T00:00:00Z"), now).labelHi).toBe("आवेदन के लिए 5 दिन शेष");
  });
});
