import { LocationCategory, ShotType } from "@prisma/client";
import { CameraMoveType, Expression, Pose } from "../engine25d/spec";
import { pickSubstitute } from "../safety/safeVisualLibrary";
import { splitSentences } from "../language/languageProfiles";
import { detectEnvironment, getEnvironment } from "./library/environments";
import { chooseExpression } from "./library/expressions";
import { choosePose } from "./library/poses";
import { detectProps, getProp } from "./library/props";
import { analyzeMotion } from "./motionRequirementAnalyzer";
import { DirectorContext, SceneInput, ShotPlan } from "./types";

const MIN_SHOT_SECONDS = 2.5;

type ShotTemplate = {
  type: ShotType;
  weight: number;
  camera: CameraMoveType;
  intensity: number;
  withCharacters: boolean;
  viewerSees: (s: Ctx) => string;
  purpose: string;
  insertProp?: boolean;
};

interface Ctx {
  scene: SceneInput;
  place: string;
  focusName?: string;
  propName?: string;
  substitute?: string;
}

const T = (t: ShotTemplate) => t;

const OPENING: ShotTemplate[] = [
  T({ type: "ESTABLISHING", weight: 1.1, camera: "dolly_in", intensity: 0.8, withCharacters: false, viewerSees: (c) => `Establishing view of ${c.place}`, purpose: "Orient the viewer in place and time" }),
  T({ type: "WIDE", weight: 1, camera: "pan_right", intensity: 0.7, withCharacters: true, viewerSees: (c) => (c.focusName ? `${c.focusName} within ${c.place}` : `Wider view of ${c.place}`), purpose: "Introduce who the story is about" }),
];
const RESTRICTED: ShotTemplate[] = [
  T({ type: "CUTAWAY", weight: 1, camera: "push_in", intensity: 0.5, withCharacters: false, viewerSees: (c) => `Substitute visual: ${c.substitute}`, purpose: "Carry the narration without depicting a restricted event" }),
  T({ type: "INSERT", weight: 0.8, camera: "slow_zoom", intensity: 0.7, withCharacters: false, viewerSees: (c) => `Quiet detail: ${c.substitute}`, purpose: "Give the narration space without graphic imagery" }),
];
const QUOTE: ShotTemplate[] = [
  T({ type: "MEDIUM", weight: 1.2, camera: "push_in", intensity: 0.35, withCharacters: true, viewerSees: (c) => `${c.focusName ?? "The speaker"} speaking`, purpose: "Let the viewer hear the verified statement from its source" }),
  T({ type: "CLOSE_UP", weight: 0.9, camera: "rack_focus", intensity: 0.6, withCharacters: true, viewerSees: (c) => `Close on ${c.focusName ?? "the speaker"}`, purpose: "Weight of the statement" }),
];
const NARRATIVE: ShotTemplate[] = [
  T({ type: "WIDE", weight: 1, camera: "dolly_in", intensity: 0.6, withCharacters: true, viewerSees: (c) => `${c.focusName ?? "The people involved"} at ${c.place}`, purpose: "Show the situation" }),
  T({ type: "MEDIUM", weight: 1, camera: "push_in", intensity: 0.45, withCharacters: true, viewerSees: (c) => `${c.focusName ?? "The person"}, reacting`, purpose: "Bring the viewer closer to the people" }),
  T({ type: "CLOSE_UP", weight: 0.8, camera: "slow_zoom", intensity: 0.7, withCharacters: true, viewerSees: (c) => `Close on ${c.focusName ?? "the person"}'s face`, purpose: "Emotional weight" }),
];
const NARRATIVE_NO_PEOPLE: ShotTemplate[] = [
  T({ type: "WIDE", weight: 1, camera: "pan_left", intensity: 0.7, withCharacters: false, viewerSees: (c) => `${c.place}`, purpose: "Place the events" }),
  T({ type: "INSERT", weight: 0.8, camera: "rack_focus", intensity: 0.6, withCharacters: false, insertProp: true, viewerSees: (c) => `Detail: ${c.propName ?? "an object from the story"}`, purpose: "Anchor a key fact visually" }),
];
const CLOSING: ShotTemplate[] = [T({ type: "WIDE", weight: 1, camera: "pull_out", intensity: 0.8, withCharacters: false, viewerSees: (c) => `${c.place}, pulling away`, purpose: "Close the story; sourcing and status" })];

function shotCountFor(duration: number, max: number): number {
  return Math.max(1, Math.min(max, Math.round(duration / 5.5)));
}

function splitNarration(text: string, parts: number): string[] {
  const sentences = splitSentences(text);
  if (parts <= 1 || sentences.length === 0) return [text];
  const out: string[] = Array.from({ length: parts }, () => "");
  sentences.forEach((s, i) => {
    const idx = Math.min(parts - 1, Math.floor((i * parts) / sentences.length));
    out[idx] = `${out[idx]} ${s}`.trim();
  });
  return out.map((t, i) => t || out[Math.max(0, i - 1)]);
}

/**
 * ShotDirector: decides what the viewer sees in each shot of a scene, why,
 * with which characters and props, how the camera moves, and whether 2.5D
 * is enough. Rules encode documentary grammar (establish → closer → detail)
 * and the newsroom's safety rules (no minors, no depiction of restricted
 * events, silhouettes for sensitive scenes).
 */
export function directScene(scene: SceneInput, ctx: DirectorContext, position: { isFirst: boolean; isLast: boolean }): ShotPlan[] {
  const placeText = `${scene.location} ${scene.background}`;
  const restricted = scene.safetyLevel === "RESTRICTED";
  const sensitive = scene.safetyLevel === "SENSITIVE";
  const sceneText = [scene.narratorText, ...scene.dialogue.map((d) => d.text)].join(" ");

  let category: LocationCategory = detectEnvironment(placeText, scene.location);
  let substitute: ShotPlan["substitute"];
  if (restricted) {
    const topics = scene.safetyReasons.map((r) => r.split(" ")[0]);
    const sub = pickSubstitute(topics, scene.sceneNumber, ctx.sensitiveTopics);
    substitute = { id: sub.id, description: sub.description };
    category = "SUBSTITUTE";
  }
  const env = getEnvironment(category);

  // Characters on screen: never minors; none in restricted scenes.
  const drawable = ctx.characters.filter((c) => !c.isMinor);
  const sceneChars = restricted ? [] : scene.characters.filter((k) => drawable.some((c) => c.key === k));
  const speakerKey = scene.dialogue.find((d) => sceneChars.includes(d.speakerKey) || drawable.some((c) => c.key === d.speakerKey))?.speakerKey;
  const focusKey = speakerKey ?? sceneChars[0];
  const focus = drawable.find((c) => c.key === focusKey);

  let templates: ShotTemplate[];
  let maxShots = 3;
  if (restricted) templates = RESTRICTED;
  else if (position.isFirst) {
    templates = OPENING;
    maxShots = 2;
  } else if (position.isLast) {
    templates = CLOSING;
    maxShots = 1;
  } else if (speakerKey) templates = QUOTE;
  else if (sceneChars.length > 0) templates = NARRATIVE;
  else templates = NARRATIVE_NO_PEOPLE;

  const count = Math.min(templates.length, shotCountFor(scene.durationSeconds, maxShots));
  const chosen = templates.slice(0, count);
  const weightSum = chosen.reduce((s, t) => s + t.weight, 0);
  const narrationParts = splitNarration(scene.narratorText, count);
  const propKeys = detectProps(sceneText, env.props);
  const insertProp = propKeys.find((k) => getProp(k)?.placement === "insert") ?? propKeys[0];

  const shots: ShotPlan[] = chosen.map((tpl, i) => {
    const withChars = tpl.withCharacters && sceneChars.length > 0;
    let characterKeys = withChars ? (tpl.type === "MEDIUM" || tpl.type === "CLOSE_UP" ? [focusKey!] : sceneChars.slice(0, 3)) : [];
    characterKeys = characterKeys.filter(Boolean);
    const expressions: Record<string, Expression> = {};
    const poses: Record<string, Pose> = {};
    for (const key of characterKeys) {
      const speaks = key === speakerKey;
      expressions[key] = chooseExpression(sceneText, scene.emotionalTone);
      poses[key] = speaks ? "talking" : choosePose(narrationParts[i] ?? sceneText, false);
    }
    // Close-ups must never be crying/shocked caricatures in news: soften.
    for (const key of Object.keys(expressions)) {
      if (tpl.type === "CLOSE_UP" && (expressions[key] === "shocked" || expressions[key] === "excited")) expressions[key] = "worried";
    }

    const shotText = `${narrationParts[i] ?? ""} ${i === count - 1 ? scene.dialogue.map((d) => d.text).join(" ") : ""}`;
    const motion = analyzeMotion({ text: shotText, hasCharacters: characterKeys.length > 0, safetyLevel: scene.safetyLevel, i2vAvailable: ctx.i2vAvailable });
    let camera = tpl.camera;
    if (motion.walk && characterKeys.length > 0 && tpl.type === "WIDE") camera = "tracking";
    if (scene.emotionalTone === "somber" && camera === "dolly_in") camera = "slow_zoom";

    const shotPropsFor = tpl.insertProp ? (insertProp ? [insertProp] : []) : withChars && (tpl.type === "WIDE" || tpl.type === "ESTABLISHING") ? propKeys.filter((k) => getProp(k)?.placement === "ground").slice(0, 1) : [];
    const shotProps = shotPropsFor;
    // A bag placed on the ground beside the character is not also held.
    if (shotProps.some((k) => k === "luggage" || k === "bag")) for (const k of Object.keys(poses)) if (poses[k] === "holding_bag") poses[k] = "standing";
    const c: Ctx = { scene, place: env.label.toLowerCase(), focusName: focus?.displayName, propName: shotProps[0] ? getProp(shotProps[0])?.name : undefined, substitute: substitute?.description };

    return {
      shotNumber: i + 1,
      shotType: tpl.type,
      durationSeconds: Math.max(MIN_SHOT_SECONDS, (scene.durationSeconds * tpl.weight) / weightSum),
      viewerSees: tpl.viewerSees(c),
      emotionalPurpose: tpl.purpose,
      locationCategory: category,
      substitute,
      characterKeys,
      focusCharacterKey: characterKeys.includes(focusKey ?? "") ? focusKey : characterKeys[0],
      expressions,
      poses,
      propKeys: shotProps,
      cameraMovement: camera,
      cameraIntensity: tpl.intensity,
      narration: narrationParts[i] ?? "",
      // Quotes play after the narration in the audio timeline, so they belong to the scene's last shot.
      dialogue: i === count - 1 ? scene.dialogue : [],
      silhouettes: sensitive,
      motion,
      textBasis: shotText.trim(),
    };
  });
  return shots;
}
