import { Pose } from "../../engine25d/spec";

/**
 * Joint angles (degrees) for the procedural rig. 0 = hanging straight down
 * for limbs; positive rotates the limb forward (towards the character's
 * facing side). Torso lean is forward-positive.
 */
export interface PoseAngles {
  torsoLean: number;
  headTilt: number;
  upperArmL: number;
  lowerArmL: number;
  upperArmR: number;
  lowerArmR: number;
  thighL: number;
  shinL: number;
  thighR: number;
  shinR: number;
  sitting?: boolean;
  kneeling?: boolean;
  holds?: "phone" | "bag";
  prompt: string;
}

export const POSE_LIBRARY: Record<Pose, PoseAngles> = {
  standing: { torsoLean: 0, headTilt: 0, upperArmL: 6, lowerArmL: 4, upperArmR: -6, lowerArmR: -4, thighL: 2, shinL: 0, thighR: -2, shinR: 0, prompt: "standing" },
  walking: { torsoLean: 3, headTilt: 0, upperArmL: 18, lowerArmL: 10, upperArmR: -18, lowerArmR: -6, thighL: 18, shinL: -6, thighR: -14, shinR: -18, prompt: "walking" },
  running: { torsoLean: 12, headTilt: 4, upperArmL: 45, lowerArmL: 70, upperArmR: -40, lowerArmR: 60, thighL: 40, shinL: -30, thighR: -30, shinR: -60, prompt: "running" },
  sitting: { torsoLean: 2, headTilt: 0, upperArmL: 20, lowerArmL: 50, upperArmR: 20, lowerArmR: 50, thighL: 85, shinL: -85, thighR: 85, shinR: -85, sitting: true, prompt: "sitting" },
  talking: { torsoLean: 1, headTilt: 2, upperArmL: 8, lowerArmL: 6, upperArmR: 25, lowerArmR: 60, thighL: 2, shinL: 0, thighR: -2, shinR: 0, prompt: "talking with a small hand gesture" },
  pointing: { torsoLean: 2, headTilt: 0, upperArmL: 6, lowerArmL: 4, upperArmR: 80, lowerArmR: 5, thighL: 2, shinL: 0, thighR: -2, shinR: 0, prompt: "pointing" },
  looking_back: { torsoLean: 0, headTilt: -6, upperArmL: 6, lowerArmL: 4, upperArmR: -6, lowerArmR: -4, thighL: 2, shinL: 0, thighR: -2, shinR: 0, prompt: "looking back over the shoulder" },
  holding_phone: { torsoLean: 2, headTilt: 8, upperArmL: 6, lowerArmL: 4, upperArmR: 30, lowerArmR: 110, thighL: 2, shinL: 0, thighR: -2, shinR: 0, holds: "phone", prompt: "holding a phone" },
  holding_bag: { torsoLean: 0, headTilt: 0, upperArmL: 4, lowerArmL: 2, upperArmR: -4, lowerArmR: -2, thighL: 2, shinL: 0, thighR: -2, shinR: 0, holds: "bag", prompt: "holding a bag" },
  falling: { torsoLean: -25, headTilt: -10, upperArmL: 60, lowerArmL: 20, upperArmR: -60, lowerArmR: -20, thighL: 20, shinL: -20, thighR: -10, shinR: -30, prompt: "losing balance" },
  kneeling: { torsoLean: 5, headTilt: 6, upperArmL: 10, lowerArmL: 20, upperArmR: 10, lowerArmR: 20, thighL: 80, shinL: -170, thighR: 10, shinR: -90, kneeling: true, prompt: "kneeling" },
  running_away: { torsoLean: 14, headTilt: 0, upperArmL: 50, lowerArmL: 70, upperArmR: -45, lowerArmR: 60, thighL: 42, shinL: -35, thighR: -32, shinR: -65, prompt: "running away" },
  looking_up: { torsoLean: -3, headTilt: -14, upperArmL: 6, lowerArmL: 4, upperArmR: -6, lowerArmR: -4, thighL: 2, shinL: 0, thighR: -2, shinR: 0, prompt: "looking up" },
  looking_down: { torsoLean: 4, headTilt: 16, upperArmL: 6, lowerArmL: 4, upperArmR: -6, lowerArmR: -4, thighL: 2, shinL: 0, thighR: -2, shinR: 0, prompt: "looking down" },
  turning: { torsoLean: 0, headTilt: 0, upperArmL: 10, lowerArmL: 6, upperArmR: -10, lowerArmR: -6, thighL: 6, shinL: 0, thighR: -6, shinR: 0, prompt: "turning" },
  waving: { torsoLean: 0, headTilt: 0, upperArmL: 6, lowerArmL: 4, upperArmR: 150, lowerArmR: 20, thighL: 2, shinL: 0, thighR: -2, shinR: 0, prompt: "waving" },
  crossing_arms: { torsoLean: 0, headTilt: 0, upperArmL: 30, lowerArmL: 100, upperArmR: 30, lowerArmR: 100, thighL: 2, shinL: 0, thighR: -2, shinR: 0, prompt: "arms crossed" },
};

const TEXT_TO_POSE: [RegExp, Pose][] = [
  [/\b(ran away|fled|escaped)\b/i, "running_away"],
  [/\b(ran|running|chased)\b/i, "running"],
  [/\b(walked|walking|went to|reached|arrived)\b/i, "walking"],
  [/\b(sat|sitting|seated)\b/i, "sitting"],
  [/\b(phone|call|called|mobile)\b/i, "holding_phone"],
  [/\b(bag|luggage|suitcase)\b/i, "holding_bag"],
  [/\b(pointed|pointing)\b/i, "pointing"],
  [/\b(waved|waving)\b/i, "waving"],
  [/\b(knelt|kneeling)\b/i, "kneeling"],
  [/\b(looked back|turned back)\b/i, "looking_back"],
  [/\b(waiting|waited|stood)\b/i, "standing"],
];

export function choosePose(text: string, speaking: boolean): Pose {
  for (const [re, pose] of TEXT_TO_POSE) if (re.test(text)) return pose;
  return speaking ? "talking" : "standing";
}
