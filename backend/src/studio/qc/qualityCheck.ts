import { MAX_VIDEO_SECONDS } from "../config";
import { DialogueLine, LanguageScriptContent, LintFlag, QcIssue, QcReport, SafetyLevelKey } from "../types";
import { checkDialogue, findUnsupportedNames, findUnsupportedNumbers, lintAllegations } from "../safety/factCheck";
import { lintRegister } from "../language/registerLint";
import { NARRATOR_SPEAKER_KEY } from "../media/voiceCatalog";

export interface QcInput {
  articleText: string;
  masterLanguage: string;
  allowReconstruction: boolean;
  characters: { key: string; displayName: string; realName?: string | null; isRealPerson: boolean; anonymized: boolean }[];
  masterScenes: {
    sceneNumber: number;
    narratorText: string;
    dialogue: DialogueLine[];
    safetyLevel: SafetyLevelKey;
    hasSubstituteVisual: boolean;
    hasVisualAsset: boolean;
    visualIsPlaceholder: boolean;
  }[];
  voiceAssignments: Record<string, string>; // speakerKey -> voice code
  languages: {
    languageCode: string;
    content: LanguageScriptContent;
    lintFlags: LintFlag[];
    timeline?: { totalSeconds: number; scenes: { sceneNumber: number; startSeconds: number; durationSeconds: number }[] };
    segments: { sceneNumber: number; lineIndex: number; speakerKey: string; voiceCode: string; startSeconds: number | null; durationSeconds: number; isPlaceholder: boolean }[];
    subtitleCueCount?: number;
    renderDurationSeconds?: number | null;
  }[];
}

type CheckName =
  | "duration_limit"
  | "no_prohibited_visuals"
  | "no_slang_or_abuse"
  | "voice_consistency"
  | "audio_video_sync"
  | "no_missing_or_duplicated_content"
  | "no_hallucinated_facts"
  | "no_fabricated_quotes"
  | "allegations_attributed"
  | "real_voices_and_translations";

/**
 * Stage: FINAL QUALITY CHECK (brief §31). Runs every check; any BLOCKING
 * issue makes the story NEEDS_REVIEW, which blocks publishing until an
 * editor fixes it or explicitly overrides with a note.
 */
export function runQualityCheck(input: QcInput): QcReport {
  const issues: QcIssue[] = [];
  const failed = new Set<CheckName>();
  const add = (check: CheckName, issue: Omit<QcIssue, "check">) => {
    issues.push({ check, ...issue });
    if (issue.severity === "BLOCKING") failed.add(check);
  };

  // Duration
  for (const lang of input.languages) {
    const total = lang.renderDurationSeconds ?? lang.timeline?.totalSeconds;
    if (total !== undefined && total !== null && total > MAX_VIDEO_SECONDS) {
      add("duration_limit", { severity: "BLOCKING", languageCode: lang.languageCode, message: `Video is ${Math.round(total)}s — over the ${MAX_VIDEO_SECONDS}s limit.` });
    }
  }

  // Visual safety
  for (const scene of input.masterScenes) {
    if (scene.safetyLevel === "RESTRICTED" && !scene.hasSubstituteVisual) {
      add("no_prohibited_visuals", { severity: "BLOCKING", sceneNumber: scene.sceneNumber, message: "Restricted scene is not using a safe substitute visual." });
    }
    if (!scene.hasVisualAsset) add("no_missing_or_duplicated_content", { severity: "BLOCKING", sceneNumber: scene.sceneNumber, message: "Scene has no visual asset." });
    else if (scene.visualIsPlaceholder) add("real_voices_and_translations", { severity: "WARNING", sceneNumber: scene.sceneNumber, message: "Scene uses offline placeholder art (no image provider configured)." });
  }

  // Master-script fact checks
  const masterText = input.masterScenes.map((s) => [s.narratorText, ...s.dialogue.map((d) => d.text)].join(" ")).join(" ");
  for (const n of findUnsupportedNumbers(masterText, input.articleText)) {
    add("no_hallucinated_facts", { severity: "BLOCKING", message: `Number "${n}" in the script does not appear in the article.` });
  }
  if (input.masterLanguage === "en") {
    const allowed = input.characters.flatMap((c) => [c.displayName, c.realName ?? ""]).filter(Boolean);
    for (const name of findUnsupportedNames(masterText, input.articleText, allowed)) {
      add("no_hallucinated_facts", { severity: "WARNING", message: `Name "${name}" in the script does not appear in the article — verify.` });
    }
  }
  for (const scene of input.masterScenes) {
    for (const flag of checkDialogue(scene.dialogue, input.articleText, input.characters, input.allowReconstruction)) {
      add("no_fabricated_quotes", { severity: flag.severity, sceneNumber: scene.sceneNumber, message: `${flag.rule}: "${flag.excerpt ?? ""}"` });
    }
    if (input.masterLanguage === "en") {
      for (const flag of lintAllegations(scene.narratorText, scene.sceneNumber)) {
        add("allegations_attributed", { severity: flag.severity, sceneNumber: scene.sceneNumber, message: `${flag.rule}: "${flag.excerpt}"` });
      }
    }
    for (const flag of lintRegister(scene.narratorText, input.masterLanguage, scene.sceneNumber)) {
      add("no_slang_or_abuse", { severity: flag.severity, sceneNumber: scene.sceneNumber, languageCode: input.masterLanguage, message: `${flag.rule}: ${flag.excerpt ?? ""}` });
    }
  }

  // Per-language checks
  const voiceBySpeaker = new Map<string, Set<string>>();
  for (const lang of input.languages) {
    const lc = lang.languageCode;
    if (lang.content.untranslated) add("real_voices_and_translations", { severity: "BLOCKING", languageCode: lc, message: "Script is untranslated master text (no translation provider configured)." });

    for (const flag of lang.lintFlags) {
      if (flag.rule === "UNTRANSLATED") continue;
      const check: CheckName = ["ABUSIVE_LANGUAGE", "SLANG_OR_COLLOQUIAL", "SENSATIONAL_LANGUAGE", "EXCLAMATION", "EMOJI_OR_INTERNET_LANGUAGE", "SHOUTING_CAPS"].includes(flag.rule)
        ? "no_slang_or_abuse"
        : flag.rule.startsWith("NUMBER_")
          ? "no_hallucinated_facts"
          : flag.rule === "OVER_DURATION"
            ? "duration_limit"
            : flag.rule === "UNHEDGED_ALLEGATION"
              ? "allegations_attributed"
              : "no_missing_or_duplicated_content";
      add(check, { severity: flag.severity, languageCode: lc, sceneNumber: flag.sceneNumber, message: `${flag.rule}${flag.excerpt ? `: ${flag.excerpt}` : ""}` });
    }

    // Completeness & duplication
    const sceneNumbers = new Set(lang.content.scenes.map((s) => s.sceneNumber));
    for (const master of input.masterScenes) {
      if (!sceneNumbers.has(master.sceneNumber)) add("no_missing_or_duplicated_content", { severity: "BLOCKING", languageCode: lc, sceneNumber: master.sceneNumber, message: "Scene missing from this language." });
    }
    const seen = new Map<string, number>();
    for (const scene of lang.content.scenes) {
      for (const sentence of scene.narratorText.split(/(?<=[.!?।])\s+/).map((x) => x.trim().toLowerCase()).filter((x) => x.length > 25)) {
        if (seen.has(sentence)) add("no_missing_or_duplicated_content", { severity: "WARNING", languageCode: lc, sceneNumber: scene.sceneNumber, message: `Sentence repeated from scene ${seen.get(sentence)}.` });
        else seen.set(sentence, scene.sceneNumber);
      }
    }

    if (lang.segments.length > 0) {
      for (const scene of lang.content.scenes) {
        const expected = 1 + scene.dialogue.length;
        const have = lang.segments.filter((s) => s.sceneNumber === scene.sceneNumber).length;
        if (have < expected) add("no_missing_or_duplicated_content", { severity: "BLOCKING", languageCode: lc, sceneNumber: scene.sceneNumber, message: `Audio missing for ${expected - have} line(s).` });
      }
    }

    // Voice consistency
    for (const seg of lang.segments) {
      const expected = input.voiceAssignments[seg.speakerKey];
      if (expected && expected !== seg.voiceCode) {
        add("voice_consistency", { severity: "BLOCKING", languageCode: lc, sceneNumber: seg.sceneNumber, message: `${seg.speakerKey} spoke with ${seg.voiceCode}, assigned ${expected}.` });
      }
      if (!voiceBySpeaker.has(seg.speakerKey)) voiceBySpeaker.set(seg.speakerKey, new Set());
      voiceBySpeaker.get(seg.speakerKey)!.add(seg.voiceCode);
    }
    const placeholders = lang.segments.filter((s) => s.isPlaceholder).length;
    if (placeholders > 0) add("real_voices_and_translations", { severity: "BLOCKING", languageCode: lc, message: `${placeholders} line(s) use silent placeholder audio — no real voice configured for ${lc}.` });

    // Sync
    if (lang.timeline) {
      for (const seg of lang.segments) {
        const scene = lang.timeline.scenes.find((s) => s.sceneNumber === seg.sceneNumber);
        if (!scene || seg.startSeconds === null) continue;
        const end = seg.startSeconds + seg.durationSeconds;
        if (seg.startSeconds < scene.startSeconds - 0.01 || end > scene.startSeconds + scene.durationSeconds + 0.01) {
          add("audio_video_sync", { severity: "BLOCKING", languageCode: lc, sceneNumber: seg.sceneNumber, message: "A spoken line runs outside its scene." });
        }
      }
      if (lang.renderDurationSeconds && Math.abs(lang.renderDurationSeconds - lang.timeline.totalSeconds) > 0.5) {
        add("audio_video_sync", { severity: "BLOCKING", languageCode: lc, message: `Rendered duration ${lang.renderDurationSeconds}s differs from the timeline ${lang.timeline.totalSeconds}s.` });
      }
    }
  }
  for (const [speaker, voices] of voiceBySpeaker) {
    if (voices.size > 1) add("voice_consistency", { severity: "BLOCKING", message: `${speaker === NARRATOR_SPEAKER_KEY ? "Narrator" : speaker} uses different voices across languages: ${[...voices].join(", ")}.` });
  }

  const checks: CheckName[] = [
    "duration_limit",
    "no_prohibited_visuals",
    "no_slang_or_abuse",
    "voice_consistency",
    "audio_video_sync",
    "no_missing_or_duplicated_content",
    "no_hallucinated_facts",
    "no_fabricated_quotes",
    "allegations_attributed",
    "real_voices_and_translations",
  ];
  return {
    status: failed.size > 0 ? "NEEDS_REVIEW" : "PASSED",
    checkedAt: new Date().toISOString(),
    issues,
    checks: checks.map((name) => ({ name, passed: !failed.has(name) })),
  };
}
