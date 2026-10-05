import { CameraKey, CameraMoveType, CameraSpec, cameraSpecSchema, Easing } from "./spec";
import { fbm1, lerp, segmentProgress } from "./math";

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
  roll: number;
  orbit: number;
  opticalZoom: boolean;
  /** Parallax strength from focal length (35 mm = 1). */
  lensScale: number;
}

const K = (x = 0, y = 0, zoom = 1, roll = 0, orbit = 0): CameraKey => ({ x, y, zoom, roll, orbit });

interface Preset {
  start: CameraKey;
  end: CameraKey;
  easing: Easing;
  opticalZoom?: boolean;
  shake?: { amplitude: number; frequency: number; rotation: number };
  startTime?: number;
  endTime?: number;
}

// Amplitudes are deliberately small: premium documentary movement, never a theme-park ride.
const PRESETS: Record<CameraMoveType, Preset> = {
  static: { start: K(), end: K(), easing: "linear", shake: { amplitude: 0.0008, frequency: 0.35, rotation: 0.03 } },
  dolly_in: { start: K(0, 0, 1), end: K(0, -0.004, 1.1), easing: "cinematic" },
  dolly_out: { start: K(0, -0.004, 1.1), end: K(0, 0, 1), easing: "cinematic" },
  push_in: { start: K(0, 0, 1), end: K(0, -0.01, 1.16), easing: "cinematic" },
  pull_out: { start: K(0, -0.01, 1.16), end: K(0, 0, 1), easing: "cinematic" },
  pan_left: { start: K(0.045, 0, 1.02), end: K(-0.045, 0, 1.02), easing: "sine_in_out" },
  pan_right: { start: K(-0.045, 0, 1.02), end: K(0.045, 0, 1.02), easing: "sine_in_out" },
  tilt_up: { start: K(0, 0.035, 1.02), end: K(0, -0.035, 1.02), easing: "sine_in_out" },
  tilt_down: { start: K(0, -0.035, 1.02), end: K(0, 0.035, 1.02), easing: "sine_in_out" },
  orbit: { start: K(0, 0, 1.04, 0, -0.06), end: K(0, 0, 1.06, 0, 0.06), easing: "sine_in_out" },
  tracking: { start: K(-0.06, 0, 1.03), end: K(0.06, 0, 1.03), easing: "linear" },
  handheld: { start: K(0, 0, 1.03), end: K(0, 0, 1.04), easing: "linear", shake: { amplitude: 0.0045, frequency: 0.7, rotation: 0.25 } },
  rack_focus: { start: K(0, 0, 1.02), end: K(0, 0, 1.04), easing: "cinematic", shake: { amplitude: 0.0008, frequency: 0.35, rotation: 0.03 } },
  whip_pan: { start: K(0, 0, 1.02), end: K(0.35, 0, 1.02), easing: "ease_in", startTime: 0.7, endTime: 1 },
  slow_zoom: { start: K(0, 0, 1), end: K(0, 0, 1.08), easing: "cinematic", opticalZoom: true },
};

/** Camera spec for a movement type at a given intensity (admin-overridable). */
export function cameraPreset(type: CameraMoveType, intensity = 1, overrides: Partial<CameraSpec> = {}): CameraSpec {
  const p = PRESETS[type];
  return cameraSpecSchema.parse({
    type,
    start: p.start,
    end: p.end,
    startTime: p.startTime ?? 0,
    endTime: p.endTime ?? 1,
    easing: p.easing,
    intensity,
    opticalZoom: p.opticalZoom ?? false,
    shake: p.shake ?? { amplitude: 0, frequency: 0.6, rotation: 0 },
    focalLength: 35,
    ...overrides,
  });
}

/**
 * CameraMotionEngine: camera state at time t (seconds). Deltas from the start
 * key are scaled by `intensity`; shake is seeded fractal noise, so the same
 * shot always shakes the same way.
 */
export function evaluateCamera(spec: CameraSpec, t: number, duration: number, seed: number): CameraState {
  const u = duration > 0 ? t / duration : 0;
  const p = segmentProgress(u, spec.startTime, spec.endTime, spec.easing) * spec.intensity;
  const s = spec.start;
  const e = spec.end;
  const sh = spec.shake;
  const n = (k: number) => fbm1(seed * 7 + k, t * Math.max(0.01, sh.frequency));
  return {
    x: lerp(s.x, e.x, p) + sh.amplitude * n(1),
    y: lerp(s.y, e.y, p) + sh.amplitude * 0.8 * n(2),
    zoom: lerp(s.zoom, e.zoom, p),
    roll: lerp(s.roll, e.roll, p) + sh.rotation * n(3),
    orbit: lerp(s.orbit, e.orbit, p),
    opticalZoom: spec.opticalZoom,
    lensScale: 35 / spec.focalLength,
  };
}

/** Camera speed in canvas fractions per second (drives motion blur). */
export function cameraVelocity(spec: CameraSpec, t: number, duration: number, seed: number, fps: number): number {
  const dt = 1 / fps;
  const a = evaluateCamera(spec, Math.max(0, t - dt / 2), duration, seed);
  const b = evaluateCamera(spec, Math.min(duration, t + dt / 2), duration, seed);
  return Math.hypot(b.x - a.x, b.y - a.y) / dt + Math.abs(b.zoom - a.zoom) / dt * 0.5;
}
