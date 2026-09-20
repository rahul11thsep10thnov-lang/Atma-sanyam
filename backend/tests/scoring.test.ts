import { describe, expect, it } from "vitest";
import { scoreSuitability } from "../src/modules/scoring/SuitabilityScorer";
import { scoreQuality } from "../src/modules/scoring/QualityScorer";
import { ExtractedStory } from "../src/modules/extraction/StoryExtractor";

function makeExtracted(overrides: Partial<ExtractedStory> = {}): ExtractedStory {
  return {
    title: "Property dispute between brothers in Prayagraj turns violent",
    eventType: "PROPERTY_INHERITANCE",
    eventDate: null,
    state: "Uttar Pradesh",
    district: "Prayagraj",
    city: null,
    peopleInvolved: [],
    relationships: [],
    whatHappened: "A long dispute over ancestral property escalated into violence.",
    background: "The dispute has been ongoing since 2021.",
    policeAction: "Police have registered a case and arrested one brother.",
    legalStatus: "A civil suit over the property remains pending.",
    currentStatus: "The injured brother is reported to be in stable condition.",
    presentElementCount: 9,
    presentElements: ["what", "who", "where", "when", "cause", "sequence", "police_legal", "current_status", "background"],
    ...overrides,
  };
}

describe("scoreSuitability", () => {
  it("scores a fully-detailed, well-sourced story highly", () => {
    const result = scoreSuitability({
      extracted: makeExtracted(),
      totalSourceTextLength: 2000,
      sourceCount: 3,
    });
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.missingElements).toHaveLength(0);
  });

  it("scores a short, thin breaking-news stub low (must not be padded to pass)", () => {
    const result = scoreSuitability({
      extracted: makeExtracted({
        presentElementCount: 2,
        presentElements: ["what", "who"],
        background: null,
        policeAction: null,
        legalStatus: null,
        currentStatus: null,
      }),
      totalSourceTextLength: 90, // "Man arrested after family dispute. Police registered a case."
      sourceCount: 1,
    });
    expect(result.score).toBeLessThan(70);
  });

  it("never lets source-text volume alone substitute for missing explanatory elements", () => {
    // A long article that still only covers 2 of 9 elements should score
    // well below one covering all 9 — completeness dominates raw length.
    const thinButLong = scoreSuitability({
      extracted: makeExtracted({ presentElementCount: 2, presentElements: ["what", "who"] }),
      totalSourceTextLength: 5000,
      sourceCount: 1,
    });
    const complete = scoreSuitability({ extracted: makeExtracted(), totalSourceTextLength: 2000, sourceCount: 1 });
    expect(complete.score).toBeGreaterThan(thinButLong.score);
  });
});

describe("scoreQuality", () => {
  it("computes the 5-factor rubric additively and caps at 100", () => {
    const result = scoreQuality({
      familyRelevanceScore: 100,
      informationCompletenessScore: 100,
      sourceCount: 5,
      hasPoliceOrLegalDevelopment: true,
      hasCurrentStatusUpdate: true,
      averageSourceReliability: 100,
      videoSuitabilityScore: 100,
    });
    expect(result.familyRelevance).toBe(25);
    expect(result.informationCompleteness).toBe(25);
    expect(result.storyDevelopment).toBe(20);
    expect(result.sourceReliability).toBe(15);
    expect(result.videoSuitability).toBe(15);
    expect(result.total).toBe(100);
  });

  it("penalizes a single-source, undeveloped story even with high relevance", () => {
    const result = scoreQuality({
      familyRelevanceScore: 90,
      informationCompletenessScore: 40,
      sourceCount: 1,
      hasPoliceOrLegalDevelopment: false,
      hasCurrentStatusUpdate: false,
      averageSourceReliability: 50,
      videoSuitabilityScore: 30,
    });
    expect(result.total).toBeLessThan(70);
  });
});
