import { AiModel, AiTask, PrismaClient } from "@prisma/client";
import { env } from "../../config/env";
import { resolveModel, ResolvedModel, Purpose } from "../models/modelRegistry";
import { ComfyUIClient } from "./comfyui/ComfyUIClient";
import { ComfyDepthProvider, ComfyImageProvider, ComfyInpaintingProvider, ComfySegmentationProvider, ComfyVideoProvider } from "./comfyui/adapters";
import { InferenceClient } from "./http/InferenceClient";
import { HttpDepthProvider, HttpImageProvider, HttpInpaintingProvider, HttpSegmentationProvider, HttpVideoProvider } from "./http/adapters";
import { AlphaMatteSegmentationProvider, DiffusionFillInpaintingProvider, LayerDepthProvider, ProceduralImageProvider } from "./procedural";
import { LocalAiError, LocalDepthProvider, LocalImageProvider, LocalInpaintingProvider, LocalSegmentationProvider, LocalVideoProvider } from "./types";

type ProviderFor<T extends AiTask> = T extends "IMAGE_GENERATION"
  ? LocalImageProvider
  : T extends "SEGMENTATION"
    ? LocalSegmentationProvider
    : T extends "DEPTH"
      ? LocalDepthProvider
      : T extends "INPAINTING"
        ? LocalInpaintingProvider
        : T extends "VIDEO_GENERATION"
          ? LocalVideoProvider
          : never;

export interface LocalAiConfig {
  comfyBaseUrl?: string;
  comfyApiKey?: string;
  inferenceBaseUrl?: string;
  inferenceApiKey?: string;
  inferenceSigningSecret?: string;
  timeoutMs: number;
  i2vTimeoutMs: number;
  fetchImpl?: typeof fetch;
}

export function localAiConfigFromEnv(): LocalAiConfig {
  return {
    comfyBaseUrl: env.localAi.comfyBaseUrl || undefined,
    comfyApiKey: env.localAi.comfyApiKey || undefined,
    inferenceBaseUrl: env.localAi.inferenceBaseUrl || undefined,
    inferenceApiKey: env.localAi.inferenceApiKey || undefined,
    inferenceSigningSecret: env.localAi.inferenceSigningSecret || undefined,
    timeoutMs: env.localAi.timeoutMs,
    i2vTimeoutMs: env.localAi.i2vTimeoutMs,
  };
}

/**
 * Builds adapters for registry rows and checks backend availability (cached
 * briefly so a batch of jobs does not hammer the health endpoints).
 */
export class LocalAiFactory {
  private health = new Map<string, { ok: boolean; at: number }>();

  constructor(private readonly cfg: LocalAiConfig) {}

  private comfy(model: AiModel, task: AiTask): ComfyUIClient {
    const base = model.endpoint || this.cfg.comfyBaseUrl;
    if (!base) throw new LocalAiError("COMFYUI_BASE_URL is not configured", false, "CONFIG");
    return new ComfyUIClient({ baseUrl: base, apiKey: this.cfg.comfyApiKey, timeoutMs: task === "VIDEO_GENERATION" ? this.cfg.i2vTimeoutMs : this.cfg.timeoutMs, fetchImpl: this.cfg.fetchImpl });
  }

  private inference(model: AiModel, task: AiTask): InferenceClient {
    const base = model.endpoint || this.cfg.inferenceBaseUrl;
    if (!base) throw new LocalAiError("INFERENCE_BASE_URL is not configured", false, "CONFIG");
    return new InferenceClient({ baseUrl: base, apiKey: this.cfg.inferenceApiKey, signingSecret: this.cfg.inferenceSigningSecret, timeoutMs: task === "VIDEO_GENERATION" ? this.cfg.i2vTimeoutMs : this.cfg.timeoutMs, fetchImpl: this.cfg.fetchImpl });
  }

  provider<T extends AiTask>(model: AiModel & { task: T }): ProviderFor<T>;
  provider(model: AiModel): unknown {
    const t = model.task;
    if (model.provider === "procedural") {
      if (t === "IMAGE_GENERATION") return new ProceduralImageProvider();
      if (t === "SEGMENTATION") return new AlphaMatteSegmentationProvider();
      if (t === "DEPTH") return new LayerDepthProvider();
      if (t === "INPAINTING") return new DiffusionFillInpaintingProvider();
      throw new LocalAiError(`No procedural provider for ${t}`, false, "CONFIG");
    }
    if (model.provider === "comfyui") {
      const c = this.comfy(model, t);
      if (t === "IMAGE_GENERATION") return new ComfyImageProvider(c);
      if (t === "SEGMENTATION") return new ComfySegmentationProvider(c);
      if (t === "DEPTH") return new ComfyDepthProvider(c);
      if (t === "INPAINTING") return new ComfyInpaintingProvider(c);
      if (t === "VIDEO_GENERATION") return new ComfyVideoProvider(c);
    }
    if (model.provider === "http-inference") {
      const c = this.inference(model, t);
      if (t === "IMAGE_GENERATION") return new HttpImageProvider(c);
      if (t === "SEGMENTATION") return new HttpSegmentationProvider(c);
      if (t === "DEPTH") return new HttpDepthProvider(c);
      if (t === "INPAINTING") return new HttpInpaintingProvider(c);
      if (t === "VIDEO_GENERATION") return new HttpVideoProvider(c);
    }
    throw new LocalAiError(`Unsupported provider ${model.provider} for ${t}`, false, "CONFIG");
  }

  private assertTask(model: AiModel, task: AiTask) {
    if (model.task !== task) throw new LocalAiError(`Model ${model.modelId} is a ${model.task} model, not ${task}`, false, "CONFIG");
  }
  image(model: AiModel): LocalImageProvider {
    this.assertTask(model, "IMAGE_GENERATION");
    return this.provider(model as AiModel & { task: "IMAGE_GENERATION" });
  }
  segmentation(model: AiModel): LocalSegmentationProvider {
    this.assertTask(model, "SEGMENTATION");
    return this.provider(model as AiModel & { task: "SEGMENTATION" });
  }
  depth(model: AiModel): LocalDepthProvider {
    this.assertTask(model, "DEPTH");
    return this.provider(model as AiModel & { task: "DEPTH" });
  }
  inpainting(model: AiModel): LocalInpaintingProvider {
    this.assertTask(model, "INPAINTING");
    return this.provider(model as AiModel & { task: "INPAINTING" });
  }
  video(model: AiModel): LocalVideoProvider {
    this.assertTask(model, "VIDEO_GENERATION");
    return this.provider(model as AiModel & { task: "VIDEO_GENERATION" });
  }

  /** True when the model's backend is configured and answers its health check. */
  async isAvailable(model: AiModel): Promise<boolean> {
    if (model.provider === "procedural") return true;
    const key = `${model.provider}|${model.endpoint ?? ""}`;
    const hit = this.health.get(key);
    if (hit && Date.now() - hit.at < 30_000) return hit.ok;
    let ok = false;
    try {
      if (model.provider === "comfyui") ok = (await this.comfy(model, model.task).health()).ok;
      else if (model.provider === "http-inference") {
        const h = await this.inference(model, model.task).health();
        ok = h.ok && (!h.models || h.models.includes(model.modelId));
      }
    } catch {
      ok = false;
    }
    this.health.set(key, { ok, at: Date.now() });
    return ok;
  }

  /** Resolve the best usable model for a task (licence gate + availability), or null. */
  async resolve(prisma: PrismaClient, task: AiTask, purpose: Purpose, modelId?: string): Promise<ResolvedModel | null> {
    return resolveModel(prisma, task, { purpose, modelId, isAvailable: (m) => this.isAvailable(m) });
  }
}
