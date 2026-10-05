import { EffectsSpec } from "./spec";
import { blurImage, downscale, PImage } from "./raster";
import { motionBlurH } from "./focus";
import { LightState } from "./lighting";
import { clamp, mulberry32 } from "./math";

/**
 * CinematicEffectsEngine: the "lens and film" pass applied to every composed
 * frame — bloom, lens flare, chromatic aberration, atmospheric haze, colour
 * grade (lift/gamma/gain, contrast, saturation), vignette, film grain, fades
 * and camera motion blur. Restrained by default: premium, not "AI".
 */
export class PostProcessor {
  private readonly vignette: Float32Array;
  private readonly grainTile: Float32Array;
  private readonly lut: Float32Array[]; // per channel, 1024 entries
  private static readonly LUT_N = 1024;

  constructor(
    private readonly W: number,
    private readonly H: number,
    private readonly fx: EffectsSpec,
    seed: number,
    private readonly hazeColor: [number, number, number],
  ) {
    // Vignette: soft, slightly oval for portrait frames.
    this.vignette = new Float32Array(W * H);
    const cx = W / 2;
    const cy = H / 2;
    const rx = W * 0.75;
    const ry = H * 0.68;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const r = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry);
        this.vignette[y * W + x] = 1 - fx.vignette * clamp((r - 0.45) / 0.75, 0, 1) ** 1.6;
      }
    const rand = mulberry32(seed ^ 0x9e3779b9);
    this.grainTile = new Float32Array(256 * 256);
    for (let i = 0; i < this.grainTile.length; i++) this.grainTile[i] = (rand() + rand() + rand()) / 1.5 - 1; // ~gaussian in [-1,1]
    // Grade LUT: lift / gamma / gain then contrast around mid-grey.
    const g = fx.grade;
    this.lut = [0, 1, 2].map((c) => {
      const t = new Float32Array(PostProcessor.LUT_N);
      for (let i = 0; i < PostProcessor.LUT_N; i++) {
        let v = i / (PostProcessor.LUT_N - 1);
        v = g.lift[c] + v * (g.gain[c] - g.lift[c]);
        v = Math.pow(clamp(v, 0, 1), 1 / g.gamma[c]);
        v = (v - 0.5) * g.contrast + 0.5;
        t[i] = clamp(v, 0, 1);
      }
      return t;
    });
  }

  /**
   * Applies the effects in place-ish and returns 8-bit RGB (rgb24) for the encoder.
   * `fade` is 1 normally and ramps to 0 at fade transitions.
   */
  apply(frameIn: PImage, opts: { frame: number; lights: LightState[]; fade: number; cameraVelocityPx: number }): Uint8Array {
    const { W, H, fx } = this;
    let frame = frameIn;

    // Camera motion blur (only meaningful for fast moves such as whip pans).
    const shutterLen = opts.cameraVelocityPx * fx.motionBlur;
    if (shutterLen > 3) frame = motionBlurH(frame, Math.min(shutterLen, W * 0.15));

    // Bloom: bright-pass at quarter resolution, blurred, added back.
    let bloom: PImage | null = null;
    if (fx.bloom.intensity > 0) {
      const small = downscale(frame, 4);
      const thr = fx.bloom.threshold;
      const d = small.data;
      for (let i = 0; i < d.length; i += 4) {
        const l = d[i] * 0.2126 + d[i + 1] * 0.7152 + d[i + 2] * 0.0722;
        const k = l > thr ? (l - thr) / Math.max(1e-3, 1 - thr) : 0;
        d[i] *= k;
        d[i + 1] *= k;
        d[i + 2] *= k;
      }
      bloom = blurImage(small, Math.max(1.5, (fx.bloom.radius * W) / 4));
    }

    const flares = fx.lensFlare > 0 ? opts.lights.filter((l) => l.flare && l.x > -W * 0.2 && l.x < W * 1.2 && l.y > -H * 0.2 && l.y < H * 1.2) : [];
    const out = new Uint8Array(W * H * 3);
    const src = frame.data;
    const ca = fx.chromaticAberration;
    const cx = W / 2;
    const cy = H / 2;
    const sat = fx.grade.saturation;
    const lutN = PostProcessor.LUT_N - 1;
    const [lr, lg, lb] = this.lut;
    const grain = fx.grain;
    const gOffX = (opts.frame * 73) & 255;
    const gOffY = (opts.frame * 151) & 255;
    const haze = fx.haze;
    const hz = this.hazeColor;
    const fade = opts.fade;
    const bI = fx.bloom.intensity;
    const tile = this.grainTile;
    const vig = this.vignette;
    // bloom upsampling tables (quarter resolution → full)
    const bw = bloom ? bloom.width : 0;
    const bh = bloom ? bloom.height : 0;
    const bd = bloom ? bloom.data : null;
    const bx0 = new Int32Array(W);
    const btx = new Float32Array(W);
    if (bloom) {
      for (let x = 0; x < W; x++) {
        const f = Math.min(bw - 1, Math.max(0, (x + 0.5) / 4 - 0.5));
        bx0[x] = Math.min(bw - 2, f | 0) < 0 ? 0 : Math.min(bw - 2, f | 0);
        btx[x] = bw > 1 ? Math.min(1, f - bx0[x]) : 0;
      }
    }
    const W1 = W - 1;
    const H1 = H - 1;

    for (let y = 0; y < H; y++) {
      let hazeK = haze * 0.35 * (1 - y / (H * 0.75));
      if (hazeK < 0) hazeK = 0;
      const hkR = hz[0] * hazeK;
      const hkG = hz[1] * hazeK;
      const hkB = hz[2] * hazeK;
      const hKeep = 1 - hazeK;
      let by0 = 0;
      let bty = 0;
      if (bd) {
        const f = Math.min(bh - 1, Math.max(0, (y + 0.5) / 4 - 0.5));
        by0 = bh > 1 ? Math.min(bh - 2, f | 0) : 0;
        bty = bh > 1 ? Math.min(1, f - by0) : 0;
      }
      const dyc = (y - cy) * ca;
      const grow = ((y + gOffY) & 255) * 256;
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        const o = i * 4;
        let r: number, g: number, b: number;
        if (ca > 0) {
          const dxc = (x - cx) * ca;
          let rx = (x + dxc + 0.5) | 0;
          let ry = (y + dyc + 0.5) | 0;
          let bx = (x - dxc + 0.5) | 0;
          let byy = (y - dyc + 0.5) | 0;
          rx = rx < 0 ? 0 : rx > W1 ? W1 : rx;
          ry = ry < 0 ? 0 : ry > H1 ? H1 : ry;
          bx = bx < 0 ? 0 : bx > W1 ? W1 : bx;
          byy = byy < 0 ? 0 : byy > H1 ? H1 : byy;
          r = src[(ry * W + rx) * 4];
          g = src[o + 1];
          b = src[(byy * W + bx) * 4 + 2];
        } else {
          r = src[o];
          g = src[o + 1];
          b = src[o + 2];
        }
        if (bd) {
          const x0 = bx0[x];
          const tx = btx[x];
          const a = (by0 * bw + x0) * 4;
          const c = a + bw * 4;
          const w00 = (1 - tx) * (1 - bty) * bI;
          const w01 = tx * (1 - bty) * bI;
          const w10 = (1 - tx) * bty * bI;
          const w11 = tx * bty * bI;
          r += bd[a] * w00 + bd[a + 4] * w01 + bd[c] * w10 + bd[c + 4] * w11;
          g += bd[a + 1] * w00 + bd[a + 5] * w01 + bd[c + 1] * w10 + bd[c + 5] * w11;
          b += bd[a + 2] * w00 + bd[a + 6] * w01 + bd[c + 2] * w10 + bd[c + 6] * w11;
        }
        if (hazeK > 0) {
          r = r * hKeep + hkR;
          g = g * hKeep + hkG;
          b = b * hKeep + hkB;
        }
        // grade (LUT)
        r = lr[r <= 0 ? 0 : r >= 1 ? lutN : (r * lutN) | 0];
        g = lg[g <= 0 ? 0 : g >= 1 ? lutN : (g * lutN) | 0];
        b = lb[b <= 0 ? 0 : b >= 1 ? lutN : (b * lutN) | 0];
        const l = r * 0.2126 + g * 0.7152 + b * 0.0722;
        const v = vig[i] * fade;
        r = (l + (r - l) * sat) * v;
        g = (l + (g - l) * sat) * v;
        b = (l + (b - l) * sat) * v;
        if (grain > 0) {
          const ll = l < 0 ? 0 : l > 1 ? 1 : l;
          const n = tile[grow + ((x + gOffX) & 255)] * grain * (0.35 + 0.65 * Math.sqrt(ll) * (1 - ll * 0.5));
          r += n;
          g += n;
          b += n;
        }
        const q = i * 3;
        out[q] = r <= 0 ? 0 : r >= 1 ? 255 : r * 255 + 0.5;
        out[q + 1] = g <= 0 ? 0 : g >= 1 ? 255 : g * 255 + 0.5;
        out[q + 2] = b <= 0 ? 0 : b >= 1 ? 255 : b * 255 + 0.5;
      }
    }
    for (const l of flares) drawFlare(out, W, H, l, fx.lensFlare * fade);
    return out;
  }
}

/** Anamorphic-ish streak + ghost discs along the light→centre axis (additive, on 8-bit output). */
function drawFlare(out: Uint8Array, W: number, H: number, l: LightState, amount: number) {
  const k = clamp(l.strength, 0, 1.5) * amount;
  if (k < 0.02) return;
  const col = [l.rgb[0] / Math.max(1e-3, l.strength), l.rgb[1] / Math.max(1e-3, l.strength), l.rgb[2] / Math.max(1e-3, l.strength)];
  const add = (x: number, y: number, a: number) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const q = ((y | 0) * W + (x | 0)) * 3;
    out[q] = Math.min(255, out[q] + col[0] * a * 255);
    out[q + 1] = Math.min(255, out[q + 1] + col[1] * a * 255);
    out[q + 2] = Math.min(255, out[q + 2] + col[2] * a * 255);
  };
  // horizontal streak
  const len = W * 0.35;
  for (let dx = -len; dx <= len; dx += 1) {
    const a = 0.22 * k * (1 - Math.abs(dx) / len) ** 3;
    add(l.x + dx, l.y, a);
    add(l.x + dx, l.y + 1, a * 0.5);
    add(l.x + dx, l.y - 1, a * 0.5);
  }
  // ghosts
  const cx = W / 2;
  const cy = H / 2;
  for (const [t, r, a] of [
    [0.6, W * 0.025, 0.08],
    [1.25, W * 0.045, 0.05],
    [1.7, W * 0.018, 0.07],
  ] as const) {
    const gx = l.x + (cx - l.x) * t * 2;
    const gy = l.y + (cy - l.y) * t * 2;
    for (let y = Math.floor(gy - r); y <= gy + r; y++)
      for (let x = Math.floor(gx - r); x <= gx + r; x++) {
        const d = Math.hypot(x - gx, y - gy) / r;
        if (d < 1) add(x, y, a * k * (1 - d * d));
      }
  }
}

export function fadeFactor(t: number, duration: number, transition: { in: "cut" | "fade"; out: "cut" | "fade"; durationSeconds: number }): number {
  let f = 1;
  if (transition.in === "fade" && transition.durationSeconds > 0) f = Math.min(f, clamp(t / transition.durationSeconds, 0, 1));
  if (transition.out === "fade" && transition.durationSeconds > 0) f = Math.min(f, clamp((duration - t) / transition.durationSeconds, 0, 1));
  return f;
}

