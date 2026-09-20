import { describe, expect, it } from "vitest";
import { textSimilarity, datesWithin } from "../src/modules/dedup/similarity";

describe("textSimilarity", () => {
  it("scores near-duplicate headlines from different outlets highly", () => {
    const a = "Property dispute between brothers in Prayagraj turns violent, one hospitalised";
    const b = "Two brothers injured in property fight in Prayagraj";
    expect(textSimilarity(a, b)).toBeGreaterThan(0.15);
  });

  it("scores unrelated headlines low", () => {
    const a = "Property dispute between brothers in Prayagraj turns violent";
    const b = "Sensex closes 200 points higher amid global cues";
    expect(textSimilarity(a, b)).toBeLessThan(0.1);
  });

  it("returns 0 for empty text", () => {
    expect(textSimilarity("", "something")).toBe(0);
  });
});

describe("datesWithin", () => {
  it("treats missing dates as a neutral (non-disqualifying) match", () => {
    expect(datesWithin(null, new Date(), 5)).toBe(true);
  });

  it("matches dates within the window", () => {
    const a = new Date("2024-01-01T00:00:00Z");
    const b = new Date("2024-01-03T00:00:00Z");
    expect(datesWithin(a, b, 5)).toBe(true);
  });

  it("rejects dates outside the window", () => {
    const a = new Date("2024-01-01T00:00:00Z");
    const b = new Date("2024-02-01T00:00:00Z");
    expect(datesWithin(a, b, 5)).toBe(false);
  });
});
