import { MAX_VIDEO_SECONDS, PAUSE_AFTER_SCENE_SECONDS, PAUSE_BEFORE_SCENE_SECONDS, PAUSE_BETWEEN_LINES_SECONDS, SCENE_MAX_SECONDS, SCENE_MIN_SECONDS } from "../config";
import { estimateSpeechSeconds } from "../language/languageProfiles";

export interface SceneTextLike {
  narratorText: string;
  dialogue: { text: string }[];
}

/** Planned seconds for one scene: speech + natural pauses, within scene bounds. */
export function estimateSceneSeconds(scene: SceneTextLike, languageCode: string): number {
  const lines = [scene.narratorText, ...scene.dialogue.map((d) => d.text)].filter((t) => t.trim());
  const speech = lines.reduce((sum, line) => sum + estimateSpeechSeconds(line, languageCode), 0);
  const pauses = PAUSE_BEFORE_SCENE_SECONDS + PAUSE_AFTER_SCENE_SECONDS + Math.max(0, lines.length - 1) * PAUSE_BETWEEN_LINES_SECONDS;
  return Math.min(Math.max(speech + pauses, SCENE_MIN_SECONDS), Math.max(SCENE_MAX_SECONDS, speech + pauses));
}

export function estimateScriptSeconds(scenes: SceneTextLike[], languageCode: string): number {
  return scenes.reduce((sum, s) => sum + estimateSceneSeconds(s, languageCode), 0);
}

export interface PlannedSentence {
  text: string;
  /** Sentences carrying a key fact (names, dates, ages, amounts, allegations, official statements) are never dropped. */
  isKey: boolean;
  /** Lower = dropped first among non-key sentences. */
  priority: number;
}

export interface CompressionResult {
  kept: PlannedSentence[];
  dropped: PlannedSentence[];
  estimatedSeconds: number;
  fits: boolean;
}

/**
 * Fact-preserving compression. When the narration would exceed the
 * limit, non-key sentences are removed lowest-priority first (claims and
 * colour before events). Key-fact sentences are never removed; if the
 * key facts alone don't fit, `fits` is false and the story is routed to
 * admin review rather than silently truncated. The 5-minute ceiling is
 * absolute; the voice is never sped up to make things fit.
 */
export function compressToFit(sentences: PlannedSentence[], maxSeconds: number, languageCode: string, overheadSeconds = 0): CompressionResult {
  const limit = Math.min(maxSeconds, MAX_VIDEO_SECONDS);
  const estimate = (list: PlannedSentence[]) => list.reduce((s, x) => s + estimateSpeechSeconds(x.text, languageCode) + PAUSE_BETWEEN_LINES_SECONDS, 0) + overheadSeconds;

  const kept = [...sentences];
  const dropped: PlannedSentence[] = [];
  const candidates = sentences
    .map((s, index) => ({ s, index }))
    .filter(({ s }) => !s.isKey)
    .sort((a, b) => a.s.priority - b.s.priority || b.index - a.index);

  for (const { s } of candidates) {
    if (estimate(kept) <= limit) break;
    kept.splice(kept.indexOf(s), 1);
    dropped.push(s);
  }
  const estimatedSeconds = estimate(kept);
  return { kept, dropped, estimatedSeconds, fits: estimatedSeconds <= limit };
}
