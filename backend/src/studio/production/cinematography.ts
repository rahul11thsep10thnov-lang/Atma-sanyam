import { ShotType } from "@prisma/client";
import {
  DepthSpec,
  depthSpecSchema,
  EffectsSpec,
  effectsSpecSchema,
  EnvironmentSpec,
  FocusSpec,
  LightingSpec,
  LightSpec,
  ParticleSpec,
  particleSpecSchema,
  ShadowSpec,
  shadowSpecSchema,
} from "../engine25d/spec";
import { EnvironmentDescriptor, timeBucket } from "./library/environments";

type TimeOfDay = LightingSpec["timeOfDay"];
type RGB = [number, number, number];

const AMBIENT: Record<TimeOfDay, { color: RGB; intensity: number }> = {
  morning: { color: [1.0, 0.95, 0.88], intensity: 1.0 },
  afternoon: { color: [1.0, 1.0, 0.97], intensity: 1.05 },
  evening: { color: [1.0, 0.8, 0.62], intensity: 0.8 },
  night: { color: [0.55, 0.63, 0.88], intensity: 0.45 },
  unspecified: { color: [0.97, 0.97, 0.99], intensity: 0.95 },
};

const LIGHT_COLORS: Record<string, RGB> = {
  streetlight: [1.0, 0.8, 0.52],
  interior: [1.0, 0.9, 0.74],
  window: [0.86, 0.92, 1.0],
  neon: [0.95, 0.35, 0.65],
  train: [1.0, 0.9, 0.7],
  fire: [1.0, 0.55, 0.2],
};

export interface LightingContext {
  timeOfDay: TimeOfDay;
  env: EnvironmentDescriptor;
  text: string;
  trainPassing: boolean;
  shotType: ShotType;
}

/** LightingEngine presets: ambient + key light + the location's practical lights. */
export function buildLighting(c: LightingContext): LightingSpec {
  const bucket = timeBucket(c.timeOfDay);
  const ambient = { ...AMBIENT[c.timeOfDay] };
  const lights: LightSpec[] = [];
  const rainy = /\b(rain|monsoon|storm)\b/i.test(c.text);
  if (rainy) ambient.intensity *= 0.82;

  if (!c.env.interior) {
    if (bucket === "day") lights.push({ id: "sun", type: "sun", x: 0.85, y: 0.04, color: [1, 0.97, 0.9], intensity: rainy ? 0.25 : 0.55, radius: 1.4, flicker: { amount: 0, speed: 8 }, castsShadows: true, flare: false });
    if (bucket === "dusk") lights.push({ id: "sun", type: "sun", x: 0.92, y: c.env.horizonY - 0.08, color: [1, 0.72, 0.45], intensity: 0.75, radius: 1.1, flicker: { amount: 0, speed: 8 }, castsShadows: true, flare: true });
    if (bucket === "night") lights.push({ id: "moon", type: "moon", x: 0.15, y: 0.06, color: [0.65, 0.75, 1.0], intensity: 0.25, radius: 1.3, flicker: { amount: 0, speed: 8 }, castsShadows: false, flare: false });
  }
  c.env.practicalLights
    .filter((l) => l.times.includes(bucket))
    .forEach((l, i) => {
      if (l.type === "train") {
        if (!c.trainPassing) return;
        // Light from the passing train's windows sweeps across the platform.
        lights.push({
          id: `train-${i}`,
          type: "train",
          x: 1.2,
          y: l.y,
          color: LIGHT_COLORS.train,
          intensity: bucket === "night" ? 1.1 : 0.7,
          radius: 0.45,
          flicker: { amount: 0.12, speed: 14 },
          motion: { from: [1.25, l.y], to: [-0.25, l.y], startTime: 0, endTime: 1, easing: "linear", loop: false },
          castsShadows: true,
          flare: bucket === "night",
        });
        return;
      }
      if (l.type === "police") {
        lights.push({ id: `police-${i}`, type: "police", x: l.x, y: l.y, color: [0.9, 0.15, 0.15], intensity: 0.8, radius: 0.32, flicker: { amount: 0, speed: 8 }, pulse: { colors: [[0.95, 0.12, 0.12], [0.15, 0.3, 1.0]], frequency: 1.6 }, castsShadows: false, flare: false });
        return;
      }
      lights.push({
        id: `${l.type}-${i}`,
        type: l.type,
        x: l.x,
        y: l.y,
        color: LIGHT_COLORS[l.type] ?? [1, 0.9, 0.75],
        intensity: l.type === "window" ? 0.6 : 0.85,
        radius: l.type === "interior" ? 0.6 : 0.3,
        flicker: { amount: l.flicker ?? 0, speed: 9 },
        castsShadows: l.type === "interior" || l.type === "window",
        flare: false,
      });
    });

  return { timeOfDay: c.timeOfDay, ambient, lights, keyDirection: bucket === "dusk" ? 160 : 115 };
}

export function buildShadows(timeOfDay: TimeOfDay, interior: boolean): ShadowSpec {
  const bucket = timeBucket(timeOfDay);
  return shadowSpecSchema.parse({
    enabled: true,
    opacity: bucket === "night" ? 0.35 : interior ? 0.4 : 0.5,
    softness: bucket === "day" ? 0.35 : 0.6,
    length: bucket === "dusk" ? 0.9 : 0.45,
    contact: true,
  });
}

export interface EnvironmentContext {
  env: EnvironmentDescriptor;
  timeOfDay: TimeOfDay;
  text: string;
  shotType: ShotType;
  seed: number;
  trainSource?: { x: number; y: number };
}

/** EnvironmentParticleEngine presets by location, time of day, weather and shot type. */
export function buildEnvironment(c: EnvironmentContext): { environment: EnvironmentSpec; fogDensity: number } {
  const bucket = timeBucket(c.timeOfDay);
  const wide = c.shotType === "ESTABLISHING" || c.shotType === "WIDE" || c.shotType === "TRACKING";
  const close = c.shotType === "CLOSE_UP" || c.shotType === "EXTREME_CLOSE_UP" || c.shotType === "INSERT";
  const particles: ParticleSpec[] = [];
  let seed = c.seed;
  const add = (p: Partial<ParticleSpec> & { type: ParticleSpec["type"] }) => particles.push(particleSpecSchema.parse({ seed: ++seed, ...p }));
  let weather: EnvironmentSpec["weather"] = "clear";
  let fogDensity = bucket === "night" ? 0.08 : bucket === "dusk" ? 0.14 : 0.1;

  if (/\b(rain|raining|monsoon|downpour|storm)\b/i.test(c.text)) {
    weather = "rain";
    fogDensity = 0.22;
    add({ type: "rain", density: 1.1, speed: 1.6, direction: 100, lifetime: 0.7, opacity: 0.45, depthRange: [0.15, 1], wind: 0.15 });
  }
  if (/\b(fog|foggy|mist|winter morning|smog)\b/i.test(c.text)) {
    weather = "fog";
    fogDensity = 0.4;
    add({ type: "fog", density: 1, speed: 0.04, direction: 0, lifetime: 20, opacity: 0.35, depthRange: [0.1, 0.6] });
  }
  for (const type of c.env.particles) {
    if (type === "steam" && c.trainSource) add({ type: "steam", density: 1, speed: 0.5, direction: -90, lifetime: 3.5, opacity: 0.38, depthRange: [0.26, 0.3], color: [0.93, 0.93, 0.96], size: 0.075, source: { x: c.trainSource.x, y: c.trainSource.y, spread: 0.1 } });
    if (type === "dust" && weather !== "rain") add({ type: "dust", density: close ? 0.5 : 0.8, speed: 0.04, direction: -20, lifetime: 7, opacity: bucket === "night" ? 0.5 : 0.3, depthRange: [0.35, 0.95], size: 0.0035, color: [1, 0.92, 0.75] });
    if (type === "crowds" && wide) add({ type: "crowds", density: 0.7, speed: 0.025, direction: 0, lifetime: 30, opacity: 0.75, depthRange: [0.14, 0.2] });
    if (type === "traffic" && wide) add({ type: "traffic", density: 0.8, speed: 0.12, direction: 0, lifetime: 12, opacity: 0.8, depthRange: [0.1, 0.18] });
    if (type === "birds" && bucket !== "night" && wide) add({ type: "birds", density: 0.6, speed: 0.06, direction: -10, lifetime: 20, opacity: 0.7, depthRange: [0.04, 0.12] });
    if (type === "insects" && bucket === "night") add({ type: "insects", density: 0.6, speed: 0.08, direction: 0, lifetime: 4, opacity: 0.6, depthRange: [0.4, 0.7] });
    if (type === "leaves" && bucket !== "night") add({ type: "leaves", density: 0.5, speed: 0.12, direction: 70, lifetime: 8, opacity: 0.8, depthRange: [0.5, 1], wind: 0.2 });
    if (type === "mist") add({ type: "mist", density: 0.8, speed: 0.03, direction: 0, lifetime: 25, opacity: 0.25, depthRange: [0.1, 0.4] });
    if (type === "water") add({ type: "water", density: 1, speed: 0.05, direction: 0, lifetime: 2, opacity: 0.5, depthRange: [0.2, 0.5], area: [0, c.env.horizonY + 0.02, 1, c.env.groundY - 0.05] });
    if (type === "smoke") add({ type: "smoke", density: 0.8, speed: 0.15, direction: -80, lifetime: 6, opacity: 0.4, depthRange: [0.1, 0.15], source: { x: 0.7, y: c.env.horizonY - 0.2, spread: 0.02 } });
  }
  return { environment: { weather, particles }, fogDensity };
}

/** DepthEngine defaults with the shot's fog. */
export function buildDepthSpec(fogDensity: number, timeOfDay: TimeOfDay): DepthSpec {
  const fogColor: RGB = timeOfDay === "night" ? [0.16, 0.2, 0.32] : timeOfDay === "evening" ? [0.78, 0.6, 0.5] : [0.7, 0.74, 0.8];
  return depthSpecSchema.parse({ fogDensity, fogColor });
}

const APERTURE: Partial<Record<ShotType, number>> = {
  ESTABLISHING: 5,
  WIDE: 7,
  TRACKING: 8,
  MEDIUM: 14,
  OVER_SHOULDER: 18,
  CLOSE_UP: 22,
  EXTREME_CLOSE_UP: 26,
  INSERT: 30,
  CUTAWAY: 10,
};

/** FocusEngine plan: focus on the subject; rack focus for inserts and over-the-shoulder shots. */
export function buildFocus(shotType: ShotType, subjectDepth: number, foregroundDepth: number | null, rack: boolean, subjectKey?: string): FocusSpec {
  const aperture = APERTURE[shotType] ?? 12;
  if (rack && foregroundDepth !== null) {
    return { aperture, focusDepth: subjectDepth, focusLayerKey: subjectKey, rack: { from: foregroundDepth, to: subjectDepth, startTime: 0.15, endTime: 0.55, easing: "ease_in_out" } };
  }
  return { aperture, focusDepth: subjectDepth, focusLayerKey: subjectKey };
}

/** CinematicEffectsEngine: restrained defaults (premium, not "AI"), adjusted by tone. */
export function buildEffects(tone: string, timeOfDay: TimeOfDay): EffectsSpec {
  const somber = tone === "somber";
  return effectsSpecSchema.parse({
    grain: timeOfDay === "night" ? 0.045 : 0.032,
    vignette: somber ? 0.36 : 0.26,
    bloom: { threshold: timeOfDay === "night" ? 0.7 : 0.82, intensity: timeOfDay === "night" ? 0.26 : 0.16, radius: 0.025 },
    chromaticAberration: 0.0006,
    lensFlare: 0.35,
    motionBlur: 0.5,
    haze: 0.1,
    grade: {
      lift: timeOfDay === "night" ? [0.01, 0.02, 0.05] : [0.015, 0.02, 0.035],
      gamma: [1, 1, 1],
      gain: timeOfDay === "evening" ? [1.06, 0.99, 0.92] : [1.03, 1.0, 0.96],
      saturation: somber ? 0.82 : 0.94,
      contrast: 1.06,
    },
  });
}
