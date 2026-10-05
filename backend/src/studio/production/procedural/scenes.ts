import { PImage } from "../../engine25d/raster";
import { hash01 } from "../../engine25d/math";
import { Painter, Paint, RGBA, hex, mix, rgb, shade, solid } from "./painter";

export type TimeOfDay = "morning" | "afternoon" | "evening" | "night" | "unspecified";

export interface ScenePartRequest {
  painter: string;
  part: "background" | "midground" | "foreground";
  element?: string;
  category?: string;
  substitute?: string;
  timeOfDay: TimeOfDay;
  width: number;
  height: number;
  seed: number;
  widthFactor?: number;
}

export interface ScenePartResult {
  image: PImage;
  /** Per-pixel depth (0 far … 1 near) for backgrounds: drives in-image parallax. */
  depth?: Float32Array;
  metadata: Record<string, unknown>;
}

interface Palette {
  skyTop: RGBA;
  skyMid: RGBA;
  horizon: RGBA;
  haze: RGBA;
  ground: RGBA;
  lit: RGBA; // lit window colour
  litOn: boolean;
  light: number; // overall brightness factor for painted materials
}

function palette(t: TimeOfDay): Palette {
  if (t === "night")
    return { skyTop: rgb("#060a1a"), skyMid: rgb("#0f1834"), horizon: rgb("#24335a"), haze: rgb("#1b2440"), ground: rgb("#2a2c34"), lit: rgb("#ffc978"), litOn: true, light: 0.42 };
  if (t === "evening")
    return { skyTop: rgb("#1d2b55"), skyMid: rgb("#6a4f7c"), horizon: rgb("#f2a15f"), haze: rgb("#8a6a78"), ground: rgb("#6d6460"), lit: rgb("#ffd08a"), litOn: true, light: 0.78 };
  if (t === "morning")
    return { skyTop: rgb("#7aa9d8"), skyMid: rgb("#b9d0e6"), horizon: rgb("#f3dcc0"), haze: rgb("#c8cfd8"), ground: rgb("#8e8a82"), lit: rgb("#e8eef5"), litOn: false, light: 1 };
  return { skyTop: rgb("#5e98d1"), skyMid: rgb("#a7c6e3"), horizon: rgb("#dfe8ee"), haze: rgb("#c2ccd6"), ground: rgb("#8a8780"), lit: rgb("#dfe7ef"), litOn: false, light: 1 };
}

const matColor = (pal: Palette, hexColor: string, k = 1): RGBA => {
  const c = rgb(hexColor);
  const l = pal.light * k;
  // Night/dusk materials drift towards the sky colour (ambient), keeping silhouettes readable.
  return mix([c[0] * l, c[1] * l, c[2] * l, 1], [pal.haze[0] * 0.6, pal.haze[1] * 0.6, pal.haze[2] * 0.7, 1], 1 - pal.light);
};
const mat = (pal: Palette, hexColor: string, k = 1): Paint => ({ kind: "solid", color: matColor(pal, hexColor, k) });

class DepthCanvas {
  readonly p: Painter;
  constructor(w: number, h: number) {
    this.p = new Painter(w, h);
  }
  poly(points: number[], depth: number) {
    this.p.poly(points, solid(depth, depth, depth, 1));
  }
  rect(x: number, y: number, w: number, h: number, depth: number) {
    this.poly([x, y, x + w, y, x + w, y + h, x, y + h], depth);
  }
  gradientRect(x: number, y: number, w: number, h: number, d0: number, d1: number) {
    this.p.poly([x, y, x + w, y, x + w, y + h, x, y + h], { kind: "linear", x0: 0, y0: y, x1: 0, y1: y + h, stops: [[0, [d0, d0, d0, 1]], [1, [d1, d1, d1, 1]]] });
  }
  values(): Float32Array {
    const d = this.p.img.data;
    const out = new Float32Array(this.p.w * this.p.h);
    for (let i = 0, j = 0; i < out.length; i++, j += 4) out[i] = d[j + 3] > 0 ? d[j] / d[j + 3] : 0;
    return out;
  }
}

// ---------------------------------------------------------------------------
// Shared building blocks
// ---------------------------------------------------------------------------

function sky(p: Painter, pal: Palette, horizonY: number, t: TimeOfDay, seed: number) {
  p.rect(0, 0, p.w, horizonY + 2, { kind: "linear", x0: 0, y0: 0, x1: 0, y1: horizonY, stops: [[0, pal.skyTop], [0.6, pal.skyMid], [1, pal.horizon]] });
  if (t === "evening") {
    const R = p.w * 0.55;
    p.ellipse(p.w * 0.84, horizonY - p.h * 0.01, R, R, { kind: "radial", cx: p.w * 0.84, cy: horizonY - p.h * 0.01, r: R, stops: [[0, rgb("#ffe6b4", 0.85)], [0.18, rgb("#ffbe78", 0.5)], [0.55, rgb("#ff9a50", 0.12)], [1, rgb("#ff9a50", 0)]] });
  }
  if (t === "night") {
    for (let i = 0; i < 90; i++) {
      const x = hash01(seed, i) * p.w;
      const y = hash01(seed, i, 7) * horizonY * 0.8;
      p.ellipse(x, y, 1.1, 1.1, solid(1, 1, 1, 0.25 + hash01(seed, i, 3) * 0.5));
    }
    p.ellipse(p.w * 0.16, p.h * 0.07, p.w * 0.035, p.w * 0.035, hex("#f4f1df"));
  }
  // Soft, layered clouds: clusters of translucent puffs, lit from below at dusk
  if (t !== "night") {
    for (let i = 0; i < 5; i++) {
      const cx = hash01(seed, i, 11) * p.w;
      const cy = (0.1 + hash01(seed, i, 12) * 0.3) * horizonY;
      const cw = p.w * (0.18 + hash01(seed, i, 13) * 0.22);
      for (let k = 0; k < 9; k++) {
        const ox = (hash01(seed, i * 31 + k, 14) - 0.5) * cw * 1.4;
        const oy = (hash01(seed, i * 31 + k, 15) - 0.5) * cw * 0.12;
        const r = cw * (0.22 + hash01(seed, i * 31 + k, 16) * 0.3);
        const top: RGBA = t === "evening" ? [1, 0.86, 0.8, 0.07] : [1, 1, 1, 0.11];
        const under: RGBA = t === "evening" ? [1, 0.7, 0.55, 0.06] : [0.9, 0.93, 0.97, 0.08];
        p.ellipse(cx + ox, cy + oy, r, r * 0.42, { kind: "radial", cx: cx + ox, cy: cy + oy, r, stops: [[0, top], [0.7, under], [1, [under[0], under[1], under[2], 0]]] });
      }
    }
  }
}

function skyline(p: Painter, dc: DepthCanvas, pal: Palette, baseY: number, maxH: number, seed: number, depth = 0.05) {
  let x = -p.w * 0.02;
  let i = 0;
  const color = mix(pal.haze, pal.skyTop, 0.35);
  while (x < p.w) {
    const bw = p.w * (0.05 + hash01(seed, i, 21) * 0.08);
    const bh = maxH * (0.35 + hash01(seed, i, 22) * 0.65);
    p.rect(x, baseY - bh, bw, bh + 2, { kind: "solid", color });
    dc.rect(x, baseY - bh, bw, bh + 2, depth);
    if (pal.litOn) {
      for (let wy = baseY - bh + 6; wy < baseY - 6; wy += 9) {
        for (let wx = x + 4; wx < x + bw - 4; wx += 8) {
          if (hash01(seed, Math.round(wx), Math.round(wy)) < 0.22) p.rect(wx, wy, 3, 4, { kind: "solid", color: [pal.lit[0], pal.lit[1], pal.lit[2], 0.75] });
        }
      }
    }
    if (hash01(seed, i, 23) < 0.12) {
      // water tank / tower
      p.rect(x + bw * 0.4, baseY - bh - maxH * 0.25, bw * 0.08, maxH * 0.25, { kind: "solid", color });
      p.ellipse(x + bw * 0.44, baseY - bh - maxH * 0.27, bw * 0.22, maxH * 0.06, { kind: "solid", color });
    }
    x += bw + p.w * 0.004;
    i++;
  }
  // tree blobs
  for (let t = 0; t < 10; t++) {
    const tx = hash01(seed, t, 31) * p.w;
    const r = p.w * (0.02 + hash01(seed, t, 32) * 0.03);
    p.ellipse(tx, baseY - r * 0.6, r, r * 0.8, { kind: "solid", color: shade(color, 0.85) });
    dc.poly(ellipsePts(tx, baseY - r * 0.6, r, r * 0.8), depth + 0.01);
  }
}

function ellipsePts(cx: number, cy: number, rx: number, ry: number): number[] {
  const pts: number[] = [];
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    pts.push(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry);
  }
  return pts;
}

/** Ground plane with perspective tiles, from y0 to the bottom. Depth increases towards the viewer. */
function groundPlane(p: Painter, dc: DepthCanvas, y0: number, color: Paint, lineColor: RGBA, horizonY: number, d0: number, d1: number, tiles = true) {
  p.rect(0, y0, p.w, p.h - y0, color);
  dc.gradientRect(0, y0, p.w, p.h - y0, d0, d1);
  if (!tiles) return;
  const vx = p.w * 0.5;
  // horizontal joints spaced in perspective
  for (let k = 1; k < 14; k++) {
    const t = Math.pow(k / 14, 1.8);
    const y = y0 + (p.h - y0) * t;
    p.rect(0, y, p.w, Math.max(1, 2 * t), { kind: "solid", color: lineColor });
  }
  for (let k = -12; k <= 12; k++) {
    const xb = vx + k * p.w * 0.12;
    const xt = vx + (xb - vx) * ((y0 - horizonY) / (p.h - horizonY));
    p.line([xt, y0, xb, p.h], 1.6, { kind: "solid", color: lineColor });
  }
}

function lampPost(p: Painter, x: number, topY: number, bottomY: number, pal: Palette, on: boolean) {
  p.rect(x - p.w * 0.004, topY, p.w * 0.008, bottomY - topY, mat(pal, "#3b4a44"));
  p.rect(x - p.w * 0.018, topY - p.h * 0.008, p.w * 0.036, p.h * 0.01, mat(pal, "#2e3833"));
  if (on) {
    p.ellipse(x, topY + p.h * 0.004, p.w * 0.06, p.w * 0.06, { kind: "radial", cx: x, cy: topY + p.h * 0.004, r: p.w * 0.06, stops: [[0, rgb("#fff2c8", 0.95)], [0.25, rgb("#ffd68a", 0.5)], [1, rgb("#ffb050", 0)]] });
  }
}

// ---------------------------------------------------------------------------
// Railway platform (the most detailed environment)
// ---------------------------------------------------------------------------

function railwayBackground(r: ScenePartRequest): ScenePartResult {
  const p = new Painter(r.width, r.height);
  const dc = new DepthCanvas(r.width, r.height);
  const pal = palette(r.timeOfDay);
  const W = r.width;
  const H = r.height;
  // The background plate is overscanned (1.2×): map canvas fractions into it.
  const Y = (f: number) => H * (0.5 + (f - 0.5) / 1.2);
  const horizonY = Y(0.5);
  sky(p, pal, horizonY, r.timeOfDay, r.seed);
  dc.rect(0, 0, W, horizonY, 0);
  skyline(p, dc, pal, Y(0.52), H * 0.09, r.seed + 1, 0.05);

  // Far platform: canopy, pillars, signboard, lamps
  const canopyTop = Y(0.43);
  const canopyBot = Y(0.465);
  const farFloor = Y(0.6);
  p.poly([0, canopyTop, W, canopyTop - H * 0.01, W, canopyBot, 0, canopyBot + H * 0.006], mat(pal, "#5d5f63"));
  for (let x = 0; x < W; x += W * 0.03) p.line([x, canopyTop + 2, x + W * 0.01, canopyBot - 2], 1.2, mat(pal, "#46484c")); // corrugation
  dc.rect(0, canopyTop - H * 0.01, W, farFloor - canopyTop + H * 0.02, 0.14);
  // Station building wall behind the far platform (arched openings, warm interior at dusk/night)
  const wallTop = Y(0.47);
  p.rect(0, wallTop, W, farFloor - wallTop, { kind: "linear", x0: 0, y0: wallTop, x1: 0, y1: farFloor, stops: [[0, matColor(pal, "#7d4536")], [1, matColor(pal, "#9a5a42")]] });
  for (let i = 0; i < 9; i++) {
    const ax = W * (0.02 + i * 0.115);
    const aw = W * 0.06;
    const at = wallTop + (farFloor - wallTop) * 0.22;
    p.roundRect(ax, at, aw, farFloor - at, aw / 2, pal.litOn ? { kind: "linear", x0: 0, y0: at, x1: 0, y1: farFloor, stops: [[0, rgb("#f4c27a")], [1, rgb("#c98a4e")]] } : mat(pal, "#2c2624"));
  }
  p.rect(0, wallTop, W, H * 0.006, mat(pal, "#e8dcc0"));
  p.rect(0, farFloor - H * 0.004, W, H * 0.022, mat(pal, "#8b857b"));
  p.rect(0, farFloor - H * 0.004, W, H * 0.004, mat(pal, "#d8b23a")); // far yellow edge
  for (let i = 0; i < 7; i++) {
    const x = W * (0.06 + i * 0.15);
    p.rect(x, canopyBot, W * 0.012, farFloor - canopyBot, mat(pal, "#2f4f46"));
    p.shadeVertical(x, canopyBot, W * 0.012, farFloor - canopyBot, 0.5);
  }
  // Hanging yellow station board (blank: no readable text)
  const bx = W * 0.38;
  p.rect(bx + W * 0.02, canopyBot, 2, H * 0.012, mat(pal, "#222"));
  p.rect(bx + W * 0.2, canopyBot, 2, H * 0.012, mat(pal, "#222"));
  p.rect(bx, canopyBot + H * 0.012, W * 0.24, H * 0.03, mat(pal, "#e3b62d"));
  p.rect(bx + W * 0.01, canopyBot + H * 0.015, W * 0.22, H * 0.024, { kind: "solid", color: [0, 0, 0, 0] });
  for (let k = 0; k < 3; k++) p.rect(bx + W * (0.03 + k * 0.065), canopyBot + H * 0.021, W * 0.05, H * 0.012, mat(pal, "#1d1d1d"));
  // Lamps on the far platform (match environment light positions 0.2 / 0.66 at y 0.47)
  const lampOn = pal.litOn;
  for (const fx of [0.2, 0.66]) lampPost(p, W * (0.5 + (fx - 0.5) / 1.2), Y(0.47), farFloor, pal, lampOn);

  // Tea stall on the far platform; its kettle is the steam source (environments.ts steamSource 0.875, 0.552)
  const X = (f: number) => W * (0.5 + (f - 0.5) / 1.2);
  const st0 = X(0.835);
  const st1 = X(0.915);
  p.rect(st0, Y(0.563), st1 - st0, farFloor - Y(0.563), mat(pal, "#7a4a2a"));
  p.rect(st0, Y(0.563), st1 - st0, H * 0.004, mat(pal, "#a8743f"));
  p.rect(st0 + W * 0.004, Y(0.537), W * 0.004, Y(0.563) - Y(0.537), mat(pal, "#3a2a1d"));
  p.rect(st1 - W * 0.008, Y(0.537), W * 0.004, Y(0.563) - Y(0.537), mat(pal, "#3a2a1d"));
  p.poly([st0 - W * 0.012, Y(0.522), st1 + W * 0.012, Y(0.522), st1 + W * 0.004, Y(0.539), st0 - W * 0.004, Y(0.539)], mat(pal, "#c8452f"));
  for (let k = 0; k < 6; k++) p.rect(st0 - W * 0.01 + k * ((st1 - st0 + W * 0.02) / 6), Y(0.522), (st1 - st0 + W * 0.02) / 12, Y(0.539) - Y(0.522), mat(pal, "#e9dcc0"), 0.85);
  p.ellipse(X(0.875), Y(0.558), W * 0.011, H * 0.0055, mat(pal, "#aab0b6", 1.2));
  p.rect(X(0.875) - W * 0.0025, Y(0.551), W * 0.005, H * 0.004, mat(pal, "#6c7177"));
  for (let k = 0; k < 4; k++) p.rect(X(0.848) + k * W * 0.012, Y(0.556), W * 0.006, H * 0.007, mat(pal, "#e8e2d4")); // glasses
  if (pal.litOn) p.ellipse(X(0.875), Y(0.543), W * 0.05, W * 0.05, { kind: "radial", cx: X(0.875), cy: Y(0.543), r: W * 0.05, stops: [[0, rgb("#fff0c0", 0.85)], [0.3, rgb("#ffcf7a", 0.35)], [1, rgb("#ffb050", 0)]] });

  // Track bed with sleepers and rails (behind our platform)
  const trackTop = Y(0.62);
  const edgeY = Y(0.73);
  p.rect(0, trackTop, W, edgeY - trackTop, mat(pal, "#5b5249"));
  dc.gradientRect(0, trackTop, W, edgeY - trackTop, 0.18, 0.27);
  for (let x = -W * 0.02; x < W; x += W * 0.028) {
    p.rect(x, trackTop + (edgeY - trackTop) * 0.25, W * 0.016, (edgeY - trackTop) * 0.12, mat(pal, "#3a332d"));
    p.rect(x, trackTop + (edgeY - trackTop) * 0.62, W * 0.018, (edgeY - trackTop) * 0.14, mat(pal, "#3a332d"));
  }
  for (const fy of [0.27, 0.36, 0.66, 0.77]) p.rect(0, trackTop + (edgeY - trackTop) * fy, W, H * 0.0025, mat(pal, "#b9b4ab", 1.2));
  // gravel speckle
  for (let i = 0; i < 2500; i++) {
    const x = hash01(r.seed, i, 41) * W;
    const y = trackTop + hash01(r.seed, i, 42) * (edgeY - trackTop);
    p.rect(x, y, 2, 2, solid(0, 0, 0, 0.12));
  }

  // Our platform: edge face, yellow tactile line, stone floor in perspective
  p.rect(0, edgeY - H * 0.012, W, H * 0.012, mat(pal, "#4a4440"));
  groundPlane(p, dc, edgeY, mat(pal, "#8d8880"), [0, 0, 0, 0.14], horizonY, 0.3, 0.62);
  p.rect(0, edgeY, W, H * 0.014, mat(pal, "#e1b931"));
  for (let x = 0; x < W; x += W * 0.012) p.rect(x, edgeY + H * 0.003, W * 0.005, H * 0.008, mat(pal, "#b8921f"));
  // Reflections of lamps on the floor at night
  if (lampOn) for (const fx of [0.2, 0.66]) p.ellipse(W * (0.5 + (fx - 0.5) / 1.2), Y(0.86), W * 0.12, H * 0.02, { kind: "radial", cx: W * (0.5 + (fx - 0.5) / 1.2), cy: Y(0.86), r: W * 0.12, stops: [[0, rgb("#ffcf86", 0.18)], [1, rgb("#ffcf86", 0)]] });

  p.ink(0.55, 0.1).grain(0.06, r.seed);
  return {
    image: p.img,
    depth: dc.values(),
    metadata: { horizonY: 0.5, groundY: 0.84, trackY: 0.73, lights: [{ x: 0.2, y: 0.47 }, { x: 0.66, y: 0.47 }] },
  };
}

function trainElement(r: ScenePartRequest, metro = false): ScenePartResult {
  const p = new Painter(r.width, r.height);
  const pal = palette(r.timeOfDay);
  const W = r.width;
  const H = r.height;
  const coachW = W / Math.max(1, Math.round((r.widthFactor ?? 3.2) / 1.05));
  const body = metro ? "#b8bec6" : "#1f3f7a";
  const band = metro ? "#d23b3b" : "#e7dbb2";
  for (let cx = 0, n = 0; cx < W - 2; cx += coachW, n++) {
    const x0 = cx + coachW * 0.012;
    const x1 = cx + coachW * 0.988;
    const top = H * 0.06;
    const bodyBottom = H * 0.8;
    // roof
    p.roundRect(x0, top - H * 0.04, x1 - x0, H * 0.12, H * 0.05, mat(pal, metro ? "#9aa1aa" : "#6b6f75"));
    // body
    p.rect(x0, top + H * 0.02, x1 - x0, bodyBottom - top - H * 0.02, mat(pal, body));
    p.shadeVertical(x0, top, x1 - x0, bodyBottom - top, 0.18);
    p.rect(x0, H * 0.24, x1 - x0, H * 0.05, mat(pal, band));
    p.rect(x0, H * 0.58, x1 - x0, H * 0.025, mat(pal, band));
    // windows with bars; warm interior light at dusk/night
    const winY = H * 0.31;
    const winH = H * 0.22;
    for (let wx = x0 + coachW * 0.12; wx < x1 - coachW * 0.14; wx += coachW * 0.075) {
      const lit = pal.litOn && hash01(r.seed, n, Math.round(wx)) < 0.8;
      p.rect(wx, winY, coachW * 0.052, winH, lit ? { kind: "linear", x0: 0, y0: winY, x1: 0, y1: winY + winH, stops: [[0, rgb("#ffe2a6")], [1, rgb("#f0a85a")]] } : mat(pal, "#1a2230"));
      if (!metro) for (let b = 1; b < 5; b++) p.rect(wx + (coachW * 0.052 * b) / 5 - 1, winY, 2, winH, mat(pal, "#0e1116"));
    }
    // doors
    for (const dx of [x0 + coachW * 0.025, x1 - coachW * 0.085]) {
      p.rect(dx, H * 0.22, coachW * 0.06, bodyBottom - H * 0.23, mat(pal, metro ? "#8f959c" : "#173263"));
      p.rect(dx + coachW * 0.012, H * 0.3, coachW * 0.036, H * 0.12, pal.litOn ? hex("#ffd790") : mat(pal, "#1a2230"));
    }
    // undercarriage, bogies, wheels
    p.rect(x0, bodyBottom, x1 - x0, H * 0.08, mat(pal, "#1b1c1f"));
    for (const bxF of [0.16, 0.84]) {
      const bx = cx + coachW * bxF;
      p.rect(bx - coachW * 0.09, bodyBottom + H * 0.02, coachW * 0.18, H * 0.11, mat(pal, "#2a2b2f"));
      for (const off of [-0.05, 0.05]) p.ellipse(bx + coachW * off, bodyBottom + H * 0.13, H * 0.065, H * 0.065, mat(pal, "#131416"));
    }
    // coupler gap shadow
    p.rect(x1, top + H * 0.1, coachW * 0.024, bodyBottom - top - H * 0.05, solid(0, 0, 0, 0.6));
  }
  p.ink(0.6, 0.12).grain(0.05, r.seed);
  return { image: p.img, metadata: { wheelsY: 0.93, steamSourceY: 0.85 } };
}

function railingForeground(r: ScenePartRequest): ScenePartResult {
  const p = new Painter(r.width, r.height);
  const pal = palette(r.timeOfDay);
  const W = r.width;
  const H = r.height;
  const iron = mat(pal, "#2f4a3f", 1.1);
  p.rect(0, H * 0.12, W, H * 0.07, iron);
  p.rect(0, H * 0.12, W, H * 0.015, mat(pal, "#5f7d70", 1.2));
  p.rect(0, H * 0.62, W, H * 0.05, iron);
  for (let x = W * 0.01; x < W; x += W * 0.045) {
    p.rect(x, H * 0.18, W * 0.012, H * 0.46, iron);
    p.ellipse(x + W * 0.006, H * 0.4, W * 0.012, H * 0.03, iron);
  }
  p.rect(0, H * 0.67, W, H * 0.33, mat(pal, "#77716a"));
  p.rect(0, H * 0.67, W, H * 0.02, mat(pal, "#99938a"));
  p.ink(0.5, 0.15).grain(0.05, r.seed);
  return { image: p.img, metadata: {} };
}

// ---------------------------------------------------------------------------
// Other environments (shared blocks, parameterised by category)
// ---------------------------------------------------------------------------

const FACADES: Record<string, { wall: string; trim: string; roof: string; columns?: boolean; arches?: boolean; glass?: boolean; chimneys?: boolean }> = {
  POLICE_STATION: { wall: "#c9a96e", trim: "#8c3b2e", roof: "#6d4a3a" },
  POLICE_HEADQUARTERS: { wall: "#a8513f", trim: "#efe6d2", roof: "#5a3a2e", columns: true },
  COURT: { wall: "#e2d6b8", trim: "#b9a983", roof: "#8d7d62", columns: true },
  DISTRICT_HOSPITAL: { wall: "#e9ece6", trim: "#7fb59e", roof: "#9aa39d" },
  GOVERNMENT_HOSPITAL: { wall: "#e7ebe4", trim: "#5f9e86", roof: "#8f9893" },
  SCHOOL: { wall: "#e6c768", trim: "#a5492f", roof: "#7c5a3a" },
  COLLEGE: { wall: "#d9b48c", trim: "#7a3d2d", roof: "#6d4d3a", arches: true },
  GOVERNMENT_BUILDING: { wall: "#dcc8a4", trim: "#9a3f30", roof: "#7c6a54", columns: true },
  FACTORY: { wall: "#9aa0a6", trim: "#6c7177", roof: "#5c6166", chimneys: true },
  AIRPORT: { wall: "#9fb9cf", trim: "#e9eef2", roof: "#c9d3db", glass: true },
  FIRE_STATION: { wall: "#c63d32", trim: "#f0ede6", roof: "#7c3b33" },
  RAILWAY_STATION: { wall: "#a4523d", trim: "#efe5cf", roof: "#5a3b30", arches: true },
  AMBULANCE: { wall: "#e7ebe4", trim: "#5f9e86", roof: "#8f9893" },
};

function civicBackground(r: ScenePartRequest): ScenePartResult {
  const p = new Painter(r.width, r.height);
  const dc = new DepthCanvas(r.width, r.height);
  const pal = palette(r.timeOfDay);
  const W = r.width;
  const H = r.height;
  const Y = (f: number) => H * (0.5 + (f - 0.5) / 1.2);
  const horizonY = Y(0.62);
  sky(p, pal, horizonY, r.timeOfDay, r.seed);
  dc.rect(0, 0, W, horizonY, 0);
  skyline(p, dc, pal, Y(0.5), H * 0.06, r.seed + 3, 0.05);
  const f = FACADES[r.category ?? ""] ?? FACADES.GOVERNMENT_BUILDING;
  const top = Y(0.36);
  const bottom = Y(0.66);
  // far ground and compound wall between the horizon and the building's base
  p.rect(0, horizonY, W, bottom - horizonY + 2, mat(pal, "#8f8a7c"));
  dc.gradientRect(0, horizonY, W, bottom - horizonY + 2, 0.12, 0.2);
  p.rect(0, Y(0.6), W, bottom - Y(0.6), mat(pal, "#b9ae98"));
  p.rect(0, Y(0.6), W, H * 0.006, mat(pal, f.trim));
  const x0 = W * 0.08;
  const x1 = W * 0.92;
  p.rect(x0, top, x1 - x0, bottom - top, mat(pal, f.wall));
  dc.rect(x0, top - H * 0.05, x1 - x0, bottom - top + H * 0.05, 0.16);
  p.rect(x0 - W * 0.02, top - H * 0.02, x1 - x0 + W * 0.04, H * 0.025, mat(pal, f.roof));
  p.rect(x0, bottom - H * 0.03, x1 - x0, H * 0.03, mat(pal, f.trim));
  if (f.chimneys) for (const cxF of [0.25, 0.7]) p.rect(W * cxF, Y(0.2), W * 0.045, top - Y(0.2), mat(pal, "#7d7f82"));
  // windows (rows), columns or arches
  for (let row = 0; row < 2; row++) {
    for (let x = x0 + W * 0.05; x < x1 - W * 0.06; x += W * 0.1) {
      const wy = top + (bottom - top) * (0.15 + row * 0.42);
      const wh = (bottom - top) * 0.28;
      if (f.arches) p.roundRect(x, wy, W * 0.05, wh, W * 0.025, pal.litOn ? hex("#e8b96a") : mat(pal, "#2b3138"));
      else p.rect(x, wy, W * 0.05, wh, f.glass ? mat(pal, "#5d87a8", 1.2) : pal.litOn && hash01(r.seed, x, row) < 0.6 ? hex("#efc27a") : mat(pal, "#2b3138"));
      p.rect(x - 2, wy - 3, W * 0.05 + 4, 4, mat(pal, f.trim));
    }
  }
  if (f.columns) for (let x = x0 + W * 0.03; x < x1; x += W * 0.11) {
    p.rect(x, top + H * 0.005, W * 0.022, bottom - top, mat(pal, "#efe8d6"));
    p.shadeVertical(x, top, W * 0.022, bottom - top, 0.4);
  }
  // forecourt
  groundPlane(p, dc, bottom, mat(pal, "#9a9387"), [0, 0, 0, 0.08], horizonY, 0.22, 0.62, false);
  p.rect(0, bottom, W, H * 0.01, mat(pal, "#6c665e"));
  p.ink(0.55, 0.1).grain(0.06, r.seed);
  return { image: p.img, depth: dc.values(), metadata: { horizonY: 0.62, groundY: 0.86 } };
}

function streetBackground(r: ScenePartRequest): ScenePartResult {
  const p = new Painter(r.width, r.height);
  const dc = new DepthCanvas(r.width, r.height);
  const pal = palette(r.timeOfDay);
  const W = r.width;
  const H = r.height;
  const Y = (f: number) => H * (0.5 + (f - 0.5) / 1.2);
  const horizonY = Y(0.6);
  sky(p, pal, horizonY, r.timeOfDay, r.seed);
  dc.rect(0, 0, W, horizonY, 0);
  // two rows of shop/house facades converging to the vanishing point
  const colors = ["#c98f5a", "#d9c27a", "#9db4a0", "#c76f62", "#b8a8c8", "#e0b07c"];
  let x = 0;
  let i = 0;
  while (x < W) {
    const bw = W * (0.14 + hash01(r.seed, i, 51) * 0.1);
    const bh = H * (0.16 + hash01(r.seed, i, 52) * 0.12);
    const base = Y(0.66);
    p.rect(x, base - bh, bw, bh, mat(pal, colors[i % colors.length]));
    dc.rect(x, base - bh, bw, bh, 0.15);
    // shutter + blank signboard + balcony
    p.rect(x + bw * 0.1, base - bh * 0.42, bw * 0.8, bh * 0.42, mat(pal, "#6f747a"));
    for (let s = 0; s < 8; s++) p.rect(x + bw * 0.1, base - bh * 0.42 + (bh * 0.42 * s) / 8, bw * 0.8, 1.5, solid(0, 0, 0, 0.25));
    p.rect(x + bw * 0.08, base - bh * 0.56, bw * 0.84, bh * 0.1, mat(pal, hash01(r.seed, i, 53) < 0.5 ? "#2f5d8a" : "#a33a2e"));
    p.rect(x + bw * 0.2, base - bh * 0.85, bw * 0.25, bh * 0.18, pal.litOn ? hex("#f2c77e") : mat(pal, "#2f3338"));
    p.rect(x + bw * 0.55, base - bh * 0.85, bw * 0.25, bh * 0.18, pal.litOn && i % 2 === 0 ? hex("#f2c77e") : mat(pal, "#2f3338"));
    x += bw;
    i++;
  }
  // overhead wires
  for (let k = 0; k < 4; k++) p.curve(0, Y(0.3) + k * 6, W * 0.5, Y(0.34) + k * 9, W, Y(0.31) + k * 5, 1.4, solid(0.05, 0.05, 0.06, 0.8));
  // road + footpath
  const roadTop = Y(0.66);
  groundPlane(p, dc, roadTop, mat(pal, "#55565a"), [1, 1, 1, 0.0], horizonY, 0.2, 0.62, false);
  p.rect(0, roadTop, W, H * 0.03, mat(pal, "#8f8a80"));
  for (let k = 0; k < 6; k++) p.rect(W * (0.05 + k * 0.18), Y(0.8), W * 0.08, H * 0.006, solid(0.95, 0.95, 0.9, 0.55 * pal.light));
  p.ink(0.5, 0.1).grain(0.06, r.seed);
  return { image: p.img, depth: dc.values(), metadata: { horizonY: 0.6, groundY: 0.86 } };
}

function ruralBackground(r: ScenePartRequest, mountains = false, river = false): ScenePartResult {
  const p = new Painter(r.width, r.height);
  const dc = new DepthCanvas(r.width, r.height);
  const pal = palette(r.timeOfDay);
  const W = r.width;
  const H = r.height;
  const Y = (f: number) => H * (0.5 + (f - 0.5) / 1.2);
  const horizonY = Y(mountains ? 0.5 : 0.58);
  sky(p, pal, horizonY, r.timeOfDay, r.seed);
  dc.rect(0, 0, W, horizonY, 0);
  if (mountains) {
    for (let layer = 0; layer < 3; layer++) {
      const pts: number[] = [0, horizonY + H * 0.05];
      for (let k = 0; k <= 12; k++) pts.push((k / 12) * W, horizonY - H * (0.06 + layer * 0.04) * (0.5 + hash01(r.seed, k, layer) * 0.8) + layer * H * 0.03);
      pts.push(W, horizonY + H * 0.05);
      p.poly(pts, { kind: "solid", color: mix(pal.haze, rgb("#3f5a4a"), 0.3 + layer * 0.25) });
      dc.poly(pts, 0.04 + layer * 0.04);
    }
  }
  // fields / terraces in bands
  const fieldColors = ["#9cab5c", "#b8a75e", "#7f9a4e", "#c2b26a"];
  for (let b = 0; b < 6; b++) {
    const y0 = horizonY + (H - horizonY) * Math.pow(b / 6, 1.6);
    const y1 = horizonY + (H - horizonY) * Math.pow((b + 1) / 6, 1.6);
    p.rect(0, y0, W, y1 - y0 + 1, mat(pal, fieldColors[b % fieldColors.length]));
  }
  dc.gradientRect(0, horizonY, W, H - horizonY, 0.12, 0.62);
  if (river) {
    const wy = Y(0.66);
    p.rect(0, wy, W, H * 0.12, { kind: "linear", x0: 0, y0: wy, x1: 0, y1: wy + H * 0.12, stops: [[0, mix(pal.horizon, rgb("#3c6f8f"), 0.5)], [1, rgb("#24485e")]] });
    for (let s = 0; s < 6; s++) p.rect(0, Y(0.79) + s * H * 0.012, W, H * 0.012, mat(pal, s % 2 ? "#b9ab92" : "#a8997f"));
  }
  // tree line
  for (let t = 0; t < 14; t++) {
    const tx = hash01(r.seed, t, 61) * W;
    const ty = horizonY + H * 0.005;
    const rr = W * (0.03 + hash01(r.seed, t, 62) * 0.04);
    p.rect(tx - 2, ty - rr * 0.6, 4, rr * 0.7, mat(pal, "#4a3a2a"));
    p.ellipse(tx, ty - rr, rr, rr * 0.85, mat(pal, mountains ? "#2f4a3a" : "#3f6a3a"));
    dc.poly(ellipsePts(tx, ty - rr, rr, rr * 0.85), 0.1);
  }
  // dirt road
  const vx = W * 0.5;
  p.poly([vx - W * 0.03, horizonY + H * 0.02, vx + W * 0.03, horizonY + H * 0.02, W * 0.85, H, W * 0.15, H], mat(pal, "#b08f68"));
  p.ink(0.45, 0.1).grain(0.07, r.seed);
  return { image: p.img, depth: dc.values(), metadata: { horizonY: mountains ? 0.5 : 0.58, groundY: 0.87 } };
}

function interiorBackground(r: ScenePartRequest, opts: { window?: boolean; door?: boolean; fan?: boolean; hallway?: boolean } = { window: true, door: true }): ScenePartResult {
  const p = new Painter(r.width, r.height);
  const dc = new DepthCanvas(r.width, r.height);
  const pal = palette(r.timeOfDay);
  const W = r.width;
  const H = r.height;
  const Y = (f: number) => H * (0.5 + (f - 0.5) / 1.2);
  const lightK = r.timeOfDay === "night" ? 0.55 : 0.9;
  const wall = { kind: "linear" as const, x0: 0, y0: 0, x1: 0, y1: Y(0.72), stops: [[0, shade(rgb("#c9b48f"), lightK * 0.8)], [1, shade(rgb("#dcc9a3"), lightK)]] as [number, RGBA][] };
  p.rect(0, 0, W, Y(0.72), wall);
  dc.rect(0, 0, W, Y(0.72), 0.22);
  if (opts.hallway) {
    // corridor perspective
    const vx = W * 0.5;
    const vy = Y(0.48);
    p.poly([0, 0, vx - W * 0.12, vy - H * 0.1, vx - W * 0.12, vy + H * 0.12, 0, H], mat(pal, "#b9a789", lightK));
    p.poly([W, 0, vx + W * 0.12, vy - H * 0.1, vx + W * 0.12, vy + H * 0.12, W, H], mat(pal, "#a8977b", lightK));
    p.rect(vx - W * 0.12, vy - H * 0.1, W * 0.24, H * 0.22, mat(pal, "#d8c7a6", lightK * 1.1));
    dc.poly([vx - W * 0.12, vy - H * 0.1, vx + W * 0.12, vy - H * 0.1, vx + W * 0.12, vy + H * 0.12, vx - W * 0.12, vy + H * 0.12], 0.05);
  }
  if (opts.window) {
    const wx = W * 0.58;
    const wy = Y(0.22);
    const ww = W * 0.3;
    const wh = H * 0.26;
    p.rect(wx - 8, wy - 8, ww + 16, wh + 16, mat(pal, "#6a4a32"));
    p.rect(wx, wy, ww, wh, { kind: "linear", x0: 0, y0: wy, x1: 0, y1: wy + wh, stops: [[0, pal.skyTop], [1, pal.horizon]] });
    dc.rect(wx, wy, ww, wh, 0.02);
    p.rect(wx + ww / 2 - 3, wy, 6, wh, mat(pal, "#6a4a32"));
    for (let b = 1; b < 6; b++) p.rect(wx, wy + (wh * b) / 6, ww, 2, mat(pal, "#4a3424"));
    // curtains
    p.poly([wx - W * 0.04, wy - 12, wx + ww * 0.22, wy - 12, wx + ww * 0.12, wy + wh + 20, wx - W * 0.05, wy + wh + 30], mat(pal, "#8c3f3a"));
    p.poly([wx + ww + W * 0.04, wy - 12, wx + ww * 0.8, wy - 12, wx + ww * 0.9, wy + wh + 20, wx + ww + W * 0.05, wy + wh + 30], mat(pal, "#8c3f3a"));
  }
  if (opts.door) {
    const dx = W * 0.1;
    p.rect(dx, Y(0.3), W * 0.26, Y(0.72) - Y(0.3), mat(pal, "#7a5236"));
    p.rect(dx + W * 0.02, Y(0.33), W * 0.1, Y(0.5) - Y(0.33), mat(pal, "#6a4630"));
    p.rect(dx + W * 0.14, Y(0.33), W * 0.1, Y(0.5) - Y(0.33), mat(pal, "#6a4630"));
    p.ellipse(dx + W * 0.22, Y(0.52), 6, 6, hex("#d6b25a"));
  }
  if (opts.fan) {
    const fx = W * 0.5;
    const fy = Y(0.08);
    p.rect(fx - 3, 0, 6, fy, mat(pal, "#ddd"));
    p.ellipse(fx, fy, W * 0.04, H * 0.012, mat(pal, "#cfcfcf"));
    for (const a of [0, 120, 240]) p.ellipse(fx + Math.cos((a * Math.PI) / 180) * W * 0.12, fy + Math.sin((a * Math.PI) / 180) * H * 0.008, W * 0.11, H * 0.007, mat(pal, "#d9d9d9"), 1, a);
  }
  // floor
  groundPlane(p, dc, Y(0.72), mat(pal, "#9b8268", lightK * 1.2), [0, 0, 0, 0.12], Y(0.5), 0.3, 0.62);
  p.rect(0, Y(0.72) - 6, W, 8, mat(pal, "#5d4634"));
  p.ink(0.5, 0.1).grain(0.06, r.seed);
  return { image: p.img, depth: dc.values(), metadata: { horizonY: 0.5, groundY: 0.9 } };
}

function religiousBackground(r: ScenePartRequest): ScenePartResult {
  // Distant, generic architecture only — no religious symbols in focus.
  const res = civicBackground({ ...r, category: "COURT" });
  const p = new Painter(r.width, r.height);
  p.img.data.set(res.image.data);
  const pal = palette(r.timeOfDay);
  const W = r.width;
  const H = r.height;
  const Y = (f: number) => H * (0.5 + (f - 0.5) / 1.2);
  p.ellipse(W * 0.5, Y(0.33), W * 0.14, H * 0.06, mat(pal, "#e9e2d0"));
  p.rect(W * 0.36, Y(0.33), W * 0.28, Y(0.36) - Y(0.33), mat(pal, "#e9e2d0"));
  return { image: p.img, depth: res.depth, metadata: res.metadata };
}

function roadBackground(r: ScenePartRequest): ScenePartResult {
  const res = ruralBackground(r);
  const p = new Painter(r.width, r.height);
  p.img.data.set(res.image.data);
  const pal = palette(r.timeOfDay);
  const W = r.width;
  const H = r.height;
  const Y = (f: number) => H * (0.5 + (f - 0.5) / 1.2);
  const hy = Y(0.58);
  p.poly([W * 0.47, hy, W * 0.53, hy, W * 1.05, H, -W * 0.05, H], mat(pal, "#4f5054"));
  for (let k = 0; k < 8; k++) {
    const t0 = Math.pow(k / 8, 1.7);
    const t1 = Math.pow((k + 0.5) / 8, 1.7);
    const yy0 = hy + (H - hy) * t0;
    const yy1 = hy + (H - hy) * t1;
    p.poly([W * 0.5 - 1 - 4 * t0, yy0, W * 0.5 + 1 + 4 * t0, yy0, W * 0.5 + 1 + 10 * t1, yy1, W * 0.5 - 1 - 10 * t1, yy1], solid(0.95, 0.92, 0.8, 0.8 * pal.light));
  }
  return { image: p.img, depth: res.depth, metadata: { horizonY: 0.58, groundY: 0.88 } };
}

// ---------------------------------------------------------------------------
// Midground vehicles / structures and foreground elements
// ---------------------------------------------------------------------------

function vehicle(r: ScenePartRequest, kind: string): ScenePartResult {
  const p = new Painter(r.width, r.height);
  const pal = palette(r.timeOfDay);
  const W = r.width;
  const H = r.height;
  const colors: Record<string, [string, string]> = {
    jeep: ["#e8e3d6", "#2e4f8f"],
    ambulance: ["#f2f2ee", "#d63a2f"],
    bus: ["#c8452f", "#e9c35a"],
    truck: ["#d07a2a", "#2f6f8f"],
    autos: ["#2f6f3a", "#e3c13a"],
  };
  const [bodyC, stripe] = colors[kind] ?? colors.jeep;
  const count = kind === "autos" ? 3 : 1;
  for (let i = 0; i < count; i++) {
    const x0 = (W / count) * i + W * 0.04;
    const x1 = (W / count) * (i + 1) - W * 0.04;
    const top = kind === "autos" ? H * 0.25 : H * 0.08;
    p.roundRect(x0, top, x1 - x0, H * 0.72 - top, H * 0.06, mat(pal, bodyC));
    p.rect(x0, H * 0.5, x1 - x0, H * 0.06, mat(pal, stripe));
    p.rect(x0 + (x1 - x0) * 0.08, top + H * 0.06, (x1 - x0) * 0.35, H * 0.2, mat(pal, "#26313c", 1.2));
    p.rect(x0 + (x1 - x0) * 0.5, top + H * 0.06, (x1 - x0) * 0.4, H * 0.2, mat(pal, "#26313c", 1.2));
    for (const wx of [0.22, 0.78]) p.ellipse(x0 + (x1 - x0) * wx, H * 0.8, H * 0.13, H * 0.13, mat(pal, "#16171a"));
    if (kind === "jeep" || kind === "ambulance") p.rect(x0 + (x1 - x0) * 0.4, top - H * 0.05, (x1 - x0) * 0.2, H * 0.05, kind === "jeep" ? hex("#c83a3a") : hex("#3a5fd6"));
  }
  p.ink(0.55, 0.12).grain(0.05, r.seed);
  return { image: p.img, metadata: {} };
}

function housesRow(r: ScenePartRequest, rural: boolean): ScenePartResult {
  const p = new Painter(r.width, r.height);
  const pal = palette(r.timeOfDay);
  const W = r.width;
  const H = r.height;
  let x = 0;
  let i = 0;
  while (x < W) {
    const bw = W * (0.18 + hash01(r.seed, i, 71) * 0.12);
    const bh = H * (0.55 + hash01(r.seed, i, 72) * 0.4);
    p.rect(x, H - bh, bw - 4, bh, mat(pal, rural ? (i % 2 ? "#b98a5e" : "#c9a27a") : ["#d8b07a", "#a9c3b0", "#cf8f7a"][i % 3]));
    if (rural) p.poly([x - 6, H - bh, x + bw / 2, H - bh - H * 0.18, x + bw + 2, H - bh], mat(pal, "#7a4a2e"));
    p.rect(x + bw * 0.35, H - bh * 0.45, bw * 0.25, bh * 0.45, mat(pal, "#4a3324"));
    p.rect(x + bw * 0.12, H - bh * 0.8, bw * 0.18, bh * 0.16, pal.litOn ? hex("#f0c27a") : mat(pal, "#2c3036"));
    x += bw;
    i++;
  }
  p.ink(0.5, 0.12).grain(0.05, r.seed);
  return { image: p.img, metadata: {} };
}

function stallsRow(r: ScenePartRequest): ScenePartResult {
  const p = new Painter(r.width, r.height);
  const pal = palette(r.timeOfDay);
  const W = r.width;
  const H = r.height;
  const awn = ["#d14a3a", "#e3b23a", "#3a7ad1", "#3aa66a"];
  for (let i = 0, x = 0; x < W; i++, x += W * 0.22) {
    p.rect(x + W * 0.01, H * 0.35, W * 0.2, H * 0.65, mat(pal, "#8a6a4a"));
    p.poly([x, H * 0.18, x + W * 0.22, H * 0.18, x + W * 0.2, H * 0.36, x + W * 0.02, H * 0.36], mat(pal, awn[i % awn.length]));
    for (let k = 0; k < 6; k++) p.ellipse(x + W * (0.04 + k * 0.03), H * 0.55, W * 0.012, W * 0.012, mat(pal, ["#e0702a", "#d8c03a", "#6aa23a"][k % 3]));
  }
  p.ink(0.5, 0.12).grain(0.05, r.seed);
  return { image: p.img, metadata: {} };
}

function treeLine(r: ScenePartRequest): ScenePartResult {
  const p = new Painter(r.width, r.height);
  const pal = palette(r.timeOfDay);
  for (let t = 0; t < 12; t++) {
    const x = (t / 11) * r.width;
    const rr = r.height * (0.25 + hash01(r.seed, t, 81) * 0.15);
    p.rect(x - 4, r.height - rr, 8, rr, mat(pal, "#4a3a2a"));
    p.ellipse(x, r.height - rr * 1.2, rr * 0.8, rr * 0.7, mat(pal, "#3f6a3a"));
  }
  p.ink(0.45, 0.12).grain(0.05, r.seed);
  return { image: p.img, metadata: {} };
}

function desk(r: ScenePartRequest): ScenePartResult {
  const p = new Painter(r.width, r.height);
  const pal = palette(r.timeOfDay);
  const W = r.width;
  const H = r.height;
  p.rect(W * 0.05, H * 0.3, W * 0.9, H * 0.12, mat(pal, "#7a5236"));
  p.rect(W * 0.08, H * 0.42, W * 0.06, H * 0.58, mat(pal, "#5d3e28"));
  p.rect(W * 0.86, H * 0.42, W * 0.06, H * 0.58, mat(pal, "#5d3e28"));
  for (let k = 0; k < 4; k++) p.rect(W * (0.15 + k * 0.03), H * (0.18 - k * 0.025), W * 0.22, H * 0.03, mat(pal, k % 2 ? "#e9d9a8" : "#c7b37e"));
  p.ink(0.5, 0.12).grain(0.05, r.seed);
  return { image: p.img, metadata: {} };
}

function genericForeground(r: ScenePartRequest, kind: string): ScenePartResult {
  const p = new Painter(r.width, r.height);
  const pal = palette(r.timeOfDay);
  const W = r.width;
  const H = r.height;
  if (kind === "barricade") {
    for (let x = W * 0.05; x < W; x += W * 0.32) {
      p.rect(x, H * 0.25, W * 0.28, H * 0.12, hex("#e8e3d6"));
      for (let s = 0; s < 5; s++) p.poly([x + s * W * 0.06, H * 0.25, x + s * W * 0.06 + W * 0.03, H * 0.25, x + s * W * 0.06 + W * 0.0, H * 0.37, x + s * W * 0.06 - W * 0.03, H * 0.37], hex("#c8332a"));
      p.rect(x + W * 0.02, H * 0.37, W * 0.02, H * 0.6, mat(pal, "#555"));
      p.rect(x + W * 0.24, H * 0.37, W * 0.02, H * 0.6, mat(pal, "#555"));
    }
  } else if (kind === "foliage" || kind === "pine" || kind === "reeds" || kind === "crops") {
    const green = kind === "crops" ? "#c2a956" : "#2f5a34";
    for (let i = 0; i < 60; i++) {
      const x = hash01(r.seed, i, 91) * W;
      const hgt = H * (0.4 + hash01(r.seed, i, 92) * 0.6);
      p.curve(x, H, x + Painter.jitter(r.seed, i, W * 0.03), H - hgt * 0.5, x + Painter.jitter(r.seed, i + 100, W * 0.06), H - hgt, W * 0.008, mat(pal, green));
      if (kind === "foliage" || kind === "pine") p.ellipse(x, H - hgt, W * 0.03, H * 0.08, mat(pal, green), 0.9);
    }
  } else if (kind === "gate" || kind === "fence") {
    p.rect(0, H * 0.15, W, H * 0.04, mat(pal, "#3a3f44"));
    for (let x = 0; x < W; x += W * 0.03) p.rect(x, H * 0.15, W * 0.008, H * 0.85, mat(pal, "#3a3f44"));
  } else if (kind === "awning") {
    p.poly([0, 0, W, 0, W, H * 0.45, 0, H * 0.3], mat(pal, "#c8452f"));
  }
  p.ink(0.45, 0.15).grain(0.05, r.seed);
  return { image: p.img, metadata: {} };
}

// ---------------------------------------------------------------------------
// Safe substitute visuals (restricted scenes): no people, nothing graphic.
// ---------------------------------------------------------------------------

function substituteBackground(r: ScenePartRequest): ScenePartResult {
  const id = r.substitute ?? "building-exterior";
  if (id.startsWith("window")) return interiorBackground(r, { window: true });
  if (id.includes("hallway") || id.includes("corridor")) return interiorBackground(r, { hallway: true });
  if (id.includes("closed-door") || id === "front-door" || id === "silhouettes-apart") return interiorBackground(r, { door: true });
  if (id === "ceiling-fan") return interiorBackground(r, { window: true, fan: true });
  if (id === "evidence-envelope") return interiorBackground(r, { window: true });
  if (id === "empty-swing" || id === "school-bag") return ruralBackground(r);
  if (id === "cordon" || id === "police-vehicle") return streetBackground(r);
  if (id.includes("police")) return civicBackground({ ...r, category: "POLICE_STATION" });
  if (id.includes("court")) return civicBackground({ ...r, category: "COURT" });
  if (id.includes("hospital") || id === "ambulance") return civicBackground({ ...r, category: "DISTRICT_HOSPITAL" });
  return civicBackground({ ...r, category: "GOVERNMENT_BUILDING" });
}

/** Entry point used by the procedural image provider. */
export function paintScenePart(r: ScenePartRequest): ScenePartResult {
  if (r.part === "midground") {
    switch (r.element) {
      case "train":
        return trainElement(r);
      case "metro":
        return trainElement(r, true);
      case "jeep":
      case "ambulance":
      case "bus":
      case "truck":
      case "autos":
        return vehicle(r, r.element);
      case "houses":
        return housesRow(r, r.painter === "rural" || r.painter === "mountains");
      case "stalls":
      case "shops":
        return stallsRow(r);
      case "trees":
        return treeLine(r);
      case "desk":
        return desk(r);
      default:
        return housesRow(r, false);
    }
  }
  if (r.part === "foreground") {
    if (r.element === "railing") return railingForeground(r);
    return genericForeground(r, r.element ?? "fence");
  }
  switch (r.painter) {
    case "railway_platform":
      return railwayBackground(r);
    case "civic_building":
      return civicBackground(r);
    case "street":
      return streetBackground(r);
    case "rural":
      return ruralBackground(r);
    case "river":
      return ruralBackground(r, false, true);
    case "mountains":
      return ruralBackground(r, true);
    case "interior":
      return interiorBackground(r, { window: true, door: true });
    case "religious_building":
      return religiousBackground(r);
    case "road":
      return roadBackground(r);
    case "substitute":
      return substituteBackground(r);
    default:
      return streetBackground(r);
  }
}
