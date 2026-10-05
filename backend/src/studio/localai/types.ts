import { AiModel } from "@prisma/client";

/**
 * Local AI provider contracts. Every model runs on infrastructure we control
 * (ComfyUI or the internal inference API on GPU workers, or the built-in
 * procedural fallbacks). Commercial hosted APIs are not part of this layer.
 */

export interface Provenance {
  generator: string; // adapter key: procedural | comfyui | http-inference
  modelId: string;
  modelVersion: string;
  license: string;
  commercialUse: boolean;
  seed: number;
  parameters: Record<string, unknown>;
  durationMs: number;
  gpuWorkerId?: string;
}

export interface OutputFile {
  name: string;
  data: Buffer;
  contentType: string;
}

export type AssetRole = "background" | "midground" | "foreground" | "character" | "prop";

export interface SceneAssetRequest {
  role: AssetRole;
  prompt: string;
  negativePrompt: string;
  width: number;
  height: number;
  seed: number;
  style: string;
  /** Transparent output (characters, props, midground/foreground elements). */
  transparent: boolean;
  /** Identity / style references for continuity (character sheets, location plates). */
  references?: { kind: "character" | "location" | "style"; path: string; weight?: number }[];
  /** Structured hints the procedural painter uses (environment painter, character look, prop painter). */
  painterHint?: Record<string, unknown>;
  jobId?: string;
  signal?: AbortSignal;
}

export interface GeneratedSceneAsset {
  kind: "image" | "rig";
  files: OutputFile[];
  /** File name of the primary output (image.png or rig.json). */
  primary: string;
  width: number;
  height: number;
  hasAlpha: boolean;
  isPlaceholder: boolean;
  /** Optional depth map produced alongside the image (grey PNG, white = near). */
  depthFile?: string;
  metadata: Record<string, unknown>;
  provenance: Provenance;
}

export interface LocalImageProvider {
  readonly key: string;
  generateSceneAsset(req: SceneAssetRequest, model: AiModel): Promise<GeneratedSceneAsset>;
}

export interface SegmentationRequest {
  image: Buffer; // PNG/JPEG
  /** What to keep: the main subject (character/prop) or everything in front of the background plate. */
  mode: "subject" | "foreground";
  prompt?: string;
  seed?: number;
  jobId?: string;
  signal?: AbortSignal;
}

export interface SegmentationResult {
  mask: Buffer; // grey PNG, white = keep
  cutout: Buffer; // RGBA PNG
  width: number;
  height: number;
  coverage: number; // fraction of pixels kept
  provenance: Provenance;
}

export interface LocalSegmentationProvider {
  readonly key: string;
  segment(req: SegmentationRequest, model: AiModel): Promise<SegmentationResult>;
}

export interface DepthRequest {
  image: Buffer;
  role?: AssetRole;
  /** Metadata from the generator (e.g. horizon/ground lines) that a heuristic estimator can use. */
  hints?: Record<string, unknown>;
  jobId?: string;
  signal?: AbortSignal;
}

export interface DepthResult {
  depth: Buffer; // grey PNG, white = near
  width: number;
  height: number;
  provenance: Provenance;
}

export interface LocalDepthProvider {
  readonly key: string;
  estimate(req: DepthRequest, model: AiModel): Promise<DepthResult>;
}

export interface InpaintRequest {
  image: Buffer;
  mask: Buffer; // grey PNG, white = fill
  prompt?: string;
  seed?: number;
  jobId?: string;
  signal?: AbortSignal;
}

export interface InpaintResult {
  image: Buffer;
  width: number;
  height: number;
  provenance: Provenance;
}

export interface LocalInpaintingProvider {
  readonly key: string;
  inpaint(req: InpaintRequest, model: AiModel): Promise<InpaintResult>;
}

export interface ImageToVideoRequest {
  image: Buffer; // first frame (the shot's composed key frame)
  prompt: string;
  negativePrompt: string;
  durationSeconds: number; // 3..5
  fps: number;
  width: number;
  height: number;
  seed: number;
  motionStrength?: number;
  jobId?: string;
  signal?: AbortSignal;
}

export interface ImageToVideoResult {
  /** MP4 (H.264) clip; frames are re-timed into the shot by the render stage. */
  video: Buffer;
  width: number;
  height: number;
  fps: number;
  frames: number;
  provenance: Provenance;
}

/** Optional: used only when the MotionRequirementAnalyzer decides LOCAL_I2V_REQUIRED. */
export interface LocalVideoProvider {
  readonly key: string;
  generateShot(req: ImageToVideoRequest, model: AiModel): Promise<ImageToVideoResult>;
}

export class LocalAiError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
    readonly code: "UNAVAILABLE" | "TIMEOUT" | "CANCELLED" | "BAD_RESPONSE" | "REJECTED" | "LICENSE_BLOCKED" | "CONFIG",
  ) {
    super(message);
    this.name = "LocalAiError";
  }
}
