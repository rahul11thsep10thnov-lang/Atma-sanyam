export type CameraMotion = "slow-zoom-in" | "slow-zoom-out" | "pan-left" | "pan-right" | "static";

export interface AnimateRequest {
  image: Buffer;
  prompt: string;
  motion: CameraMotion;
  durationSeconds: number;
  width: number;
  height: number;
  fps: number;
}

/**
 * Animates a scene still into motion. `rendersInline` providers (the local
 * Ken Burns animator) apply motion inside the final FFmpeg render instead of
 * producing a clip, so one still serves every language at any scene length.
 * External providers produce a clip once per scene; the renderer holds its
 * last frame when a language's narration runs longer (never speeding voice).
 */
export interface VideoProvider {
  readonly key: string;
  readonly rendersInline: boolean;
  isConfigured(): boolean;
  animate(request: AnimateRequest): Promise<{ video: Buffer }>;
}
