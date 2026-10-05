import { MotionAnalysis } from "./types";
import { SafetyLevelKey } from "../types";

// Motion that procedural 2.5D cannot convincingly fake. Even then, a local
// I2V model is only used when one is available and licence-cleared.
const I2V_PATTERNS: [RegExp, string][] = [
  [/\b(collid(?:e|ed|ing)|collision|crash(?:ed)?|rammed)\b/i, "a physical collision"],
  [/\b(fell (?:from|off|into|down)|falling|tumbled)\b/i, "a fall"],
  [/\b(stampede|scuffle|brawl|clash(?:ed)?|mob)\b/i, "a complex crowd interaction"],
  [/\b(swept away|flood(?:ed|ing)?|waves?|torrent)\b/i, "fluid water movement"],
  [/\b(overturned|skidded|derailed|swerved)\b/i, "complex vehicle motion"],
  [/\b(chased|chasing|ran after|sprinted)\b/i, "a running chase"],
];
const CHARACTER_PATTERNS = /\b(walk(?:ed|ing)?|went|arrived|reached|ran|running|talk(?:ed|ing)?|said|told|gestur|turn(?:ed|ing)?|look(?:ed|ing)|wait(?:ed|ing)|cr(?:ied|ying)|holding|sat|stood|phone)\b/i;
const ENVIRONMENT_PATTERNS = /\b(rain|fog|mist|smoke|steam|train|traffic|crowd|river|wind|storm|snow|dust|market|station|highway)\b/i;

/**
 * MotionRequirementAnalyzer: decides whether a shot can be done in 2.5D
 * (the default, by far) or genuinely needs local image-to-video. Every
 * decision carries a human-readable reason and a confidence.
 */
export function analyzeMotion(input: {
  text: string;
  hasCharacters: boolean;
  safetyLevel: SafetyLevelKey;
  i2vAvailable: boolean;
  allowI2V?: boolean;
}): MotionAnalysis {
  const text = input.text;
  if (input.safetyLevel === "RESTRICTED") {
    return {
      decision: "STATIC_2_5D",
      reason: "Restricted scene: shown with a substitute visual; restricted events are never animated or generated as video.",
      confidence: 0.99,
      selectedRenderer: "engine25d",
    };
  }

  const i2vHits = I2V_PATTERNS.filter(([re]) => re.test(text)).map(([, label]) => label);
  if (i2vHits.length > 0 && input.hasCharacters) {
    const confidence = Math.min(0.95, 0.6 + 0.15 * i2vHits.length);
    const walk = /\b(ran|running|chased|sprinted|chasing)\b/i.test(text) ? "run" : undefined;
    if (input.safetyLevel === "SENSITIVE") {
      return { decision: "LOCAL_I2V_REQUIRED", reason: `Shot describes ${i2vHits.join(", ")}, but the scene is sensitive: kept in 2.5D with silhouettes (no generated video of sensitive events).`, confidence, selectedRenderer: "engine25d", walk };
    }
    if (input.i2vAvailable && input.allowI2V !== false) {
      return { decision: "LOCAL_I2V_REQUIRED", reason: `Shot describes ${i2vHits.join(", ")}, which procedural 2.5D cannot convincingly animate; a 3–5 s local I2V clip is generated from the 2.5D first frame.`, confidence, selectedRenderer: "i2v", walk };
    }
    return { decision: "LOCAL_I2V_REQUIRED", reason: `Shot describes ${i2vHits.join(", ")}; no licence-cleared local I2V model is enabled, so the 2.5D engine renders it with procedural motion.`, confidence, selectedRenderer: "engine25d", walk };
  }

  if (input.hasCharacters && CHARACTER_PATTERNS.test(text)) {
    const walk = /\b(ran|running)\b/i.test(text) ? "run" : /\b(walk(?:ed|ing)?|went|arrived|reached)\b/i.test(text) ? "walk" : undefined;
    return { decision: "CHARACTER_2_5D", reason: `Character action (${text.match(CHARACTER_PATTERNS)?.[0]}) is covered by procedural character motion (breathing, blinks, head/eye movement${walk ? ", walk cycle" : ""}).`, confidence: 0.85, selectedRenderer: "engine25d", walk };
  }
  if (ENVIRONMENT_PATTERNS.test(text)) {
    return { decision: "ENVIRONMENT_2_5D", reason: `Environment motion (${text.match(ENVIRONMENT_PATTERNS)?.[0]}) is covered by the particle, lighting and layer-motion systems.`, confidence: 0.8, selectedRenderer: "engine25d" };
  }
  return { decision: "STATIC_2_5D", reason: "Calm moment: camera movement, parallax and subtle life are enough.", confidence: 0.9, selectedRenderer: "engine25d" };
}
