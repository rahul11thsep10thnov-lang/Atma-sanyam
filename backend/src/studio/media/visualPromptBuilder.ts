import { CharacterAppearance, MasterScene, SafetyLevelKey } from "../types";
import { CameraMotion } from "../providers/video/VideoProvider";
import { pickSubstitute } from "../safety/safeVisualLibrary";
import { contentHash } from "../hashing";

export const ANIMATION_STYLES: Record<string, string> = {
  "flat-2d-editorial": "flat 2D editorial illustration, clean vector shapes, muted earthy palette, soft paper grain, calm and respectful",
  "soft-watercolor": "soft watercolour illustration, gentle washes, muted colours, calm documentary mood",
  "paper-cutout": "layered paper-cutout illustration, subtle shadows between layers, muted palette",
  "minimal-line-art": "minimal line-art illustration with limited flat colour fills, generous negative space",
};

const LIGHTING: Record<string, string> = {
  morning: "soft early-morning light, pale sky",
  afternoon: "even daylight, clear sky",
  evening: "warm dusk light, long soft shadows",
  night: "quiet night, cool blue tones, warm window light",
  unspecified: "soft overcast daylight",
};

export const NEGATIVE_PROMPT =
  "photorealistic faces, identifiable real people, portraits, close-up faces, blood, gore, injuries, wounds, weapons, violence in progress, dead bodies, self-harm, ropes or nooses, nudity, sexual content, children's faces, text, captions, logos, watermarks, readable signboards, flags, religious symbols in focus, sensational imagery";

export interface StyleBible {
  style: string;
  styleKey: string;
  palette: string;
  characterSheets: Record<string, string>;
  seedBase: number;
}

export function buildStyleBible(params: {
  storyId: string;
  animationStyle: string;
  characters: { key: string; displayName: string; role: string; gender: string; ageGroup: string; isMinor: boolean; appearance: CharacterAppearance | null }[];
}): StyleBible {
  const style = ANIMATION_STYLES[params.animationStyle] ?? ANIMATION_STYLES["flat-2d-editorial"];
  const characterSheets: Record<string, string> = {};
  for (const c of params.characters) {
    if (c.isMinor) continue; // minors are never drawn
    const a = c.appearance;
    const who = `${c.ageGroup === "ELDERLY" ? "older " : ""}${c.gender === "FEMALE" ? "woman" : c.gender === "MALE" ? "man" : "person"} (${c.role})`;
    characterSheets[c.key] = a ? `${who} wearing ${a.clothing}, ${a.hair}, ${a.build}, colours ${a.palette}, stylised figure with simplified features` : `${who}, stylised figure with simplified features`;
  }
  return { style, styleKey: params.animationStyle, palette: "muted earthy tones with a single deep-blue accent", characterSheets, seedBase: parseInt(contentHash(params.storyId).slice(0, 8), 16) };
}

export function cameraMotionFor(direction: string): CameraMotion {
  const d = direction.toLowerCase();
  if (d.includes("pull") || d.includes("zoom out")) return "slow-zoom-out";
  if (d.includes("pan left")) return "pan-left";
  if (d.includes("pan right") || d.includes("pan")) return "pan-right";
  if (d.includes("static")) return "static";
  return "slow-zoom-in";
}

export interface VisualPromptResult {
  prompt: string;
  negativePrompt: string;
  isSubstitute: boolean;
  substituteReason?: string;
  seed: number;
  hash: string;
  timeOfDay: string;
  motion: CameraMotion;
}

/**
 * Stages: VISUAL PROMPT GENERATION + SAFE VISUAL REPLACEMENT. Builds one
 * prompt per scene from the story's style bible, so lighting, palette,
 * characters' clothing and places stay consistent from scene to scene.
 * RESTRICTED scenes get a contextual substitute (no people, no event);
 * SENSITIVE scenes show people only as distant silhouettes.
 */
export function buildVisualPrompt(
  scene: Pick<MasterScene, "sceneNumber" | "location" | "timeOfDay" | "characters" | "background" | "props" | "cameraDirection" | "emotionalTone">,
  safety: { level: SafetyLevelKey; topics: string[] },
  bible: StyleBible,
  storyTopics: string[]
): VisualPromptResult {
  const lighting = LIGHTING[scene.timeOfDay] ?? LIGHTING.unspecified;
  const motion = cameraMotionFor(scene.cameraDirection);
  let prompt: string;
  let isSubstitute = false;
  let substituteReason: string | undefined;

  if (safety.level === "RESTRICTED") {
    const sub = pickSubstitute(safety.topics, scene.sceneNumber, storyTopics);
    isSubstitute = true;
    substituteReason = `Restricted content (${safety.topics.join(", ")}) replaced with "${sub.id}"`;
    prompt = [bible.style, `Subject: ${sub.description}.`, `Setting context: ${scene.location}.`, `Lighting: ${lighting}.`, `Camera: ${sub.camera}.`, "No people in frame.", `Palette: ${bible.palette}.`].join(" ");
  } else {
    const people = scene.characters.map((k) => bible.characterSheets[k]).filter(Boolean);
    const peopleText =
      people.length === 0
        ? "No people in frame."
        : safety.level === "SENSITIVE"
          ? `People shown only as distant, backlit silhouettes with no faces or actions: ${people.join("; ")}.`
          : `People (small in frame, calm postures, faces not detailed): ${people.join("; ")}.`;
    prompt = [
      bible.style,
      `Setting: ${scene.background}.`,
      `Lighting: ${lighting}.`,
      scene.props.length ? `Props: ${scene.props.join(", ")}.` : "",
      peopleText,
      `Mood: ${scene.emotionalTone}, restrained.`,
      `Camera: ${scene.cameraDirection}.`,
      `Palette: ${bible.palette}.`,
    ]
      .filter(Boolean)
      .join(" ");
  }

  const settingKey = scene.location.split(",")[0].trim().toLowerCase();
  const seed = (bible.seedBase + parseInt(contentHash(settingKey, isSubstitute ? prompt : "").slice(0, 6), 16)) >>> 0;
  return {
    prompt,
    negativePrompt: NEGATIVE_PROMPT,
    isSubstitute,
    substituteReason,
    seed,
    hash: contentHash(prompt, NEGATIVE_PROMPT, seed),
    timeOfDay: scene.timeOfDay,
    motion,
  };
}
