import { MAX_VIDEO_SECONDS, PAUSE_AFTER_SCENE_SECONDS, PAUSE_BEFORE_SCENE_SECONDS, PAUSE_BETWEEN_LINES_SECONDS, SCENE_MIN_SECONDS } from "../config";

export interface TimelineSegmentInput {
  sceneNumber: number;
  lineIndex: number; // 0 = narration, 1.. = dialogue lines in order
  speakerKey: string;
  durationSeconds: number;
  text: string;
}

export interface PlacedSegment extends TimelineSegmentInput {
  startSeconds: number;
  track: "NARRATION" | "DIALOGUE";
}

export interface TimelineScene {
  sceneNumber: number;
  startSeconds: number;
  durationSeconds: number;
}

export interface LanguageTimeline {
  languageCode: string;
  scenes: TimelineScene[];
  segments: PlacedSegment[];
  totalSeconds: number;
  overLimit: boolean;
}

/** Minimum time a scene needs in one language: its lines, played in order, with natural pauses. */
export function sceneSpeechSeconds(segments: TimelineSegmentInput[]): number {
  if (segments.length === 0) return 0;
  const speech = segments.reduce((s, x) => s + x.durationSeconds, 0);
  return PAUSE_BEFORE_SCENE_SECONDS + speech + PAUSE_BETWEEN_LINES_SECONDS * (segments.length - 1) + PAUSE_AFTER_SCENE_SECONDS;
}

/**
 * Stages: AUDIO TIMELINE + AUDIO/VIDEO SYNC. Lays the synthesised lines of
 * each scene end-to-end with natural pauses and sets each scene's length to
 * fit its speech (never shorter than the scene's visual floor). Speech is
 * never sped up: a longer language simply holds each scene's animation
 * longer. `sceneFloors` lets several languages share one common timeline
 * (multi-audio package): pass the per-scene maximum across languages.
 */
export function buildLanguageTimeline(
  languageCode: string,
  sceneNumbers: number[],
  segments: TimelineSegmentInput[],
  sceneFloors: Record<number, number> = {}
): LanguageTimeline {
  const scenes: TimelineScene[] = [];
  const placed: PlacedSegment[] = [];
  let cursor = 0;

  for (const sceneNumber of sceneNumbers) {
    const lines = segments.filter((s) => s.sceneNumber === sceneNumber).sort((a, b) => a.lineIndex - b.lineIndex);
    const needed = sceneSpeechSeconds(lines);
    const duration = Math.max(needed, SCENE_MIN_SECONDS, sceneFloors[sceneNumber] ?? 0);
    // Centre speech slightly early in a held scene so it never starts late after a transition.
    let t = cursor + PAUSE_BEFORE_SCENE_SECONDS + Math.max(0, (duration - needed) * 0.25);
    for (const line of lines) {
      placed.push({ ...line, startSeconds: round(t), track: line.lineIndex === 0 ? "NARRATION" : "DIALOGUE" });
      t += line.durationSeconds + PAUSE_BETWEEN_LINES_SECONDS;
    }
    scenes.push({ sceneNumber, startSeconds: round(cursor), durationSeconds: round(duration) });
    cursor += duration;
  }
  const totalSeconds = round(cursor);
  return { languageCode, scenes, segments: placed, totalSeconds, overLimit: totalSeconds > MAX_VIDEO_SECONDS };
}

/** Per-scene maximum across languages — the shared master timeline for a multi-audio package. */
export function commonSceneFloors(timelines: LanguageTimeline[]): Record<number, number> {
  const floors: Record<number, number> = {};
  for (const tl of timelines) for (const s of tl.scenes) floors[s.sceneNumber] = Math.max(floors[s.sceneNumber] ?? 0, s.durationSeconds);
  return floors;
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
