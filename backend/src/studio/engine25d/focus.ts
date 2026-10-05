import { FocusSpec } from "./spec";
import { blurImage, createImage, downscale, PImage } from "./raster";
import { segmentProgress } from "./math";

/**
 * FocusEngine: where the lens is focused at time t (with rack focus), and how
 * much each depth is defocused. Blur is expressed in screen pixels at the
 * output resolution (the spec's aperture is defined for a 1080-px-wide frame).
 */
export function focusDepthAt(spec: FocusSpec, u: number, layerDepthOf: (key: string) => number | undefined): number {
  const base = spec.focusLayerKey ? (layerDepthOf(spec.focusLayerKey) ?? spec.focusDepth) : spec.focusDepth;
  if (!spec.rack) return base;
  const p = segmentProgress(u, spec.rack.startTime, spec.rack.endTime, spec.rack.easing);
  // a rack pulls from `from` to the subject (`to` is normally the subject's depth)
  const to = spec.focusLayerKey ? base : spec.rack.to;
  return spec.rack.from + (to - spec.rack.from) * p;
}

export function blurRadiusPx(spec: FocusSpec, depth: number, focusDepth: number, frameWidth: number): number {
  return spec.aperture * Math.abs(depth - focusDepth) * (frameWidth / 1080);
}

/**
 * Cache of pre-blurred copies of a source image. Big blurs are stored at
 * reduced resolution (a blurred image has no high frequencies to lose), so a
 * rack focus over a large background stays cheap in time and memory.
 * Radii are quantised in ~12% steps — below what the eye notices frame to frame.
 */
export class BlurCache {
  private levels = new Map<number, { img: PImage; factor: number }>();
  constructor(
    private readonly src: PImage,
    private readonly maxEntries = 12,
  ) {}

  /** Number of blur levels built (diagnostics). */
  static builds = 0;

  static quantise(radius: number): number {
    if (radius < 0.6) return 0;
    return Math.round(Math.log(radius / 0.6) / Math.log(1.12));
  }

  static radiusOf(q: number): number {
    return q === 0 ? 0 : 0.6 * Math.pow(1.12, q);
  }

  /** Blurred copy for a radius in *source* pixels; `factor` = source px per stored px. */
  get(radiusSrc: number): { img: PImage; factor: number } {
    const q = BlurCache.quantise(radiusSrc);
    if (q === 0) return { img: this.src, factor: 1 };
    const hit = this.levels.get(q);
    if (hit) return hit;
    const r = BlurCache.radiusOf(q);
    let factor = 1;
    while (factor * 2 <= r / 1.5 && factor < 16) factor *= 2;
    const small = factor > 1 ? downscale(this.src, factor) : this.src;
    const entry = { img: blurImage(small, r / factor), factor };
    BlurCache.builds++;
    if (this.levels.size >= this.maxEntries) this.levels.delete(this.levels.keys().next().value!);
    this.levels.set(q, entry);
    return entry;
  }
}

/** Horizontal motion blur (box) — used for fast-moving layers and whip pans. */
export function motionBlurH(src: PImage, lengthPx: number): PImage {
  const r = Math.round(lengthPx / 2);
  if (r < 1) return src;
  const { width: w, height: h } = src;
  const out = createImage(w, h);
  const s = src.data;
  const d = out.data;
  const inv = 1 / (2 * r + 1);
  for (let y = 0; y < h; y++) {
    const row = y * w * 4;
    for (let c = 0; c < 4; c++) {
      let acc = 0;
      for (let k = -r; k <= r; k++) acc += s[row + Math.min(w - 1, Math.max(0, k)) * 4 + c];
      for (let x = 0; x < w; x++) {
        d[row + x * 4 + c] = acc * inv;
        acc += s[row + Math.min(w - 1, x + r + 1) * 4 + c] - s[row + Math.max(0, x - r) * 4 + c];
      }
    }
  }
  return out;
}
