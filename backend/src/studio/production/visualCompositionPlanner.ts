import { LayerKind, LocationCategory, ShotType } from "@prisma/client";
import {
  CameraSpec,
  CharacterMotion,
  characterMotionSchema,
  DepthSpec,
  EffectsSpec,
  EnvironmentSpec,
  FocusSpec,
  LayerMotion,
  LightingSpec,
  Placement,
  ShadowSpec,
} from "../engine25d/spec";
import { cameraPreset } from "../engine25d/camera";
import { hash01 } from "../engine25d/math";
import { getEnvironment, timeBucket } from "./library/environments";
import { EXPRESSION_LIBRARY } from "./library/expressions";
import { POSE_LIBRARY } from "./library/poses";
import { getProp } from "./library/props";
import { buildDepthSpec, buildEffects, buildEnvironment, buildFocus, buildLighting, buildShadows } from "./cinematography";
import { characterRefKey, locationRefKey, propRefKey, sizeTier, TIER_MAX_HEIGHT } from "./continuity";
import { DirectorCharacter, DirectorContext, SceneInput, ShotPlan } from "./types";

export const DEFAULT_DEPTHS = { background: 0.0, midground: 0.25, characters: 0.45, props: 0.7, foreground: 1.0 };

export const NEGATIVE_PROMPT =
  "photorealistic photo, identifiable real person, celebrity likeness, blood, gore, injury, weapon, nudity, sexual content, dead body, self-harm, readable text, logo, watermark, extra limbs, distorted face, child";

export interface LayerPlan {
  key: string;
  kind: LayerKind;
  name: string;
  zIndex: number;
  depth: number;
  placement: Placement;
  blend: "normal" | "multiply" | "screen" | "add";
  lightResponse: number;
  castsShadow: boolean;
  silhouette: boolean;
  motion?: LayerMotion;
  character?: CharacterMotion;
  assetRole: "background" | "midground" | "foreground" | "character" | "prop";
  prompt: string;
  negativePrompt: string;
  reuseKey: string;
  pixelSize: { width: number; height: number };
  painterHint: Record<string, unknown>;
  characterKey?: string;
  characterRefKey?: string;
  propKey?: string;
  propRefKey?: string;
  locationRefKey?: string;
  expression?: string;
  pose?: string;
}

export interface CompositionPlan {
  composition: Record<"background" | "midground" | "characters" | "props" | "foreground", { key: string; name: string; description: string }[]>;
  depth: typeof DEFAULT_DEPTHS;
  layers: LayerPlan[];
  camera: CameraSpec;
  lighting: LightingSpec;
  shadows: ShadowSpec;
  environment: EnvironmentSpec;
  focus: FocusSpec;
  effects: EffectsSpec;
  depthSpec: DepthSpec;
  transition: { in: "cut" | "fade"; out: "cut" | "fade"; durationSeconds: number };
  locationCategory: LocationCategory;
  locationRefKey: string;
  timeOfDay: LightingSpec["timeOfDay"];
  style: string;
  aspectRatio: string;
}

export interface PlannerInput {
  shot: ShotPlan;
  scene: SceneInput;
  ctx: DirectorContext;
  canvas: { width: number; height: number; fps: number; aspectRatio: string };
  seed: number;
  position: { firstShotOfEpisode: boolean; lastShotOfEpisode: boolean };
  depthOverrides?: Partial<typeof DEFAULT_DEPTHS>;
}

const CHARACTER_FRAMING: Partial<Record<ShotType, { height: number; feet: number }>> = {
  WIDE: { height: 0.31, feet: 0 },
  TRACKING: { height: 0.33, feet: 0 },
  ESTABLISHING: { height: 0.22, feet: 0 },
  MEDIUM: { height: 1.25, feet: 1.33 },
  OVER_SHOULDER: { height: 1.15, feet: 1.25 },
  CLOSE_UP: { height: 2.4, feet: 2.55 },
  EXTREME_CLOSE_UP: { height: 3.6, feet: 3.62 },
  LOW_ANGLE: { height: 0.55, feet: 0.97 },
  HIGH_ANGLE: { height: 0.24, feet: 0 },
  POV: { height: 0.4, feet: 0 },
};

function ageScale(c: DirectorCharacter): number {
  if (c.ageGroup === "ELDERLY") return 0.96;
  if (c.ageGroup === "YOUNG") return 0.98;
  if (c.gender === "FEMALE") return 0.94;
  return 1;
}

function slotsFor(n: number): number[] {
  if (n <= 1) return [0.6];
  if (n === 2) return [0.36, 0.67];
  return [0.27, 0.52, 0.76];
}

function describeCharacter(c: DirectorCharacter, expression: string, pose: string, silhouette: boolean): string {
  const who = `${c.ageGroup === "ELDERLY" ? "older " : c.ageGroup === "YOUNG" ? "young " : ""}Indian ${c.gender === "FEMALE" ? "woman" : c.gender === "MALE" ? "man" : "person"} (${c.role})`;
  const look = c.appearance?.clothing ? `, wearing ${c.appearance.clothing}` : "";
  const silh = silhouette ? ", seen as a backlit silhouette, no facial detail" : "";
  return `${who}${look}, ${EXPRESSION_LIBRARY[expression as keyof typeof EXPRESSION_LIBRARY]?.prompt ?? expression}, ${POSE_LIBRARY[pose as keyof typeof POSE_LIBRARY]?.prompt ?? pose}, full body, stylised graphic-novel illustration, simplified non-identifiable features, isolated on plain background${silh}`;
}

/**
 * VisualCompositionPlanner: turns a directed shot into a structured visual
 * composition — background, midground, characters, props and foreground
 * layers with depth, placement, motion and asset requests — plus the
 * camera, lighting, environment, focus and grading for the shot.
 */
export function planComposition(input: PlannerInput): CompositionPlan {
  const { shot, scene, ctx, canvas, seed } = input;
  const W = canvas.width;
  const H = canvas.height;
  const aspect = W / H;
  const env = getEnvironment(shot.locationCategory);
  const bucket = timeBucket(scene.timeOfDay);
  const style = ctx.styleKey;
  const depth = { ...DEFAULT_DEPTHS, ...input.depthOverrides };
  const locKey = shot.substitute ? `SUBSTITUTE:${shot.substitute.id}:${bucket}` : locationRefKey(shot.locationCategory, ctx.state, bucket);
  const layers: LayerPlan[] = [];
  const composition: CompositionPlan["composition"] = { background: [], midground: [], characters: [], props: [], foreground: [] };
  const insertShot = shot.shotType === "INSERT" && shot.propKeys.length > 0;
  const closeShot = shot.shotType === "CLOSE_UP" || shot.shotType === "EXTREME_CLOSE_UP" || insertShot;
  const placeholderSize = (hFrac: number, wFrac: number) => {
    const h = Math.min(TIER_MAX_HEIGHT.L, Math.round(H * hFrac));
    return { height: h, width: Math.round(W * wFrac * (h / (H * hFrac))) };
  };

  // ---- Background plate (always; covers the frame with overscan) ----
  const bgPrompt = shot.substitute ? `${shot.substitute.description}, quiet and respectful, no people, no text` : `${env.backgroundPrompt}, ${scene.timeOfDay !== "unspecified" ? scene.timeOfDay : "daytime"} light`;
  layers.push({
    key: "bg",
    kind: "BACKGROUND",
    name: shot.substitute ? "Substitute background" : `${env.label} background`,
    zIndex: 0,
    depth: depth.background,
    placement: { x: 0.5, y: 0.5, anchor: [0.5, 0.5], height: 1.0, rotation: 0, opacity: 1, flipX: false, cover: true },
    blend: "normal",
    lightResponse: 0.7,
    castsShadow: false,
    silhouette: false,
    assetRole: "background",
    prompt: `${bgPrompt}, wide establishing plate, ${style} style`,
    negativePrompt: `${NEGATIVE_PROMPT}, people, person, crowd`,
    reuseKey: `loc:${locKey}:bg:${style}:${canvas.aspectRatio}`,
    pixelSize: placeholderSize(1.2, 1.2),
    painterHint: { painter: env.painter, category: shot.locationCategory, timeOfDay: scene.timeOfDay, substitute: shot.substitute?.id, part: "background" },
    locationRefKey: locKey,
  });
  composition.background.push({ key: "bg", name: layers[0].name, description: bgPrompt });

  // ---- Midground elements (not for close-ups, inserts or substitutes) ----
  let trainPassing = false;
  let trainSource: { x: number; y: number } | undefined;
  if (!closeShot && !shot.substitute) {
    env.midground.forEach((m, i) => {
      const widthFactor = m.widthFactor ?? 1.1;
      const hFrac = m.key === "train" || m.key === "metro" ? 0.3 : 0.26;
      const travel = m.motion === "pass_left" || m.motion === "pass_right";
      if (m.key === "train" || m.key === "metro") {
        trainPassing = travel;
        trainSource = { x: 0.32, y: env.groundY - 0.15 };
      }
      const speed = 0.07; // canvas widths per second: a departing train, not a rushing one
      const dir = m.motion === "pass_right" ? 1 : -1;
      const startX = 0.5 - dir * 0.15;
      const motion: LayerMotion | undefined = travel
        ? { translate: { from: [0, 0], to: [dir * speed * shot.durationSeconds, 0], startTime: 0, endTime: 1, easing: "ease_in" } }
        : { oscillate: [{ axis: "y", amplitude: 0.0006, frequency: 3.1, phase: 0 }] };
      const key = `mid_${m.key}`;
      layers.push({
        key,
        kind: "MIDGROUND",
        name: m.name,
        zIndex: 10 + i,
        depth: Math.min(depth.characters - 0.05, depth.midground + i * 0.04),
        placement: { x: startX, y: env.groundY - 0.11, anchor: [0.5, 1], height: hFrac, rotation: 0, opacity: 1, flipX: false, cover: false },
        blend: "normal",
        lightResponse: 0.9,
        castsShadow: false,
        silhouette: false,
        motion,
        assetRole: "midground",
        prompt: `${m.prompt}, ${style} style, transparent background`,
        negativePrompt: NEGATIVE_PROMPT,
        reuseKey: `loc:${locKey}:mid:${m.key}:${style}`,
        pixelSize: placeholderSize(hFrac, widthFactor),
        painterHint: { painter: env.painter, element: m.key, widthFactor, timeOfDay: scene.timeOfDay, part: "midground" },
        locationRefKey: locKey,
      });
      composition.midground.push({ key, name: m.name, description: m.prompt });
    });
  }

  // ---- Characters ----
  const framing = CHARACTER_FRAMING[shot.shotType] ?? CHARACTER_FRAMING.WIDE!;
  const chars = shot.characterKeys.map((k) => ctx.characters.find((c) => c.key === k)).filter((c): c is DirectorCharacter => !!c && !c.isMinor);
  const slots = slotsFor(chars.length);
  const focusKey = shot.focusCharacterKey ?? chars[0]?.key;
  let focusDepth = depth.characters;
  let focusCharX = 0.6;
  let focusFeetY = env.groundY;
  let focusHeight = framing.height;
  chars.forEach((c, i) => {
    const isFocus = c.key === focusKey;
    const single = chars.length === 1 || shot.shotType === "MEDIUM" || shot.shotType === "CLOSE_UP" || shot.shotType === "EXTREME_CLOSE_UP";
    if (!isFocus && single && chars.length > 1 && shot.shotType !== "WIDE") return;
    const hFrac = framing.height * ageScale(c) * (isFocus ? 1 : 0.94);
    const feetY = framing.feet > 0 ? framing.feet : env.groundY + (isFocus ? 0.02 : -0.01) * (chars.length > 1 ? 1 : 0);
    const x = single && chars.length === 1 ? (shot.shotType === "CLOSE_UP" || shot.shotType === "EXTREME_CLOSE_UP" ? 0.5 : 0.58) : slots[i];
    const d = Math.min(0.62, depth.characters + (isFocus ? 0.04 : 0) + i * 0.015);
    const expression = shot.expressions[c.key] ?? "neutral";
    const pose = shot.poses[c.key] ?? "standing";
    const tier = sizeTier(H * hFrac);
    const refKey = characterRefKey(ctx.storyId, c);
    const r = hash01(seed, i + 7);
    const walking = shot.motion.walk && isFocus;
    const micro = characterMotionSchema.parse({
      expression,
      pose: walking ? (shot.motion.walk === "run" ? "running" : "walking") : pose,
      breathing: 0.8,
      blinkInterval: 2.8 + r * 1.6,
      headMotion: "subtle",
      eyeDirection: pose === "talking" ? (x > 0.5 ? "camera-left" : "camera-right") : pose === "looking_down" ? "down" : "camera",
      bodySway: 0.15,
      walk: walking ? { cycleHz: shot.motion.walk === "run" ? 1.6 : 0.9, travel: shot.motion.walk === "run" ? 0.35 : 0.18, direction: x > 0.5 ? -1 : 1, run: shot.motion.walk === "run" } : undefined,
      headTurn: pose === "looking_back" ? { from: 0, to: -18, startTime: 0.2, endTime: 0.6, easing: "ease_in_out" } : r > 0.55 && !walking ? { from: 0, to: (r - 0.5) * 16, startTime: 0.25, endTime: 0.75, easing: "ease_in_out" } : undefined,
      gesture: pose === "talking" ? { type: "talk", startTime: 0.1, endTime: 0.9, easing: "ease_in_out" } : undefined,
    });
    const key = `char_${c.key}`;
    layers.push({
      key,
      kind: "CHARACTER",
      name: c.displayName,
      zIndex: 30 + Math.round(d * 100),
      depth: d,
      placement: { x, y: feetY, anchor: [0.5, 1], height: hFrac, rotation: 0, opacity: 1, flipX: x > 0.6 && chars.length > 1, cover: false },
      blend: "normal",
      lightResponse: 1,
      castsShadow: framing.feet === 0,
      silhouette: shot.silhouettes,
      character: micro,
      assetRole: "character",
      prompt: describeCharacter(c, expression, micro.pose, shot.silhouettes),
      negativePrompt: NEGATIVE_PROMPT,
      reuseKey: `char:${refKey}:${style}:${tier}`,
      pixelSize: { height: Math.min(TIER_MAX_HEIGHT[tier], Math.round(H * hFrac)), width: Math.round(Math.min(TIER_MAX_HEIGHT[tier], Math.round(H * hFrac)) * 0.42) },
      painterHint: { character: { key: c.key, gender: c.gender, ageGroup: c.ageGroup, role: c.role, isOfficial: c.isOfficial, appearance: c.appearance ?? null } },
      characterKey: c.key,
      characterRefKey: refKey,
      expression,
      pose: micro.pose,
    });
    composition.characters.push({ key, name: c.displayName, description: `${c.role}, ${expression}, ${micro.pose}` });
    if (isFocus) {
      focusDepth = d;
      focusCharX = x;
      focusFeetY = feetY;
      focusHeight = hFrac;
    }
  });

  // ---- Props ----
  shot.propKeys.forEach((propKey, i) => {
    const prop = getProp(propKey);
    if (!prop) return;
    const insert = insertShot && i === 0;
    const hFrac = insert ? 0.42 : Math.max(0.04, focusHeight * prop.relativeHeight);
    const x = insert ? 0.5 : Math.max(0.12, Math.min(0.88, focusCharX + (focusCharX > 0.5 ? -0.14 : 0.14)));
    const y = insert ? 0.8 : focusFeetY + 0.005;
    const d = insert ? 0.62 : Math.min(0.75, focusDepth + 0.05);
    const key = `prop_${propKey}`;
    const refKey = propRefKey(propKey, style);
    layers.push({
      key,
      kind: "PROP",
      name: prop.name,
      zIndex: 30 + Math.round(d * 100) + 1,
      depth: insert ? d : Math.max(d, depth.props * 0.8),
      placement: { x, y, anchor: [0.5, 1], height: hFrac, rotation: insert ? -4 : 0, opacity: 1, flipX: false, cover: false },
      blend: "normal",
      lightResponse: 1,
      castsShadow: !insert,
      silhouette: false,
      assetRole: "prop",
      prompt: `${prop.prompt}, ${style} style, transparent background`,
      negativePrompt: NEGATIVE_PROMPT,
      reuseKey: `prop:${refKey}:${sizeTier(H * hFrac)}`,
      pixelSize: { height: Math.min(TIER_MAX_HEIGHT.L, Math.round(H * hFrac)), width: Math.round(Math.min(TIER_MAX_HEIGHT.L, Math.round(H * hFrac)) * 1.1) },
      painterHint: { prop: prop.painter },
      propKey,
      propRefKey: refKey,
    });
    composition.props.push({ key, name: prop.name, description: prop.prompt });
    if (insert) focusDepth = d;
  });

  // ---- Foreground (frames the shot, sits nearest the lens, usually out of focus) ----
  let foregroundDepth: number | null = null;
  if (!insertShot && env.foreground.length > 0 && shot.shotType !== "EXTREME_CLOSE_UP") {
    const f = env.foreground[0];
    const hFrac = closeShot ? 0.22 : 0.26;
    foregroundDepth = depth.foreground;
    layers.push({
      key: `fg_${f.key}`,
      kind: "FOREGROUND",
      name: f.name,
      zIndex: 100,
      depth: depth.foreground,
      placement: { x: 0.5, y: 1.03, anchor: [0.5, 1], height: hFrac, rotation: 0, opacity: 1, flipX: false, cover: false },
      blend: "normal",
      lightResponse: 0.55,
      castsShadow: false,
      silhouette: false,
      assetRole: "foreground",
      prompt: `${f.prompt}, ${style} style, transparent background`,
      negativePrompt: NEGATIVE_PROMPT,
      reuseKey: `loc:${locKey}:fg:${f.key}:${style}`,
      pixelSize: placeholderSize(hFrac, 1.5),
      painterHint: { painter: env.painter, element: f.key, timeOfDay: scene.timeOfDay, part: "foreground" },
      locationRefKey: locKey,
    });
    composition.foreground.push({ key: `fg_${f.key}`, name: f.name, description: f.prompt });
  } else if (shot.shotType === "OVER_SHOULDER" || insertShot) {
    foregroundDepth = 0.95;
  }

  layers.sort((a, b) => a.zIndex - b.zIndex || a.depth - b.depth);

  // ---- Camera, light, environment, focus, effects ----
  const camera = cameraPreset(shot.cameraMovement, shot.cameraIntensity, shot.cameraMovement === "tracking" && focusKey ? { trackLayerKey: `char_${focusKey}` } : {});
  const text = `${scene.narratorText} ${scene.background} ${scene.location}`;
  const lighting = buildLighting({ timeOfDay: scene.timeOfDay, env, text, trainPassing, shotType: shot.shotType });
  const { environment, fogDensity } = buildEnvironment({ env, timeOfDay: scene.timeOfDay, text, shotType: shot.shotType, seed, trainSource: trainPassing ? trainSource : undefined });
  const rack = shot.cameraMovement === "rack_focus" || shot.shotType === "OVER_SHOULDER" || insertShot;
  const focus = buildFocus(shot.shotType, focusDepth, foregroundDepth, rack, focusKey ? `char_${focusKey}` : undefined);
  const effects = buildEffects(scene.emotionalTone, scene.timeOfDay);
  const depthSpec = buildDepthSpec(fogDensity, scene.timeOfDay);

  return {
    composition,
    depth,
    layers,
    camera,
    lighting,
    shadows: buildShadows(scene.timeOfDay, env.interior),
    environment,
    focus,
    effects,
    depthSpec,
    transition: { in: input.position.firstShotOfEpisode ? "fade" : "cut", out: input.position.lastShotOfEpisode ? "fade" : "cut", durationSeconds: 0.5 },
    locationCategory: shot.locationCategory,
    locationRefKey: locKey,
    timeOfDay: scene.timeOfDay,
    style,
    aspectRatio: canvas.aspectRatio,
  };
}
