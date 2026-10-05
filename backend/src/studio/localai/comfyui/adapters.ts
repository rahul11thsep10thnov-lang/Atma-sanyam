import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { AiModel } from "@prisma/client";
import { decodeImageBuffer, encodeGrayPng, encodePng, createImage } from "../../engine25d/raster";
import { ComfyUIClient } from "./ComfyUIClient";
import { fillTemplate, loadWorkflow } from "./workflowTemplate";
import {
  DepthRequest,
  DepthResult,
  GeneratedSceneAsset,
  ImageToVideoRequest,
  ImageToVideoResult,
  InpaintRequest,
  InpaintResult,
  LocalAiError,
  LocalDepthProvider,
  LocalImageProvider,
  LocalInpaintingProvider,
  LocalSegmentationProvider,
  LocalVideoProvider,
  Provenance,
  SceneAssetRequest,
  SegmentationRequest,
  SegmentationResult,
} from "../types";

const execFileAsync = promisify(execFile);

type Cfg = Record<string, string | number | boolean>;
const cfgOf = (m: AiModel): Cfg => ((m.config ?? {}) as Cfg) || {};

function prov(model: AiModel, seed: number, parameters: Record<string, unknown>, started: number): Provenance {
  return { generator: "comfyui", modelId: model.modelId, modelVersion: model.version, license: model.license, commercialUse: model.commercialUseAllowed, seed, parameters, durationMs: Date.now() - started };
}

/** Diffusion models work best near 1 MP and need dimensions divisible by 16. */
export function fitGenerationSize(width: number, height: number, maxPixels = 1_600_000, multiple = 16): { width: number; height: number } {
  const s = Math.min(1, Math.sqrt(maxPixels / (width * height)));
  const r = (v: number) => Math.max(multiple, Math.round((v * s) / multiple) * multiple);
  return { width: r(width), height: r(height) };
}

/** Prompt suffix that makes subject-only generations easy to matte. */
const ISOLATE = ", isolated subject centred on a plain flat light grey background, full figure in frame, no shadow on the background";

async function runSingleImage(client: ComfyUIClient, workflow: Record<string, unknown>, signal?: AbortSignal): Promise<Buffer[]> {
  const id = await client.queuePrompt(workflow, signal);
  const outputs = await client.waitForOutputs(id, signal);
  const buffers: Buffer[] = [];
  for (const o of outputs) buffers.push(await client.download(o, signal));
  return buffers;
}

export class ComfyImageProvider implements LocalImageProvider {
  readonly key = "comfyui";
  constructor(private readonly client: ComfyUIClient) {}

  async generateSceneAsset(req: SceneAssetRequest, model: AiModel): Promise<GeneratedSceneAsset> {
    const started = Date.now();
    if (!model.workflow) throw new LocalAiError(`Model ${model.modelId} has no ComfyUI workflow`, false, "CONFIG");
    const c = cfgOf(model);
    const size = fitGenerationSize(req.width, req.height, Number(c.maxPixels ?? 1_600_000));
    const prompt = `${req.prompt}${req.transparent ? ISOLATE : ""}`;
    const values: Cfg = {
      prompt,
      negative_prompt: req.negativePrompt,
      seed: req.seed >>> 0,
      width: size.width,
      height: size.height,
      steps: Number(c.steps ?? 4),
      cfg: Number(c.cfg ?? 1),
      sampler: String(c.sampler ?? "euler"),
      scheduler: String(c.scheduler ?? "simple"),
      checkpoint: String(c.checkpoint ?? ""),
      filename_prefix: `atma/${req.jobId ?? "asset"}`,
    };
    const workflow = fillTemplate(await loadWorkflow(model.workflow), values) as Record<string, unknown>;
    const [image] = await runSingleImage(this.client, workflow, req.signal);
    return {
      kind: "image",
      files: [{ name: "image.png", data: image, contentType: "image/png" }],
      primary: "image.png",
      width: size.width,
      height: size.height,
      // Diffusion output is opaque; subject layers are matted by the segmentation step.
      hasAlpha: false,
      isPlaceholder: false,
      metadata: { requested: { width: req.width, height: req.height }, workflow: model.workflow },
      provenance: prov(model, req.seed, { ...values, prompt: undefined, negative_prompt: undefined }, started),
    };
  }
}

/** Generic image→image workflow (depth, matte, inpaint) with {{input_image}} / {{mask_image}} placeholders. */
async function imageToImage(client: ComfyUIClient, model: AiModel, inputs: { image: Buffer; mask?: Buffer }, extra: Cfg, signal?: AbortSignal): Promise<Buffer> {
  if (!model.workflow) throw new LocalAiError(`Model ${model.modelId} has no ComfyUI workflow`, false, "CONFIG");
  const tag = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const values: Cfg = { ...cfgOf(model), ...extra, input_image: await client.uploadImage(inputs.image, `atma-in-${tag}.png`, signal), filename_prefix: `atma/${tag}` };
  if (inputs.mask) values.mask_image = await client.uploadImage(inputs.mask, `atma-mask-${tag}.png`, signal);
  const workflow = fillTemplate(await loadWorkflow(model.workflow), values) as Record<string, unknown>;
  const [out] = await runSingleImage(client, workflow, signal);
  return out;
}

export class ComfyDepthProvider implements LocalDepthProvider {
  readonly key = "comfyui";
  constructor(private readonly client: ComfyUIClient) {}
  async estimate(req: DepthRequest, model: AiModel): Promise<DepthResult> {
    const started = Date.now();
    const src = await decodeImageBuffer(req.image);
    const out = await imageToImage(this.client, model, { image: req.image }, { resolution: Math.min(1024, Math.max(src.width, src.height)) }, req.signal);
    // Normalise to a single-channel PNG at the source size (white = near, as Depth Anything outputs).
    const img = await decodeImageBuffer(out);
    const g = new Float32Array(src.width * src.height);
    for (let y = 0; y < src.height; y++) {
      const sy = Math.min(img.height - 1, Math.floor(((y + 0.5) * img.height) / src.height));
      for (let x = 0; x < src.width; x++) {
        const sx = Math.min(img.width - 1, Math.floor(((x + 0.5) * img.width) / src.width));
        const o = (sy * img.width + sx) * 4;
        const a = img.data[o + 3] || 1;
        g[y * src.width + x] = img.data[o] / a;
      }
    }
    return { depth: encodeGrayPng(src.width, src.height, g), width: src.width, height: src.height, provenance: prov(model, 0, { role: req.role }, started) };
  }
}

export class ComfySegmentationProvider implements LocalSegmentationProvider {
  readonly key = "comfyui";
  constructor(private readonly client: ComfyUIClient) {}
  async segment(req: SegmentationRequest, model: AiModel): Promise<SegmentationResult> {
    const started = Date.now();
    const src = await decodeImageBuffer(req.image);
    const out = await imageToImage(this.client, model, { image: req.image }, { prompt: req.prompt ?? "main subject" }, req.signal);
    const m = await decodeImageBuffer(out);
    if (m.width !== src.width || m.height !== src.height) throw new LocalAiError("Segmentation output size mismatch", false, "BAD_RESPONSE");
    const mask = new Float32Array(src.width * src.height);
    // Accept either an RGBA cut-out (use alpha) or a white-on-black mask image.
    let hasAlpha = false;
    for (let i = 0; i < mask.length && !hasAlpha; i += 97) if (m.data[i * 4 + 3] < 0.98) hasAlpha = true;
    for (let i = 0; i < mask.length; i++) mask[i] = hasAlpha ? m.data[i * 4 + 3] : m.data[i * 4 + 3] > 0 ? m.data[i * 4] / m.data[i * 4 + 3] : 0;
    const cut = createImage(src.width, src.height);
    let kept = 0;
    for (let i = 0; i < mask.length; i++) {
      kept += mask[i];
      for (let ch = 0; ch < 4; ch++) cut.data[i * 4 + ch] = src.data[i * 4 + ch] * mask[i];
    }
    return { mask: encodeGrayPng(src.width, src.height, mask), cutout: encodePng(cut), width: src.width, height: src.height, coverage: kept / mask.length, provenance: prov(model, req.seed ?? 0, { mode: req.mode }, started) };
  }
}

export class ComfyInpaintingProvider implements LocalInpaintingProvider {
  readonly key = "comfyui";
  constructor(private readonly client: ComfyUIClient) {}
  async inpaint(req: InpaintRequest, model: AiModel): Promise<InpaintResult> {
    const started = Date.now();
    const out = await imageToImage(this.client, model, { image: req.image, mask: req.mask }, { prompt: req.prompt ?? "", seed: (req.seed ?? 0) >>> 0 }, req.signal);
    const img = await decodeImageBuffer(out);
    return { image: out, width: img.width, height: img.height, provenance: prov(model, req.seed ?? 0, {}, started) };
  }
}

/**
 * Image-to-video through a ComfyUI workflow whose output is a frame sequence
 * (SaveImage on the decoded batch). Frames are assembled into an H.264 MP4
 * here so the clip flows into the normal shot pipeline.
 */
export class ComfyVideoProvider implements LocalVideoProvider {
  readonly key = "comfyui";
  constructor(private readonly client: ComfyUIClient) {}

  async generateShot(req: ImageToVideoRequest, model: AiModel): Promise<ImageToVideoResult> {
    const started = Date.now();
    if (!model.workflow) throw new LocalAiError(`Model ${model.modelId} has no ComfyUI workflow`, false, "CONFIG");
    const c = cfgOf(model);
    const fps = Number(c.fps ?? 16);
    const duration = Math.max(3, Math.min(5, req.durationSeconds));
    // Wan-style models want 4n+1 frames.
    const frames = Math.floor((duration * fps) / 4) * 4 + 1;
    const size = fitGenerationSize(req.width, req.height, Number(c.maxPixels ?? 480 * 832), 16);
    const tag = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const values: Cfg = {
      ...c,
      input_image: await this.client.uploadImage(req.image, `atma-i2v-${tag}.png`, req.signal),
      prompt: req.prompt,
      negative_prompt: req.negativePrompt,
      seed: req.seed >>> 0,
      width: size.width,
      height: size.height,
      length: frames,
      steps: Number(c.steps ?? 30),
      cfg: Number(c.cfg ?? 5),
      filename_prefix: `atma/i2v-${tag}`,
    };
    const workflow = fillTemplate(await loadWorkflow(model.workflow), values) as Record<string, unknown>;
    const id = await this.client.queuePrompt(workflow, req.signal);
    const outputs = await this.client.waitForOutputs(id, req.signal);
    const dir = await mkdtemp(join(tmpdir(), "atma-i2v-"));
    try {
      let n = 0;
      for (const o of outputs.sort((a, b) => a.filename.localeCompare(b.filename))) {
        await writeFile(join(dir, `f_${String(n++).padStart(5, "0")}.png`), await this.client.download(o, req.signal));
      }
      if (n < 8) throw new LocalAiError(`I2V returned only ${n} frames`, false, "BAD_RESPONSE");
      const mp4 = join(dir, "out.mp4");
      await execFileAsync("ffmpeg", ["-v", "error", "-y", "-framerate", String(fps), "-i", join(dir, "f_%05d.png"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16", "-preset", "medium", mp4]);
      return { video: await readFile(mp4), width: size.width, height: size.height, fps, frames: n, provenance: prov(model, req.seed, { frames, fps, steps: values.steps, cfg: values.cfg, width: size.width, height: size.height }, started) };
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
}
