import { PrismaClient } from "@prisma/client";
import { LanguageScriptContent, LanguageSceneLines, LintFlag, MasterScene } from "../types";
import { TranslationProvider, LocalizeItem } from "../providers/translation/TranslationProvider";
import { LLMProvider } from "../providers/llm/LLMProvider";
import { contentHash } from "../hashing";
import { cachedAi } from "../cache";
import { getLanguageProfile } from "./languageProfiles";
import { lintRegister } from "./registerLint";
import { checkNumberParity } from "./factConsistency";
import { estimateScriptSeconds } from "../content/durationPlanner";
import { lintAllegations } from "../safety/factCheck";

export interface LanguageScriptInput {
  title: string;
  masterLanguage: string;
  targetLanguage: string;
  scenes: Pick<MasterScene, "sceneNumber" | "narratorText" | "dialogue" | "onScreenText">[];
  previous?: LanguageScriptContent | null;
  glossary: { term: string; rendering?: string }[];
  context: string;
  maxSeconds: number;
}

export interface LanguageScriptResult {
  content: LanguageScriptContent;
  lintFlags: LintFlag[];
  estimatedSeconds: number;
  reusedScenes: number;
  localizedScenes: number;
  provider: string;
}

export function masterSceneHash(scene: Pick<MasterScene, "narratorText" | "dialogue" | "onScreenText">): string {
  return contentHash(scene.narratorText, scene.dialogue.map((d) => [d.speakerKey, d.text, d.statementType]), scene.onScreenText ?? "");
}

const CONDENSE_SYSTEM = `You condense narration for a timed news video. For each item, rewrite it shorter in the SAME language
while keeping every fact (names, places, dates, numbers, attributions such as "police said", "allegedly"). Formal
news register, no slang, no dramatisation. Return ONLY JSON: {"texts": {"<id>": "<shorter text>"}}`;

/**
 * Stage: MULTILINGUAL SCRIPT GENERATION for one language. Localises only
 * the scenes whose master text changed since the previous version (or
 * that were never localised); scenes an editor fixed by hand are kept
 * unless their master scene changed. Then lints register, number parity
 * and allegation hedging, and condenses (LLM) if this language runs past
 * the duration ceiling — so the voice never has to be sped up.
 */
export async function generateLanguageScript(
  prisma: PrismaClient,
  input: LanguageScriptInput,
  translation: TranslationProvider,
  llm?: LLMProvider | null
): Promise<LanguageScriptResult> {
  const lang = input.targetLanguage;
  getLanguageProfile(lang);

  const previousByScene = new Map((input.previous?.scenes ?? []).map((s) => [s.sceneNumber, s]));
  const scenes: LanguageSceneLines[] = [];
  const items: LocalizeItem[] = [];
  let reused = 0;

  for (const scene of input.scenes) {
    const sourceHash = masterSceneHash(scene);
    const prev = previousByScene.get(scene.sceneNumber);
    if (prev && prev.sourceHash === sourceHash && input.previous && (prev.edited || !input.previous.untranslated)) {
      scenes.push(prev);
      reused++;
      continue;
    }
    if (lang === input.masterLanguage) {
      scenes.push({ sceneNumber: scene.sceneNumber, narratorText: scene.narratorText, dialogue: scene.dialogue.map((d) => ({ ...d })), onScreenText: scene.onScreenText, sourceHash });
      continue;
    }
    scenes.push({ sceneNumber: scene.sceneNumber, narratorText: "", dialogue: scene.dialogue.map((d) => ({ ...d, text: "" })), onScreenText: scene.onScreenText, sourceHash });
    items.push({ id: `${scene.sceneNumber}.n`, text: scene.narratorText, kind: "narration" });
    scene.dialogue.forEach((d, i) => items.push({ id: `${scene.sceneNumber}.d${i}`, text: d.text, kind: "dialogue" }));
    if (scene.onScreenText) items.push({ id: `${scene.sceneNumber}.o`, text: scene.onScreenText, kind: "on-screen" });
  }

  let title = input.previous?.title && reused === input.scenes.length ? input.previous.title : input.title;
  let untranslated = false;
  const needsTranslation = items.length > 0 || (lang !== input.masterLanguage && title === input.title);
  if (needsTranslation && lang !== input.masterLanguage) {
    items.push({ id: "title", text: input.title, kind: "title" });
    const request = { sourceLanguage: input.masterLanguage, targetLanguage: lang, items, glossary: input.glossary, context: input.context };
    const result =
      translation.key === "passthrough"
        ? await translation.localize(request)
        : await cachedAi(prisma, ["localize", translation.key, request], () => translation.localize(request));
    untranslated = result.untranslated;
    title = result.texts.title ?? input.title;
    for (const scene of scenes) {
      if (scene.narratorText !== "" || !items.some((i) => i.id === `${scene.sceneNumber}.n`)) continue;
      scene.narratorText = result.texts[`${scene.sceneNumber}.n`] ?? "";
      scene.dialogue = scene.dialogue.map((d, i) => ({ ...d, text: result.texts[`${scene.sceneNumber}.d${i}`] ?? "" }));
      if (scene.onScreenText) scene.onScreenText = result.texts[`${scene.sceneNumber}.o`] ?? scene.onScreenText;
    }
  }

  // Condense if this language runs long (languages differ in spoken length).
  let estimatedSeconds = estimateScriptSeconds(scenes, lang);
  const lintFlags: LintFlag[] = [];
  if (estimatedSeconds > input.maxSeconds) {
    if (llm?.isConfigured() && !untranslated) {
      const longest = [...scenes].sort((a, b) => b.narratorText.length - a.narratorText.length).slice(0, Math.ceil(scenes.length / 2));
      const condenseItems = longest.map((s) => ({ id: String(s.sceneNumber), text: s.narratorText }));
      try {
        const condensed = await cachedAi(prisma, ["condense", llm.model, lang, condenseItems], () =>
          llm.completeJson<{ texts: Record<string, string> }>({ system: CONDENSE_SYSTEM, prompt: JSON.stringify({ language: lang, items: condenseItems }), maxTokens: 6000 })
        );
        for (const s of longest) if (condensed.texts?.[String(s.sceneNumber)]) s.narratorText = condensed.texts[String(s.sceneNumber)];
        estimatedSeconds = estimateScriptSeconds(scenes, lang);
      } catch (err) {
        lintFlags.push({ rule: "CONDENSE_FAILED", severity: "WARNING", suggestion: (err as Error).message });
      }
    }
    if (estimatedSeconds > input.maxSeconds) {
      lintFlags.push({ rule: "OVER_DURATION", severity: "BLOCKING", excerpt: `${Math.round(estimatedSeconds)}s`, suggestion: `Shorten this language's narration to under ${input.maxSeconds}s.` });
    }
  }

  const masterByScene = new Map(input.scenes.map((s) => [s.sceneNumber, s]));
  for (const scene of scenes) {
    const all = [scene.narratorText, ...scene.dialogue.map((d) => d.text)].join(" ");
    if (!scene.narratorText.trim()) lintFlags.push({ rule: "EMPTY_NARRATION", severity: "BLOCKING", sceneNumber: scene.sceneNumber });
    lintFlags.push(...lintRegister(all, lang, scene.sceneNumber));
    const master = masterByScene.get(scene.sceneNumber);
    if (master && lang !== input.masterLanguage) {
      lintFlags.push(...checkNumberParity([master.narratorText, ...master.dialogue.map((d) => d.text)].join(" "), all, scene.sceneNumber));
    }
    if (lang === "en") lintFlags.push(...lintAllegations(scene.narratorText, scene.sceneNumber));
  }
  if (untranslated) lintFlags.push({ rule: "UNTRANSLATED", severity: "BLOCKING", suggestion: "No translation provider configured — this is master-language text. Configure ANTHROPIC_API_KEY or GOOGLE_TRANSLATE_API_KEY." });

  return {
    content: { title, languageCode: lang, scenes, untranslated: untranslated || undefined },
    lintFlags,
    estimatedSeconds: Math.round(estimatedSeconds),
    reusedScenes: reused,
    localizedScenes: input.scenes.length - reused,
    provider: lang === input.masterLanguage ? "master" : translation.key,
  };
}
