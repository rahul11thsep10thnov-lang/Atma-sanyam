import { AnimationTimeline, animationTimelineSchema, ScenePackageManifest } from "./spec";
import { evaluateCamera } from "./camera";
import { focusDepthAt } from "./focus";
import { evaluateLights } from "./lighting";
import { evaluateCharacter } from "./characterMotion";
import { layerSeed } from "./frameRenderer";

/** The animated parts of a shot as stored on StudioShot.animationProfile. */
export function timelineOf(m: ScenePackageManifest): AnimationTimeline {
  const layers: Record<string, NonNullable<ScenePackageManifest["layers"][number]["motion"]>> = {};
  const characters: Record<string, NonNullable<ScenePackageManifest["layers"][number]["character"]>> = {};
  for (const l of m.layers) {
    if (l.motion) layers[l.key] = l.motion;
    if (l.character) characters[l.key] = l.character;
  }
  return animationTimelineSchema.parse({ duration: m.canvas.durationSeconds, camera: m.camera, layers, characters });
}

export interface TimelineSample {
  t: number;
  camera: { x: number; y: number; zoom: number; roll: number; orbit: number };
  focusDepth: number;
  lights: Record<string, number>;
  characters: Record<string, { blink: number; speech: number; headTurn: number; breath: number; travelX: number }>;
}

/**
 * Samples the procedural timeline (camera, focus, lights, character
 * performance) at a given rate — for the Shot Inspector's curves and for QC
 * checks such as "the camera never jumps between consecutive frames".
 */
export function sampleTimeline(m: ScenePackageManifest, rate = 10): TimelineSample[] {
  const dur = m.canvas.durationSeconds;
  const n = Math.max(2, Math.round(dur * rate) + 1);
  const out: TimelineSample[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * dur;
    const u = dur > 0 ? t / dur : 0;
    const cam = evaluateCamera(m.camera, t, dur, m.seed);
    const lights = evaluateLights(m.lighting, t, u, m.seed, (x, y) => [x, y], 1);
    const characters: TimelineSample["characters"] = {};
    for (const l of m.layers) {
      if (!l.character) continue;
      const f = evaluateCharacter(l.character, t, dur, layerSeed(m.seed, l.key), l.placement.flipX ? -1 : 1);
      characters[l.key] = { blink: f.face.blink, speech: f.face.speech, headTurn: f.face.turn, breath: f.breath, travelX: f.travelX };
    }
    out.push({
      t,
      camera: { x: cam.x, y: cam.y, zoom: cam.zoom, roll: cam.roll, orbit: cam.orbit },
      focusDepth: focusDepthAt(m.focus, u, (k) => m.layers.find((l) => l.key === k)?.depth),
      lights: Object.fromEntries(lights.map((l) => [l.id, l.strength])),
      characters,
    });
  }
  return out;
}
