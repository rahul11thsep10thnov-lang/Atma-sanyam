import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ScenePackageManifest } from "../engine25d/spec";

const execFileAsync = promisify(execFile);

export type ShotQcSeverity = "BLOCKING" | "WARNING";
export interface ShotQcIssue {
  check: string;
  severity: ShotQcSeverity;
  message: string;
}
export interface ShotQcReport {
  status: "PASSED" | "FAILED";
  checkedAt: string;
  issues: ShotQcIssue[];
  metrics: { width?: number; height?: number; fps?: number; frames?: number; durationSeconds?: number; meanLuma?: number[]; motion?: number };
}

export interface ShotQcInput {
  videoPath: string;
  manifest: ScenePackageManifest;
  expected: { width: number; height: number; fps: number; durationSeconds: number };
  safetyLevel: "SAFE" | "SENSITIVE" | "RESTRICTED";
  /** Layers whose assets are placeholder art not yet accepted by an editor. */
  unresolvedPlaceholders: string[];
  /** Layers whose asset versions came from models blocked for production (and not overridden). */
  licenseBlocked: string[];
  /** Characters on screen that must never be drawn (minors). */
  forbiddenCharacterLayers: string[];
}

async function probe(path: string) {
  const { stdout } = await execFileAsync("ffprobe", ["-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries", "stream=codec_name,width,height,r_frame_rate,nb_read_frames:format=duration", "-of", "json", path]);
  const j = JSON.parse(stdout) as { streams: { codec_name: string; width: number; height: number; r_frame_rate: string; nb_read_frames: string }[]; format: { duration: string } };
  const s = j.streams[0];
  const [n, d] = s.r_frame_rate.split("/").map(Number);
  return { codec: s.codec_name, width: s.width, height: s.height, fps: d ? n / d : n, frames: Number(s.nb_read_frames), duration: Number(j.format.duration) };
}

/** Mean luma of a few frames sampled across the shot (tiny grey thumbnails). */
async function sampleFrames(path: string, duration: number, count = 5): Promise<Uint8Array[]> {
  const out: Uint8Array[] = [];
  for (let i = 0; i < count; i++) {
    const t = Math.min(duration - 0.05, ((i + 0.5) / count) * duration);
    const { stdout } = await execFileAsync("ffmpeg", ["-v", "error", "-ss", t.toFixed(3), "-i", path, "-frames:v", "1", "-vf", "scale=64:114,format=gray", "-f", "rawvideo", "-"], { encoding: "buffer", maxBuffer: 1024 * 1024 });
    out.push(new Uint8Array(stdout as unknown as Buffer));
  }
  return out;
}

/**
 * Shot QC: the rendered file matches the render profile and planned length,
 * frames are not black, the shot actually moves (2.5D, not a slideshow), the
 * disclosure is set, safety rules hold, and no unresolved placeholder or
 * licence-blocked asset is in it. BLOCKING issues fail the shot.
 */
export async function runShotQc(input: ShotQcInput): Promise<ShotQcReport> {
  const issues: ShotQcIssue[] = [];
  const add = (check: string, severity: ShotQcSeverity, message: string) => issues.push({ check, severity, message });
  const metrics: ShotQcReport["metrics"] = {};
  try {
    const p = await probe(input.videoPath);
    Object.assign(metrics, { width: p.width, height: p.height, fps: p.fps, frames: p.frames, durationSeconds: p.duration });
    if (p.codec !== "h264") add("codec", "BLOCKING", `Codec is ${p.codec}, expected h264`);
    if (p.width !== input.expected.width || p.height !== input.expected.height) add("resolution", "BLOCKING", `Rendered ${p.width}x${p.height}, expected ${input.expected.width}x${input.expected.height}`);
    if (Math.abs(p.fps - input.expected.fps) > 0.01) add("fps", "BLOCKING", `Rendered at ${p.fps} fps, expected ${input.expected.fps}`);
    const expectedFrames = Math.round(input.expected.durationSeconds * input.expected.fps);
    if (Math.abs(p.frames - expectedFrames) > 1) add("duration", "BLOCKING", `Shot has ${p.frames} frames, the timeline needs ${expectedFrames}`);
    const frames = await sampleFrames(input.videoPath, p.duration);
    const lumas = frames.map((f) => f.reduce((s, v) => s + v, 0) / Math.max(1, f.length) / 255);
    metrics.meanLuma = lumas.map((l) => Math.round(l * 1000) / 1000);
    // the first sample may fall inside a fade-in; judge the rest
    if (lumas.slice(1).some((l) => l < 0.02)) add("black_frames", "BLOCKING", "Black frames detected mid-shot");
    // motion between the 2nd and last samples (outside fades)
    const a = frames[1];
    const b = frames[frames.length - 1];
    let diff = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) diff += Math.abs(a[i] - b[i]);
    metrics.motion = Math.round((diff / Math.max(1, a.length) / 255) * 10000) / 10000;
    if (metrics.motion < 0.002) add("motion", "WARNING", "Shot is nearly static (check camera/animation)");
  } catch (e) {
    add("readable", "BLOCKING", `Render could not be read: ${(e as Error).message.split("\n")[0]}`);
  }
  if (input.manifest.disclosure?.kind !== "VISUAL_RECONSTRUCTION") add("disclosure", "BLOCKING", "Shot is missing the visual-reconstruction disclosure");
  // Asset resolution: a layer shown much larger than its source looks soft.
  const H = input.manifest.canvas.height;
  const zoom = Math.max(input.manifest.camera.start.zoom, input.manifest.camera.end.zoom);
  for (const l of input.manifest.layers) {
    const shown = l.placement.cover ? H * 1.2 : l.placement.height * H * zoom;
    if (shown > l.source.height * 1.5) add("asset_resolution", "WARNING", `Layer ${l.key} is shown at ~${Math.round(shown)}px from a ${l.source.height}px asset (upscaled ${(shown / l.source.height).toFixed(1)}×)`);
  }
  const chars = input.manifest.layers.filter((l) => l.kind === "character");
  if (input.safetyLevel === "RESTRICTED" && chars.length) add("safety_restricted", "BLOCKING", "Restricted scene shows characters; it must use a substitute visual");
  if (input.safetyLevel === "SENSITIVE" && chars.some((l) => !l.silhouette)) add("safety_sensitive", "BLOCKING", "Sensitive scene shows identifiable characters; use silhouettes");
  for (const k of input.forbiddenCharacterLayers) add("no_minors", "BLOCKING", `Layer ${k} depicts a minor`);
  for (const k of input.unresolvedPlaceholders) add("placeholder_asset", "WARNING", `Layer ${k} uses placeholder art that an editor has not approved (blocks publishing)`);
  for (const k of input.licenseBlocked) add("licence", "BLOCKING", `Layer ${k} was generated by a model that is not cleared for production`);
  return { status: issues.some((i) => i.severity === "BLOCKING") ? "FAILED" : "PASSED", checkedAt: new Date().toISOString(), issues, metrics };
}
