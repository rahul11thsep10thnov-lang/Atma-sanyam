import { createImage, PImage } from "./raster";
import { invert, Mat2D } from "./math";
import type { LightMap } from "./lighting";

export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export type BlendMode = "normal" | "multiply" | "screen" | "add";

/**
 * Screen-space light multipliers derived from a LightMap, evaluated a row at a
 * time (the per-pixel cost is a single lerp). "absolute": the layer is painted
 * in neutral light and receives the scene's light (characters, props).
 * "relative": the layer is already lit for its time of day (environment
 * plates) and only receives local variations (practical lights, passing
 * train light).
 */
export class LightField {
  private readonly n: Float32Array; // normalised map (w*h*3)
  private readonly colIdx: Int32Array;
  private readonly colT: Float32Array;
  constructor(
    readonly map: LightMap,
    readonly mode: "absolute" | "relative",
    exposure: number,
    width: number,
  ) {
    const { w, h, data, ambient } = map;
    this.n = new Float32Array(w * h * 3);
    for (let i = 0; i < w * h; i++)
      for (let c = 0; c < 3; c++) {
        const v = data[i * 3 + c];
        this.n[i * 3 + c] = mode === "absolute" ? v / exposure - 1 : ((v - ambient[c]) / Math.max(0.05, ambient[c])) * 0.5;
      }
    this.colIdx = new Int32Array(width);
    this.colT = new Float32Array(width);
    for (let x = 0; x < width; x++) {
      const fx = Math.min(w - 1, Math.max(0, (x + 0.5) / map.scale - 0.5));
      this.colIdx[x] = Math.min(w - 2, fx | 0) < 0 ? 0 : Math.min(w - 2, fx | 0);
      this.colT[x] = w > 1 ? fx - this.colIdx[x] : 0;
    }
  }

  private colBuf = new Float32Array(0);

  /** Multipliers for pixels x0..x1-1 of row y into out[(x-x0)*3+c]. */
  fillRow(y: number, x0: number, x1: number, response: number, out: Float32Array): void {
    const { w, h, scale } = this.map;
    const fy = Math.min(h - 1, Math.max(0, (y + 0.5) / scale - 0.5));
    const y0 = h > 1 ? Math.min(h - 2, fy | 0) : 0;
    const ty = h > 1 ? fy - y0 : 0;
    const r0 = y0 * w * 3;
    const r1 = (h > 1 ? y0 + 1 : y0) * w * 3;
    const n = this.n;
    // vertical lerp once per texel column, then a horizontal lerp per pixel
    if (this.colBuf.length < w * 3 + 3) this.colBuf = new Float32Array(w * 3 + 3);
    const col = this.colBuf;
    for (let i = 0; i < w * 3; i++) col[i] = (n[r0 + i] + (n[r1 + i] - n[r0 + i]) * ty) * response;
    col[w * 3] = col[w * 3 - 3];
    col[w * 3 + 1] = col[w * 3 - 2];
    col[w * 3 + 2] = col[w * 3 - 1];
    const rel = this.mode === "relative";
    const ci = this.colIdx;
    const ct = this.colT;
    for (let x = x0, o = 0; x < x1; x++, o += 3) {
      const c = ci[x] * 3;
      const tx = ct[x];
      let m0 = 1 + col[c] + (col[c + 3] - col[c]) * tx;
      let m1 = 1 + col[c + 1] + (col[c + 4] - col[c + 1]) * tx;
      let m2 = 1 + col[c + 2] + (col[c + 5] - col[c + 2]) * tx;
      if (rel) {
        m0 = m0 < 0.6 ? 0.6 : m0 > 2.4 ? 2.4 : m0;
        m1 = m1 < 0.6 ? 0.6 : m1 > 2.4 ? 2.4 : m1;
        m2 = m2 < 0.6 ? 0.6 : m2 > 2.4 ? 2.4 : m2;
      } else {
        if (m0 < 0) m0 = 0;
        if (m1 < 0) m1 = 0;
        if (m2 < 0) m2 = 0;
      }
      out[o] = m0;
      out[o + 1] = m1;
      out[o + 2] = m2;
    }
  }
}

export interface DrawOptions {
  opacity?: number;
  blend?: BlendMode;
  /** Restrict drawing to this destination rectangle (px). */
  clip?: Rect;
  /** Per-pixel colour multiplier applied to the source, RGB. */
  tint?: [number, number, number];
  /** Fill the source's alpha with a flat colour instead of its pixels (silhouettes, shadows). */
  flatColor?: [number, number, number];
  /** Screen-space lighting (see LightField). */
  light?: { field: LightField; response: number };
  /** Atmospheric fog mixed in after lighting. */
  fog?: { rgb: [number, number, number]; amount: number };
}

let rowBuf = new Float32Array(4096 * 3);

/**
 * Draws `src` onto `dst` through the affine transform `m` (source px →
 * destination px) with bilinear filtering, premultiplied "over" (or another
 * blend mode). The single compositing primitive of the 2.5D engine: layers,
 * rig parts, sprites and particles all go through it.
 */
export function drawImageAffine(dst: PImage, src: PImage, m: Mat2D, opts: DrawOptions = {}): void {
  const opacity = opts.opacity ?? 1;
  if (opacity <= 0) return;
  const inv = invert(m);
  const sw = src.width;
  const sh = src.height;
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (let k = 0; k < 4; k++) {
    const cx = k & 1 ? sw : 0;
    const cy = k & 2 ? sh : 0;
    const px = m[0] * cx + m[2] * cy + m[4];
    const py = m[1] * cx + m[3] * cy + m[5];
    if (px < x0) x0 = px;
    if (px > x1) x1 = px;
    if (py < y0) y0 = py;
    if (py > y1) y1 = py;
  }
  const clip = opts.clip;
  x0 = Math.max(Math.floor(x0), clip ? Math.floor(clip.x0) : 0, 0);
  y0 = Math.max(Math.floor(y0), clip ? Math.floor(clip.y0) : 0, 0);
  x1 = Math.min(Math.ceil(x1), clip ? Math.ceil(clip.x1) : dst.width, dst.width);
  y1 = Math.min(Math.ceil(y1), clip ? Math.ceil(clip.y1) : dst.height, dst.height);
  if (x0 >= x1 || y0 >= y1) return;

  const s = src.data;
  const d = dst.data;
  const dw = dst.width;
  const blend = opts.blend ?? "normal";
  const normal = blend === "normal";
  const tint = opts.tint;
  const flat = opts.flatColor;
  const light = opts.light;
  const fogA = opts.fog && opts.fog.amount > 0.002 ? opts.fog.amount : 0;
  const fogR = opts.fog ? opts.fog.rgb[0] * fogA : 0;
  const fogG = opts.fog ? opts.fog.rgb[1] * fogA : 0;
  const fogB = opts.fog ? opts.fog.rgb[2] * fogA : 0;
  const keep = 1 - fogA;
  const scaleX = Math.hypot(m[0], m[1]);
  const scaleY = Math.hypot(m[2], m[3]);
  // Strong minification aliases with plain bilinear: use a 4-tap footprint instead.
  const minify = Math.min(scaleX, scaleY) < 0.5;
  const ia = inv[0],
    ib = inv[1],
    ic = inv[2],
    id = inv[3],
    ie = inv[4],
    iff = inv[5];
  if (light && rowBuf.length < (x1 - x0) * 3) rowBuf = new Float32Array((x1 - x0) * 3);
  const lrow = rowBuf;
  const mfx = 0.25 / scaleX;
  const mfy = 0.25 / scaleY;

  for (let y = y0; y < y1; y++) {
    const py = y + 0.5;
    let rowLit = false;
    // source coords at the row start, stepping (ia, ib) per pixel
    let sx = ia * (x0 + 0.5) + ic * py + ie - 0.5;
    let sy = ib * (x0 + 0.5) + id * py + iff - 0.5;
    for (let x = x0; x < x1; x++, sx += ia, sy += ib) {
      if (sx <= -1 || sy <= -1 || sx >= sw || sy >= sh) continue;
      let r = 0,
        g = 0,
        b = 0,
        a = 0;
      if (minify) {
        for (let k = 0; k < 4; k++) {
          const ix = Math.round(sx + (k & 1 ? mfx : -mfx));
          const iy = Math.round(sy + (k & 2 ? mfy : -mfy));
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
        const fx1 = fx + 1;
        const fy1 = fy + 1;
        const vx0 = fx >= 0;
        const vx1 = fx1 < sw;
        const vy0 = fy >= 0;
        const vy1 = fy1 < sh;
        const w00 = (1 - tx) * (1 - ty);
        const w01 = tx * (1 - ty);
        const w10 = (1 - tx) * ty;
        const w11 = tx * ty;
        if (vy0) {
          const row = fy * sw;
          if (vx0) {
            const o = (row + fx) * 4;
            r += s[o] * w00;
            g += s[o + 1] * w00;
            b += s[o + 2] * w00;
            a += s[o + 3] * w00;
          }
          if (vx1) {
            const o = (row + fx1) * 4;
            r += s[o] * w01;
            g += s[o + 1] * w01;
            b += s[o + 2] * w01;
            a += s[o + 3] * w01;
          }
        }
        if (vy1) {
          const row = fy1 * sw;
          if (vx0) {
            const o = (row + fx) * 4;
            r += s[o] * w10;
            g += s[o + 1] * w10;
            b += s[o + 2] * w10;
            a += s[o + 3] * w10;
          }
          if (vx1) {
            const o = (row + fx1) * 4;
            r += s[o] * w11;
            g += s[o + 1] * w11;
            b += s[o + 2] * w11;
            a += s[o + 3] * w11;
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
      if (light) {
        if (!rowLit) {
          light.field.fillRow(y, x0, x1, light.response, lrow);
          rowLit = true;
        }
        const lo = (x - x0) * 3;
        r *= lrow[lo];
        g *= lrow[lo + 1];
        b *= lrow[lo + 2];
      }
      if (fogA > 0) {
        r = r * keep + fogR * a;
        g = g * keep + fogG * a;
        b = b * keep + fogB * a;
      }
      r *= opacity;
      g *= opacity;
      b *= opacity;
      a *= opacity;
      const o = (y * dw + x) * 4;
      if (normal) {
        const inv1 = 1 - a;
        d[o] = r + d[o] * inv1;
        d[o + 1] = g + d[o + 1] * inv1;
        d[o + 2] = b + d[o + 2] * inv1;
        d[o + 3] = a + d[o + 3] * inv1;
      } else blendPixel(d, o, r, g, b, a, blend);
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
