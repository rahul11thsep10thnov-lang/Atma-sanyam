import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CAMERA_MOVES, cameraSpecSchema, ManifestInput, particleSpecSchema, lightingSpecSchema, focusSpecSchema, effectsSpecSchema } from "../src/studio/engine25d/spec";
import { cameraPreset, evaluateCamera } from "../src/studio/engine25d/camera";
import { createImage, PImage } from "../src/studio/engine25d/raster";
import { sceneFromMemory } from "../src/studio/engine25d/scene";
import { FrameRenderer } from "../src/studio/engine25d/frameRenderer";
import { evaluateParticles } from "../src/studio/engine25d/particles";
import { buildLightMap, evaluateLights } from "../src/studio/engine25d/lighting";
import { blurRadiusPx, focusDepthAt } from "../src/studio/engine25d/focus";
import { PostProcessor } from "../src/studio/engine25d/effects";
import { renderShotToFile } from "../src/studio/engine25d/shotRenderer";
import { buildManifest, IncompletePackageError, packageHash } from "../src/studio/production/scenePackage";
import { buildRailwayDemo } from "../src/studio/demo/railwayDemo";

function solidImage(w: number, h: number, rgb: [number, number, number], alpha = 1): PImage {
  const img = createImage(w, h);
  for (let i = 0; i < w * h; i++) img.data.set([rgb[0] * alpha, rgb[1] * alpha, rgb[2] * alpha, alpha], i * 4);
  return img;
}

function baseManifest(over: Partial<ManifestInput> = {}): ManifestInput {
  return {
    version: 1,
    shotId: "t",
    canvas: { width: 108, height: 192, fps: 10, durationSeconds: 2, aspectRatio: "9:16" },
    seed: 7,
    style: "test",
    layers: [],
    camera: cameraPreset("static"),
    lighting: { timeOfDay: "afternoon", ambient: { color: [1, 1, 1], intensity: 1 }, lights: [] },
    effects: { grain: 0, vignette: 0, bloom: { threshold: 1, intensity: 0, radius: 0.01 }, chromaticAberration: 0, lensFlare: 0, motionBlur: 0, haze: 0 },
    depth: { fogDensity: 0 },
    ...over,
  };
}

/** Horizontal centroid of pixels close to a colour. */
function centroidX(img: PImage, rgb: [number, number, number]): number {
  let sx = 0;
  let n = 0;
  for (let y = 0; y < img.height; y++)
    for (let x = 0; x < img.width; x++) {
      const o = (y * img.width + x) * 4;
      if (Math.abs(img.data[o] - rgb[0]) + Math.abs(img.data[o + 1] - rgb[1]) + Math.abs(img.data[o + 2] - rgb[2]) < 0.08) {
        sx += x;
        n++;
      }
    }
  return n ? sx / n : NaN;
}

describe("CameraMotionEngine", () => {
  it("evaluates all 15 moves deterministically", () => {
    expect(CAMERA_MOVES).toHaveLength(15);
    for (const m of CAMERA_MOVES) {
      const spec = cameraPreset(m);
      const a = evaluateCamera(spec, 1.3, 5, 9);
      expect(evaluateCamera(spec, 1.3, 5, 9)).toEqual(a);
    }
    const dolly = cameraPreset("dolly_in");
    expect(evaluateCamera(dolly, 5, 5, 1).zoom).toBeGreaterThan(evaluateCamera(dolly, 0, 5, 1).zoom);
    const pan = cameraPreset("pan_right");
    expect(evaluateCamera(pan, 5, 5, 1).x).toBeGreaterThan(evaluateCamera(pan, 0, 5, 1).x);
    const whip = cameraPreset("whip_pan");
    expect(Math.abs(evaluateCamera(whip, 2, 5, 1).x)).toBeLessThan(0.01); // holds, then whips at the end
    expect(evaluateCamera(whip, 5, 5, 1).x).toBeGreaterThan(0.3);
    expect(evaluateCamera(cameraPreset("slow_zoom"), 5, 5, 1).opticalZoom).toBe(true);
    expect(cameraSpecSchema.parse(cameraPreset("orbit")).type).toBe("orbit");
  });
});

describe("ParallaxRenderer / DepthEngine", () => {
  it("moves near layers more than far layers under a pan", () => {
    const m = baseManifest({
      camera: cameraPreset("pan_right", 2),
      layers: [
        { key: "far", kind: "midground", name: "far", zIndex: 1, depth: 0.05, source: { type: "image", path: "far", width: 20, height: 40 }, placement: { x: 0.5, y: 0.5, anchor: [0.5, 0.5], height: 0.2 } },
        { key: "near", kind: "foreground", name: "near", zIndex: 2, depth: 0.95, source: { type: "image", path: "near", width: 20, height: 40 }, placement: { x: 0.5, y: 0.8, anchor: [0.5, 0.5], height: 0.2 } },
      ],
    });
    const scene = sceneFromMemory(m, { far: { image: solidImage(20, 40, [1, 0, 0]) }, near: { image: solidImage(20, 40, [0, 0, 1]) } });
    const r = new FrameRenderer(scene, { width: 108, height: 192, fps: 10 });
    const f0 = r.renderLinear(0).image;
    const f1 = r.renderLinear(19).image;
    const farMove = Math.abs(centroidX(f1, [1, 0, 0]) - centroidX(f0, [1, 0, 0]));
    const nearMove = Math.abs(centroidX(f1, [0, 0, 1]) - centroidX(f0, [0, 0, 1]));
    expect(nearMove).toBeGreaterThan(farMove * 3);
    expect(centroidX(f1, [0, 0, 1])).toBeLessThan(centroidX(f0, [0, 0, 1])); // camera right → content left
  });

  it("displaces a depth-mapped plate per pixel (near rows move more) and ground-locks standing layers", () => {
    const W = 130;
    const Hh = 230;
    const plate = createImage(W, Hh);
    const depth = new Float32Array(W * Hh);
    for (let y = 0; y < Hh; y++)
      for (let x = 0; x < W; x++) {
        // non-periodic vertical bars so horizontal motion is measurable; top = far, bottom = near
        const v = Math.sin(x * 12.9898) * 43758.5453 - Math.floor(Math.sin(x * 12.9898) * 43758.5453) > 0.5 ? 1 : 0;
        plate.data.set([v, v, v, 1], (y * W + x) * 4);
        depth[y * W + x] = y / (Hh - 1);
      }
    const m = baseManifest({
      camera: cameraPreset("pan_right", 2),
      layers: [
        { key: "bg", kind: "background", name: "bg", zIndex: 0, depth: 0, source: { type: "image", path: "bg", width: W, height: Hh, depthPath: "d" }, placement: { x: 0.5, y: 0.5, anchor: [0.5, 0.5], height: 1, cover: true } },
        { key: "man", kind: "character", name: "man", zIndex: 5, depth: 0.45, source: { type: "image", path: "man", width: 10, height: 30 }, placement: { x: 0.5, y: 0.9, anchor: [0.5, 1], height: 0.2 } },
      ],
    });
    const scene = sceneFromMemory(m, { bg: { image: plate, depth: { width: W, height: Hh, data: depth } }, man: { image: solidImage(10, 30, [1, 0, 0]) } });
    const r = new FrameRenderer(scene, { width: 108, height: 192, fps: 10 });
    // phase shift of the stripe pattern on a top row vs a bottom row between first and last frame
    const shiftOf = (row: number) => {
      const a = r.renderLinear(0).image;
      const b = r.renderLinear(19).image;
      let best = 0;
      let bestErr = Infinity;
      for (let s = -45; s <= 45; s++) {
        let err = 0;
        for (let x = 45; x < 63; x++) err += Math.abs(a.data[(row * 108 + x) * 4] - b.data[(row * 108 + x + s) * 4]);
        if (err < bestErr) {
          bestErr = err;
          best = s;
        }
      }
      return Math.abs(best);
    };
    expect(shiftOf(185)).toBeGreaterThan(shiftOf(5) + 10);
    expect(r.describe(0).layers.find((l) => l.key === "man")!.depth).toBeGreaterThan(0.7); // feet at y≈0.9 of a 0→1 floor
  });
});

describe("EnvironmentParticleEngine", () => {
  it("is deterministic and physically directed", () => {
    const rain = particleSpecSchema.parse({ type: "rain", density: 0.3, speed: 1.5, direction: 95, lifetime: 1, seed: 4 });
    const a = evaluateParticles(rain, { t: 1, duration: 5, lights: [] });
    expect(evaluateParticles(rain, { t: 1, duration: 5, lights: [] })).toEqual(a);
    const b = evaluateParticles(rain, { t: 1.05, duration: 5, lights: [] });
    const fell = a.filter((p, i) => b[i].y > p.y).length;
    expect(fell / a.length).toBeGreaterThan(0.8);
    const steam = evaluateParticles(particleSpecSchema.parse({ type: "steam", density: 1, speed: 0.3, direction: -90, lifetime: 3, source: { x: 0.5, y: 0.6, spread: 0.01 } }), { t: 2, duration: 5, lights: [] });
    expect(steam.every((p) => p.y <= 0.62)).toBe(true); // rises from the source
    for (const type of ["rain", "snow", "fog", "mist", "smoke", "dust", "steam", "fire", "sparks", "leaves", "water", "crowds", "traffic", "birds", "insects"] as const) {
      expect(evaluateParticles(particleSpecSchema.parse({ type }), { t: 0.5, duration: 5, lights: [{ x: 0.5, y: 0.4 }] }).length, type).toBeGreaterThan(0);
    }
  });
});

describe("LightingEngine / FocusEngine / effects", () => {
  it("flickers deterministically, moves lights and lights pools", () => {
    const spec = lightingSpecSchema.parse({
      ambient: { color: [0.5, 0.5, 0.6], intensity: 0.5 },
      lights: [
        { id: "lamp", type: "streetlight", x: 0.2, y: 0.4, color: [1, 0.8, 0.5], intensity: 1, radius: 0.2, flicker: { amount: 0.4, speed: 9 } },
        { id: "train", type: "train", x: 1.2, y: 0.5, color: [1, 0.9, 0.7], intensity: 1, radius: 0.3, motion: { from: [1.2, 0.5], to: [-0.2, 0.5], startTime: 0, endTime: 1, easing: "linear" } },
      ],
    });
    const proj = (x: number, y: number) => [x * 100, y * 200] as [number, number];
    const l1 = evaluateLights(spec, 1.1, 0.2, 3, proj, 200);
    expect(evaluateLights(spec, 1.1, 0.2, 3, proj, 200)).toEqual(l1);
    const l2 = evaluateLights(spec, 4, 0.8, 3, proj, 200);
    expect(l2[1].x).toBeLessThan(l1[1].x);
    const map = buildLightMap(spec, l1, 100, 200);
    const at = (x: number, y: number) => map.data[((Math.floor(y / 8) * map.w + Math.floor(x / 8)) * 3)];
    expect(at(20, 80)).toBeGreaterThan(at(90, 190));
  });

  it("racks focus and defocuses away from the focal plane", () => {
    const f = focusSpecSchema.parse({ aperture: 20, focusDepth: 0.5, rack: { from: 1, to: 0.5, startTime: 0.1, endTime: 0.5 } });
    expect(focusDepthAt(f, 0, () => undefined)).toBeCloseTo(1, 5);
    expect(focusDepthAt(f, 1, () => undefined)).toBeCloseTo(0.5, 5);
    expect(blurRadiusPx(f, 0.5, 0.5, 1080)).toBe(0);
    expect(blurRadiusPx(f, 0, 0.5, 1080)).toBeCloseTo(10, 5);
  });

  it("vignette darkens corners and fades go to black", () => {
    const fx = effectsSpecSchema.parse({ grain: 0, vignette: 0.5, bloom: { intensity: 0 }, chromaticAberration: 0, lensFlare: 0, haze: 0, grade: { lift: [0, 0, 0], gain: [1, 1, 1], gamma: [1, 1, 1], saturation: 1, contrast: 1 } });
    const pp = new PostProcessor(60, 100, fx, 1, [0.5, 0.5, 0.5]);
    const img = solidImage(60, 100, [0.6, 0.6, 0.6]);
    const out = pp.apply(img, { frame: 0, lights: [], fade: 1, cameraVelocityPx: 0 });
    expect(out[(50 * 60 + 30) * 3]).toBeGreaterThan(out[0] + 20);
    const black = pp.apply(img, { frame: 0, lights: [], fade: 0, cameraVelocityPx: 0 });
    expect(Math.max(...black)).toBe(0);
  });
});

describe("frame and shot rendering", () => {
  const manifest = () =>
    baseManifest({
      camera: cameraPreset("dolly_in"),
      layers: [
        { key: "bg", kind: "background", name: "bg", zIndex: 0, depth: 0, source: { type: "image", path: "bg", width: 40, height: 70 }, placement: { x: 0.5, y: 0.5, anchor: [0.5, 0.5], height: 1, cover: true } },
        { key: "box", kind: "prop", name: "box", zIndex: 5, depth: 0.6, source: { type: "image", path: "box", width: 10, height: 10 }, placement: { x: 0.5, y: 0.85, anchor: [0.5, 1], height: 0.15 }, castsShadow: true },
      ],
      environment: { particles: [{ type: "dust", density: 0.5, seed: 2 }] },
    });
  const assets = () => ({ bg: { image: solidImage(40, 70, [0.3, 0.5, 0.7]) }, box: { image: solidImage(10, 10, [0.8, 0.4, 0.1]) } });

  it("is a pure function of (package, frame) and animates over time", () => {
    const r1 = new FrameRenderer(sceneFromMemory(manifest(), assets()), { width: 108, height: 192, fps: 10 });
    const r2 = new FrameRenderer(sceneFromMemory(manifest(), assets()), { width: 108, height: 192, fps: 10 });
    const a = r1.renderFrame(7);
    expect(Buffer.compare(Buffer.from(a), Buffer.from(r2.renderFrame(7)))).toBe(0);
    expect(Buffer.compare(Buffer.from(a), Buffer.from(r1.renderFrame(15)))).not.toBe(0);
  });

  it("renders an H.264 shot through worker threads with every frame in order", async () => {
    const dir = mkdtempSync(join(tmpdir(), "atma-shot-"));
    try {
      const out = join(dir, "shot_001.mp4");
      let last = 0;
      const res = await renderShotToFile(sceneFromMemory(manifest(), assets()), out, { width: 108, height: 192, fps: 10, crf: 23, preset: "ultrafast", workers: 2, onProgress: (d) => (last = d) });
      expect(res.frames).toBe(20);
      expect(last).toBe(20);
      const probe = execFileSync("ffprobe", ["-v", "error", "-count_frames", "-show_entries", "stream=width,height,nb_read_frames,codec_name", "-of", "csv=p=0", out]).toString().trim();
      expect(probe).toBe("h264,108,192,20");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);

  it("can be cancelled", async () => {
    const dir = mkdtempSync(join(tmpdir(), "atma-shot-"));
    const ctrl = new AbortController();
    ctrl.abort();
    try {
      await expect(renderShotToFile(sceneFromMemory(manifest(), assets()), join(dir, "x.mp4"), { width: 108, height: 192, fps: 10, crf: 23, preset: "ultrafast", workers: 1, signal: ctrl.signal })).rejects.toThrow(/cancelled/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("scene packages", () => {
  it("refuses incomplete packages and hashes deterministically", async () => {
    const dir = mkdtempSync(join(tmpdir(), "atma-demo-"));
    try {
      const demo = await buildRailwayDemo({ outDir: dir, width: 108, height: 192, fps: 10, durationSeconds: 1, renderVideo: false, stills: [5] });
      expect(demo.manifest.layers.map((l) => l.kind)).toEqual(["background", "midground", "character", "prop", "foreground"]);
      expect(demo.manifest.disclosure.kind).toBe("VISUAL_RECONSTRUCTION");
      expect(demo.placeholders.length).toBe(5); // procedural art must be approved before publishing
      expect(demo.manifest.layers.find((l) => l.kind === "character")!.character!.headTurn).toBeDefined(); // watches the departing train
      const assets = Object.fromEntries(demo.manifest.layers.map((l) => [l.key, { kind: l.source.type, path: l.source.path, width: l.source.width, height: l.source.height, placeholder: true, contentHash: "h-" + l.key }]));
      const h1 = packageHash(demo.manifest, assets as never, "e1", { width: 108, height: 192, fps: 10 });
      expect(packageHash(demo.manifest, assets as never, "e1", { width: 108, height: 192, fps: 10 })).toBe(h1);
      expect(packageHash(demo.manifest, { ...assets, bg: { ...(assets as never as Record<string, object>).bg, contentHash: "changed" } } as never, "e1", { width: 108, height: 192, fps: 10 })).not.toBe(h1);
      expect(() => buildManifest({ shotId: "s", plan: { layers: [{ key: "bg" }] } as never, canvas: { width: 1, height: 1, fps: 1, durationSeconds: 1, aspectRatio: "9:16" }, seed: 1, assets: {} })).toThrow(IncompletePackageError);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);
});
