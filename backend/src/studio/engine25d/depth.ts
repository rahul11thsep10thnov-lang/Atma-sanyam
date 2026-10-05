import { DepthSpec } from "./spec";
import { clamp, lerp } from "./math";

/**
 * DepthEngine: maps scene depth (0 = far … 1 = near) to how strongly a plane
 * reacts to the camera. Lateral camera moves shift near planes more than far
 * ones (parallax); dolly moves scale near planes more than far ones
 * (perspective change), and atmosphere (fog/haze) thickens with distance.
 */
export function parallaxFactor(depth: number, spec: DepthSpec, lensScale = 1): number {
  return lerp(spec.parallaxFar, spec.parallaxNear, clamp(depth, 0, 1)) * lensScale;
}

export function dollyFactor(depth: number, spec: DepthSpec): number {
  return lerp(spec.dollyFar, spec.dollyNear, clamp(depth, 0, 1));
}

/** Fraction of fog colour mixed into a plane at this depth. */
export function fogAmount(depth: number, spec: DepthSpec): number {
  return clamp(spec.fogDensity * Math.pow(1 - clamp(depth, 0, 1), spec.fogCurve), 0, 0.85);
}

/** Single-channel map (depth, mask) with bilinear/nearest lookups in its own pixel space. */
export interface GrayMap {
  width: number;
  height: number;
  data: Float32Array;
}

export function sampleGray(m: GrayMap, x: number, y: number): number {
  const xi = x < 0 ? 0 : x >= m.width - 1 ? m.width - 1 : x | 0;
  const yi = y < 0 ? 0 : y >= m.height - 1 ? m.height - 1 : y | 0;
  return m.data[yi * m.width + xi];
}

/** Resamples a grey map to a new size (bilinear); used when a depth map's size differs from its image. */
export function resizeGray(m: GrayMap, width: number, height: number): GrayMap {
  if (m.width === width && m.height === height) return m;
  const out = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    const fy = Math.min(m.height - 1, Math.max(0, ((y + 0.5) * m.height) / height - 0.5));
    const y0 = Math.floor(fy);
    const y1 = Math.min(m.height - 1, y0 + 1);
    const ty = fy - y0;
    for (let x = 0; x < width; x++) {
      const fx = Math.min(m.width - 1, Math.max(0, ((x + 0.5) * m.width) / width - 0.5));
      const x0 = Math.floor(fx);
      const x1 = Math.min(m.width - 1, x0 + 1);
      const tx = fx - x0;
      const a = m.data[y0 * m.width + x0] * (1 - tx) + m.data[y0 * m.width + x1] * tx;
      const b = m.data[y1 * m.width + x0] * (1 - tx) + m.data[y1 * m.width + x1] * tx;
      out[y * width + x] = a * (1 - ty) + b * ty;
    }
  }
  return { width, height, data: out };
}

/** Light smoothing so displacement never tears along hard depth edges. */
export function smoothGray(m: GrayMap, radius: number): GrayMap {
  if (radius < 1) return m;
  const { width: w, height: h } = m;
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  const r = Math.round(radius);
  const inv = 1 / (2 * r + 1);
  for (let y = 0; y < h; y++) {
    let acc = 0;
    for (let k = -r; k <= r; k++) acc += m.data[y * w + clamp(k, 0, w - 1)];
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = acc * inv;
      acc += m.data[y * w + Math.min(w - 1, x + r + 1)] - m.data[y * w + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let k = -r; k <= r; k++) acc += tmp[clamp(k, 0, h - 1) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = acc * inv;
      acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return { width: w, height: h, data: out };
}
