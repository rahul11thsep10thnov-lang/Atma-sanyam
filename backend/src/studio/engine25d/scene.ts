import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { decodeGrayFile, decodeImageFile, PImage } from "./raster";
import { GrayMap, resizeGray } from "./depth";
import { ScenePackageManifest, parseManifest } from "./spec";
import type { RigDef } from "../production/procedural/characterRig";

/** Resolves a manifest path (storage key or absolute path) to a local file path. */
export type ResolveAsset = (pathOrKey: string) => Promise<string>;

export interface SceneLayerData {
  key: string;
  image?: PImage;
  /** Per-pixel depth in the image's own pixel grid (white = near). */
  depth?: GrayMap;
  rig?: { def: RigDef; images: Record<string, PImage> };
  /** The asset could not be loaded (only allowed for previews; drawn as a hatched stand-in). */
  missing?: string;
}

/** Everything a frame depends on: the manifest plus decoded assets (shareable with worker threads). */
export interface SceneData {
  manifest: ScenePackageManifest;
  layers: Record<string, SceneLayerData>;
}

function shareImage(img: PImage): PImage {
  const sab = new SharedArrayBuffer(img.data.byteLength);
  const data = new Float32Array(sab);
  data.set(img.data);
  return { width: img.width, height: img.height, data };
}

function shareGray(m: GrayMap): GrayMap {
  const data = new Float32Array(new SharedArrayBuffer(m.data.byteLength));
  data.set(m.data);
  return { width: m.width, height: m.height, data };
}

export class MissingAssetError extends Error {
  constructor(
    readonly layerKey: string,
    readonly path: string,
    cause: string,
  ) {
    super(`Layer ${layerKey}: cannot load ${path}: ${cause}`);
    this.name = "MissingAssetError";
  }
}

/**
 * Loads a scene package: decodes every layer image, depth map and rig into
 * premultiplied float buffers. With `shared`, buffers live in
 * SharedArrayBuffers so render workers read them without copies.
 */
export async function loadSceneData(manifestInput: unknown, resolve: ResolveAsset, opts: { shared?: boolean; allowMissing?: boolean } = {}): Promise<SceneData> {
  const manifest = parseManifest(manifestInput);
  const share = opts.shared ? shareImage : (i: PImage) => i;
  const shareG = opts.shared ? shareGray : (g: GrayMap) => g;
  const layers: Record<string, SceneLayerData> = {};
  for (const l of manifest.layers) {
    const entry: SceneLayerData = { key: l.key };
    try {
      if (l.source.type === "image") {
        const path = await resolve(l.source.path);
        const img = await decodeImageFile(path);
        entry.image = share(img);
        if (l.source.depthPath) {
          const d = await decodeGrayFile(await resolve(l.source.depthPath));
          entry.depth = shareG(resizeGray(d, img.width, img.height));
        }
      } else {
        const rigPath = await resolve(l.source.path);
        const def = JSON.parse(await readFile(rigPath, "utf8")) as RigDef;
        const dir = dirname(rigPath);
        const images: Record<string, PImage> = {};
        for (const name of new Set([...def.parts.map((p) => p.image), def.headOverlay])) images[name] = share(await decodeImageFile(join(dir, name)));
        entry.rig = { def, images };
      }
    } catch (e) {
      if (!opts.allowMissing) throw new MissingAssetError(l.key, l.source.path, (e as Error).message);
      entry.missing = (e as Error).message;
    }
    layers[l.key] = entry;
  }
  return { manifest, layers };
}

/** Builds SceneData from in-memory assets (tests, previews of unsaved edits). */
export function sceneFromMemory(manifestInput: unknown, layers: Record<string, Omit<SceneLayerData, "key">>): SceneData {
  const manifest = parseManifest(manifestInput);
  const out: Record<string, SceneLayerData> = {};
  for (const l of manifest.layers) out[l.key] = { key: l.key, ...(layers[l.key] ?? { missing: "not provided" }) };
  return { manifest, layers: out };
}
