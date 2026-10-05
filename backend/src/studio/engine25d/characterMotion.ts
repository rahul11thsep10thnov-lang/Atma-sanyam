import { CharacterMotion, Pose } from "./spec";
import { clamp, fbm1, hash01, segmentProgress } from "./math";
import { EXPRESSION_LIBRARY, FaceParams } from "../production/library/expressions";
import { POSE_LIBRARY, PoseAngles } from "../production/library/poses";

/** Per-frame character state produced by the CharacterMotionEngine. */
export interface CharacterFrame {
  /** Rotation per rig part in degrees (screen space, clockwise positive). */
  angles: Record<string, number>;
  /** Breathing scale for the torso (1 = rest). */
  breath: number;
  /** Whole-body sway around the feet, degrees. */
  sway: number;
  /** Horizontal travel in canvas widths since t = 0 (walking/running). */
  travelX: number;
  /** Facing direction: 1 = screen-right, -1 = screen-left (mirrored). */
  facing: 1 | -1;
  face: { params: FaceParams; blink: number; eye: [number, number]; speech: number; turn: number };
  holds?: "phone" | "bag";
  sitting: boolean;
  /** Vertical bob (fraction of figure height, negative = up) for image-sourced characters. */
  bob: number;
}

const EYE: Record<string, [number, number]> = {
  camera: [0, 0],
  left: [-0.9, 0],
  right: [0.9, 0],
  up: [0, -0.8],
  down: [0.1, 0.8],
  "camera-left": [-0.45, 0],
  "camera-right": [0.45, 0],
};

const TAU = Math.PI * 2;

/** Joint angle (pose space, forward-positive) → screen rotation for each rig part. */
function poseToScreen(p: PoseAngles): Record<string, number> {
  return {
    pelvis: 0,
    torso: p.torsoLean,
    head: p.headTilt,
    upperArmL: -p.upperArmL,
    foreArmL: -p.lowerArmL,
    upperArmR: -p.upperArmR,
    foreArmR: -p.lowerArmR,
    thighL: -p.thighL,
    shinL: -p.shinL,
    thighR: -p.thighR,
    shinR: -p.shinR,
    skirt: 0,
    hairBack: 0,
    propPhone: 0,
    propBag: 0,
  };
}

/** Smooth 0→1→0 blink curve around each scheduled blink. */
function blinkAt(t: number, interval: number, seed: number): number {
  if (interval <= 0) return 0;
  const dur = 0.16;
  // Blink times: jittered around a regular interval; double-blinks occasionally.
  let tb = 0.35 + hash01(seed, 1) * interval * 0.6;
  for (let i = 0; tb < t + dur && i < 1000; i++) {
    const dt = t - tb;
    if (dt >= 0 && dt <= dur) return Math.sin((dt / dur) * Math.PI) ** 0.7;
    if (hash01(seed, i, 9) < 0.12) {
      const dt2 = t - (tb + 0.24);
      if (dt2 >= 0 && dt2 <= dur) return Math.sin((dt2 / dur) * Math.PI) ** 0.7;
    }
    tb += interval * (0.6 + hash01(seed, i, 3) * 0.8);
  }
  return 0;
}

function lerpPose(a: PoseAngles, b: PoseAngles, k: number): PoseAngles {
  const out = { ...a };
  for (const key of ["torsoLean", "headTilt", "upperArmL", "lowerArmL", "upperArmR", "lowerArmR", "thighL", "shinL", "thighR", "shinR"] as const) out[key] = a[key] + (b[key] - a[key]) * k;
  return out;
}

const GESTURE_POSE: Record<string, Pose> = { point: "pointing", wave: "waving", raise_phone: "holding_phone" };

/**
 * CharacterMotionEngine: evaluates a character's procedural life at time t —
 * breathing, blinks, eye saccades, head motion and turns, body sway, walk or
 * run cycles, talking gestures and speech mouth movement, cloth and hair
 * secondary motion. Fully deterministic for a given seed.
 */
export function evaluateCharacter(spec: CharacterMotion, t: number, duration: number, seed: number, baseFacing: 1 | -1 = 1): CharacterFrame {
  const k = spec.intensity;
  const u = duration > 0 ? clamp(t / duration, 0, 1) : 0;
  let pose: PoseAngles = { ...POSE_LIBRARY[spec.pose] };
  const params: FaceParams = { ...EXPRESSION_LIBRARY[spec.expression] };

  // Gestures blend the base pose towards a gesture pose inside their window.
  if (spec.gesture && spec.gesture.type !== "talk") {
    const g = segmentProgress(u, spec.gesture.startTime, spec.gesture.endTime, spec.gesture.easing);
    const bell = Math.sin(Math.min(1, g) * Math.PI); // in, hold, out
    const target = POSE_LIBRARY[GESTURE_POSE[spec.gesture.type]];
    pose = lerpPose(pose, target, clamp(bell * 1.4, 0, 1));
    if (spec.gesture.type === "raise_phone" && bell > 0.4) pose.holds = "phone";
  }
  const angles = poseToScreen(pose);

  // Breathing (~15 breaths/min) lifts the torso, shoulders and head a little.
  const breathPhase = Math.sin(t * TAU * 0.26 + hash01(seed, 4) * TAU);
  const breath = 1 + 0.009 * spec.breathing * k * breathPhase;
  angles.upperArmL += 0.6 * spec.breathing * k * breathPhase;
  angles.upperArmR -= 0.6 * spec.breathing * k * breathPhase;

  // Idle body sway and weight shift (slow noise).
  let sway = spec.bodySway * k * 1.6 * fbm1(seed + 11, t * 0.22);
  angles.torso += spec.bodySway * k * 1.2 * fbm1(seed + 12, t * 0.3);

  // Head: subtle drift, optional timed head turn.
  const headAmp = spec.headMotion === "none" ? 0 : spec.headMotion === "moderate" ? 3.2 : 1.6;
  angles.head += headAmp * k * fbm1(seed + 21, t * 0.35);
  let turn = 0.12 * headAmp * k * fbm1(seed + 22, t * 0.25);
  if (spec.headTurn) {
    const p = segmentProgress(u, spec.headTurn.startTime, spec.headTurn.endTime, spec.headTurn.easing);
    const deg = spec.headTurn.from + (spec.headTurn.to - spec.headTurn.from) * p;
    turn += clamp(deg / 30, -1, 1);
    angles.head += deg * 0.08;
  }

  // Walk / run cycle.
  let travelX = 0;
  let facing: 1 | -1 = baseFacing;
  let bob = 0;
  if (spec.walk) {
    const run = spec.walk.run;
    const phi = t * TAU * spec.walk.cycleHz + hash01(seed, 5) * TAU;
    const thighAmp = run ? 34 : 21;
    const s = Math.sin(phi);
    const sOpp = Math.sin(phi + Math.PI);
    angles.thighL = -thighAmp * s - (run ? 10 : 2);
    angles.thighR = -thighAmp * sOpp - (run ? 10 : 2);
    // knees bend while the leg swings forward
    angles.shinL = (run ? 50 : 26) * Math.max(0, Math.cos(phi + 0.9)) + 4;
    angles.shinR = (run ? 50 : 26) * Math.max(0, Math.cos(phi + Math.PI + 0.9)) + 4;
    const armAmp = run ? 38 : 18;
    angles.upperArmL = armAmp * s * 0.9 - 4;
    angles.upperArmR = armAmp * sOpp * 0.9 - 4;
    angles.foreArmL = -(run ? 70 : 14) - 8 * Math.max(0, s);
    angles.foreArmR = -(run ? 70 : 14) - 8 * Math.max(0, sOpp);
    angles.torso += run ? 10 : 3;
    bob = -Math.abs(Math.cos(phi)) * (run ? 0.012 : 0.006);
    travelX = spec.walk.travel * u * spec.walk.direction;
    facing = spec.walk.direction;
    sway *= 0.3;
  }

  // Talking: hand gestures in rhythm and speech mouth movement.
  let speech = 0;
  if (spec.gesture?.type === "talk") {
    const g = segmentProgress(u, spec.gesture.startTime, spec.gesture.endTime, "linear");
    const active = g > 0 && g < 1 ? 1 : 0;
    if (active) {
      const syll = 0.5 + 0.5 * Math.sin(t * TAU * 4.7 + fbm1(seed + 31, t) * 2);
      const phrase = clamp(0.6 + fbm1(seed + 32, t * 0.6) * 1.2, 0, 1); // pauses between phrases
      speech = 0.42 * syll * phrase;
      angles.foreArmR += -9 * k * Math.sin(t * TAU * 0.85 + 0.6) * phrase;
      angles.upperArmR += -4 * k * Math.sin(t * TAU * 0.6) * phrase;
      angles.head += 1.6 * k * Math.sin(t * TAU * 0.9) * phrase;
    }
  }

  // Secondary motion: cloth and hair lag behind the body.
  angles.skirt = spec.clothMotion * k * (1.4 * Math.sin(t * TAU * 0.45 + 1) + (spec.walk ? 3 * Math.sin(t * TAU * spec.walk.cycleHz) : 0));
  angles.hairBack = spec.hairMotion * k * (2 * Math.sin(t * TAU * 0.5 + 2) + (spec.walk ? 4 * Math.sin(t * TAU * spec.walk.cycleHz * 2) : 0)) - angles.head * 0.4;

  // Eyes: direction + small saccades; blinks.
  const base = EYE[spec.eyeDirection] ?? [0, 0];
  const sac = Math.floor(t / 1.15);
  const eye: [number, number] = [
    clamp(base[0] + (hash01(seed, sac, 41) - 0.5) * 0.22, -1, 1),
    clamp(base[1] + (hash01(seed, sac, 42) - 0.5) * 0.16, -1, 1),
  ];
  const blink = blinkAt(t, spec.blinkInterval, seed);
  params.browRaise = clamp(params.browRaise + 0.06 * fbm1(seed + 51, t * 0.4), 0, 1.1);

  return { angles, breath, sway, travelX, facing, face: { params, blink, eye, speech, turn }, holds: pose.holds, sitting: !!pose.sitting || !!pose.kneeling, bob };
}
