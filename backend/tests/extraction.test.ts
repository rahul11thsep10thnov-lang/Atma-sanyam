import { describe, expect, it } from "vitest";
import { RuleBasedStoryExtractor } from "../src/modules/extraction/RuleBasedStoryExtractor";

describe("RuleBasedStoryExtractor", () => {
  const extractor = new RuleBasedStoryExtractor();

  it("extracts location and multiple explanatory elements from a detailed article", async () => {
    const result = await extractor.extract({
      headline: "Property dispute between brothers in Prayagraj turns violent, one hospitalised",
      summary:
        "A long-running property dispute between two brothers escalated into a physical altercation on Tuesday " +
        "at their home in Prayagraj. Police said a case has been registered and one brother was arrested. " +
        "The families had been in dispute since 2021. The injured brother is reported to be in stable condition.",
      category: "PROPERTY_INHERITANCE",
    });

    expect(result.state).toBe("Uttar Pradesh");
    expect(result.district).toBe("Prayagraj");
    expect(result.presentElementCount).toBeGreaterThanOrEqual(6);
    expect(result.policeAction).not.toBeNull();
    expect(result.currentStatus).not.toBeNull();
  });

  it("extracts very few elements from a thin breaking-news stub", async () => {
    const result = await extractor.extract({
      headline: "Man arrested after family dispute",
      summary: "Police registered a case after a family dispute was reported in the area.",
      category: "FAMILY_DISPUTE",
    });

    expect(result.presentElementCount).toBeLessThanOrEqual(4);
  });
});
