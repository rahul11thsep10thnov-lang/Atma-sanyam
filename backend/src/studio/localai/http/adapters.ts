import { AiModel } from "@prisma/client";
import { InferenceClient, InferenceResponse } from "./InferenceClient";
import { fitGenerationSize } from "../comfyui/adapters";
import { decodeImageBuffer } from "../../engine25d/raster";
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

const b64 = (b: Buffer) => b.toString("base64");
function out(res: InferenceResponse, name: string): Buffer {
  const v = res.outputs[name];
  if (typeof v !== "string" || !v) throw new LocalAiError(`Inference response missing output "${name}"`, false, "BAD_RESPONSE");
  return Buffer.from(v, "base64");
}
function prov(model: AiModel, res: InferenceResponse, seed: number, parameters: Record<string, unknown>, started: number): Provenance {
  return {
    generator: "http-inference",
    modelId: model.modelId,
    modelVersion: res.modelVersion ?? model.version,
    license: model.license,
    commercialUse: model.commercialUseAllowed,
    seed,
    parameters,
    durationMs: res.durationMs ?? Date.now() - started,
    gpuWorkerId: res.gpuWorkerId,
  };
}
const params = (m: AiModel) => (m.config ?? {}) as Record<string, unknown>;

export class HttpImageProvider implements LocalImageProvider {
  readonly key = "http-inference";
  constructor(private readonly client: InferenceClient) {}
  async generateSceneAsset(req: SceneAssetRequest, model: AiModel): Promise<GeneratedSceneAsset> {
    const started = Date.now();
    const size = fitGenerationSize(req.width, req.height, Number(params(model).maxPixels ?? 1_600_000));
    const p = { ...params(model), prompt: req.prompt, negativePrompt: req.negativePrompt, seed: req.seed >>> 0, width: size.width, height: size.height, isolateSubject: req.transparent };
    const res = await this.client.run("image-generation", { model: model.modelId, inputs: {}, params: p }, { jobId: req.jobId, signal: req.signal });
    const image = out(res, "image");
    return {
      kind: "image",
      files: [{ name: "image.png", data: image, contentType: "image/png" }],
      primary: "image.png",
      width: size.width,
      height: size.height,
      hasAlpha: false,
      isPlaceholder: false,
      metadata: res.metadata ?? {},
      provenance: prov(model, res, req.seed, { ...p, prompt: undefined, negativePrompt: undefined }, started),
    };
  }
}

export class HttpSegmentationProvider implements LocalSegmentationProvider {
  readonly key = "http-inference";
  constructor(private readonly client: InferenceClient) {}
  async segment(req: SegmentationRequest, model: AiModel): Promise<SegmentationResult> {
    const started = Date.now();
    const res = await this.client.run("segmentation", { model: model.modelId, inputs: { image: b64(req.image) }, params: { ...params(model), mode: req.mode, prompt: req.prompt } }, { jobId: req.jobId, signal: req.signal });
    const mask = out(res, "mask");
    const cutout = out(res, "cutout");
    const m = await decodeImageBuffer(mask);
    let kept = 0;
    for (let i = 0; i < m.width * m.height; i++) kept += m.data[i * 4 + 3] > 0 ? m.data[i * 4] / m.data[i * 4 + 3] : 0;
    return { mask, cutout, width: m.width, height: m.height, coverage: kept / (m.width * m.height), provenance: prov(model, res, req.seed ?? 0, { mode: req.mode }, started) };
  }
}

export class HttpDepthProvider implements LocalDepthProvider {
  readonly key = "http-inference";
  constructor(private readonly client: InferenceClient) {}
  async estimate(req: DepthRequest, model: AiModel): Promise<DepthResult> {
    const started = Date.now();
    const res = await this.client.run("depth", { model: model.modelId, inputs: { image: b64(req.image) }, params: { ...params(model), role: req.role } }, { jobId: req.jobId, signal: req.signal });
    const depth = out(res, "depth");
    const d = await decodeImageBuffer(depth);
    return { depth, width: d.width, height: d.height, provenance: prov(model, res, 0, { role: req.role }, started) };
  }
}

export class HttpInpaintingProvider implements LocalInpaintingProvider {
  readonly key = "http-inference";
  constructor(private readonly client: InferenceClient) {}
  async inpaint(req: InpaintRequest, model: AiModel): Promise<InpaintResult> {
    const started = Date.now();
    const res = await this.client.run("inpainting", { model: model.modelId, inputs: { image: b64(req.image), mask: b64(req.mask) }, params: { ...params(model), prompt: req.prompt, seed: req.seed } }, { jobId: req.jobId, signal: req.signal });
    const image = out(res, "image");
    const d = await decodeImageBuffer(image);
    return { image, width: d.width, height: d.height, provenance: prov(model, res, req.seed ?? 0, {}, started) };
  }
}

export class HttpVideoProvider implements LocalVideoProvider {
  readonly key = "http-inference";
  constructor(private readonly client: InferenceClient) {}
  async generateShot(req: ImageToVideoRequest, model: AiModel): Promise<ImageToVideoResult> {
    const started = Date.now();
    const size = fitGenerationSize(req.width, req.height, Number(params(model).maxPixels ?? 480 * 832));
    const duration = Math.max(3, Math.min(5, req.durationSeconds));
    const res = await this.client.run(
      "i2v",
      { model: model.modelId, inputs: { image: b64(req.image) }, params: { ...params(model), prompt: req.prompt, negativePrompt: req.negativePrompt, seed: req.seed >>> 0, durationSeconds: duration, width: size.width, height: size.height, motionStrength: req.motionStrength } },
      { jobId: req.jobId, signal: req.signal },
    );
    const video = out(res, "video");
    const fps = Number(res.metadata?.fps ?? params(model).fps ?? 16);
    const frames = Number(res.metadata?.frames ?? Math.round(duration * fps));
    return { video, width: size.width, height: size.height, fps, frames, provenance: prov(model, res, req.seed, { durationSeconds: duration, width: size.width, height: size.height }, started) };
  }
}
