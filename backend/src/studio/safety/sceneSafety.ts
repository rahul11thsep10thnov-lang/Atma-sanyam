import { SafetyLevelKey } from "../types";

export interface TopicRule {
  topic: string;
  pattern: RegExp;
  /** Level of any scene whose content touches this topic. */
  level: Exclude<SafetyLevelKey, "SAFE">;
}

export const TOPIC_RULES: TopicRule[] = [
  { topic: "suicide", pattern: /\b(suicide|took (?:her|his|their) own life|hanged (?:herself|himself|themselves)|found hanging|self-harm|consumed poison|killed (?:herself|himself))\b/i, level: "RESTRICTED" },
  { topic: "sexual_violence", pattern: /\b(rape[ds]?|raping|sexual(?:ly)? assault(?:ed)?|molest(?:ed|ation)?|sexual harassment|POCSO|outrag(?:ed|ing) (?:the )?modesty)\b/i, level: "RESTRICTED" },
  { topic: "graphic_violence", pattern: /\b(stabb(?:ed|ing)|hacked|beheaded|dismembered|chopped|blood(?:ied|y)?|slit|burnt alive|set (?:her|him|them) on fire|set ablaze|acid attack|strangled|mutilated|gunshot|shot dead)\b/i, level: "RESTRICTED" },
  { topic: "dead_body", pattern: /\b(body was found|bodies were found|dead body|corpse|post-?mortem|autopsy|found dead)\b/i, level: "RESTRICTED" },
  { topic: "nudity", pattern: /\b(naked|nude|undress(?:ed)?|obscene (?:video|photo)s?)\b/i, level: "RESTRICTED" },
  { topic: "weapons", pattern: /\b(knife|knives|pistol|gun|firearm|axe|sickle|machete|iron rod|country-made)\b/i, level: "RESTRICTED" },
  { topic: "death", pattern: /\b(died|death|dead|murder(?:ed)?|killed|homicide|deceased)\b/i, level: "SENSITIVE" },
  { topic: "violence", pattern: /\b(assault(?:ed)?|beat(?:en|ing)?|thrash(?:ed)?|attack(?:ed)?|torture[d]?|domestic violence|harass(?:ed|ment)|cruelty|injur(?:ed|ies))\b/i, level: "SENSITIVE" },
  { topic: "dowry", pattern: /\b(dowry)\b/i, level: "SENSITIVE" },
  { topic: "minors", pattern: /\b(minor|child(?:ren)?|infant|POCSO|juvenile|(?:[1-9]|1[0-7])-year-old)\b/i, level: "SENSITIVE" },
  { topic: "arrest", pattern: /\b(arrest(?:ed)?|detain(?:ed)?|custody|jail)\b/i, level: "SENSITIVE" },
];

export function detectTopics(text: string): TopicRule[] {
  return TOPIC_RULES.filter((r) => r.pattern.test(text));
}

/** Story-level: which sensitive topics does the article touch? */
export function detectSensitiveTopics(text: string): { topics: string[]; isSensitive: boolean } {
  const topics = detectTopics(text).map((r) => r.topic);
  const isSensitive = topics.some((t) => t !== "arrest");
  return { topics, isSensitive };
}

export interface SceneSafetyInput {
  narratorText: string;
  dialogue: { text: string }[];
  background: string;
  props: string[];
  animationRequirements: string;
}

export interface SceneSafetyResult {
  level: SafetyLevelKey;
  reasons: string[];
  topics: string[];
}

/**
 * Stage: CONTENT SAFETY ANALYSIS (per scene). SAFE scenes are illustrated
 * directly. SENSITIVE scenes are illustrated with restraint (no violence
 * shown, no identifiable faces). RESTRICTED scenes never show the event —
 * their visual is replaced by a contextual substitute while the narration
 * continues unchanged.
 */
export function classifyScene(scene: SceneSafetyInput): SceneSafetyResult {
  const text = [scene.narratorText, ...scene.dialogue.map((d) => d.text), scene.background, scene.props.join(" "), scene.animationRequirements].join(" \n ");
  const matches = detectTopics(text);
  if (matches.length === 0) return { level: "SAFE", reasons: [], topics: [] };
  const level: SafetyLevelKey = matches.some((m) => m.level === "RESTRICTED") ? "RESTRICTED" : "SENSITIVE";
  return {
    level,
    topics: matches.map((m) => m.topic),
    reasons: matches.map((m) => `${m.topic} (${m.level.toLowerCase()})`),
  };
}
