/**
 * Implements the §13 scoring rubric:
 *   Family relevance             0-25
 *   Information completeness     0-25
 *   Story development            0-20
 *   Source reliability           0-15
 *   Video suitability            0-15
 *   ------------------------------------
 *   TOTAL                       100
 */
export interface QualityScoreInput {
  /** 0-100 from FamilyClassifier */
  familyRelevanceScore: number;
  /** 0-100 completeness ratio-derived score from SuitabilityScorer (presentElementCount / total) */
  informationCompletenessScore: number;
  /** Number of distinct corroborating sources attached (StorySource rows) */
  sourceCount: number;
  /** Whether policeAction/legalStatus/currentStatus fields are populated (story has "developed" beyond a bare report) */
  hasPoliceOrLegalDevelopment: boolean;
  hasCurrentStatusUpdate: boolean;
  /** Average NewsSource.reliabilityScore (0-100) across attached sources */
  averageSourceReliability: number;
  /** 0-100 from SuitabilityScorer */
  videoSuitabilityScore: number;
}

export interface QualityScoreBreakdown {
  familyRelevance: number;
  informationCompleteness: number;
  storyDevelopment: number;
  sourceReliability: number;
  videoSuitability: number;
  total: number;
}

export function scoreQuality(input: QualityScoreInput): QualityScoreBreakdown {
  const familyRelevance = round(pct(input.familyRelevanceScore) * 25);
  const informationCompleteness = round(pct(input.informationCompletenessScore) * 25);

  let storyDevelopment = Math.min(10, input.sourceCount * 5); // up to 10 for multi-source corroboration
  if (input.hasPoliceOrLegalDevelopment) storyDevelopment += 5;
  if (input.hasCurrentStatusUpdate) storyDevelopment += 5;
  storyDevelopment = Math.min(20, storyDevelopment);

  const sourceReliability = round(pct(input.averageSourceReliability) * 15);
  const videoSuitability = round(pct(input.videoSuitabilityScore) * 15);

  const total = familyRelevance + informationCompleteness + storyDevelopment + sourceReliability + videoSuitability;

  return {
    familyRelevance,
    informationCompleteness,
    storyDevelopment: round(storyDevelopment),
    sourceReliability,
    videoSuitability,
    total: Math.min(100, total),
  };
}

function pct(score0to100: number): number {
  return Math.max(0, Math.min(100, score0to100)) / 100;
}

function round(n: number): number {
  return Math.round(n);
}
