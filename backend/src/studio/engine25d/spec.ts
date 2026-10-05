import { z } from "zod";

// The contract between the planners (what a shot should look like) and the
// 2.5D engine (how to animate and render it). Everything a frame depends on
// is in the manifest, so a render is a pure function of (manifest, t).
// Coordinates are canvas fractions: x 0 → 1 left → right, y 0 → 1 top → bottom.
// Depth: 0 = farthest (sky/background), 1 = nearest (foreground).

const vec2 = z.tuple([z.number(), z.number()]);
const rgb = z.tuple([z.number(), z.number(), z.number()]); // 0..1

export const EASINGS = ["linear", "ease_in", "ease_out", "ease_in_out", "cinematic", "sine_in_out", "expo_out"] as const;
export const easingSchema = z.enum(EASINGS);
export type Easing = z.infer<typeof easingSchema>;

export const CAMERA_MOVES = [
  "static",
  "dolly_in",
  "dolly_out",
  "pan_left",
  "pan_right",
  "tilt_up",
  "tilt_down",
  "orbit",
  "tracking",
  "push_in",
  "pull_out",
  "handheld",
  "rack_focus",
  "whip_pan",
  "slow_zoom",
] as const;
export const cameraMoveSchema = z.enum(CAMERA_MOVES);
export type CameraMoveType = z.infer<typeof cameraMoveSchema>;

export const cameraKeySchema = z.object({
  x: z.number().default(0), // camera offset; content moves the other way, scaled by depth
  y: z.number().default(0),
  zoom: z.number().default(1), // dolly (depth-dependent) for dolly/push moves, optical for slow_zoom
  roll: z.number().default(0), // degrees
  orbit: z.number().default(0), // perspective shift around the focus plane
});
export type CameraKey = z.infer<typeof cameraKeySchema>;

export const cameraSpecSchema = z.object({
  type: cameraMoveSchema,
  start: cameraKeySchema,
  end: cameraKeySchema,
  startTime: z.number().min(0).max(1).default(0), // fraction of the shot
  endTime: z.number().min(0).max(1).default(1),
  easing: easingSchema.default("cinematic"),
  intensity: z.number().min(0).max(3).default(1),
  opticalZoom: z.boolean().default(false), // true: all planes scale equally (slow_zoom)
  shake: z.object({ amplitude: z.number().default(0), frequency: z.number().default(0.6), rotation: z.number().default(0) }).default({}),
  focalLength: z.number().min(10).max(200).default(35), // mm; wider lens = stronger parallax
  trackLayerKey: z.string().optional(),
});
export type CameraSpec = z.infer<typeof cameraSpecSchema>;

export const timedSchema = z.object({ startTime: z.number().min(0).max(1).default(0), endTime: z.number().min(0).max(1).default(1), easing: easingSchema.default("ease_in_out") });

export const layerMotionSchema = z.object({
  translate: timedSchema.extend({ from: vec2, to: vec2 }).optional(), // canvas fractions
  oscillate: z
    .array(z.object({ axis: z.enum(["x", "y", "rotation", "scale"]), amplitude: z.number(), frequency: z.number(), phase: z.number().default(0) }))
    .optional(),
  opacity: timedSchema.extend({ from: z.number(), to: z.number() }).optional(),
});
export type LayerMotion = z.infer<typeof layerMotionSchema>;

export const EXPRESSIONS = [
  "neutral",
  "happy",
  "sad",
  "angry",
  "fearful",
  "surprised",
  "confused",
  "worried",
  "suspicious",
  "determined",
  "crying",
  "shocked",
  "disappointed",
  "relieved",
  "excited",
] as const;
export type Expression = (typeof EXPRESSIONS)[number];

export const POSES = [
  "standing",
  "walking",
  "running",
  "sitting",
  "talking",
  "pointing",
  "looking_back",
  "holding_phone",
  "holding_bag",
  "falling",
  "kneeling",
  "running_away",
  "looking_up",
  "looking_down",
  "turning",
  "waving",
  "crossing_arms",
] as const;
export type Pose = (typeof POSES)[number];

export const EYE_DIRECTIONS = ["camera", "left", "right", "up", "down", "camera-left", "camera-right"] as const;

export const characterMotionSchema = z.object({
  expression: z.enum(EXPRESSIONS).default("neutral"),
  pose: z.enum(POSES).default("standing"),
  breathing: z.number().min(0).max(2).default(0.8),
  blinkInterval: z.number().min(0).max(20).default(3.2), // seconds; 0 disables
  headMotion: z.enum(["none", "subtle", "moderate"]).default("subtle"),
  headTurn: timedSchema.extend({ from: z.number(), to: z.number() }).optional(), // degrees
  eyeDirection: z.enum(EYE_DIRECTIONS).default("camera"),
  bodySway: z.number().min(0).max(1).default(0.15),
  walk: z.object({ cycleHz: z.number().default(0.9), travel: z.number().default(0.25), direction: z.union([z.literal(1), z.literal(-1)]).default(1), run: z.boolean().default(false) }).optional(),
  gesture: timedSchema.extend({ type: z.enum(["point", "wave", "talk", "raise_phone"]) }).optional(),
  clothMotion: z.number().min(0).max(1).default(0.3),
  hairMotion: z.number().min(0).max(1).default(0.3),
  intensity: z.number().min(0).max(2).default(1), // global multiplier for all micro-motion
});
export type CharacterMotion = z.infer<typeof characterMotionSchema>;

export const placementSchema = z.object({
  x: z.number(),
  y: z.number(),
  anchor: vec2.default([0.5, 1]),
  height: z.number().positive(), // layer height in canvas heights
  rotation: z.number().default(0),
  opacity: z.number().min(0).max(1).default(1),
  flipX: z.boolean().default(false),
  cover: z.boolean().default(false), // must always cover the frame (engine adds overscan)
});
export type Placement = z.infer<typeof placementSchema>;

export const imageSourceSchema = z.object({
  type: z.literal("image"),
  path: z.string(), // storage key or absolute path
  maskPath: z.string().optional(),
  depthPath: z.string().optional(), // per-layer depth for in-image displacement (single-image backgrounds)
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  placeholder: z.boolean().default(false),
  assetId: z.string().optional(),
});
export const rigSourceSchema = z.object({
  type: z.literal("rig"),
  path: z.string(), // rig.json
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  placeholder: z.boolean().default(false),
  assetId: z.string().optional(),
});

export const LAYER_KINDS = ["background", "midground", "character", "prop", "foreground"] as const;
export const layerSpecSchema = z.object({
  key: z.string(),
  kind: z.enum(LAYER_KINDS),
  name: z.string(),
  zIndex: z.number().int(),
  depth: z.number().min(0).max(1),
  source: z.discriminatedUnion("type", [imageSourceSchema, rigSourceSchema]),
  placement: placementSchema,
  blend: z.enum(["normal", "multiply", "screen", "add"]).default("normal"),
  lightResponse: z.number().min(0).max(1).default(1),
  castsShadow: z.boolean().default(false),
  silhouette: z.boolean().default(false),
  parallax: z.number().optional(), // override the depth-derived parallax factor
  extraBlur: z.number().default(0),
  motion: layerMotionSchema.optional(),
  character: characterMotionSchema.optional(),
  groundY: z.number().optional(), // where contact shadows sit (defaults to placement y for feet-anchored layers)
});
export type LayerSpec = z.infer<typeof layerSpecSchema>;

export const depthSpecSchema = z.object({
  parallaxFar: z.number().default(0.12),
  parallaxNear: z.number().default(1.6),
  dollyFar: z.number().default(0.25),
  dollyNear: z.number().default(1.8),
  fogColor: rgb.default([0.62, 0.66, 0.72]),
  fogDensity: z.number().min(0).max(1).default(0.15),
  fogCurve: z.number().default(1.6),
  displacement: z.number().default(0.02), // in-image depth displacement strength for layers with depth maps
});
export type DepthSpec = z.infer<typeof depthSpecSchema>;

export const PARTICLE_TYPES = ["rain", "snow", "fog", "mist", "smoke", "dust", "steam", "fire", "sparks", "leaves", "water", "crowds", "traffic", "birds", "insects"] as const;
export const particleSpecSchema = z.object({
  type: z.enum(PARTICLE_TYPES),
  density: z.number().min(0).max(3).default(1),
  speed: z.number().default(1),
  direction: z.number().default(90), // degrees, 0 = right, 90 = down
  lifetime: z.number().positive().default(3),
  opacity: z.number().min(0).max(1).default(0.6),
  depthRange: vec2.default([0.3, 0.9]),
  wind: z.number().default(0),
  seed: z.number().int().default(1),
  color: rgb.optional(),
  size: z.number().optional(), // canvas fraction
  source: z.object({ x: z.number(), y: z.number(), spread: z.number().default(0.05) }).optional(),
  area: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(), // x0,y0,x1,y1
});
export type ParticleSpec = z.infer<typeof particleSpecSchema>;

export const environmentSpecSchema = z.object({
  weather: z.enum(["clear", "overcast", "rain", "fog", "snow", "haze"]).default("clear"),
  particles: z.array(particleSpecSchema).default([]),
});
export type EnvironmentSpec = z.infer<typeof environmentSpecSchema>;

export const LIGHT_TYPES = ["sun", "moon", "streetlight", "headlights", "police", "fire", "neon", "interior", "window", "train", "generic"] as const;
export const lightSpecSchema = z.object({
  id: z.string(),
  type: z.enum(LIGHT_TYPES),
  x: z.number(),
  y: z.number(),
  color: rgb,
  intensity: z.number().min(0).max(4),
  radius: z.number().positive(), // canvas fraction
  flicker: z.object({ amount: z.number().default(0), speed: z.number().default(8) }).default({}),
  motion: timedSchema.extend({ from: vec2, to: vec2, loop: z.boolean().default(false) }).optional(),
  pulse: z.object({ colors: z.array(rgb).min(2), frequency: z.number() }).optional(),
  castsShadows: z.boolean().default(false),
  flare: z.boolean().default(false),
  affects: z.array(z.enum(LAYER_KINDS)).optional(), // default: all
});
export type LightSpec = z.infer<typeof lightSpecSchema>;

export const lightingSpecSchema = z.object({
  timeOfDay: z.enum(["morning", "afternoon", "evening", "night", "unspecified"]).default("unspecified"),
  ambient: z.object({ color: rgb, intensity: z.number() }),
  lights: z.array(lightSpecSchema).default([]),
  keyDirection: z.number().default(110), // degrees; used for shadows when no light casts shadows
});
export type LightingSpec = z.infer<typeof lightingSpecSchema>;

export const shadowSpecSchema = z.object({
  enabled: z.boolean().default(true),
  opacity: z.number().min(0).max(1).default(0.45),
  softness: z.number().min(0).max(1).default(0.5),
  length: z.number().min(0).max(2).default(0.5),
  contact: z.boolean().default(true),
});
export type ShadowSpec = z.infer<typeof shadowSpecSchema>;

export const focusSpecSchema = z.object({
  aperture: z.number().min(0).max(80).default(12), // blur px (at 1080 px width) per 1.0 of depth difference
  focusDepth: z.number().min(0).max(1).default(0.45),
  focusLayerKey: z.string().optional(),
  rack: timedSchema.extend({ from: z.number(), to: z.number() }).optional(),
});
export type FocusSpec = z.infer<typeof focusSpecSchema>;

export const effectsSpecSchema = z.object({
  grain: z.number().min(0).max(0.3).default(0.035),
  vignette: z.number().min(0).max(1).default(0.28),
  bloom: z.object({ threshold: z.number().default(0.8), intensity: z.number().default(0.18), radius: z.number().default(0.02) }).default({}),
  chromaticAberration: z.number().min(0).max(0.01).default(0.0006),
  lensFlare: z.number().min(0).max(1).default(0.35),
  motionBlur: z.number().min(0).max(1).default(0.5),
  haze: z.number().min(0).max(1).default(0.1),
  grade: z
    .object({
      lift: rgb.default([0.015, 0.02, 0.035]),
      gamma: rgb.default([1, 1, 1]),
      gain: rgb.default([1.03, 1.0, 0.96]),
      saturation: z.number().default(0.94),
      contrast: z.number().default(1.06),
    })
    .default({}),
});
export type EffectsSpec = z.infer<typeof effectsSpecSchema>;

export const transitionSchema = z.object({
  in: z.enum(["cut", "fade"]).default("cut"),
  out: z.enum(["cut", "fade"]).default("cut"),
  durationSeconds: z.number().min(0).max(2).default(0.4),
});

export const manifestSchema = z.object({
  version: z.literal(1),
  shotId: z.string(),
  storyId: z.string().optional(),
  canvas: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    fps: z.number().int().positive(),
    durationSeconds: z.number().positive(),
    aspectRatio: z.string(),
  }),
  seed: z.number().int(),
  style: z.string(),
  background: rgb.default([0.05, 0.06, 0.08]), // clear colour
  layers: z.array(layerSpecSchema),
  depth: depthSpecSchema.default({}),
  depthMap: z.string().optional(),
  lightingMap: z.string().optional(),
  shadowMap: z.string().optional(),
  masks: z.record(z.string()).default({}),
  camera: cameraSpecSchema,
  lighting: lightingSpecSchema,
  shadows: shadowSpecSchema.default({}),
  environment: environmentSpecSchema.default({}),
  focus: focusSpecSchema.default({}),
  effects: effectsSpecSchema.default({}),
  transition: transitionSchema.default({}),
  disclosure: z.object({ kind: z.literal("VISUAL_RECONSTRUCTION"), burnIn: z.boolean().default(false) }).default({ kind: "VISUAL_RECONSTRUCTION", burnIn: false }),
});
export type ScenePackageManifest = z.infer<typeof manifestSchema>;
export type ManifestInput = z.input<typeof manifestSchema>;

/** The animated parts of a shot, as stored on StudioShot.animationProfile (brief §25). */
export const animationTimelineSchema = z.object({
  duration: z.number().positive(),
  camera: cameraSpecSchema,
  layers: z.record(layerMotionSchema).default({}),
  characters: z.record(characterMotionSchema).default({}),
});
export type AnimationTimeline = z.infer<typeof animationTimelineSchema>;

export function parseManifest(input: unknown): ScenePackageManifest {
  return manifestSchema.parse(input);
}
