import { WritingSpeed } from "../types";

/**
 * A single progress function drives both the SVG stroke-dashoffset reveal
 * (formulas/arrows/circles/underlines) and the plain-text character reveal,
 * so both feel like one consistent "hand speed" (docs/VIDEO_RENDERING.md
 * "Handwriting effect") rather than two different effects.
 */
const SPEED_MULTIPLIER: Record<WritingSpeed, number> = {
  realistic: 0.85,
  medium: 1.0,
  fast: 1.6,
};

export function writingProgress(
  frame: number,
  fps: number,
  startMs: number,
  durationMs: number,
  writingSpeed: WritingSpeed
): number {
  const nowMs = (frame / fps) * 1000;
  const effectiveDurationMs = Math.max(1, durationMs / SPEED_MULTIPLIER[writingSpeed]);
  const elapsed = nowMs - startMs;
  if (elapsed <= 0) return 0;
  if (elapsed >= effectiveDurationMs) return 1;
  return elapsed / effectiveDurationMs;
}

/** Reveals whole words progressively rather than one character at a time,
 * which reads more like natural handwriting pacing than a typewriter. */
export function revealedText(text: string, progress: number): string {
  if (progress >= 1) return text;
  if (progress <= 0) return "";
  const words = text.split(" ");
  const revealCount = Math.max(1, Math.round(words.length * progress));
  return words.slice(0, revealCount).join(" ");
}
