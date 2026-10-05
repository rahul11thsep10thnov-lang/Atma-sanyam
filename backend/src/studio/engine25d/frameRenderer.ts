import { LayerSpec, ScenePackageManifest } from "./spec";
import { apply, clamp, invert, Mat2D, multiply, rotate, scale, segmentProgress, translate } from "./math";
import { cameraVelocity, CameraState, evaluateCamera } from "./camera";
import { blurImage, createImage, downscale, PImage } from "./raster";
import { drawImageAffine, LightField, Rect } from "./composite";
import { dollyFactor, fogAmount, GrayMap, parallaxFactor, sampleGray, smoothGray } from "./depth";
import { BlurCache, blurRadiusPx, focusDepthAt, motionBlurH } from "./focus";
import { buildLightMap, evaluateLights, keyLightFor, LightMap, LightState } from "./lighting";
import { buildParticleSprites, evaluateParticles, Particle } from "./particles";
import { fadeFactor, PostProcessor } from "./effects";
import { CharacterFrame, evaluateCharacter } from "./characterMotion";
import { LoadedRig, renderRigFrame, rigCanvas, rigFromMemory } from "./rigRenderer";
import { SceneData, SceneLayerData } from "./scene";

export interface FrameSize {
  width: number;
  height: number;
  fps: number;
}

interface Prepared {
  spec: LayerSpec;
  data: SceneLayerData;
  srcW: number;
  srcH: number;
  anchorPx: [number, number];
  /** Screen px per source px before camera and scene zoom. */
  baseScale: number;
  /** Depth used for parallax/dolly/fog/focus (ground-locked for grounded layers). */
  depth: number;
  grounded: boolean;
  image?: PImage;
  blur?: BlurCache;
  motionBlurred: Map<number, PImage>;
  depthMap?: GrayMap;
  depthRange?: [number, number];
  rig?: LoadedRig;
  seed: number;
}

interface LayerMotionState {
  tx: number;
  ty: number;
  ox: number;
  oy: number;
  rot: number;
  scale: number;
  opacity: number;
}

interface Cam extends CameraState {
  opt: number; // optical zoom × scene zoom
}

const C_SOFT_SHADOW = [0, 0, 0] as [number, number, number];

function layerMotion(spec: LayerSpec, u: number, t: number): LayerMotionState {
  const m: LayerMotionState = { tx: 0, ty: 0, ox: 0, oy: 0, rot: 0, scale: 1, opacity: spec.placement.opacity };
  const mo = spec.motion;
  if (!mo) return m;
  if (mo.translate) {
    const p = segmentProgress(u, mo.translate.startTime, mo.translate.endTime, mo.translate.easing);
    m.tx = mo.translate.from[0] + (mo.translate.to[0] - mo.translate.from[0]) * p;
    m.ty = mo.translate.from[1] + (mo.translate.to[1] - mo.translate.from[1]) * p;
  }
  for (const o of mo.oscillate ?? []) {
    const v = o.amplitude * Math.sin(Math.PI * 2 * o.frequency * t + o.phase);
    if (o.axis === "x") m.ox += v;
    else if (o.axis === "y") m.oy += v;
    else if (o.axis === "rotation") m.rot += v;
    else m.scale *= 1 + v;
  }
  if (mo.opacity) {
    const p = segmentProgress(u, mo.opacity.startTime, mo.opacity.endTime, mo.opacity.easing);
    m.opacity *= mo.opacity.from + (mo.opacity.to - mo.opacity.from) * p;
  }
  return m;
}

function keyHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Per-layer seed (character performance, sway…): stable for a layer key within a shot. */
export function layerSeed(manifestSeed: number, key: string): number {
  return (manifestSeed ^ keyHash(key)) >>> 0;
}

/**
 * The 2.5D frame renderer: a pure function of (scene package, frame index).
 * Composes depth-ordered layers under a moving camera with parallax, dolly
 * perspective, in-image depth displacement for the background plate,
 * procedural character performance, contact/projected shadows, practical and
 * moving lights, environment particles, depth of field and the lens/film
 * post pass.
 */
export class FrameRenderer {
  readonly W: number;
  readonly H: number;
  readonly fps: number;
  readonly duration: number;
  readonly frameCount: number;
  readonly manifest: ScenePackageManifest;
  private readonly layers: Prepared[];
  private readonly sceneZoom: number;
  private readonly post: PostProcessor;
  private readonly sprites: Record<string, PImage>;
  private readonly seed: number;

  constructor(scene: SceneData, size: FrameSize) {
    this.manifest = scene.manifest;
    this.W = size.width;
    this.H = size.height;
    this.fps = size.fps;
    this.duration = scene.manifest.canvas.durationSeconds;
    this.frameCount = Math.max(1, Math.round(this.duration * this.fps));
    this.seed = scene.manifest.seed;
    this.sprites = buildParticleSprites();
    this.layers = [...scene.manifest.layers].sort((a, b) => a.zIndex - b.zIndex || a.depth - b.depth).map((spec) => this.prepare(spec, scene.layers[spec.key]));
    this.groundLock();
    this.sceneZoom = this.solveCoverZoom();
    const m = scene.manifest;
    this.post = new PostProcessor(this.W, this.H, m.effects, m.seed, m.depth.fogColor as [number, number, number]);
  }

  // -------------------------------------------------------------------------
  // Preparation
  // -------------------------------------------------------------------------

  private prepare(spec: LayerSpec, data: SceneLayerData | undefined): Prepared {
    const d = data ?? { key: spec.key, missing: "no data" };
    const seed = layerSeed(this.seed, spec.key);
    const base: Prepared = { spec, data: d, srcW: 1, srcH: 1, anchorPx: [0, 0], baseScale: 1, depth: spec.depth, grounded: false, motionBlurred: new Map(), seed };
    if (d.rig) {
      base.rig = rigFromMemory(d.rig.def, d.rig.images);
      base.srcW = d.rig.def.width;
      base.srcH = d.rig.def.height;
    } else if (d.image) {
      base.image = d.image;
      base.srcW = d.image.width;
      base.srcH = d.image.height;
      base.blur = new BlurCache(d.image, 8);
    } else {
      base.srcW = 420;
      base.srcH = 1000;
    }
    base.anchorPx = [spec.placement.anchor[0] * base.srcW, spec.placement.anchor[1] * base.srcH];
    if (spec.placement.cover) base.baseScale = Math.max(this.W / base.srcW, this.H / base.srcH) * 1.2 * (spec.placement.height || 1);
    else base.baseScale = (spec.placement.height * this.H) / base.srcH;
    if (d.depth) {
      base.depthMap = smoothGray(d.depth, Math.max(1, Math.round(Math.min(d.depth.width, d.depth.height) / 300)));
      let lo = 1;
      let hi = 0;
      for (let i = 0; i < base.depthMap.data.length; i += 7) {
        const v = base.depthMap.data[i];
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
      base.depthRange = [lo, hi];
    }
    base.grounded = !spec.placement.cover && spec.placement.anchor[1] >= 0.99 && (spec.kind === "character" || spec.kind === "prop" || spec.kind === "midground");
    return base;
  }

  /** Grounded layers move exactly like the floor under their feet (no foot sliding). */
  private groundLock() {
    const bg = this.layers.find((l) => l.spec.placement.cover && l.depthMap);
    if (!bg || !bg.depthMap) return;
    const C = [this.W / 2, this.H / 2];
    for (const l of this.layers) {
      if (!l.grounded) continue;
      const P = [l.spec.placement.x * this.W, l.spec.placement.y * this.H];
      const sx = bg.anchorPx[0] + (P[0] - C[0]) / bg.baseScale;
      const sy = bg.anchorPx[1] + (P[1] - C[1]) / bg.baseScale - 2;
      if (sx < 0 || sy < 0 || sx >= bg.srcW || sy >= bg.srcH) continue;
      const gd = sampleGray(bg.depthMap, sx, sy);
      if (gd > 0.05) l.depth = gd;
    }
  }

  /** Smallest uniform scene zoom (≥ 1) for which cover layers fill the frame through the whole camera move. */
  private solveCoverZoom(): number {
    let z = 1;
    const covers = this.layers.filter((l) => l.spec.placement.cover);
    if (!covers.length) return 1;
    for (let k = 0; k <= 24; k++) {
      const t = (k / 24) * this.duration;
      const cam = this.cameraAt(t, 1, {});
      for (const l of covers) {
        const m = this.layerMatrix(l, cam, layerMotion(l.spec, t / this.duration, t), 0, false, l.anchorPx, l.baseScale, 0.45);
        const inv = invert(m);
        const halfW = l.srcW / 2;
        const halfH = l.srcH / 2;
        // displacement margin for depth-mapped plates (near rows move more than the plate's own transform)
        const dispPx = l.depthRange ? (Math.abs(cam.x) + Math.abs(cam.orbit) * 0.6) * (parallaxFactor(l.depthRange[1], this.manifest.depth, cam.lensScale) - parallaxFactor(l.depth, this.manifest.depth, cam.lensScale)) * this.W + this.H * Math.abs(cam.zoom - 1) * 0.5 * (dollyFactor(l.depthRange[1], this.manifest.depth) - dollyFactor(l.depth, this.manifest.depth)) : 0;
        const marginSrc = (dispPx + 2) / l.baseScale;
        for (const [qx, qy] of [
          [0, 0],
          [this.W, 0],
          [0, this.H],
          [this.W, this.H],
        ]) {
          const [sx, sy] = apply(inv, qx, qy);
          const ox = Math.abs(sx - l.anchorPx[0]);
          const oy = Math.abs(sy - l.anchorPx[1]);
          z = Math.max(z, ox / Math.max(1, halfW - marginSrc), oy / Math.max(1, halfH - marginSrc));
        }
      }
    }
    return Math.min(z * 1.005, 2);
  }

  // -------------------------------------------------------------------------
  // Camera & projection
  // -------------------------------------------------------------------------

  private cameraAt(t: number, zoom: number, travel: Record<string, number>): Cam {
    const m = this.manifest;
    const c = evaluateCamera(m.camera, t, this.duration, this.seed);
    if (m.camera.trackLayerKey && travel[m.camera.trackLayerKey] !== undefined) {
      const tl = this.layers.find((l) => l.spec.key === m.camera.trackLayerKey);
      const p = parallaxFactor(tl?.depth ?? 0.45, m.depth, c.lensScale);
      c.x += (travel[m.camera.trackLayerKey] / Math.max(0.05, p)) * 0.85;
    }
    return { ...c, opt: (c.opticalZoom ? c.zoom : 1) * zoom };
  }

  private dl(cam: Cam, d: number): number {
    return cam.opticalZoom ? 1 : 1 + (cam.zoom - 1) * dollyFactor(d, this.manifest.depth);
  }

  private shift(cam: Cam, d: number, focusD: number): [number, number] {
    const p = parallaxFactor(d, this.manifest.depth, cam.lensScale);
    return [-cam.x * p * this.W + cam.orbit * (d - focusD) * this.W * 0.6, -cam.y * p * this.H];
  }

  /** Canvas-fraction point at a depth → screen px under the camera. */
  private project(cam: Cam, x: number, y: number, d: number, focusD: number): [number, number] {
    const C0 = this.W / 2;
    const C1 = this.H / 2;
    const s = this.shift(cam, d, focusD);
    const k = this.dl(cam, d);
    const qx = (x * this.W + s[0] - C0) * k;
    const qy = (y * this.H + s[1] - C1) * k;
    const r = (cam.roll * Math.PI) / 180;
    const cs = Math.cos(r) * cam.opt;
    const sn = Math.sin(r) * cam.opt;
    return [C0 + qx * cs - qy * sn, C1 + qx * sn + qy * cs];
  }

  /** Source px → screen px for a layer at this instant. */
  private layerMatrix(l: Prepared, cam: Cam, mo: LayerMotionState, travelX: number, flip: boolean, anchor: [number, number], unitScale: number, focusD: number, extraRot = 0, scaleY = 1): Mat2D {
    const pl = l.spec.placement;
    const x = pl.cover ? 0.5 + mo.tx + mo.ox : pl.x + mo.tx + mo.ox + travelX;
    const y = pl.cover ? 0.5 + mo.ty + mo.oy : pl.y + mo.ty + mo.oy;
    const [qx, qy] = this.project(cam, x, y, l.depth, focusD);
    const s = unitScale * this.dl(cam, l.depth) * cam.opt * mo.scale;
    return multiply(translate(qx, qy), multiply(rotate(cam.roll + pl.rotation + mo.rot + extraRot), multiply(scale(flip ? -s : s, s * scaleY), translate(-anchor[0], -anchor[1]))));
  }

  // -------------------------------------------------------------------------
  // Frame
  // -------------------------------------------------------------------------

  /** Composites frame `i` in linear (pre-post) form. */
  renderLinear(i: number): { image: PImage; lights: LightState[]; cameraVelocityPx: number; fade: number } {
    const m = this.manifest;
    const W = this.W;
    const H = this.H;
    const t = Math.min(this.duration, i / this.fps);
    const u = this.duration > 0 ? t / this.duration : 0;

    // 1. Layer motion and character performance (travel feeds camera tracking)
    const motions = new Map<string, LayerMotionState>();
    const chars = new Map<string, CharacterFrame>();
    const travel: Record<string, number> = {};
    for (const l of this.layers) {
      const mo = layerMotion(l.spec, u, t);
      motions.set(l.spec.key, mo);
      let tr = mo.tx;
      if (l.spec.character) {
        const cf = evaluateCharacter(l.spec.character, t, this.duration, l.seed, l.spec.placement.flipX ? -1 : 1);
        chars.set(l.spec.key, cf);
        tr += cf.travelX;
      }
      travel[l.spec.key] = tr;
    }

    // 2. Camera, focus, lights
    const cam = this.cameraAt(t, this.sceneZoom, travel);
    const depthOf = (key: string) => this.layers.find((l) => l.spec.key === key)?.depth;
    const focusD = focusDepthAt(m.focus, u, depthOf);
    const lights = evaluateLights(m.lighting, t, u, this.seed, (x, y, d) => this.project(cam, x, y, d, focusD), H);
    const absMap = buildLightMap(m.lighting, lights, W, H);
    const relMap = buildLightMap(m.lighting, lights.filter((l) => l.type !== "sun" && l.type !== "moon"), W, H);
    const amb = m.lighting.ambient;
    const sun = lights.find((l) => l.type === "sun" || l.type === "moon");
    // Exposure: luminance of ambient + key sky light at a typical falloff, so a
    // neutral-painted character reads at its painted values in daylight and
    // darker/bluer at night (never brighter than painted under a warm key).
    const lum = (c: [number, number, number]) => c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
    const ambRgb: [number, number, number] = [amb.color[0] * amb.intensity, amb.color[1] * amb.intensity, amb.color[2] * amb.intensity];
    const skyRgb: [number, number, number] = sun ? [sun.rgb[0] * 0.8, sun.rgb[1] * 0.8, sun.rgb[2] * 0.8] : [0, 0, 0];
    const exposure = Math.max(0.6, lum(ambRgb) + lum(skyRgb), Math.max(ambRgb[0] + skyRgb[0], ambRgb[1] + skyRgb[1], ambRgb[2] + skyRgb[2]) * 0.82);

    const absField = new LightField(absMap, "absolute", exposure, W);
    const relField = new LightField(relMap, "relative", 1, W);

    // 3. Particles (projected and binned by depth between layers)
    const particles: Particle[] = [];
    const lightPts = m.lighting.lights.filter((l) => l.type !== "sun" && l.type !== "moon").map((l) => ({ x: l.x, y: l.y }));
    for (const ps of m.environment.particles) particles.push(...evaluateParticles(ps, { t, duration: this.duration, lights: lightPts }));
    const bins: Particle[][] = this.layers.map(() => []);
    const before: Particle[] = [];
    for (const p of particles) {
      let k = -1;
      for (let j = 0; j < this.layers.length; j++) if (this.layers[j].depth <= p.depth) k = j;
      if (k < 0) before.push(p);
      else bins[k].push(p);
    }

    // 4. Compose
    const frame = createImage(W, H);
    const bgc = m.background;
    for (let j = 0; j < frame.data.length; j += 4) {
      frame.data[j] = bgc[0];
      frame.data[j + 1] = bgc[1];
      frame.data[j + 2] = bgc[2];
      frame.data[j + 3] = 1;
    }
    this.drawParticles(frame, before, cam, focusD, absMap, relMap);
    for (let j = 0; j < this.layers.length; j++) {
      const l = this.layers[j];
      const mo = motions.get(l.spec.key)!;
      if (mo.opacity > 0.002) {
        if (l.data.missing) this.drawMissing(frame, l, cam, mo, focusD);
        else if (l.rig) this.drawRigLayer(frame, l, cam, mo, chars.get(l.spec.key)!, focusD, lights, absField, t);
        else if (l.depthMap && l.spec.placement.cover) this.drawDisplacedPlate(frame, l, cam, mo, focusD, relField);
        else this.drawImageLayer(frame, l, cam, mo, chars.get(l.spec.key), focusD, lights, l.spec.kind === "character" || l.spec.kind === "prop" ? absField : relField, t);
      }
      this.drawParticles(frame, bins[j], cam, focusD, absMap, relMap);
    }

    const camVel = cameraVelocity(m.camera, t, this.duration, this.seed, this.fps) * W / this.fps;
    return { image: frame, lights, cameraVelocityPx: camVel, fade: fadeFactor(t, this.duration, m.transition) };
  }

  /** Final 8-bit RGB frame (rgb24) for the encoder. */
  renderFrame(i: number): Uint8Array {
    const lin = this.renderLinear(i);
    return this.post.apply(lin.image, { frame: i, lights: lin.lights, fade: lin.fade, cameraVelocityPx: lin.cameraVelocityPx });
  }

  // -------------------------------------------------------------------------
  // Layer kinds
  // -------------------------------------------------------------------------

  private blurFor(l: Prepared, focusD: number): number {
    return blurRadiusPx(this.manifest.focus, l.depth, focusD, this.W) + l.spec.extraBlur * (this.W / 1080);
  }

  private fogFor(depth: number) {
    const a = fogAmount(depth, this.manifest.depth);
    return { rgb: this.manifest.depth.fogColor as [number, number, number], amount: a };
  }

  /** Background plate with a depth map: per-pixel parallax, dolly, DOF and fog. */
  private drawDisplacedPlate(frame: PImage, l: Prepared, cam: Cam, mo: LayerMotionState, focusD: number, relField: LightField) {
    const W = this.W;
    const H = this.H;
    const spec = this.manifest.depth;
    const dm = l.depthMap!;
    const dmd = dm.data;
    const dmw = dm.width;
    const src = l.image!;
    const bs = l.baseScale * mo.scale;
    const Px = (0.5 + mo.tx + mo.ox) * W;
    const Py = (0.5 + mo.ty + mo.oy) * H;
    const C0 = W / 2;
    const C1 = H / 2;
    const r = ((cam.roll + l.spec.placement.rotation + mo.rot) * Math.PI) / 180;
    const ci = Math.cos(-r) / cam.opt;
    const si = Math.sin(-r) / cam.opt;
    const lens = cam.lensScale;
    const pf = spec.parallaxFar * lens;
    const pn = spec.parallaxNear * lens;
    const zf = spec.dollyFar;
    const zn = spec.dollyNear;
    const zoomK = cam.opticalZoom ? 0 : cam.zoom - 1;
    const totalScale = bs * cam.opt * this.dl(cam, l.depth);
    // Per-depth lookup tables (256 steps): source offset terms, fog and blur weight.
    const N = 256;
    const invK = new Float32Array(N);
    const offX = new Float32Array(N);
    const offY = new Float32Array(N);
    const fogT = new Float32Array(N);
    const ap = this.manifest.focus.aperture * (W / 1080);
    const [dLo, dHi] = l.depthRange ?? [0, 1];
    const rAt = (d: number) => ap * Math.abs(d - focusD) + l.spec.extraBlur;
    const rMin = focusD >= dLo && focusD <= dHi ? l.spec.extraBlur : Math.min(rAt(dLo), rAt(dHi));
    const rMax = Math.max(rAt(dLo), rAt(dHi));
    const blurW = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const dep = i / (N - 1);
      const k = 1 + zoomK * (zf + (zn - zf) * dep);
      const p = pf + (pn - pf) * dep;
      invK[i] = 1 / k;
      // s = a + (v/k − shift + C − P)/bs  →  precompute (−shift + C − P)
      offX[i] = cam.x * p * W - cam.orbit * (dep - focusD) * W * 0.6 + C0 - Px;
      offY[i] = cam.y * p * H + C1 - Py;
      fogT[i] = Math.min(0.85, spec.fogDensity * Math.pow(1 - dep, spec.fogCurve));
      blurW[i] = rMax - rMin > 0.6 ? clamp((rAt(dep) - rMin) / (rMax - rMin), 0, 1) : 0;
    }
    const levelA = l.blur!.get(rMin / totalScale);
    const levelB = rMax - rMin > 0.6 ? l.blur!.get(rMax / totalScale) : null;
    const A = levelA.img;
    const Ad = A.data;
    const Aw = A.width;
    const Ah = A.height;
    const Af = 1 / levelA.factor;
    const B = levelB?.img;
    const Bd = B?.data;
    const Bw = B?.width ?? 0;
    const Bh = B?.height ?? 0;
    const Bf = levelB ? 1 / levelB.factor : 1;
    const opacity = mo.opacity;
    const fogC = spec.fogColor;
    const resp = l.spec.lightResponse;
    const d = frame.data;
    const sw1 = src.width - 1;
    const sh1 = src.height - 1;
    const ax = l.anchorPx[0];
    const ay = l.anchorPx[1];
    const invBs = 1 / bs;
    const startDepth = Math.round(clamp(l.depth, 0, 1) * (N - 1));
    const lrow = new Float32Array(W * 3);

    // Solve the depth-dependent inverse mapping on a coarse grid (the depth map
    // is pre-smoothed, so the mapping is smooth at this scale) and interpolate.
    const G = 4;
    const gw = Math.ceil(W / G) + 1;
    const gh = Math.ceil(H / G) + 1;
    const gsx = new Float32Array(gw * gh);
    const gsy = new Float32Array(gw * gh);
    const gd = new Float32Array(gw * gh);
    for (let gy = 0; gy < gh; gy++) {
      const qy = gy * G + 0.5 - C1;
      for (let gx = 0; gx < gw; gx++) {
        const qx = gx * G + 0.5 - C0;
        const vx = qx * ci - qy * si;
        const vy = qx * si + qy * ci;
        let di = startDepth;
        let sx = 0;
        let sy = 0;
        for (let it = 0; it < 3; it++) {
          sx = ax + (vx * invK[di] + offX[di]) * invBs;
          sy = ay + (vy * invK[di] + offY[di]) * invBs;
          sx = sx < 0 ? 0 : sx > sw1 ? sw1 : sx;
          sy = sy < 0 ? 0 : sy > sh1 ? sh1 : sy;
          di = (dmd[(sy | 0) * dmw + (sx | 0)] * (N - 1) + 0.5) | 0;
        }
        const gi = gy * gw + gx;
        gsx[gi] = sx;
        gsy[gi] = sy;
        gd[gi] = di;
      }
    }
    plateKernel(
      d, W, H, gsx, gsy, gd, gw, gh, G,
      Ad, Aw, Ah, Af,
      Bd ?? Ad, levelB ? Bw : 0, levelB ? Bh : 0, Bf, levelB ? 1 : 0,
      blurW, fogT, fogC[0], fogC[1], fogC[2], opacity,
      (y: number, out: Float32Array) => relField.fillRow(y, 0, W, resp, out), lrow,
    );
  }

  private drawImageLayer(frame: PImage, l: Prepared, cam: Cam, mo: LayerMotionState, cf: CharacterFrame | undefined, focusD: number, lights: LightState[], field: LightField, t: number) {
    const spec = l.spec;
    // Image-sourced characters still breathe and sway (whole-figure micro-motion).
    const sway = cf ? cf.sway : 0;
    const breathY = cf ? 1 + (cf.breath - 1) * 0.5 : 1;
    const travelX = cf ? cf.travelX : 0;
    const bob = cf ? cf.bob : 0;
    const flip = cf && spec.character?.walk ? cf.facing < 0 : spec.placement.flipX;
    const moB = bob ? { ...mo, oy: mo.oy + bob } : mo;
    const M = this.layerMatrix(l, cam, moB, travelX, flip, l.anchorPx, l.baseScale, focusD, sway, breathY);
    const screenScale = Math.hypot(M[0], M[1]);
    // motion blur from layer velocity (e.g. a passing train)
    let img = l.image!;
    let factor = 1;
    const vel = this.layerVelocityPx(l, t);
    const mbLen = Math.abs(vel) * this.manifest.effects.motionBlur;
    const blurPx = this.blurFor(l, focusD);
    if (blurPx > 0.6) {
      const lev = l.blur!.get(blurPx / screenScale);
      img = lev.img;
      factor = lev.factor;
    }
    if (mbLen > 1.5) {
      const q = Math.round(mbLen / screenScale / factor);
      let mb = l.motionBlurred.get(q * 1000 + factor);
      if (!mb) {
        mb = motionBlurH(img, q);
        if (l.motionBlurred.size > 6) l.motionBlurred.clear();
        l.motionBlurred.set(q * 1000 + factor, mb);
      }
      img = mb;
    }
    const Mf = factor === 1 ? M : multiply(M, scale(factor));
    if (spec.castsShadow && this.manifest.shadows.enabled) this.drawShadows(frame, l.image!, M, l.anchorPx, lights, mo.opacity, 0.55);
    drawImageAffine(frame, img, Mf, {
      opacity: mo.opacity,
      blend: spec.blend,
      flatColor: spec.silhouette ? [0.05, 0.055, 0.07] : undefined,
      light: spec.silhouette ? undefined : { field, response: spec.lightResponse },
      fog: this.fogFor(l.depth),
    });
  }

  private layerVelocityPx(l: Prepared, t: number): number {
    if (!l.spec.motion?.translate) return 0;
    const dt = 1 / this.fps;
    const a = layerMotion(l.spec, Math.max(0, t - dt / 2) / this.duration, t - dt / 2).tx;
    const b = layerMotion(l.spec, Math.min(this.duration, t + dt / 2) / this.duration, t + dt / 2).tx;
    return (b - a) * this.W;
  }

  private drawRigLayer(frame: PImage, l: Prepared, cam: Cam, mo: LayerMotionState, cf: CharacterFrame, focusD: number, lights: LightState[], absField: LightField, t: number) {
    const spec = l.spec;
    const rig = l.rig!;
    const flip = spec.character?.walk ? cf.facing < 0 : spec.placement.flipX;
    const S = l.baseScale * this.dl(cam, l.depth) * cam.opt * mo.scale;
    const full = rigCanvas(rig.def, S);
    // matrix for the full rig canvas (scale already applied inside the rig render)
    const unit = { ...l, anchorPx: full.anchor } as Prepared;
    const moUnit = { ...mo, scale: 1 };
    const Mfull = this.layerMatrix(unit, cam, moUnit, cf.travelX, flip, full.anchor, 1 / (this.dl(cam, l.depth) * cam.opt), focusD);
    // visible region of the rig canvas (+ margin for blur and shadows)
    const inv = invert(Mfull);
    const pad = 24;
    const pts = [
      [-pad, -pad],
      [this.W + pad, -pad],
      [-pad, this.H + pad],
      [this.W + pad, this.H + pad],
    ].map(([x, y]) => apply(inv, x, y));
    const clip: Rect = { x0: Math.min(...pts.map((p) => p[0])), y0: Math.min(...pts.map((p) => p[1])), x1: Math.max(...pts.map((p) => p[0])), y1: Math.max(...pts.map((p) => p[1])) };
    if (clip.x1 < 0 || clip.y1 < 0 || clip.x0 > full.width || clip.y0 > full.height) return;
    const rf = renderRigFrame(rig, cf, S, clip);
    let img = rf.image;
    const M = this.layerMatrix(unit, cam, moUnit, cf.travelX, flip, rf.anchor, 1 / (this.dl(cam, l.depth) * cam.opt), focusD);

    const feet = apply(M, rf.anchor[0], rf.anchor[1]);
    const key = keyLightFor(lights, feet[0], feet[1] - S * rig.def.height * 0.6, this.manifest.lighting.keyDirection, this.H);
    if (spec.castsShadow && this.manifest.shadows.enabled) this.drawShadows(frame, img, M, rf.anchor, lights, mo.opacity, 0.24, key);
    // rim light on the side facing the key light (stronger for silhouettes and at dusk/night)
    const tod = this.manifest.lighting.timeOfDay;
    const rimK = (spec.silhouette ? 0.9 : tod === "night" ? 0.4 : tod === "evening" ? 0.22 : 0.08) * clamp(key.strength, 0, 1.2);
    if (rimK > 0.04) img = addRim(img, flip ? -key.dx : key.dx, key.dy, key.rgb, rimK, Math.max(1.2, S * rig.def.height * 0.0025));
    const blurPx = this.blurFor(l, focusD);
    if (blurPx > 0.6) img = blurLarge(img, blurPx);
    const vel = this.layerVelocityPx(l, t) + (spec.character?.walk ? (spec.character.walk.travel * this.W) / this.duration / this.fps : 0);
    if (Math.abs(vel) * this.manifest.effects.motionBlur > 1.5) img = motionBlurH(img, Math.abs(vel) * this.manifest.effects.motionBlur);
    drawImageAffine(frame, img, M, {
      opacity: mo.opacity,
      flatColor: spec.silhouette ? [0.05, 0.055, 0.07] : undefined,
      light: spec.silhouette ? undefined : { field: absField, response: spec.lightResponse },
      fog: this.fogFor(l.depth),
    });
    if (spec.silhouette && rimK > 0.04) {
      // re-apply the rim over the flat silhouette so its edge still catches light
      const rimOnly = rimMask(rf.image, flip ? -key.dx : key.dx, key.dy, key.rgb, rimK, Math.max(1.5, S * rig.def.height * 0.004));
      drawImageAffine(frame, rimOnly, M, { opacity: mo.opacity, blend: "add" });
    }
  }

  /** Contact shadow under the feet plus a projected shadow cast away from the key light. */
  private drawShadows(frame: PImage, img: PImage, M: Mat2D, feetSrc: [number, number], lights: LightState[], opacity: number, contactWidth: number, keyIn?: ReturnType<typeof keyLightFor>) {
    const sh = this.manifest.shadows;
    const F = apply(M, feetSrc[0], feetSrc[1]);
    const heightPx = Math.hypot(M[2], M[3]) * img.height;
    const widthPx = Math.hypot(M[0], M[1]) * img.width;
    const key = keyIn ?? keyLightFor(lights, F[0], F[1] - heightPx * 0.6, this.manifest.lighting.keyDirection, this.H);
    // projected shadow
    const down = key.dy <= 0.15; // light above/behind → shadow falls towards the camera
    const k = clamp(sh.length * (0.35 + 0.65 * (1 - Math.abs(key.dy))), 0.12, 1.1) * (down ? 1 : 0.5);
    const shx = key.dx * 1.2; // shadow leans away from the light
    const f = Math.max(2, Math.round(Math.min(img.width, img.height) / 160));
    const small = blurImage(downscale(img, f), 1 + sh.softness * 3);
    const Ms = multiply(translate(F[0], F[1]), multiply([1, 0, shx * k, down ? -k : k, 0, 0], multiply(translate(-F[0], -F[1]), multiply(M, scale(f)))));
    drawImageAffine(frame, small, Ms, { flatColor: C_SOFT_SHADOW, opacity: sh.opacity * clamp(key.strength, 0.25, 1) * opacity * 0.85 });
    if (sh.contact) {
      const soft = this.sprites.soft;
      const w = Math.max(widthPx * contactWidth, 6);
      const h = Math.max(w * 0.16, 3);
      const Mc = multiply(translate(F[0] - w / 2, F[1] - h / 2 + h * 0.15), scale(w / soft.width, h / soft.height));
      drawImageAffine(frame, soft, Mc, { flatColor: C_SOFT_SHADOW, opacity: Math.min(1, sh.opacity * 1.6) * opacity });
    }
  }

  private drawParticles(frame: PImage, ps: Particle[], cam: Cam, focusD: number, absMap: LightMap, relMap: LightMap) {
    if (!ps.length) return;
    const H = this.H;
    const ap = this.manifest.focus.aperture * (this.W / 1080);
    const tmp = new Float32Array(3);
    for (const p of ps) {
      const [x, y] = this.project(cam, p.x, p.y, p.depth, focusD);
      const zoom = this.dl(cam, p.depth) * cam.opt;
      const blur = ap * Math.abs(p.depth - focusD);
      // light at the particle
      lightAt(absMap, x, y, tmp);
      const lum = tmp[0] * 0.3 + tmp[1] * 0.59 + tmp[2] * 0.11;
      let alpha = p.alpha;
      if (p.catchesLight) {
        // motes are only visible inside the pools of practical lights (lamps, windows, passing train)
        lightAt(relMap, x, y, tmp);
        const relLum = tmp[0] * 0.3 + tmp[1] * 0.59 + tmp[2] * 0.11;
        const ambLum = relMap.ambient[0] * 0.3 + relMap.ambient[1] * 0.59 + relMap.ambient[2] * 0.11;
        alpha *= clamp(((relLum - ambLum) / Math.max(0.1, ambLum)) * p.catchesLight, 0.03, 1.6);
        lightAt(absMap, x, y, tmp);
      }
      const rgb: [number, number, number] = p.additive ? p.rgb : [p.rgb[0] * Math.min(1.4, tmp[0]), p.rgb[1] * Math.min(1.4, tmp[1]), p.rgb[2] * Math.min(1.4, tmp[2])];
      const fog = fogAmount(p.depth, this.manifest.depth);
      if (!p.additive && fog > 0.01) for (let c = 0; c < 3; c++) rgb[c] = rgb[c] * (1 - fog) + this.manifest.depth.fogColor[c] * fog;
      if (p.shape === "dot") {
        const r0 = Math.max(0.6, p.size * H * zoom);
        const r = Math.sqrt(r0 * r0 + blur * blur * 0.5);
        splat(frame, x, y, r, rgb, alpha * Math.min(1, (r0 * r0) / (r * r) + 0.15), !!p.additive);
      } else if (p.shape === "streak") {
        const len = p.size * H * zoom;
        streak(frame, x, y, len, p.angle, Math.max(0.8, Math.min(2.5, 0.7 + blur * 0.25)), rgb, alpha, !!p.additive);
      } else if (p.shape === "puff") {
        const r = p.size * H * zoom;
        const soft = this.sprites.soft;
        const M = multiply(translate(x - r, y - r), scale((2 * r) / soft.width, (2 * r) / soft.height));
        drawImageAffine(frame, soft, M, { opacity: alpha, tint: rgb });
      } else if (p.sprite) {
        const spr = this.sprites[p.sprite];
        if (!spr) continue;
        const hpx = p.size * H * zoom;
        const sc = hpx / spr.height;
        const flip = p.flip ? -1 : 1;
        const M = multiply(translate(x, y - (p.bob ?? 0) * H), multiply(rotate(p.sprite === "leaf" ? (p.angle * 180) / Math.PI : 0), multiply(scale(sc * flip, sc), translate(-spr.width / 2, -spr.height))));
        drawImageAffine(frame, spr, M, { opacity: alpha, flatColor: rgb });
      }
    }
  }

  private drawMissing(frame: PImage, l: Prepared, cam: Cam, mo: LayerMotionState, focusD: number) {
    // Only reachable in previews (production renders refuse missing assets).
    const M = this.layerMatrix(l, cam, mo, 0, false, l.anchorPx, l.baseScale, focusD);
    const img = createImage(32, 32);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) img.data.set(((x + y) >> 2) % 2 ? [0.5, 0.2, 0.5, 0.5] : [0.2, 0.2, 0.2, 0.5], (y * 32 + x) * 4);
    drawImageAffine(frame, img, multiply(M, scale(l.srcW / 32, l.srcH / 32)), { opacity: 0.8 });
  }

  /** Debug/inspector data: where each layer sits at a frame. */
  describe(i: number): { t: number; sceneZoom: number; layers: { key: string; depth: number; screen: [number, number] }[] } {
    const t = i / this.fps;
    const cam = this.cameraAt(t, this.sceneZoom, {});
    return {
      t,
      sceneZoom: this.sceneZoom,
      layers: this.layers.map((l) => ({ key: l.spec.key, depth: l.depth, screen: this.project(cam, l.spec.placement.x, l.spec.placement.y, l.depth, this.manifest.focus.focusDepth) })),
    };
  }
}

// ---------------------------------------------------------------------------
// Pixel helpers
// ---------------------------------------------------------------------------

function sampleClamped(img: PImage, x: number, y: number, out: Float32Array) {
  const w = img.width;
  const h = img.height;
  const fx = Math.min(w - 1, Math.max(0, x - 0.5));
  const fy = Math.min(h - 1, Math.max(0, y - 0.5));
  const x0 = fx | 0;
  const y0 = fy | 0;
  const x1 = x0 + 1 < w ? x0 + 1 : x0;
  const y1 = y0 + 1 < h ? y0 + 1 : y0;
  const tx = fx - x0;
  const ty = fy - y0;
  const d = img.data;
  const a = (y0 * w + x0) * 4;
  const b = (y0 * w + x1) * 4;
  const c = (y1 * w + x0) * 4;
  const e = (y1 * w + x1) * 4;
  for (let k = 0; k < 4; k++) out[k] = (d[a + k] * (1 - tx) + d[b + k] * tx) * (1 - ty) + (d[c + k] * (1 - tx) + d[e + k] * tx) * ty;
}

function lightAt(m: LightMap, x: number, y: number, out: Float32Array) {
  const fx = clamp(x / m.scale - 0.5, 0, m.w - 1);
  const fy = clamp(y / m.scale - 0.5, 0, m.h - 1);
  const o = ((fy | 0) * m.w + (fx | 0)) * 3;
  out[0] = m.data[o];
  out[1] = m.data[o + 1];
  out[2] = m.data[o + 2];
}

function splat(frame: PImage, cx: number, cy: number, r: number, rgb: [number, number, number], alpha: number, additive: boolean) {
  const W = frame.width;
  const H = frame.height;
  const d = frame.data;
  const x0 = Math.max(0, Math.floor(cx - r - 1));
  const x1 = Math.min(W - 1, Math.ceil(cx + r + 1));
  const y0 = Math.max(0, Math.floor(cy - r - 1));
  const y1 = Math.min(H - 1, Math.ceil(cy + r + 1));
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const dist = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      const cov = r < 1.2 ? clamp(1.2 - dist, 0, 1) : clamp(1 - dist / r, 0, 1) ** 1.5;
      const a = cov * alpha;
      if (a <= 0.002) continue;
      const o = (y * W + x) * 4;
      if (additive) {
        d[o] += rgb[0] * a;
        d[o + 1] += rgb[1] * a;
        d[o + 2] += rgb[2] * a;
      } else {
        d[o] = rgb[0] * a + d[o] * (1 - a);
        d[o + 1] = rgb[1] * a + d[o + 1] * (1 - a);
        d[o + 2] = rgb[2] * a + d[o + 2] * (1 - a);
      }
    }
}

function streak(frame: PImage, cx: number, cy: number, len: number, angle: number, width: number, rgb: [number, number, number], alpha: number, additive: boolean) {
  const W = frame.width;
  const H = frame.height;
  const d = frame.data;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const ax = cx - (dx * len) / 2;
  const ay = cy - (dy * len) / 2;
  const x0 = Math.max(0, Math.floor(Math.min(ax, ax + dx * len) - width - 1));
  const x1 = Math.min(W - 1, Math.ceil(Math.max(ax, ax + dx * len) + width + 1));
  const y0 = Math.max(0, Math.floor(Math.min(ay, ay + dy * len) - width - 1));
  const y1 = Math.min(H - 1, Math.ceil(Math.max(ay, ay + dy * len) + width + 1));
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const px = x + 0.5 - ax;
      const py = y + 0.5 - ay;
      const along = px * dx + py * dy;
      if (along < 0 || along > len) continue;
      const across = Math.abs(px * -dy + py * dx);
      const cov = clamp(width / 2 + 0.5 - across, 0, 1);
      // fade the tail so streaks read as motion
      const a = cov * alpha * (0.35 + 0.65 * (along / len));
      if (a <= 0.002) continue;
      const o = (y * W + x) * 4;
      if (additive) {
        d[o] += rgb[0] * a;
        d[o + 1] += rgb[1] * a;
        d[o + 2] += rgb[2] * a;
      } else {
        d[o] = rgb[0] * a + d[o] * (1 - a);
        d[o + 1] = rgb[1] * a + d[o + 1] * (1 - a);
        d[o + 2] = rgb[2] * a + d[o + 2] * (1 - a);
      }
    }
}

/** Blur that downsamples first for big radii (DOF on offscreen character renders). */
function blurLarge(img: PImage, radius: number): PImage {
  if (radius < 3) return blurImage(img, radius);
  let f = 1;
  while (f * 2 <= radius / 2 && f < 8) f *= 2;
  if (f === 1) return blurImage(img, radius);
  const small = blurImage(downscale(img, f), radius / f);
  // upsample back to the original grid (bilinear)
  const out = createImage(img.width, img.height);
  const tmp = new Float32Array(4);
  for (let y = 0; y < img.height; y++)
    for (let x = 0; x < img.width; x++) {
      sampleClamped(small, (x + 0.5) / f, (y + 0.5) / f, tmp);
      out.data.set(tmp, (y * img.width + x) * 4);
    }
  return out;
}

/** Edge light: where the figure's alpha drops towards the light direction. Returns a new image. */
function addRim(img: PImage, dx: number, dy: number, rgb: [number, number, number], strength: number, widthPx: number): PImage {
  const rim = rimMask(img, dx, dy, rgb, strength, widthPx);
  const out = createImage(img.width, img.height);
  out.data.set(img.data);
  const d = out.data;
  const r = rim.data;
  for (let i = 0; i < d.length; i += 4) {
    if (r[i + 3] <= 0) continue;
    d[i] += r[i];
    d[i + 1] += r[i + 1];
    d[i + 2] += r[i + 2];
  }
  return out;
}

function rimMask(img: PImage, dx: number, dy: number, rgb: [number, number, number], strength: number, widthPx: number): PImage {
  const { width: w, height: h, data: s } = img;
  const out = createImage(w, h);
  const ox = Math.round(dx * widthPx);
  const oy = Math.round(dy * widthPx);
  const d = out.data;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = s[i + 3];
      if (a < 0.05) continue;
      const xx = x + ox;
      const yy = y + oy;
      const an = xx < 0 || yy < 0 || xx >= w || yy >= h ? 0 : s[(yy * w + xx) * 4 + 3];
      const e = clamp(a - an, 0, 1) * strength;
      if (e <= 0.01) continue;
      d[i] = rgb[0] * e;
      d[i + 1] = rgb[1] * e;
      d[i + 2] = rgb[2] * e;
      d[i + 3] = e;
    }
  return out;
}

/**
 * Inner loop of the displaced plate, kept as a small top-level function with
 * monomorphic typed-array arguments so the JIT optimises it fully.
 */
function plateKernel(
  d: Float32Array, W: number, H: number,
  gsx: Float32Array, gsy: Float32Array, gd: Float32Array, gw: number, gh: number, G: number,
  Ad: Float32Array, Aw: number, Ah: number, Af: number,
  Bd: Float32Array, Bw: number, Bh: number, Bf: number, useB: number,
  blurW: Float32Array, fogT: Float32Array, fogR: number, fogG: number, fogB: number, opacity: number,
  fillLightRow: (y: number, out: Float32Array) => void, lrow: Float32Array,
): void {
  const rowSx = new Float32Array(gw);
  const rowSy = new Float32Array(gw);
  const rowD = new Float32Array(gw);
  const invG = 1 / G;
  const Aw4 = Aw * 4;
  const Bw4 = Bw * 4;
  for (let y = 0; y < H; y++) {
    fillLightRow(y, lrow);
    const gyf = y * invG;
    const gy0 = Math.min(gh - 2, gyf | 0);
    const gty = gyf - gy0;
    const ra = gy0 * gw;
    const rb = ra + gw;
    for (let k = 0; k < gw; k++) {
      rowSx[k] = gsx[ra + k] + (gsx[rb + k] - gsx[ra + k]) * gty;
      rowSy[k] = gsy[ra + k] + (gsy[rb + k] - gsy[ra + k]) * gty;
      rowD[k] = gd[ra + k] + (gd[rb + k] - gd[ra + k]) * gty;
    }
    let o = y * W * 4;
    for (let x = 0; x < W; x++, o += 4) {
      const gxf = x * invG;
      const gx0 = gxf | 0;
      const gtx = gxf - gx0;
      const sx = rowSx[gx0] + (rowSx[gx0 + 1] - rowSx[gx0]) * gtx;
      const sy = rowSy[gx0] + (rowSy[gx0 + 1] - rowSy[gx0]) * gtx;
      const di = (rowD[gx0] + (rowD[gx0 + 1] - rowD[gx0]) * gtx + 0.5) | 0;
      let fx = sx * Af - 0.5;
      let fy = sy * Af - 0.5;
      if (fx < 0) fx = 0;
      if (fy < 0) fy = 0;
      let x0 = fx | 0;
      let y0 = fy | 0;
      if (x0 > Aw - 2) x0 = Aw - 2;
      if (y0 > Ah - 2) y0 = Ah - 2;
      let tx = fx - x0;
      let ty = fy - y0;
      if (tx > 1) tx = 1;
      if (ty > 1) ty = 1;
      let o0 = y0 * Aw4 + x0 * 4;
      let o1 = o0 + Aw4;
      let w00 = (1 - tx) * (1 - ty);
      let w01 = tx * (1 - ty);
      let w10 = (1 - tx) * ty;
      let w11 = tx * ty;
      let cr = Ad[o0] * w00 + Ad[o0 + 4] * w01 + Ad[o1] * w10 + Ad[o1 + 4] * w11;
      let cg = Ad[o0 + 1] * w00 + Ad[o0 + 5] * w01 + Ad[o1 + 1] * w10 + Ad[o1 + 5] * w11;
      let cb = Ad[o0 + 2] * w00 + Ad[o0 + 6] * w01 + Ad[o1 + 2] * w10 + Ad[o1 + 6] * w11;
      let ca = Ad[o0 + 3] * w00 + Ad[o0 + 7] * w01 + Ad[o1 + 3] * w10 + Ad[o1 + 7] * w11;
      const bw = blurW[di];
      if (useB === 1 && bw > 0.01) {
        fx = sx * Bf - 0.5;
        fy = sy * Bf - 0.5;
        if (fx < 0) fx = 0;
        if (fy < 0) fy = 0;
        x0 = fx | 0;
        y0 = fy | 0;
        if (x0 > Bw - 2) x0 = Bw - 2;
        if (y0 > Bh - 2) y0 = Bh - 2;
        tx = fx - x0;
        ty = fy - y0;
        if (tx > 1) tx = 1;
        if (ty > 1) ty = 1;
        o0 = y0 * Bw4 + x0 * 4;
        o1 = o0 + Bw4;
        w00 = (1 - tx) * (1 - ty);
        w01 = tx * (1 - ty);
        w10 = (1 - tx) * ty;
        w11 = tx * ty;
        const k0 = 1 - bw;
        cr = cr * k0 + (Bd[o0] * w00 + Bd[o0 + 4] * w01 + Bd[o1] * w10 + Bd[o1 + 4] * w11) * bw;
        cg = cg * k0 + (Bd[o0 + 1] * w00 + Bd[o0 + 5] * w01 + Bd[o1 + 1] * w10 + Bd[o1 + 5] * w11) * bw;
        cb = cb * k0 + (Bd[o0 + 2] * w00 + Bd[o0 + 6] * w01 + Bd[o1 + 2] * w10 + Bd[o1 + 6] * w11) * bw;
        ca = ca * k0 + (Bd[o0 + 3] * w00 + Bd[o0 + 7] * w01 + Bd[o1 + 3] * w10 + Bd[o1 + 7] * w11) * bw;
      }
      const a = ca * opacity;
      if (a <= 1e-4) continue;
      const lo = x * 3;
      const f = fogT[di];
      const kf = 1 - f;
      const inv = 1 - a;
      d[o] = (cr * lrow[lo] * kf + fogR * f * ca) * opacity + d[o] * inv;
      d[o + 1] = (cg * lrow[lo + 1] * kf + fogG * f * ca) * opacity + d[o + 1] * inv;
      d[o + 2] = (cb * lrow[lo + 2] * kf + fogB * f * ca) * opacity + d[o + 2] * inv;
      d[o + 3] = a + d[o + 3] * inv;
    }
  }
}
