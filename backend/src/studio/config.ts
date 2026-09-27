import { env } from "../config/env";

/** Hard ceiling from the brief: a video may never exceed 5 minutes. */
export const MAX_VIDEO_SECONDS = 300;

export const FORMAT_LIMITS = {
  SHORT: { minSeconds: 60, maxSeconds: 180, defaultTarget: 150 },
  LONG: { minSeconds: 180, maxSeconds: 300, defaultTarget: 240 },
} as const;

export type StudioFormatKey = keyof typeof FORMAT_LIMITS;

/** Scene length bounds (brief §12: scenes of roughly 5–20 seconds). */
export const SCENE_MIN_SECONDS = 5;
export const SCENE_MAX_SECONDS = 20;

/** Silence added around spoken lines so speech never feels rushed. */
export const PAUSE_BEFORE_SCENE_SECONDS = 0.4;
export const PAUSE_AFTER_SCENE_SECONDS = 0.6;
export const PAUSE_BETWEEN_LINES_SECONDS = 0.35;

export const SUPPORTED_FPS = [24, 25, 30] as const;

export interface OutputSettings {
  width: number;
  height: number;
  fps: number;
}

export function resolveOutputSettings(resolution = env.studio.defaultResolution, fps = env.studio.defaultFps, orientation = env.studio.orientation): OutputSettings {
  const landscape = resolution === "720p" ? { width: 1280, height: 720 } : { width: 1920, height: 1080 };
  const dims = orientation === "portrait" ? { width: landscape.height, height: landscape.width } : landscape;
  const safeFps = (SUPPORTED_FPS as readonly number[]).includes(fps) ? fps : 25;
  return { ...dims, fps: safeFps };
}

export function clampTargetDuration(format: StudioFormatKey, requested?: number): number {
  const limits = FORMAT_LIMITS[format];
  const value = requested ?? limits.defaultTarget;
  return Math.min(Math.max(value, limits.minSeconds), Math.min(limits.maxSeconds, MAX_VIDEO_SECONDS));
}
