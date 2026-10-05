import { PImage } from "../../engine25d/raster";
import { hash01 } from "../../engine25d/math";
import { Painter, Paint, RGBA, rgb, shade, solid } from "./painter";

export interface PropRequest {
  painter: string;
  width: number;
  height: number;
  seed: number;
  timeOfDay?: string;
}

const f = (h: string, k = 1): Paint => ({ kind: "solid", color: shade(rgb(h), k) });
const grad = (h: string, x0: number, x1: number): Paint => {
  const c = rgb(h);
  return { kind: "linear", x0, y0: 0, x1, y1: 0, stops: [[0, shade(c, 0.8)], [0.6, c], [1, shade(c, 1.1)]] as [number, RGBA][] };
};

/**
 * Procedural props (transparent background). Everything is generic: no
 * brands, no readable text, nothing graphic. Images are painted to fill the
 * requested box with the object's base on the bottom edge.
 */
export function paintProp(r: PropRequest): { image: PImage; metadata: Record<string, unknown> } {
  const p = new Painter(r.width, r.height);
  const W = r.width;
  const H = r.height;
  switch (r.painter) {
    case "suitcase": {
      const x0 = W * 0.18;
      const x1 = W * 0.82;
      const top = H * 0.2;
      p.line([W * 0.4, top, W * 0.4, H * 0.07, W * 0.6, H * 0.07, W * 0.6, top], Math.max(2, W * 0.035), f("#2a2420")); // handle
      p.roundRect(x0, top, x1 - x0, H * 0.74, W * 0.06, grad("#7a4f2e", x0, x1));
      for (const fx of [0.3, 0.5, 0.7]) p.rect(W * fx - W * 0.012, top, W * 0.024, H * 0.74, f("#5e3c22"));
      p.rect(x0, top + H * 0.32, x1 - x0, H * 0.03, f("#3a2616"));
      for (const fx of [0.26, 0.74]) p.ellipse(W * fx, H * 0.97, W * 0.035, H * 0.025, f("#151515"));
      break;
    }
    case "duffel": {
      p.curve(W * 0.25, H * 0.42, W * 0.5, H * 0.02, W * 0.75, H * 0.42, Math.max(2, W * 0.035), f("#3a2c20"));
      p.roundRect(W * 0.1, H * 0.38, W * 0.8, H * 0.6, H * 0.18, grad("#6b5a3a", W * 0.1, W * 0.9));
      p.rect(W * 0.1, H * 0.55, W * 0.8, H * 0.05, f("#4a3d27"));
      p.rect(W * 0.3, H * 0.62, W * 0.4, H * 0.22, f("#5c4c31"));
      break;
    }
    case "phone": {
      p.roundRect(W * 0.2, H * 0.05, W * 0.6, H * 0.9, W * 0.1, f("#1a1c20"));
      p.roundRect(W * 0.26, H * 0.11, W * 0.48, H * 0.78, W * 0.05, { kind: "linear", x0: 0, y0: H * 0.1, x1: 0, y1: H * 0.9, stops: [[0, rgb("#2c3c52")], [1, rgb("#1c2634")]] });
      break;
    }
    case "documents": {
      // stacked sheets with unreadable "lines", a file folder and a tie string
      p.poly([W * 0.08, H * 0.42, W * 0.86, H * 0.32, W * 0.94, H * 0.88, W * 0.14, H * 0.98], f("#c9a86a"));
      for (let k = 0; k < 3; k++) {
        const o = k * W * 0.015;
        p.poly([W * 0.14 + o, H * (0.36 - k * 0.02), W * 0.84 + o, H * (0.27 - k * 0.02), W * 0.9 + o, H * (0.82 - k * 0.02), W * 0.2 + o, H * (0.9 - k * 0.02)], f(k === 2 ? "#f2eee4" : "#e4ded0"));
      }
      for (let l = 0; l < 9; l++) {
        const t = 0.12 + l * 0.08;
        const len = 0.45 + hash01(r.seed, l) * 0.2;
        p.line([W * (0.26 + t * 0.07), H * (0.36 + t * 0.55 - 0.1 * (1 - t) * 0.5), W * (0.26 + t * 0.07 + len * 0.62), H * (0.36 + t * 0.55 - 0.1 * (1 - t) * 0.5 - len * 0.09)], Math.max(1, H * 0.008), solid(0.35, 0.35, 0.4, 0.45));
      }
      p.line([W * 0.5, H * 0.25, W * 0.55, H * 0.95], Math.max(1.5, W * 0.008), f("#b23a30"));
      break;
    }
    case "envelope": {
      p.poly([W * 0.08, H * 0.3, W * 0.92, H * 0.22, W * 0.95, H * 0.86, W * 0.1, H * 0.94], f("#d8c39a"));
      p.poly([W * 0.08, H * 0.3, W * 0.92, H * 0.22, W * 0.52, H * 0.6], f("#c4ad84"));
      p.line([W * 0.08, H * 0.3, W * 0.52, H * 0.6, W * 0.92, H * 0.22], Math.max(1, W * 0.006), solid(0.4, 0.32, 0.22, 0.6));
      break;
    }
    case "bench": {
      const legC = f("#3d4448");
      p.rect(W * 0.06, H * 0.12, W * 0.88, H * 0.1, f("#5f7d70"));
      p.rect(W * 0.06, H * 0.26, W * 0.88, H * 0.1, f("#5f7d70"));
      p.rect(W * 0.03, H * 0.48, W * 0.94, H * 0.12, grad("#6f8f80", 0, W));
      for (const fx of [0.1, 0.5, 0.88]) {
        p.rect(W * fx - W * 0.012, H * 0.1, W * 0.024, H * 0.4, legC);
        p.poly([W * fx - W * 0.02, H * 0.6, W * fx + W * 0.02, H * 0.6, W * fx + W * 0.05, H, W * fx + W * 0.02, H, W * fx, H * 0.7, W * fx - W * 0.02, H, W * fx - W * 0.05, H], legC);
      }
      break;
    }
    case "scooter": {
      p.ellipse(W * 0.2, H * 0.8, H * 0.17, H * 0.17, f("#151517"));
      p.ellipse(W * 0.8, H * 0.8, H * 0.17, H * 0.17, f("#151517"));
      p.ellipse(W * 0.2, H * 0.8, H * 0.07, H * 0.07, f("#9aa0a6"));
      p.ellipse(W * 0.8, H * 0.8, H * 0.07, H * 0.07, f("#9aa0a6"));
      p.poly([W * 0.08, H * 0.7, W * 0.3, H * 0.52, W * 0.62, H * 0.5, W * 0.72, H * 0.24, W * 0.8, H * 0.24, W * 0.82, H * 0.7, W * 0.6, H * 0.74, W * 0.35, H * 0.74], grad("#8f2f2a", 0, W));
      p.roundRect(W * 0.28, H * 0.42, W * 0.32, H * 0.08, H * 0.03, f("#1d1d1f"));
      p.line([W * 0.74, H * 0.24, W * 0.68, H * 0.12, W * 0.78, H * 0.1], Math.max(2, W * 0.012), f("#2a2a2c"));
      p.ellipse(W * 0.84, H * 0.36, W * 0.02, H * 0.035, f("#f2e7b8"));
      break;
    }
    default: {
      p.roundRect(W * 0.2, H * 0.3, W * 0.6, H * 0.68, W * 0.06, grad("#7d7a74", W * 0.2, W * 0.8));
    }
  }
  p.ink(0.65, 0.1).grain(0.04, r.seed);
  return { image: p.img, metadata: { painter: r.painter } };
}
