import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createImage, decodeImageFile, PImage } from "./raster";
import { drawImageAffine, Rect } from "./composite";
import { apply, Mat2D, multiply, rotate, scale, translate } from "./math";
import { CharacterFrame } from "./characterMotion";
import { paintFace, RigDef } from "../production/procedural/characterRig";

export interface LoadedRig {
  def: RigDef;
  images: Record<string, PImage>;
  /** Cache of painted heads keyed by quantised face state. */
  faceCache: Map<string, PImage>;
}

export async function loadRig(rigJsonPath: string): Promise<LoadedRig> {
  const def = JSON.parse(await readFile(rigJsonPath, "utf8")) as RigDef;
  const dir = dirname(rigJsonPath);
  const images: Record<string, PImage> = {};
  for (const name of [...new Set([...def.parts.map((p) => p.image), def.headOverlay])]) images[name] = await decodeImageFile(join(dir, name));
  return { def, images, faceCache: new Map() };
}

export function rigFromMemory(def: RigDef, images: Record<string, PImage>): LoadedRig {
  return { def, images, faceCache: new Map() };
}

/** Margins around the reference canvas so raised arms and leans are never clipped. */
const MARGIN_X = 0.45;
const MARGIN_TOP = 0.08;
const MARGIN_BOTTOM = 0.03;

export interface RiggedFrame {
  image: PImage;
  /** Feet centre (the layer anchor) inside `image`, px. */
  anchor: [number, number];
  /** Scale from rig reference px to `image` px. */
  scale: number;
  /** Head centre in image px (for focus/lighting heuristics). */
  head: [number, number];
}

function quant(v: number, step: number) {
  return Math.round(v / step) * step;
}

function headFor(rig: LoadedRig, f: CharacterFrame): PImage {
  const p = f.face.params;
  const key = [quant(f.face.blink, 0.2), quant(f.face.eye[0], 0.15), quant(f.face.eye[1], 0.15), quant(f.face.speech, 0.1), quant(f.face.turn, 0.1), quant(p.browRaise, 0.05), quant(p.browTilt, 0.1), quant(p.eyeOpen, 0.05), quant(p.mouthCurve, 0.1), quant(p.mouthOpen, 0.1), p.tears ? 1 : 0].join(":");
  let img = rig.faceCache.get(key);
  if (!img) {
    const q = { ...f.face, blink: quant(f.face.blink, 0.2), eye: [quant(f.face.eye[0], 0.15), quant(f.face.eye[1], 0.15)] as [number, number], speech: quant(f.face.speech, 0.1), turn: quant(f.face.turn, 0.1) };
    img = paintFace(rig.images["head.png"], rig.images[rig.def.headOverlay] ?? null, rig.def.face, q);
    if (rig.faceCache.size > 400) rig.faceCache.clear();
    rig.faceCache.set(key, img);
  }
  return img;
}

/**
 * Poses the cut-out rig for one frame and composites it into an image at
 * `outScale` × the rig's reference size. Feet are kept on the ground: the
 * root is shifted so the lowest foot touches the standing ground line, which
 * also produces a natural bob in walk cycles and lowers sitting poses.
 * `clip` (output px) limits work to the visible region for close-ups.
 */
export function renderRigFrame(rig: LoadedRig, f: CharacterFrame, outScale: number, clip?: Rect): RiggedFrame {
  const d = rig.def;
  const W = Math.ceil(d.width * (1 + 2 * MARGIN_X) * outScale);
  const H = Math.ceil(d.height * (1 + MARGIN_TOP + MARGIN_BOTTOM) * outScale);
  const out = createImage(W, H);
  const groundY = d.height * (1 + MARGIN_TOP); // reference px from canvas top (feet when standing)
  const rootX = d.width * (1 + 2 * MARGIN_X) * 0.5;

  // Local frames: L(part) = L(parent) ∘ T(attach) ∘ R(angle) [∘ S(breath) for the torso]
  const local = new Map<string, Mat2D>();
  const byName = new Map(d.parts.map((p) => [p.name, p]));
  const resolve = (name: string): Mat2D => {
    const hit = local.get(name);
    if (hit) return hit;
    const part = byName.get(name as never)!;
    const angle = f.angles[name] ?? 0;
    let m: Mat2D;
    if (!part.parent) m = multiply(translate(0, 0), rotate(angle));
    else m = multiply(resolve(part.parent), multiply(translate(part.attach[0], part.attach[1]), rotate(angle)));
    if (name === "torso") m = multiply(m, scale(1 + (f.breath - 1) * 0.6, f.breath));
    local.set(name, m);
    return m;
  };
  for (const p of d.parts) resolve(p.name);

  // Ground contact: lowest point of the feet in the root frame.
  let lowest = -Infinity;
  for (const shin of ["shinL", "shinR"]) {
    const m = local.get(shin);
    if (!m) continue;
    for (const [x, y] of [[0, 24.2 * d.unit], [7.6 * d.unit, 24.2 * d.unit]]) lowest = Math.max(lowest, apply(m, x, y)[1]);
  }
  if (!Number.isFinite(lowest)) lowest = d.height - d.root[1];
  // root → output: feet on the ground line, sway around the feet
  const footX = rootX;
  const rootToRef: Mat2D = multiply(translate(footX, groundY), multiply(rotate(f.sway), translate(0, -lowest)));
  const toOut: Mat2D = multiply(scale(outScale), rootToRef);

  const shown = (name: string, optional?: boolean) => {
    if (!optional) return true;
    return (name === "propPhone" && f.holds === "phone") || (name === "propBag" && f.holds === "bag");
  };
  let head: [number, number] = [W / 2, H * 0.1];
  for (const p of d.parts) {
    if (!shown(p.name, p.optional)) continue;
    const img = p.name === "head" ? headFor(rig, f) : rig.images[p.image];
    if (!img) continue;
    const m = multiply(toOut, multiply(local.get(p.name)!, translate(-p.pivot[0], -p.pivot[1])));
    drawImageAffine(out, img, m, { clip });
    if (p.name === "head") head = apply(m, img.width / 2, img.height * 0.55) as [number, number];
  }
  return { image: out, anchor: [footX * outScale, groundY * outScale], scale: outScale, head };
}
