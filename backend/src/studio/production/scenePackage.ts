import { createHash } from "node:crypto";
import { ManifestInput, manifestSchema, ScenePackageManifest } from "../engine25d/spec";
import { CompositionPlan, LayerPlan } from "./visualCompositionPlanner";

/**
 * Scene package = everything needed to render one shot deterministically:
 * a manifest (layers, depth, camera, lighting, environment, focus, effects,
 * transition, disclosure) that references versioned, reusable assets.
 *
 * Storage layout (keys in the StorageProvider):
 *   studio/assets/{assetId}/v{version}/image.png | depth.png | mask.png | rig.json + part PNGs
 *   studio/stories/{storyId}/shots/{shotId}/package/v{n}/manifest.json
 *   studio/stories/{storyId}/shots/{shotId}/package/v{n}/package.json   (provenance summary)
 *   studio/stories/{storyId}/shots/{shotId}/renders/v{n}/shot_{NNN}.mp4  + thumb.png
 *   studio/stories/{storyId}/episodes/{episodeId}/master/v{n}/master_visual.mp4
 */
export const storageKeys = {
  assetVersion: (assetId: string, version: number) => `studio/assets/${assetId}/v${version}`,
  package: (storyId: string, shotId: string, version: number) => `studio/stories/${storyId}/shots/${shotId}/package/v${version}`,
  render: (storyId: string, shotId: string, version: number) => `studio/stories/${storyId}/shots/${shotId}/renders/v${version}`,
  master: (storyId: string, episodeId: string, version: number) => `studio/stories/${storyId}/episodes/${episodeId}/master/v${version}`,
};

export const shotFileName = (globalNumber: number) => `shot_${String(globalNumber).padStart(3, "0")}.mp4`;

export interface LayerAssetRef {
  kind: "image" | "rig";
  /** Storage key (or absolute path) of image.png / rig.json. */
  path: string;
  depthPath?: string;
  maskPath?: string;
  width: number;
  height: number;
  placeholder: boolean;
  assetId?: string;
  /** Content hash of the asset version (feeds the render cache key). */
  contentHash?: string;
}

export interface BuildManifestInput {
  shotId: string;
  storyId?: string;
  plan: CompositionPlan;
  canvas: { width: number; height: number; fps: number; durationSeconds: number; aspectRatio: string };
  seed: number;
  assets: Record<string, LayerAssetRef>;
  burnInDisclosure?: boolean;
  /** Admin overrides from the Shot Inspector (merged last). */
  overrides?: Partial<Pick<ManifestInput, "camera" | "lighting" | "focus" | "effects" | "environment" | "shadows" | "depth">> & { layers?: Record<string, Partial<{ depth: number; placement: Partial<LayerPlan["placement"]>; extraBlur: number; silhouette: boolean }>> };
}

export class IncompletePackageError extends Error {
  constructor(readonly missing: string[]) {
    super(`Scene package is missing assets for layers: ${missing.join(", ")}`);
    this.name = "IncompletePackageError";
  }
}

export function buildManifest(input: BuildManifestInput): ScenePackageManifest {
  const { plan, assets } = input;
  const missing = plan.layers.filter((l) => !assets[l.key]).map((l) => l.key);
  if (missing.length) throw new IncompletePackageError(missing);
  const ov = input.overrides ?? {};
  const layers = plan.layers.map((l) => {
    const a = assets[l.key];
    const lo = ov.layers?.[l.key] ?? {};
    const source =
      a.kind === "rig"
        ? { type: "rig" as const, path: a.path, width: a.width, height: a.height, placeholder: a.placeholder, assetId: a.assetId }
        : { type: "image" as const, path: a.path, depthPath: a.depthPath, maskPath: a.maskPath, width: a.width, height: a.height, placeholder: a.placeholder, assetId: a.assetId };
    return {
      key: l.key,
      kind: l.kind.toLowerCase() as "background" | "midground" | "character" | "prop" | "foreground",
      name: l.name,
      zIndex: l.zIndex,
      depth: lo.depth ?? l.depth,
      source,
      placement: { ...l.placement, ...(lo.placement ?? {}) },
      blend: l.blend,
      lightResponse: l.lightResponse,
      castsShadow: l.castsShadow,
      silhouette: lo.silhouette ?? l.silhouette,
      extraBlur: lo.extraBlur ?? l.extraBlur ?? 0,
      motion: l.motion,
      character: l.character,
    };
  });
  return manifestSchema.parse({
    version: 1,
    shotId: input.shotId,
    storyId: input.storyId,
    canvas: input.canvas,
    seed: input.seed,
    style: plan.style,
    layers,
    depth: { ...plan.depthSpec, ...(ov.depth ?? {}) },
    camera: { ...plan.camera, ...(ov.camera ?? {}) },
    lighting: { ...plan.lighting, ...(ov.lighting ?? {}) },
    shadows: { ...plan.shadows, ...(ov.shadows ?? {}) },
    environment: { ...plan.environment, ...(ov.environment ?? {}) },
    focus: { ...plan.focus, ...(ov.focus ?? {}) },
    effects: { ...plan.effects, ...(ov.effects ?? {}) },
    transition: plan.transition,
    disclosure: { kind: "VISUAL_RECONSTRUCTION", burnIn: input.burnInDisclosure ?? false },
  });
}

function canonical(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === "object") return Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, canonical((v as Record<string, unknown>)[k])]));
  return v;
}

/**
 * Render cache key: the manifest (which already pins seeds and every
 * parameter) plus the content hashes of the referenced asset versions and the
 * engine version. Same key ⇒ byte-identical frames, so the render is reused.
 */
export function packageHash(manifest: ScenePackageManifest, assets: Record<string, LayerAssetRef>, engineVersion: string, output: { width: number; height: number; fps: number }): string {
  const h = createHash("sha256");
  // Approval state (placeholder flag) does not change a single pixel: keep it out of the cache key,
  // so approving placeholder art never re-renders shots. QC and CAN_PUBLISH read live asset status.
  const pixels = { ...manifest, layers: manifest.layers.map((l) => ({ ...l, source: { ...l.source, placeholder: undefined } })) };
  h.update(JSON.stringify(canonical(pixels)));
  for (const k of Object.keys(assets).sort()) h.update(`${k}:${assets[k].contentHash ?? assets[k].path}`);
  h.update(`engine:${engineVersion}:${output.width}x${output.height}@${output.fps}`);
  return h.digest("hex");
}

/** Layers still using placeholder art — they block publishing until approved or regenerated. */
export function placeholderLayers(manifest: ScenePackageManifest): string[] {
  return manifest.layers.filter((l) => l.source.placeholder).map((l) => l.key);
}
