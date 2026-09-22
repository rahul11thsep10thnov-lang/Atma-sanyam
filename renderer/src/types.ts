/**
 * Hand-mirrored TypeScript types for the Teaching Plan JSON contract.
 * Source of truth is backend/app/schemas/lesson.py — see
 * docs/ARCHITECTURE.md for why this isn't codegen'd (yet).
 */

export type SceneType =
  | "SPEAK_ONLY"
  | "WRITE_ONLY"
  | "WRITE_AND_SPEAK"
  | "DIAGRAM"
  | "FORMULA"
  | "EMPHASIS"
  | "PAUSE"
  | "ERASE"
  | "HIGHLIGHT"
  | "CIRCLE"
  | "ARROW"
  | "ZOOM";

export type BoardActionType =
  | "write"
  | "write_formula"
  | "diagram"
  | "arrow"
  | "circle"
  | "rectangle"
  | "underline"
  | "highlight"
  | "erase"
  | "camera_zoom"
  | "camera_pan";

export type WritingSpeed = "realistic" | "medium" | "fast";
export type HandMode = "OFF" | "OCCASIONAL" | "CONTINUOUS";

export interface Position {
  x: number;
  y: number;
  width?: number | null;
  height?: number | null;
}

export interface Style {
  color: string;
  font_size: number;
  stroke_width: number;
  bold: boolean;
}

export interface BoardAction {
  action: BoardActionType;
  content: string;
  position: Position;
  style: Style;
  start_time_ms: number;
  duration_ms: number;
  target_action_id?: string | null;
}

export interface Scene {
  scene_id: string;
  type: SceneType;
  narration: string;
  board_actions: BoardAction[];
  pause_before_ms: number;
  pause_after_ms: number;
  emphasis: string[];
  hand_mode?: HandMode | null;
}

export interface SubtitleSettings {
  enabled: boolean;
  font: string;
  size: number;
  position: "bottom" | "top";
  burned_in: boolean;
}

export interface WhiteboardSettings {
  writing_speed: WritingSpeed;
  pause_between_words_ms: number;
  pause_between_lines_ms: number;
  hand_mode: HandMode;
}

export interface TeachingPlan {
  lesson_title: string;
  estimated_duration_seconds: number;
  learning_objectives: string[];
  scenes: Scene[];
  language: string;
  video_format: "1920x1080" | "1080x1920" | "1080x1080";
  fps: number;
  subtitles: SubtitleSettings;
  whiteboard: WhiteboardSettings;
  prompt_version: string;
}

export interface SceneTiming {
  startMs: number;
  durationMs: number;
  audioDurationMs: number;
  boardActionStartsMs: number[];
}

export interface WhiteboardLessonProps {
  plan: TeachingPlan;
  audio: Record<string, string>;
  timeline: Record<string, SceneTiming>;
  // Remotion's Composition<Schema, Props> requires Props to satisfy
  // Record<string, unknown>; this index signature is structural only.
  [key: string]: unknown;
}
