import { describe, expect, it } from "vitest";
import { RuleBasedClassifier } from "../src/modules/classification/RuleBasedClassifier";

describe("RuleBasedClassifier", () => {
  const classifier = new RuleBasedClassifier();

  it("classifies a property dispute between brothers correctly", async () => {
    const result = await classifier.classify({
      headline: "Property dispute between brothers in Prayagraj turns violent",
      summary: "A long-running dispute over ancestral property escalated into violence between two brothers.",
    });
    expect(result.primaryCategory).toBe("PROPERTY_INHERITANCE");
    expect(result.familyRelevanceScore).toBeGreaterThan(50);
  });

  it("rejects unrelated general news as NOT_RELEVANT", async () => {
    const result = await classifier.classify({
      headline: "Sensex closes 200 points higher amid global cues",
      summary: "Indian benchmark indices closed higher on Tuesday tracking positive global cues.",
    });
    expect(result.primaryCategory).toBe("NOT_RELEVANT");
    expect(result.familyRelevanceScore).toBeLessThan(15);
  });

  it("classifies domestic violence reports distinctly from generic disputes", async () => {
    const result = await classifier.classify({
      headline: "Woman alleges domestic violence and dowry harassment by husband's family",
      summary: "Police have registered a case of domestic violence and dowry harassment.",
    });
    expect(result.primaryCategory).toBe("DOMESTIC_CONFLICT");
  });

  it("classifies husband-wife disputes", async () => {
    const result = await classifier.classify({
      headline: "Husband and wife dispute leads to divorce filing",
      summary: "The couple has filed for divorce following a prolonged marital dispute.",
    });
    expect(result.primaryCategory).toBe("HUSBAND_WIFE");
  });
});
