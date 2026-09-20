import { describe, expect, it } from "vitest";
import { JournalisticSafetyService } from "../src/modules/safety/JournalisticSafetyService";
import { ContentModerationService } from "../src/modules/safety/ContentModerationService";

describe("JournalisticSafetyService", () => {
  const service = new JournalisticSafetyService();

  it("flags an unhedged accusation as BLOCKING (spec §10 core rule)", () => {
    const flags = service.lint("Rahul murdered his brother over a property dispute.");
    expect(service.hasBlockingFlags(flags)).toBe(true);
    expect(flags.some((f) => f.rule === "UNHEDGED_ALLEGATION")).toBe(true);
  });

  it("does not flag a properly attributed allegation", () => {
    const flags = service.lint("Police have accused Rahul of murdering his brother during a property dispute.");
    expect(service.hasBlockingFlags(flags)).toBe(false);
  });

  it("does not flag a court-confirmed conviction", () => {
    const flags = service.lint("Rahul was convicted of murdering his brother after a two-year trial.");
    expect(service.hasBlockingFlags(flags)).toBe(false);
  });
});

describe("ContentModerationService", () => {
  const service = new ContentModerationService();

  it("blocks scripts containing a phone number", () => {
    const flags = service.moderate("Contact the family at 9876543210 for more details.", "FAMILY_DISPUTE");
    expect(service.hasBlockingFlags(flags)).toBe(true);
    expect(flags.some((f) => f.rule === "PHONE_NUMBER_PRESENT")).toBe(true);
  });

  it("blocks scripts mentioning a minor's exact age", () => {
    const flags = service.moderate("The 14-year-old daughter witnessed the incident.", "DOMESTIC_CONFLICT");
    expect(flags.some((f) => f.rule === "MINOR_MENTIONED" && f.severity === "BLOCKING")).toBe(true);
  });

  it("flags sensitive categories for human review without blocking", () => {
    const flags = service.moderate("A routine family dispute was reported.", "FAMILY_MURDER");
    expect(flags.some((f) => f.rule === "SENSITIVE_CATEGORY_REQUIRES_HUMAN_REVIEW")).toBe(true);
  });

  it("passes clean, non-sensitive text with no flags", () => {
    const flags = service.moderate("Two brothers disputed a boundary wall and reached a compromise.", "NEIGHBOUR_DISPUTE");
    expect(flags).toHaveLength(0);
  });
});
