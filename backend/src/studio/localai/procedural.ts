import { AiModel } from "@prisma/client";
import { createImage, decodeImageBuffer, encodeGrayPng, encodePng, PImage } from "../engine25d/raster";
import { paintScenePart, TimeOfDay } from "../production/procedural/scenes";
import { buildCharacterRig, CharacterHint, resolveCharacterLook } from "../production/procedural/characterRig";
import { paintProp } from "../production/procedural/props";
import {
  DepthRequest,
  DepthResult,
  GeneratedSceneAsset,
  InpaintRequest,
  InpaintResult,
  LocalAiError,
  LocalDepthProvider,
  LocalImageProvider,
  LocalInpaintingProvider,
  LocalSegmentationProvider,
  OutputFile,
  Provenance,
  SceneAssetRequest,
  SegmentationRequest,
  SegmentationResult,
} from "./types";

function provenance(model: AiModel, seed: number, parameters: Record<string, unknown>, started: number): Provenance {
  return {
    generator: "procedural",
    modelId: model.modelId,
    modelVersion: model.version,
    license: model.license,
    commercialUse: model.commercialUseAllowed,
    seed,
    parameters,
    durationMs: Date.now() - started,
  };
}

const png = (name: string, data: Buffer): OutputFile => ({ name, data, contentType: "image/png" });

/**
 * Offline image generator: paints graphic-novel style environments, cut-out
 * character rigs and props from structured hints. It is deterministic, needs
 * no GPU and has no third-party licence, so a full episode can always be
 * produced. Outputs are real, usable art (not grey boxes), but they are
 * flagged `isPlaceholder` so production publishing requires either an
 * administrator's approval of the asset or regeneration with a local model.
 */
export class ProceduralImageProvider implements LocalImageProvider {
  readonly key = "procedural";

  async generateSceneAsset(req: SceneAssetRequest, model: AiModel): Promise<GeneratedSceneAsset> {
    const started = Date.now();
    const hint = req.painterHint ?? {};
    if (req.signal?.aborted) throw new LocalAiError("Cancelled", false, "CANCELLED");

    if (req.role === "character") {
      const c = (hint.character ?? {}) as Partial<CharacterHint> & { key?: string };
      if (!c.key) throw new LocalAiError("Character hint missing key", false, "CONFIG");
      const look = resolveCharacterLook({ key: c.key, gender: c.gender ?? "UNKNOWN", ageGroup: c.ageGroup ?? "ADULT", role: c.role, isOfficial: c.isOfficial, appearance: c.appearance ?? null });
      const rig = buildCharacterRig(look, req.height, req.seed);
      const files: OutputFile[] = [{ name: "rig.json", data: Buffer.from(JSON.stringify(rig.def, null, 2)), contentType: "application/json" }];
      for (const [name, img] of Object.entries(rig.images)) files.push(png(name, encodePng(img)));
      return {
        kind: "rig",
        files,
        primary: "rig.json",
        width: rig.def.width,
        height: rig.def.height,
        hasAlpha: true,
        isPlaceholder: true,
        metadata: { look, parts: rig.def.parts.length },
        provenance: provenance(model, req.seed, { role: req.role, height: req.height, look: look.outfit }, started),
      };
    }

    if (req.role === "prop") {
      const res = paintProp({ painter: String(hint.prop ?? "generic"), width: req.width, height: req.height, seed: req.seed });
      return {
        kind: "image",
        files: [png("image.png", encodePng(res.image))],
        primary: "image.png",
        width: req.width,
        height: req.height,
        hasAlpha: true,
        isPlaceholder: true,
        metadata: res.metadata,
        provenance: provenance(model, req.seed, { role: req.role, painter: hint.prop }, started),
      };
    }

    const part = req.role === "background" ? "background" : req.role === "midground" ? "midground" : "foreground";
    const res = paintScenePart({
      painter: String(hint.painter ?? "street"),
      part,
      element: hint.element as string | undefined,
      category: hint.category as string | undefined,
      substitute: hint.substitute as string | undefined,
      timeOfDay: (hint.timeOfDay as TimeOfDay) ?? "afternoon",
      width: req.width,
      height: req.height,
      seed: req.seed,
      widthFactor: hint.widthFactor as number | undefined,
    });
    const files = [png("image.png", encodePng(res.image))];
    if (res.depth) files.push(png("depth.png", encodeGrayPng(req.width, req.height, res.depth)));
    return {
      kind: "image",
      files,
      primary: "image.png",
      width: req.width,
      height: req.height,
      hasAlpha: part !== "background",
      isPlaceholder: true,
      depthFile: res.depth ? "depth.png" : undefined,
      metadata: res.metadata,
      provenance: provenance(model, req.seed, { role: req.role, painter: hint.painter, element: hint.element }, started),
    };
  }
}

// ---------------------------------------------------------------------------
// Segmentation: alpha matte, or colour-key flood fill from the borders
// ---------------------------------------------------------------------------

/**
 * Subject/background separation without a learned model. Images with a real
 * alpha channel use it directly. Opaque images are expected to show the
 * subject isolated on a plain backdrop (which is how character and prop
 * prompts are written): the backdrop colour is estimated from the border and
 * flood-filled inwards with a tolerance, and the remaining region becomes the
 * matte (feathered by 1 px). A learned segmenter (BiRefNet/SAM) replaces this
 * when a licence-cleared model is enabled in the registry.
 */
export class AlphaMatteSegmentationProvider implements LocalSegmentationProvider {
  readonly key = "procedural";

  async segment(req: SegmentationRequest, model: AiModel): Promise<SegmentationResult> {
    const started = Date.now();
    const img = await decodeImageBuffer(req.image);
    const mask = alphaOrKeyMatte(img);
    const cutout = createImage(img.width, img.height);
    let kept = 0;
    for (let i = 0, j = 0; i < mask.length; i++, j += 4) {
      const m = mask[i];
      kept += m;
      // premultiplied: scale colour and alpha by the matte (re-premultiply opaque sources)
      const a = img.data[j + 3];
      cutout.data[j] = img.data[j] * m;
      cutout.data[j + 1] = img.data[j + 1] * m;
      cutout.data[j + 2] = img.data[j + 2] * m;
      cutout.data[j + 3] = a * m;
    }
    return {
      mask: encodeGrayPng(img.width, img.height, mask),
      cutout: encodePng(cutout),
      width: img.width,
      height: img.height,
      coverage: kept / mask.length,
      provenance: provenance(model, req.seed ?? 0, { mode: req.mode }, started),
    };
  }
}

export function alphaOrKeyMatte(img: PImage): Float32Array {
  const { width: w, height: h, data: d } = img;
  const n = w * h;
  const mask = new Float32Array(n);
  let translucent = 0;
  for (let i = 0; i < n; i++) if (d[i * 4 + 3] < 0.98) translucent++;
  if (translucent > n * 0.002) {
    for (let i = 0; i < n; i++) mask[i] = d[i * 4 + 3];
    return mask;
  }
  // Estimate the backdrop from border pixels (median per channel).
  const border: number[][] = [[], [], []];
  const pushPx = (x: number, y: number) => {
    const o = (y * w + x) * 4;
    border[0].push(d[o]);
    border[1].push(d[o + 1]);
    border[2].push(d[o + 2]);
  };
  for (let x = 0; x < w; x += 2) {
    pushPx(x, 0);
    pushPx(x, h - 1);
  }
  for (let y = 0; y < h; y += 2) {
    pushPx(0, y);
    pushPx(w - 1, y);
  }
  const med = border.map((c) => c.sort((a, b) => a - b)[c.length >> 1]);
  const dist = (o: number) => Math.hypot(d[o] - med[0], d[o + 1] - med[1], d[o + 2] - med[2]);
  // Tolerance from the border's own spread (noisy/gradient backdrops get more slack).
  const spread = border[0].length ? border.reduce((s, c) => s + (c[Math.floor(c.length * 0.9)] - c[Math.floor(c.length * 0.1)]), 0) / 3 : 0;
  const tol = Math.min(0.35, 0.09 + spread * 0.8);
  const bg = new Uint8Array(n);
  const stack: number[] = [];
  const seed = (i: number) => {
    if (!bg[i] && dist(i * 4) < tol) {
      bg[i] = 1;
      stack.push(i);
    }
  };
  for (let x = 0; x < w; x++) {
    seed(x);
    seed((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    seed(y * w);
    seed(y * w + w - 1);
  }
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % w;
    const y = (i / w) | 0;
    if (x > 0) seed(i - 1);
    if (x < w - 1) seed(i + 1);
    if (y > 0) seed(i - w);
    if (y < h - 1) seed(i + w);
  }
  for (let i = 0; i < n; i++) mask[i] = bg[i] ? 0 : 1;
  // 1 px feather
  const out = new Float32Array(n);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0;
      let c = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          s += mask[yy * w + xx];
          c++;
        }
      }
      out[y * w + x] = s / c;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Depth: generator-provided maps or a ground-plane prior
// ---------------------------------------------------------------------------

/**
 * Heuristic depth (not a learned estimator). Backgrounds get a ground-plane
 * prior: everything above the horizon is far; below it, depth grows towards
 * the bottom of the frame, modulated by local contrast so vertical structures
 * stand slightly forward of the ground behind them. Transparent layers get a
 * flat map inside their matte (their layer depth carries the parallax). A
 * learned model (Depth Anything V2 Small, Apache-2.0) replaces this when it
 * is enabled in the registry.
 */
export class LayerDepthProvider implements LocalDepthProvider {
  readonly key = "procedural";

  async estimate(req: DepthRequest, model: AiModel): Promise<DepthResult> {
    const started = Date.now();
    const img = await decodeImageBuffer(req.image);
    const depth = heuristicDepth(img, req.role ?? "background", Number(req.hints?.horizonY ?? 0.5));
    return { depth: encodeGrayPng(img.width, img.height, depth), width: img.width, height: img.height, provenance: provenance(model, 0, { role: req.role, horizonY: req.hints?.horizonY }, started) };
  }
}

export function heuristicDepth(img: PImage, role: string, horizonFrac: number): Float32Array {
  const { width: w, height: h, data: d } = img;
  const out = new Float32Array(w * h);
  if (role !== "background") {
    for (let i = 0; i < out.length; i++) out[i] = d[i * 4 + 3] > 0.05 ? 0.5 : 0;
    return out;
  }
  const hy = Math.max(0.05, Math.min(0.95, horizonFrac)) * h;
  // column-wise "structure" score: strong vertical edges above the ground suggest objects (walls, poles)
  for (let y = 0; y < h; y++) {
    const ground = y <= hy ? 0.03 * (y / hy) : 0.08 + 0.55 * Math.pow((y - hy) / (h - hy), 1.25);
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      const l = d[o] * 0.3 + d[o + 1] * 0.59 + d[o + 2] * 0.11;
      const r = x + 1 < w ? d[o + 4] * 0.3 + d[o + 5] * 0.59 + d[o + 6] * 0.11 : l;
      const edge = Math.min(1, Math.abs(r - l) * 6);
      out[y * w + x] = Math.min(1, ground + (y > hy * 0.6 ? edge * 0.05 : 0));
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Inpainting: push-pull diffusion fill
// ---------------------------------------------------------------------------

/**
 * Fills masked regions by multi-resolution diffusion (push-pull) from the
 * surrounding pixels, then restores fine grain so the fill does not look
 * smeared. Good for small disocclusions (clean plates behind cut-out
 * subjects, parallax edges); large semantic fills need a learned inpainter
 * (LaMa, Apache-2.0) from the registry.
 */
export class DiffusionFillInpaintingProvider implements LocalInpaintingProvider {
  readonly key = "procedural";

  async inpaint(req: InpaintRequest, model: AiModel): Promise<InpaintResult> {
    const started = Date.now();
    const img = await decodeImageBuffer(req.image);
    const m = await decodeImageBuffer(req.mask);
    if (m.width !== img.width || m.height !== img.height) throw new LocalAiError("Mask size does not match image", false, "CONFIG");
    const hole = new Float32Array(img.width * img.height);
    for (let i = 0; i < hole.length; i++) hole[i] = m.data[i * 4 + 3] > 0 ? m.data[i * 4] / m.data[i * 4 + 3] : 0;
    const filled = pushPullFill(img, hole, req.seed ?? 0);
    return { image: encodePng(filled), width: img.width, height: img.height, provenance: provenance(model, req.seed ?? 0, { holeFraction: hole.reduce((s, v) => s + (v > 0.5 ? 1 : 0), 0) / hole.length }, started) };
  }
}

export function pushPullFill(img: PImage, hole: Float32Array, seed: number): PImage {
  type Level = { w: number; h: number; c: Float32Array; wt: Float32Array };
  const W = img.width;
  const H = img.height;
  const base: Level = { w: W, h: H, c: new Float32Array(W * H * 4), wt: new Float32Array(W * H) };
  for (let i = 0; i < W * H; i++) {
    const k = hole[i] > 0.5 ? 0 : 1;
    base.wt[i] = k;
    for (let ch = 0; ch < 4; ch++) base.c[i * 4 + ch] = img.data[i * 4 + ch] * k;
  }
  const levels: Level[] = [base];
  while (levels[levels.length - 1].w > 1 || levels[levels.length - 1].h > 1) {
    const p = levels[levels.length - 1];
    const w = Math.max(1, Math.ceil(p.w / 2));
    const h = Math.max(1, Math.ceil(p.h / 2));
    const l: Level = { w, h, c: new Float32Array(w * h * 4), wt: new Float32Array(w * h) };
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sw = 0;
        const acc = [0, 0, 0, 0];
        for (let j = 0; j < 2; j++) {
          for (let i = 0; i < 2; i++) {
            const xx = Math.min(p.w - 1, x * 2 + i);
            const yy = Math.min(p.h - 1, y * 2 + j);
            const q = yy * p.w + xx;
            sw += p.wt[q];
            for (let ch = 0; ch < 4; ch++) acc[ch] += p.c[q * 4 + ch];
          }
        }
        const o = y * w + x;
        if (sw > 0) for (let ch = 0; ch < 4; ch++) l.c[o * 4 + ch] = acc[ch] / sw;
        l.wt[o] = Math.min(1, sw);
        // store normalised colour (weighted average) for the pull phase
        if (sw > 0) for (let ch = 0; ch < 4; ch++) l.c[o * 4 + ch] *= l.wt[o];
      }
    }
    levels.push(l);
    if (w === 1 && h === 1) break;
  }
  // pull: fill each level's gaps from the (bilinear) coarser level
  for (let li = levels.length - 2; li >= 0; li--) {
    const l = levels[li];
    const c = levels[li + 1];
    for (let y = 0; y < l.h; y++) {
      for (let x = 0; x < l.w; x++) {
        const o = y * l.w + x;
        const k = l.wt[o];
        if (k >= 1) continue;
        const fx = Math.min(c.w - 1, Math.max(0, (x + 0.5) / 2 - 0.5));
        const fy = Math.min(c.h - 1, Math.max(0, (y + 0.5) / 2 - 0.5));
        const x0 = Math.floor(fx);
        const y0 = Math.floor(fy);
        const x1 = Math.min(c.w - 1, x0 + 1);
        const y1 = Math.min(c.h - 1, y0 + 1);
        const tx = fx - x0;
        const ty = fy - y0;
        for (let ch = 0; ch < 4; ch++) {
          const v = (c.c[(y0 * c.w + x0) * 4 + ch] * (1 - tx) + c.c[(y0 * c.w + x1) * 4 + ch] * tx) * (1 - ty) + (c.c[(y1 * c.w + x0) * 4 + ch] * (1 - tx) + c.c[(y1 * c.w + x1) * 4 + ch] * tx) * ty;
          const wv = (c.wt[y0 * c.w + x0] * (1 - tx) + c.wt[y0 * c.w + x1] * tx) * (1 - ty) + (c.wt[y1 * c.w + x0] * (1 - tx) + c.wt[y1 * c.w + x1] * tx) * ty;
          const coarse = wv > 0 ? v / wv : 0;
          const known = k > 0 ? l.c[o * 4 + ch] / k : 0;
          l.c[o * 4 + ch] = (known * k + coarse * (1 - k)) * 1;
        }
        l.wt[o] = 1;
      }
    }
    // levels above 0 store weighted colours; after the pull every pixel has weight 1, so colours are plain now
  }
  const out = createImage(W, H);
  let s = seed >>> 0 || 1;
  for (let i = 0; i < W * H; i++) {
    for (let ch = 0; ch < 4; ch++) out.data[i * 4 + ch] = base.c[i * 4 + ch];
    if (hole[i] > 0.5) {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      const n = 1 + ((s / 4294967296) - 0.5) * 0.04;
      out.data[i * 4] *= n;
      out.data[i * 4 + 1] *= n;
      out.data[i * 4 + 2] *= n;
    }
  }
  return out;
}
