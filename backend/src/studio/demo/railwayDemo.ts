import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { AiModel } from "@prisma/client";
import { directScene } from "../production/shotDirector";
import { planComposition } from "../production/visualCompositionPlanner";
import { DirectorContext, SceneInput, ShotPlan } from "../production/types";
import { buildManifest, LayerAssetRef, placeholderLayers } from "../production/scenePackage";
import { ProceduralImageProvider } from "../localai/procedural";
import { DEFAULT_MODELS } from "../models/defaultModels";
import { loadSceneData } from "../engine25d/scene";
import { renderShotToFile, renderStillPng, ShotRenderResult } from "../engine25d/shotRenderer";
import { ScenePackageManifest } from "../engine25d/spec";

export interface RailwayDemoOptions {
  outDir: string;
  width?: number;
  height?: number;
  fps?: number;
  durationSeconds?: number;
  workers?: number;
  /** Frames to export as PNG stills (default: first, middle, last). */
  stills?: number[];
  renderVideo?: boolean;
  onProgress?: (done: number, total: number) => void;
}

export interface RailwayDemoResult {
  shot: ShotPlan;
  manifest: ScenePackageManifest;
  manifestPath: string;
  videoPath?: string;
  stills: string[];
  render?: ShotRenderResult;
  assetMs: number;
  placeholders: string[];
}

function hashKey(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** In-memory registry row for the built-in generator (the demo does not need a database). */
function proceduralModel(): AiModel {
  const d = DEFAULT_MODELS.find((m) => m.modelId === "atma-procedural-v1")!;
  const { licenseVerifiedAt, config, ...rest } = d;
  void licenseVerifiedAt;
  return { ...rest, id: "demo", endpoint: null, workflow: null, licenseUrl: null, licenseVerifiedAt: null, licenseNotes: d.licenseNotes, attributionText: null, redistributionNotes: null, gpuRequirement: null, overrideApproved: false, overrideReason: null, overrideBy: null, config: (config ?? null) as never, createdAt: new Date(0), updatedAt: new Date(0) } as AiModel;
}

/**
 * Demo: "A man waiting at an Indian railway station" — 5 s, 1080×1920 @ 30.
 * Runs the real production chain (ShotDirector → VisualCompositionPlanner →
 * local image provider → scene package → 2.5D engine → FFmpeg). Uses the
 * built-in procedural generator, so it runs anywhere without a GPU.
 */
export async function buildRailwayDemo(opts: RailwayDemoOptions): Promise<RailwayDemoResult> {
  const W = opts.width ?? 1080;
  const H = opts.height ?? 1920;
  const fps = opts.fps ?? 30;
  const duration = opts.durationSeconds ?? 5;
  await mkdir(join(opts.outDir, "assets"), { recursive: true });

  const ctx: DirectorContext = {
    storyId: "demo-railway",
    storyTitle: "A man waiting at an Indian railway station",
    sensitiveTopics: [],
    locationLabel: "railway station platform",
    characters: [
      {
        key: "CHAR_01",
        displayName: "The passenger",
        role: "passenger",
        gender: "MALE",
        ageGroup: "ADULT",
        isMinor: false,
        isOfficial: false,
        anonymized: false,
        speaks: false,
        appearance: { clothing: "blue checked shirt and grey trousers", hair: "short black hair", build: "average" },
      },
    ],
    i2vAvailable: false,
    styleKey: "graphic-novel-in",
  };
  const scene: SceneInput = {
    sceneNumber: 2,
    durationSeconds: duration,
    location: "railway station platform",
    timeOfDay: "evening",
    characters: ["CHAR_01"],
    narratorText: "A man stands waiting on the platform beside his suitcase as the evening train pulls out.",
    dialogue: [],
    emotionalTone: "reflective",
    cameraDirection: "slow push towards the man",
    background: "railway platform at dusk",
    props: ["suitcase"],
    safetyLevel: "SAFE",
    safetyReasons: [],
    transition: "cut",
  };
  const [shot] = directScene(scene, ctx, { isFirst: false, isLast: false });
  const seed = 20261005;
  const plan = planComposition({ shot: { ...shot, durationSeconds: duration }, scene, ctx, canvas: { width: W, height: H, fps, aspectRatio: "9:16" }, seed, position: { firstShotOfEpisode: true, lastShotOfEpisode: false } });

  // Generate every layer asset through the local image provider interface.
  const started = Date.now();
  const provider = new ProceduralImageProvider();
  const model = proceduralModel();
  const assets: Record<string, LayerAssetRef> = {};
  for (const l of plan.layers) {
    const out = await provider.generateSceneAsset(
      { role: l.assetRole, prompt: l.prompt, negativePrompt: l.negativePrompt, width: l.pixelSize.width, height: l.pixelSize.height, seed: hashKey(l.reuseKey) ^ seed, style: plan.style, transparent: l.assetRole !== "background", painterHint: l.painterHint },
      model,
    );
    const dir = join(opts.outDir, "assets", l.key);
    await mkdir(dir, { recursive: true });
    for (const f of out.files) await writeFile(join(dir, f.name), f.data);
    assets[l.key] = { kind: out.kind, path: join(dir, out.primary), depthPath: out.depthFile ? join(dir, out.depthFile) : undefined, width: out.width, height: out.height, placeholder: out.isPlaceholder };
  }
  const assetMs = Date.now() - started;

  const manifest = buildManifest({ shotId: "demo-shot-001", storyId: ctx.storyId, plan, canvas: { width: W, height: H, fps, durationSeconds: duration, aspectRatio: "9:16" }, seed, assets });
  const manifestPath = join(opts.outDir, "manifest.json");
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  const sceneData = await loadSceneData(manifest, async (p) => p, { shared: true });
  const total = Math.round(duration * fps);
  // (frame 0 is black: the episode opens with a fade-in)
  const stillFrames = opts.stills ?? [Math.round(fps * 0.6), Math.floor(total / 2), total - 1];
  const stills: string[] = [];
  for (const f of stillFrames) {
    const path = join(opts.outDir, `frame_${String(f).padStart(4, "0")}.png`);
    await writeFile(path, renderStillPng(sceneData, { width: W, height: H, fps }, f));
    stills.push(path);
  }
  let render: ShotRenderResult | undefined;
  let videoPath: string | undefined;
  if (opts.renderVideo !== false) {
    videoPath = join(opts.outDir, "shot_001.mp4");
    render = await renderShotToFile(sceneData, videoPath, { width: W, height: H, fps, crf: 19, preset: "medium", workers: opts.workers, onProgress: opts.onProgress });
  }
  return { shot, manifest, manifestPath, videoPath, stills, render, assetMs, placeholders: placeholderLayers(manifest) };
}
