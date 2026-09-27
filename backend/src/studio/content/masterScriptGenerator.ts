import { ArticleAnalysis, DialogueLine, ExtractedCharacter, MasterScene, MasterScript, StatementTypeKey } from "../types";
import { LLMProvider } from "../providers/llm/LLMProvider";
import { SCENE_MAX_SECONDS } from "../config";
import { estimateSpeechSeconds } from "../language/languageProfiles";
import { SETTING_KEYWORDS } from "./locationExtractor";
import { compressToFit, estimateSceneSeconds, PlannedSentence } from "./durationPlanner";
import { detectTopics } from "../safety/sceneSafety";
import { checkDialogue, lintAllegations } from "../safety/factCheck";
import { SUICIDE_HELPLINE_TEXT } from "../safety/safeVisualLibrary";

export interface MasterScriptInput {
  title: string;
  analysis: ArticleAnalysis;
  targetSeconds: number;
  maxSeconds: number;
  minSeconds: number;
  languageCode: string;
  sourceName?: string | null;
  allowDramatizedReconstruction: boolean;
  sceneNotes?: string | null;
}

export interface MasterScriptOutput {
  script: MasterScript;
  warnings: string[];
}

const AMBIENT_BY_SETTING: Record<string, string> = {
  "home interior": "room-tone",
  "police station": "office-murmur",
  "courtroom exterior": "street-murmur",
  "hospital exterior": "hospital-hum",
  "village lane": "rural-birds",
  farmland: "rural-wind",
  "city street": "traffic-distant",
  "office exterior": "street-murmur",
  "railway station": "station-murmur",
};
const PROPS_BY_SETTING: Record<string, string[]> = {
  "home interior": ["simple furniture", "window with curtains"],
  "police station": ["signboard (unreadable)", "parked police vehicle"],
  "courtroom exterior": ["court building pillars", "steps"],
  "hospital exterior": ["hospital signboard (unreadable)", "parked vehicles"],
  "village lane": ["mud-and-brick houses", "trees"],
  farmland: ["crop fields", "boundary stones"],
  "city street": ["shops with shutters", "parked two-wheelers"],
  "office exterior": ["government office building", "notice board"],
  "railway station": ["platform", "benches"],
};
const CAMERA_MOVES = ["slow push-in", "slow pan right", "static wide shot", "slow pan left", "slow pull-out"];
const TIME_WORDS: [RegExp, MasterScene["timeOfDay"]][] = [
  [/\b(night|midnight|late evening)\b|\b\d{1,2}(:\d{2})?\s?p\.?m\.?\b/i, "night"],
  [/\b(evening|dusk|sunset)\b/i, "evening"],
  [/\b(afternoon|noon)\b/i, "afternoon"],
  [/\b(morning|dawn|sunrise)\b|\b\d{1,2}(:\d{2})?\s?a\.?m\.?\b/i, "morning"],
];

function detectSetting(sentence: string, fallback: string): string {
  return SETTING_KEYWORDS.find((s) => s.keywords.test(sentence))?.setting ?? fallback;
}

function detectTime(sentence: string, fallback: MasterScene["timeOfDay"]): MasterScene["timeOfDay"] {
  return TIME_WORDS.find(([re]) => re.test(sentence))?.[1] ?? fallback;
}

function toneFor(text: string): string {
  const topics = detectTopics(text).map((t) => t.topic);
  if (topics.some((t) => ["death", "suicide", "dead_body", "graphic_violence"].includes(t))) return "somber";
  if (topics.some((t) => ["violence", "sexual_violence", "dowry"].includes(t))) return "serious";
  if (/\b(police|court|FIR|arrest|investigation)\b/i.test(text)) return "neutral-formal";
  return "neutral";
}

function charactersIn(text: string, characters: ExtractedCharacter[]): string[] {
  const lower = text.toLowerCase();
  return characters
    .filter((c) => [c.realName, c.displayName.replace(/^the\s/, ""), c.role].some((n) => n && n.length > 2 && lower.includes(n.toLowerCase())))
    .map((c) => c.key);
}

function matchSpeaker(attributedTo: string | undefined, characters: ExtractedCharacter[]): ExtractedCharacter | undefined {
  if (!attributedTo) return undefined;
  const a = attributedTo.toLowerCase().replace(/^the\s/, "");
  return characters.find(
    (c) => c.speaks && !c.anonymized && ((c.realName && (a.includes(c.realName.toLowerCase()) || c.realName.toLowerCase().includes(a))) || a.includes(c.role.toLowerCase()))
  );
}

interface Beat {
  narratorText: string;
  dialogue: DialogueLine[];
  sourceText: string;
}

/**
 * Stage: MASTER STORY SCRIPT + SCENE BREAKDOWN (deterministic template).
 * Builds the factual master script from the analysed timeline: an
 * establishing scene, background, events in order, direct quotes voiced by
 * the quoted person, the current status and a sourcing close. Uses only
 * article sentences (redacted, hedged) — nothing is invented and nothing is
 * padded; short articles give short videos.
 */
export function generateTemplateMasterScript(input: MasterScriptInput): MasterScriptOutput {
  const { analysis } = input;
  const warnings: string[] = [];
  const lang = input.languageCode;

  const quoteFacts = analysis.facts.filter((f) => f.type === "QUOTE");
  const keyTerms = analysis.facts
    .filter((f) => f.isKeyFact && ["PERSON_NAME", "DATE", "AGE", "MONEY", "LOCATION"].includes(f.type))
    .map((f) => f.value.toLowerCase());

  // 1. Candidate narrative sentences in timeline order, with priorities.
  const planned: PlannedSentence[] = analysis.timeline.map((t) => {
    const lower = t.sourceSentence.toLowerCase();
    const isKey = t.isAllegation || /\b(police|court|FIR|arrest|complaint)\b/i.test(t.sourceSentence) || keyTerms.some((k) => lower.includes(k));
    return { text: t.sourceSentence, isKey, priority: t.isAllegation ? 2 : /\b(claim|according to (?:the )?(?:family|relatives|neighbours))\b/i.test(t.sourceSentence) ? 0 : 1 };
  });
  // Quoted sentences too (they are not in the timeline).
  for (const q of quoteFacts) {
    if (q.sourceSentence && !planned.some((p) => p.text === q.sourceSentence)) {
      // Place the quote right after the narrative sentence that precedes it in the article.
      const idx = analysis.cleanedText.indexOf(q.sourceSentence);
      let after = -1;
      planned.forEach((p, i) => {
        const pos = analysis.cleanedText.indexOf(p.text);
        if (pos < idx && (after === -1 || pos > analysis.cleanedText.indexOf(planned[after].text))) after = i;
      });
      planned.splice(after + 1, 0, { text: q.sourceSentence, isKey: false, priority: 1 });
    }
  }

  const opening = `This report is from ${analysis.location.label}.`;
  const hasCourtFinding = analysis.facts.some((f) => /\b(convicted|found guilty|acquitted|sentenced)\b/i.test(f.value));
  const hasAllegations = analysis.facts.some((f) => f.type === "ALLEGATION");
  const closingParts = [
    hasAllegations && !hasCourtFinding ? "The allegations have not been proven in court." : null,
    input.sourceName ? `This account is based on reporting by ${input.sourceName}.` : "This account is based on published news reports.",
  ].filter((x): x is string => !!x);
  const closing = closingParts.join(" ");
  const overhead = estimateSpeechSeconds(`${opening} ${closing}`, lang) + 3;

  const compression = compressToFit(planned, input.maxSeconds, lang, overhead);
  if (compression.dropped.length > 0) warnings.push(`Condensed narration: dropped ${compression.dropped.length} non-essential sentence(s) to stay within ${input.maxSeconds}s.`);
  if (!compression.fits) warnings.push(`Key facts alone need about ${Math.round(compression.estimatedSeconds)}s, above the ${input.maxSeconds}s limit — needs an editor.`);
  if (compression.estimatedSeconds < input.minSeconds) {
    warnings.push(`The article supports about ${Math.round(compression.estimatedSeconds)}s of narration, below the ${input.minSeconds}s minimum for this format. Not padded — consider the short format or a fuller article.`);
  }

  // 2. Turn sentences into beats (narration + optional direct-quote dialogue), hedging where needed.
  const beats: Beat[] = [];
  for (const sentence of compression.kept.map((k) => k.text)) {
    const quote = quoteFacts.find((q) => q.sourceSentence === sentence);
    const speaker = quote ? matchSpeaker(quote.attributedTo, analysis.characters) : undefined;
    if (quote && speaker) {
      const lead = `${speaker.realName ?? speaker.displayName}${speaker.isOfficial && speaker.role !== "person named in the report" ? `, the ${speaker.role},` : ""} said:`;
      beats.push({
        narratorText: lead.charAt(0).toUpperCase() + lead.slice(1),
        dialogue: [{ speakerKey: speaker.key, text: quote.value, statementType: "DIRECT_QUOTE" as StatementTypeKey }],
        sourceText: sentence,
      });
      continue;
    }
    const unhedged = lintAllegations(sentence).some((f) => f.rule === "UNHEDGED_ALLEGATION");
    beats.push({ narratorText: unhedged ? `According to the report, ${sentence.charAt(0).toLowerCase()}${sentence.slice(1)}` : sentence, dialogue: [], sourceText: sentence });
  }

  // 3. Group beats into scenes of ~8–16 seconds, breaking on setting changes.
  const mainSetting = analysis.location.settings.find((s) => s !== "police station") ?? analysis.location.settings[0] ?? "city street";
  const establishingSetting = mainSetting === "police station" ? "city street" : mainSetting;
  const scenes: MasterScene[] = [];
  let timeOfDay: MasterScene["timeOfDay"] = "unspecified";

  const pushScene = (group: Beat[], setting: string, extra: Partial<MasterScene> = {}) => {
    const text = group.map((b) => b.sourceText).join(" ");
    const narratorText = group.map((b) => b.narratorText).join(" ");
    const dialogue = group.flatMap((b) => b.dialogue);
    timeOfDay = detectTime(text, timeOfDay);
    const n = scenes.length + 1;
    const topics = detectTopics(text).map((t) => t.topic);
    const scene: MasterScene = {
      sceneNumber: n,
      durationSeconds: 0,
      location: `${setting}, ${analysis.location.label}`,
      timeOfDay,
      characters: charactersIn(text, analysis.characters),
      narratorText,
      dialogue,
      emotionalTone: toneFor(text),
      cameraDirection: CAMERA_MOVES[(n - 1) % CAMERA_MOVES.length],
      background: `${setting} in ${analysis.location.label}`,
      props: PROPS_BY_SETTING[setting] ?? [],
      animationRequirements: "Subtle motion only: slow camera move and soft light changes. People appear as stylised, non-identifiable figures.",
      audioRequirements: { ambient: AMBIENT_BY_SETTING[setting] ?? "room-tone", sfx: [] },
      contentRestrictions: topics.length > 0 ? [`Do not depict: ${topics.join(", ")}`] : [],
      transition: "dissolve",
      ...extra,
    };
    scene.durationSeconds = Math.round(estimateSceneSeconds(scene, lang) * 10) / 10;
    scenes.push(scene);
  };

  pushScene([{ narratorText: opening, dialogue: [], sourceText: opening }], establishingSetting, {
    onScreenText: analysis.location.label,
    transition: "fade",
    cameraDirection: "slow aerial-style push-in over the area",
  });

  let group: Beat[] = [];
  let groupSetting = mainSetting;
  const flush = () => {
    if (group.length > 0) pushScene(group, groupSetting);
    group = [];
  };
  for (const beat of beats) {
    const setting = detectSetting(beat.sourceText, groupSetting);
    const groupSeconds = group.reduce((s, b) => s + estimateSpeechSeconds([b.narratorText, ...b.dialogue.map((d) => d.text)].join(" "), lang), 0);
    const beatSeconds = estimateSpeechSeconds([beat.narratorText, ...beat.dialogue.map((d) => d.text)].join(" "), lang);
    // A voiced quote gets its own scene so narration → quote plays in order.
    if (group.length > 0 && (beat.dialogue.length > 0 || setting !== groupSetting || groupSeconds + beatSeconds > SCENE_MAX_SECONDS - 4)) flush();
    groupSetting = setting;
    group.push(beat);
    if (beat.dialogue.length > 0) flush();
  }
  flush();

  const suicideStory = analysis.sensitiveTopics.includes("suicide");
  timeOfDay = "afternoon";
  pushScene([{ narratorText: closing, dialogue: [], sourceText: closing }], establishingSetting, {
    transition: "fade",
    timeOfDay: "afternoon",
    cameraDirection: "slow pull-out",
    emotionalTone: "neutral",
    onScreenText: suicideStory ? SUICIDE_HELPLINE_TEXT : undefined,
  });

  if (input.sceneNotes) warnings.push("Editor scene notes are applied by the LLM script writer only; review scenes manually.");
  warnings.push("Template script reuses the article's own sentences — enable the LLM provider or edit the wording before publishing third-party copyrighted text.");
  return { script: { title: input.title, language: lang, scenes, provider: "template" }, warnings };
}

const LLM_SYSTEM = `You are the lead writer for a calm, factual, animated explainer-news channel in India.
Write a MASTER SCRIPT for one story as structured scenes. Absolute rules:
- Use ONLY the supplied facts and timeline. Never invent names, dates, numbers, places, motives, quotes or details.
- Keep allegations as allegations ("police said", "according to the complaint", "allegedly"). Never state guilt unless a court conviction is in the facts.
- Formal, neutral, respectful news register. No slang, abuse, colloquialisms, memes, sensationalism or exaggeration.
- Narration is spoken by the narrator. Characters speak ONLY verbatim direct quotes from the supplied quotes list
  (statementType "DIRECT_QUOTE", speakerKey = that character's key). Reported statements are narrated, not voiced.
- Reconstructed dialogue is allowed ONLY if the input says allowReconstruction=true, only for anonymised characters,
  and must use statementType "RECONSTRUCTED_DIALOGUE".
- Never name characters marked anonymized; use their displayName.
- Scenes of 5–20 seconds; total narration must fit the target duration; condense wording but keep every key fact.
- Scene 1 establishes the place; the last scene states the sourcing (and that allegations are unproven when applicable).
- Visual fields describe calm, non-graphic illustrations. Never describe violence, bodies, blood, weapons in use, nudity or self-harm.
Return ONLY JSON: {"title": "...", "scenes": [{"sceneNumber": 1, "durationSeconds": 12, "location": "...",
"timeOfDay": "morning|afternoon|evening|night|unspecified", "characters": ["CHAR_01"], "narratorText": "...",
"dialogue": [{"speakerKey": "CHAR_02", "text": "...", "statementType": "DIRECT_QUOTE"}], "emotionalTone": "...",
"cameraDirection": "...", "background": "...", "props": ["..."], "animationRequirements": "...",
"audioRequirements": {"ambient": "room-tone|office-murmur|traffic-distant|rural-birds|hospital-hum|street-murmur", "sfx": []},
"contentRestrictions": ["..."], "transition": "cut|fade|dissolve|slide", "onScreenText": "optional short caption"}]}`;

/**
 * LLM master-script writer. Its output is validated (quotes verbatim,
 * dialogue rules, allegation hedging, duration) and the template script is
 * used instead if validation finds blocking problems.
 */
export async function generateMasterScript(input: MasterScriptInput, llm?: LLMProvider | null): Promise<MasterScriptOutput> {
  const template = () => generateTemplateMasterScript(input);
  if (!llm?.isConfigured()) return template();

  const { analysis } = input;
  try {
    const result = await llm.completeJson<{ title: string; scenes: MasterScene[] }>({
      system: LLM_SYSTEM,
      prompt: JSON.stringify({
        title: input.title,
        language: input.languageCode,
        targetDurationSeconds: input.targetSeconds,
        maxDurationSeconds: input.maxSeconds,
        allowReconstruction: input.allowDramatizedReconstruction,
        sourceName: input.sourceName ?? null,
        location: analysis.location,
        sensitiveTopics: analysis.sensitiveTopics,
        characters: analysis.characters.map((c) => ({ key: c.key, displayName: c.displayName, role: c.role, anonymized: c.anonymized, isOfficial: c.isOfficial, speaks: c.speaks })),
        facts: analysis.facts.filter((f) => f.type !== "EVENT").map((f) => ({ type: f.type, value: f.value, status: f.verificationStatus, attributedTo: f.attributedTo })),
        timeline: analysis.timeline,
        editorSceneNotes: input.sceneNotes ?? null,
      }),
      maxTokens: 8000,
    });

    const warnings: string[] = [];
    const scenes: MasterScene[] = (result.scenes ?? []).map((s, i) => ({
      ...s,
      sceneNumber: i + 1,
      characters: Array.isArray(s.characters) ? s.characters : [],
      dialogue: Array.isArray(s.dialogue) ? s.dialogue : [],
      props: Array.isArray(s.props) ? s.props : [],
      contentRestrictions: Array.isArray(s.contentRestrictions) ? s.contentRestrictions : [],
      audioRequirements: s.audioRequirements ?? { ambient: "room-tone", sfx: [] },
      timeOfDay: s.timeOfDay ?? "unspecified",
      transition: s.transition ?? "dissolve",
      durationSeconds: 0,
    }));
    if (scenes.length < 2) throw new Error("LLM returned too few scenes");

    const blocking = scenes.flatMap((s) => [
      ...checkDialogue(s.dialogue, analysis.cleanedText, analysis.characters, input.allowDramatizedReconstruction).filter((f) => f.severity === "BLOCKING"),
      ...lintAllegations(s.narratorText, s.sceneNumber).filter((f) => f.severity === "BLOCKING"),
    ]);
    if (blocking.length > 0) throw new Error(`LLM script failed validation: ${blocking.map((b) => b.rule).join(", ")}`);

    for (const s of scenes) s.durationSeconds = Math.round(estimateSceneSeconds(s, input.languageCode) * 10) / 10;
    const total = scenes.reduce((a, s) => a + s.durationSeconds, 0);
    if (total > input.maxSeconds) warnings.push(`LLM script estimated at ${Math.round(total)}s, above ${input.maxSeconds}s — languages will be condensed; review.`);
    if (analysis.sensitiveTopics.includes("suicide")) scenes[scenes.length - 1].onScreenText = SUICIDE_HELPLINE_TEXT;
    return { script: { title: result.title || input.title, language: input.languageCode, scenes, provider: `llm:${llm.key}` }, warnings };
  } catch (err) {
    const fallback = template();
    fallback.warnings.unshift(`LLM master script unavailable, used template: ${(err as Error).message}`);
    return fallback;
  }
}

