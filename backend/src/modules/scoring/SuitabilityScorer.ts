import { ExtractedStory } from "../extraction/StoryExtractor";

const ALL_ELEMENTS = [
  "what",
  "who",
  "where",
  "when",
  "cause",
  "sequence",
  "police_legal",
  "current_status",
  "background",
] as const;

export interface SuitabilityInput {
  extracted: ExtractedStory;
  /** Combined character count of all corroborating sources' summaries. */
  totalSourceTextLength: number;
  /** Number of distinct corroborating sources attached to this story. */
  sourceCount: number;
}

export interface SuitabilityResult {
  score: number; // 0-100, STORY_VIDEO_SUITABILITY_SCORE
  presentElementCount: number;
  missingElements: string[];
  /** Naturally-supportable narration length estimate, used to reject stories that can't reach ~2 minutes without padding. */
  estimatedNarrationSeconds: number;
}

// Average spoken narration rate for the target languages, conservatively.
const WORDS_PER_MINUTE = 130;

/**
 * Computes STORY_VIDEO_SUITABILITY_SCORE (spec §2). This is deliberately
 * about whether the underlying story NATURALLY carries enough information
 * for a 2+ minute video — it must never be satisfied by repeating a short
 * story (spec §3). The estimatedNarrationSeconds figure is derived from
 * actual extracted factual content, not from a target we pad towards.
 */
export function scoreSuitability(input: SuitabilityInput): SuitabilityResult {
  const { extracted, totalSourceTextLength, sourceCount } = input;

  const missingElements = ALL_ELEMENTS.filter((el) => !extracted.presentElements.includes(el));
  const completenessRatio = extracted.presentElements.length / ALL_ELEMENTS.length;

  // Rough words-available estimate: source text length in characters / ~6 chars per word,
  // scaled down because a script is a condensed retelling, not a verbatim reading.
  const estimatedSourceWords = totalSourceTextLength / 6;
  const estimatedScriptWords = estimatedSourceWords * 0.6;
  const estimatedNarrationSeconds = Math.round((estimatedScriptWords / WORDS_PER_MINUTE) * 60);

  const completenessScore = completenessRatio * 60; // up to 60 points
  const lengthScore = Math.min(30, (estimatedNarrationSeconds / 120) * 30); // up to 30 points, saturates at 2 minutes' worth of material
  const corroborationScore = Math.min(10, sourceCount * 3); // up to 10 points for multi-source corroboration

  const score = Math.round(Math.min(100, completenessScore + lengthScore + corroborationScore));

  return {
    score,
    presentElementCount: extracted.presentElements.length,
    missingElements,
    estimatedNarrationSeconds,
  };
}
