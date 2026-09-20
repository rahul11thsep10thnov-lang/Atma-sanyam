import { NewsSourceProvider, RawArticleDTO } from "./NewsSourceProvider";

/**
 * Deterministic offline provider used in development and tests so the
 * whole pipeline (ingestion → classification → dedup → scoring → script →
 * safety → publish) can be exercised without any real API keys. Includes a
 * deliberate mix of: a substantial family-dispute story (should pass), a
 * tiny breaking-news stub (should be rejected for insufficient info), a
 * near-duplicate of the substantial story from a "different outlet"
 * (should be merged), and an unrelated general-news story (should be
 * rejected as NOT_RELEVANT).
 */
export class MockProvider implements NewsSourceProvider {
  readonly key = "mock";
  readonly displayName = "Mock Provider (dev/test)";

  async fetchLatest(): Promise<RawArticleDTO[]> {
    const now = new Date();
    return [
      {
        externalId: "mock-1",
        url: "https://example-times.test/prayagraj-property-dispute",
        headline: "Property dispute between brothers in Prayagraj turns violent, one hospitalised",
        publishedAt: now,
        summary:
          "A long-running property dispute between two brothers, Ramesh Kumar (52) and Suresh Kumar (48), " +
          "escalated into a physical altercation on Tuesday evening at their ancestral home in Prayagraj's " +
          "Civil Lines area, police said. The dispute reportedly centres on the division of their late father's " +
          "residential property, which the brothers had been contesting in civil court for over three years. " +
          "According to the FIR filed at Civil Lines police station, Suresh Kumar allegedly assaulted his elder " +
          "brother with a wooden stick after an argument over a boundary wall construction. Ramesh Kumar was " +
          "admitted to a local hospital with head injuries and is reported to be in stable condition. Police " +
          "said Suresh Kumar has been taken into custody and a case has been registered under relevant sections " +
          "for voluntarily causing hurt. Neighbours told reporters that the two families, who live on opposite " +
          "sides of the same compound, had been in dispute since their father's death in 2021, with mediation " +
          "attempts by relatives and a local panchayat having failed earlier this year. The civil suit over the " +
          "property division remains pending before the district court, with the next hearing scheduled for " +
          "next month. Police said further legal action would depend on the outcome of the medical examination " +
          "and statements from both parties.",
        language: "en",
      },
      {
        externalId: "mock-2",
        url: "https://example-herald.test/brothers-fight-prayagraj",
        headline: "Two brothers injured in property fight in Prayagraj",
        publishedAt: now,
        summary:
          "Two brothers were injured on Tuesday following a dispute over ancestral property in Prayagraj's " +
          "Civil Lines locality, police said, corroborating an earlier report. The family has reportedly been " +
          "locked in a civil court dispute over the property since 2021.",
        language: "en",
      },
      {
        externalId: "mock-3",
        url: "https://example-wire.test/man-arrested-dispute",
        headline: "Man arrested after family dispute",
        publishedAt: now,
        summary: "Police registered a case after a family dispute was reported in the area.",
        language: "en",
      },
      {
        externalId: "mock-4",
        url: "https://example-times.test/stock-market-update",
        headline: "Sensex closes 200 points higher amid global cues",
        publishedAt: now,
        summary:
          "Indian benchmark indices closed higher on Tuesday tracking positive global cues, with the Sensex " +
          "gaining 200 points and the Nifty crossing a key resistance level, analysts said.",
        language: "en",
      },
    ];
  }
}
