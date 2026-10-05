import { createImage, PImage } from "./raster";
import { invert, Mat2D } from "./math";

export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export type BlendMode = "normal" | "multiply" | "screen" | "add";

export interface DrawOptions {
  opacity?: number;
  blend?: BlendMode;
  /** Restrict drawing to this destination rectangle (px). */
  clip?: Rect;
  /** Per-pixel colour multiplier applied to the source (lighting), RGB. */
  tint?: [number, number, number];
  /** Fill the source's alpha with a flat colour instead of its pixels (silhouettes, shadows). */
  flatColor?: [number, number, number];
}

/**
 * Draws `src` onto `dst` through the affine transform `m` (source px →
 * destination px) with bilinear filtering, premultiplied "over" (or another
 * blend mode). This is the single compositing primitive of the 2.5D engine:
 * layers, rig parts, sprites and particles all go through it.
 */
export function drawImageAffine(dst: PImage, src: PImage, m: Mat2D, opts: DrawOptions = {}): void {
  const opacity = opts.opacity ?? 1;
  if (opacity <= 0) return;
  const inv = invert(m);
  // destination bounds of the transformed source rectangle
  const corners = [
    [0, 0],
    [src.width, 0],
    [0, src.height],
    [src.width, src.height],
  ].map(([x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]);
  let x0 = Math.floor(Math.min(...corners.map((c) => c[0])));
  let y0 = Math.floor(Math.min(...corners.map((c) => c[1])));
  let x1 = Math.ceil(Math.max(...corners.map((c) => c[0])));
  let y1 = Math.ceil(Math.max(...corners.map((c) => c[1])));
  const clip = opts.clip ?? { x0: 0, y0: 0, x1: dst.width, y1: dst.height };
  x0 = Math.max(x0, Math.floor(clip.x0), 0);
  y0 = Math.max(y0, Math.floor(clip.y0), 0);
  x1 = Math.min(x1, Math.ceil(clip.x1), dst.width);
  y1 = Math.min(y1, Math.ceil(clip.y1), dst.height);
  if (x0 >= x1 || y0 >= y1) return;

  const sw = src.width;
  const sh = src.height;
  const s = src.data;
  const d = dst.data;
  const dw = dst.width;
  const blend = opts.blend ?? "normal";
  const tint = opts.tint;
  const flat = opts.flatColor;
  // Downscaling more than 2× with plain bilinear aliases; pick a box pre-filter radius from the scale.
  const scaleX = Math.hypot(m[0], m[1]);
  const scaleY = Math.hypot(m[2], m[3]);
  const minify = Math.min(scaleX, scaleY) < 0.5;
  const ia = inv[0],
    ib = inv[1],
    ic = inv[2],
    id = inv[3],
    ie = inv[4],
    iff = inv[5];

  for (let y = y0; y < y1; y++) {
    const py = y + 0.5;
    for (let x = x0; x < x1; x++) {
      const px = x + 0.5;
      const sx = ia * px + ic * py + ie - 0.5;
      const sy = ib * px + id * py + iff - 0.5;
      if (sx <= -1 || sy <= -1 || sx >= sw || sy >= sh) continue;
      let r: number, g: number, b: number, a: number;
      if (minify) {
        // 4-tap supersample over the source footprint
        r = g = b = a = 0;
        const fx = 0.25 / scaleX;
        const fy = 0.25 / scaleY;
        for (let k = 0; k < 4; k++) {
          const ox = k & 1 ? fx : -fx;
          const oy = k & 2 ? fy : -fy;
          const ix = Math.round(sx + ox);
          const iy = Math.round(sy + oy);
          if (ix < 0 || iy < 0 || ix >= sw || iy >= sh) continue;
          const o = (iy * sw + ix) * 4;
          r += s[o];
          g += s[o + 1];
          b += s[o + 2];
          a += s[o + 3];
        }
        r *= 0.25;
        g *= 0.25;
        b *= 0.25;
        a *= 0.25;
      } else {
        const fx = Math.floor(sx);
        const fy = Math.floor(sy);
        const tx = sx - fx;
        const ty = sy - fy;
        r = g = b = a = 0;
        for (let j = 0; j < 2; j++) {
          const yy = fy + j;
          if (yy < 0 || yy >= sh) continue;
          const wy = j ? ty : 1 - ty;
          for (let i = 0; i < 2; i++) {
            const xx = fx + i;
            if (xx < 0 || xx >= sw) continue;
            const w = (i ? tx : 1 - tx) * wy;
            const o = (yy * sw + xx) * 4;
            r += s[o] * w;
            g += s[o + 1] * w;
            b += s[o + 2] * w;
            a += s[o + 3] * w;
          }
        }
      }
      if (a <= 1e-5) continue;
      if (flat) {
        r = flat[0] * a;
        g = flat[1] * a;
        b = flat[2] * a;
      } else if (tint) {
        r *= tint[0];
        g *= tint[1];
        b *= tint[2];
      }
      r *= opacity;
      g *= opacity;
      b *= opacity;
      a *= opacity;
      const o = (y * dw + x) * 4;
      blendPixel(d, o, r, g, b, a, blend);
    }
  }
}

export function blendPixel(d: Float32Array, o: number, r: number, g: number, b: number, a: number, blend: BlendMode): void {
  if (blend === "normal") {
    const inv = 1 - a;
    d[o] = r + d[o] * inv;
    d[o + 1] = g + d[o + 1] * inv;
    d[o + 2] = b + d[o + 2] * inv;
    d[o + 3] = a + d[o + 3] * inv;
  } else if (blend === "add") {
    d[o] += r;
    d[o + 1] += g;
    d[o + 2] += b;
    d[o + 3] = Math.min(1, d[o + 3] + a);
  } else if (blend === "screen") {
    d[o] = r + d[o] - r * d[o];
    d[o + 1] = g + d[o + 1] - g * d[o + 1];
    d[o + 2] = b + d[o + 2] - b * d[o + 2];
    d[o + 3] = a + d[o + 3] - a * d[o + 3];
  } else {
    // multiply (premultiplied): src*dst + src*(1-da) + dst*(1-sa)
    const da = d[o + 3];
    d[o] = r * d[o] + r * (1 - da) + d[o] * (1 - a);
    d[o + 1] = g * d[o + 1] + g * (1 - da) + d[o + 1] * (1 - a);
    d[o + 2] = b * d[o + 2] + b * (1 - da) + d[o + 2] * (1 - a);
    d[o + 3] = a + da * (1 - a);
  }
}

/** Composites `src` (same size) over `dst` in place. */
export function compositeOverSame(dst: PImage, src: PImage, opacity = 1): void {
  const d = dst.data;
  const s = src.data;
  for (let i = 0; i < d.length; i += 4) {
    const a = s[i + 3] * opacity;
    if (a <= 0) continue;
    const inv = 1 - a;
    d[i] = s[i] * opacity + d[i] * inv;
    d[i + 1] = s[i + 1] * opacity + d[i + 1] * inv;
    d[i + 2] = s[i + 2] * opacity + d[i + 2] * inv;
    d[i + 3] = a + d[i + 3] * inv;
  }
}

/** Copies a sub-rectangle into a new image. */
export function cropImage(src: PImage, r: Rect): PImage {
  const x0 = Math.max(0, Math.floor(r.x0));
  const y0 = Math.max(0, Math.floor(r.y0));
  const x1 = Math.min(src.width, Math.ceil(r.x1));
  const y1 = Math.min(src.height, Math.ceil(r.y1));
  const out = createImage(Math.max(1, x1 - x0), Math.max(1, y1 - y0));
  for (let y = y0; y < y1; y++) {
    const so = (y * src.width + x0) * 4;
    out.data.set(src.data.subarray(so, so + (x1 - x0) * 4), (y - y0) * out.width * 4);
  }
  return out;
}

/** Fills the whole image with an opaque colour. */
export function fillImage(img: PImage, rgb: [number, number, number], a = 1): void {
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = rgb[0] * a;
    d[i + 1] = rgb[1] * a;
    d[i + 2] = rgb[2] * a;
    d[i + 3] = a;
  }
}
