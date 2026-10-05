import { createImage, PImage } from "../../engine25d/raster";
import { hash01, mulberry32 } from "../../engine25d/math";

export type RGBA = [number, number, number, number];
export type Paint =
  | { kind: "solid"; color: RGBA }
  | { kind: "linear"; x0: number; y0: number; x1: number; y1: number; stops: [number, RGBA][] }
  | { kind: "radial"; cx: number; cy: number; r: number; stops: [number, RGBA][] };

export const solid = (r: number, g: number, b: number, a = 1): Paint => ({ kind: "solid", color: [r, g, b, a] });
export const rgb = (hex: string, a = 1): RGBA => {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, a];
};
export const hex = (h: string, a = 1): Paint => ({ kind: "solid", color: rgb(h, a) });
export const mix = (a: RGBA, b: RGBA, t: number): RGBA => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t];
export const shade = (c: RGBA, k: number): RGBA => [c[0] * k, c[1] * k, c[2] * k, c[3]];

function evalStops(stops: [number, RGBA][], t: number): RGBA {
  if (t <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [t0, c0] = stops[i - 1];
      const [t1, c1] = stops[i];
      return mix(c0, c1, (t - t0) / Math.max(1e-6, t1 - t0));
    }
  }
  return stops[stops.length - 1][1];
}

function paintAt(p: Paint, x: number, y: number): RGBA {
  if (p.kind === "solid") return p.color;
  if (p.kind === "linear") {
    const dx = p.x1 - p.x0;
    const dy = p.y1 - p.y0;
    const len2 = dx * dx + dy * dy || 1;
    return evalStops(p.stops, ((x - p.x0) * dx + (y - p.y0) * dy) / len2);
  }
  return evalStops(p.stops, Math.hypot(x - p.cx, y - p.cy) / p.r);
}

const SUBSAMPLES = 4;

/**
 * Minimal anti-aliased vector rasteriser (polygons, ellipses, gradients) that
 * paints into a premultiplied float image. It powers the offline procedural
 * art used when no local image model is configured.
 */
export class Painter {
  readonly img: PImage;
  readonly w: number;
  readonly h: number;
  private cov: Float32Array;

  constructor(width: number, height: number) {
    this.w = width;
    this.h = height;
    this.img = createImage(width, height);
    this.cov = new Float32Array(width + 2);
  }

  /** Fill a polygon given as flat [x0,y0,x1,y1,…] in pixels (even-odd rule). */
  poly(points: number[], paint: Paint, opacity = 1): this {
    const n = points.length / 2;
    if (n < 3) return this;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (let i = 0; i < n; i++) {
      const x = points[i * 2];
      const y = points[i * 2 + 1];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const y0 = Math.max(0, Math.floor(minY));
    const y1 = Math.min(this.h - 1, Math.ceil(maxY));
    const bx0 = Math.max(0, Math.floor(minX));
    const bx1 = Math.min(this.w - 1, Math.ceil(maxX));
    if (y0 > y1 || bx0 > bx1) return this;
    const xs: number[] = [];
    const d = this.img.data;
    for (let y = y0; y <= y1; y++) {
      this.cov.fill(0, 0, bx1 - bx0 + 2);
      let any = false;
      for (let s = 0; s < SUBSAMPLES; s++) {
        const sy = y + (s + 0.5) / SUBSAMPLES;
        xs.length = 0;
        for (let i = 0; i < n; i++) {
          const ax = points[i * 2];
          const ay = points[i * 2 + 1];
          const j = (i + 1) % n;
          const bx = points[j * 2];
          const by = points[j * 2 + 1];
          if ((ay <= sy && by > sy) || (by <= sy && ay > sy)) xs.push(ax + ((sy - ay) * (bx - ax)) / (by - ay));
        }
        if (xs.length < 2) continue;
        xs.sort((a, b) => a - b);
        for (let k = 0; k + 1 < xs.length; k += 2) {
          const xa = Math.max(bx0, xs[k]);
          const xb = Math.min(bx1 + 1, xs[k + 1]);
          if (xb <= xa) continue;
          any = true;
          const ia = Math.floor(xa);
          const ib = Math.floor(xb);
          for (let ix = ia; ix <= ib && ix <= bx1; ix++) {
            const c = Math.min(xb, ix + 1) - Math.max(xa, ix);
            if (c > 0) this.cov[ix - bx0] += c / SUBSAMPLES;
          }
        }
      }
      if (!any) continue;
      for (let x = bx0; x <= bx1; x++) {
        const cv = this.cov[x - bx0];
        if (cv <= 0) continue;
        const col = paintAt(paint, x + 0.5, y + 0.5);
        const a = Math.min(1, cv) * col[3] * opacity;
        if (a <= 0) continue;
        const o = (y * this.w + x) * 4;
        const inv = 1 - a;
        d[o] = col[0] * a + d[o] * inv;
        d[o + 1] = col[1] * a + d[o + 1] * inv;
        d[o + 2] = col[2] * a + d[o + 2] * inv;
        d[o + 3] = a + d[o + 3] * inv;
      }
    }
    return this;
  }

  rect(x: number, y: number, w: number, h: number, paint: Paint, opacity = 1): this {
    return this.poly([x, y, x + w, y, x + w, y + h, x, y + h], paint, opacity);
  }

  roundRect(x: number, y: number, w: number, h: number, r: number, paint: Paint, opacity = 1): this {
    const pts: number[] = [];
    const rr = Math.min(r, w / 2, h / 2);
    const corner = (cx: number, cy: number, a0: number) => {
      for (let i = 0; i <= 6; i++) {
        const a = a0 + (i / 6) * (Math.PI / 2);
        pts.push(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      }
    };
    corner(x + w - rr, y + rr, -Math.PI / 2);
    corner(x + w - rr, y + h - rr, 0);
    corner(x + rr, y + h - rr, Math.PI / 2);
    corner(x + rr, y + rr, Math.PI);
    return this.poly(pts, paint, opacity);
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, paint: Paint, opacity = 1, rotationDeg = 0): this {
    const n = Math.max(24, Math.min(160, Math.round((rx + ry) * 0.8)));
    const pts: number[] = [];
    const c = Math.cos((rotationDeg * Math.PI) / 180);
    const s = Math.sin((rotationDeg * Math.PI) / 180);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const ex = Math.cos(a) * rx;
      const ey = Math.sin(a) * ry;
      pts.push(cx + ex * c - ey * s, cy + ex * s + ey * c);
    }
    return this.poly(pts, paint, opacity);
  }

  /** Thick line segment(s) as quads with rounded caps. */
  line(points: number[], width: number, paint: Paint, opacity = 1): this {
    for (let i = 0; i + 3 < points.length; i += 2) {
      const [x0, y0, x1, y1] = [points[i], points[i + 1], points[i + 2], points[i + 3]];
      const dx = x1 - x0;
      const dy = y1 - y0;
      const len = Math.hypot(dx, dy) || 1;
      const nx = (-dy / len) * (width / 2);
      const ny = (dx / len) * (width / 2);
      this.poly([x0 + nx, y0 + ny, x1 + nx, y1 + ny, x1 - nx, y1 - ny, x0 - nx, y0 - ny], paint, opacity);
      this.ellipse(x1, y1, width / 2, width / 2, paint, opacity);
    }
    if (points.length >= 2) this.ellipse(points[0], points[1], width / 2, width / 2, paint, opacity);
    return this;
  }

  /** Quadratic curve tube (for hair strands, folds, mouths). */
  curve(x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, width: number, paint: Paint, opacity = 1): this {
    const pts: number[] = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const a = (1 - t) * (1 - t);
      const b = 2 * (1 - t) * t;
      const c = t * t;
      pts.push(a * x0 + b * cx + c * x1, a * y0 + b * cy + c * y1);
    }
    return this.line(pts, width, paint, opacity);
  }

  /**
   * Graphic-novel ink: darkens pixels where alpha or luminance changes sharply
   * (outer silhouettes and big colour boundaries), giving drawn line work.
   */
  ink(strength = 0.75, threshold = 0.12, color: [number, number, number] = [0.08, 0.07, 0.09]): this {
    const { w, h } = this;
    const d = this.img.data;
    const lum = new Float32Array(w * h);
    const al = new Float32Array(w * h);
    for (let i = 0, j = 0; i < lum.length; i++, j += 4) {
      al[i] = d[j + 3];
      lum[i] = d[j] * 0.3 + d[j + 1] * 0.59 + d[j + 2] * 0.11;
    }
    const edge = new Float32Array(w * h);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const gxL = lum[i + 1] - lum[i - 1];
        const gyL = lum[i + w] - lum[i - w];
        const gxA = al[i + 1] - al[i - 1];
        const gyA = al[i + w] - al[i - w];
        const g = Math.max(Math.hypot(gxL, gyL), Math.hypot(gxA, gyA) * 0.9);
        edge[i] = g > threshold ? Math.min(1, (g - threshold) * 3) : 0;
      }
    }
    for (let i = 0, j = 0; i < edge.length; i++, j += 4) {
      const e = edge[i] * strength;
      if (e <= 0) continue;
      const a = Math.max(d[j + 3], e * 0.9);
      // ink over (premultiplied): blend towards ink colour with coverage e
      d[j] = d[j] * (1 - e) + color[0] * e * a;
      d[j + 1] = d[j + 1] * (1 - e) + color[1] * e * a;
      d[j + 2] = d[j + 2] * (1 - e) + color[2] * e * a;
      d[j + 3] = a;
    }
    return this;
  }

  /** Subtle printed-paper texture so flat fills don't look digital. */
  grain(amount: number, seed: number): this {
    const d = this.img.data;
    const rand = mulberry32(seed);
    for (let j = 0; j < d.length; j += 4) {
      if (d[j + 3] <= 0) continue;
      const n = 1 + (rand() - 0.5) * amount;
      d[j] *= n;
      d[j + 1] *= n;
      d[j + 2] *= n;
    }
    return this;
  }

  /** Soft vertical shading band (form shading on cylinders: bodies, pillars, coaches). */
  shadeVertical(x: number, y: number, w: number, h: number, strength: number): this {
    const d = this.img.data;
    for (let yy = Math.max(0, Math.floor(y)); yy < Math.min(this.h, Math.ceil(y + h)); yy++) {
      for (let xx = Math.max(0, Math.floor(x)); xx < Math.min(this.w, Math.ceil(x + w)); xx++) {
        const t = (xx - x) / w;
        const k = 1 - strength * Math.pow(Math.abs(t - 0.4) * 1.6, 2);
        const o = (yy * this.w + xx) * 4;
        d[o] *= k;
        d[o + 1] *= k;
        d[o + 2] *= k;
      }
    }
    return this;
  }

  /** Deterministic jitter helper for organic placement. */
  static jitter(seed: number, i: number, amount: number): number {
    return (hash01(seed, i) - 0.5) * 2 * amount;
  }
}
