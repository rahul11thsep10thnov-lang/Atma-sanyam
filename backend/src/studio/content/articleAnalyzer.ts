import { ArticleAnalysis, ExtractedCharacter, ExtractedFact, TimelineEvent } from "../types";
import { LLMProvider } from "../providers/llm/LLMProvider";
import { ContentModerationService } from "../../modules/safety/ContentModerationService";
import { cleanArticle } from "./articleCleaner";
import { extractFactsRuleBased } from "./factExtractor";
import { buildTimeline } from "./timelineBuilder";
import { buildAppearance, extractCharacters, protect } from "./characterExtractor";
import { extractLocation } from "./locationExtractor";
import { detectSensitiveTopics } from "../safety/sceneSafety";
import { isQuoteInArticle } from "../safety/factCheck";

export interface AnalyzeInput {
  title: string;
  text: string;
  characterNotes?: string | null;
  locationHint?: { state?: string; district?: string; locationText?: string };
  contentWarnings?: string[];
}

const LLM_SYSTEM = `You are a meticulous fact-extraction editor for an Indian public-interest news channel.
From the article, extract ONLY what the article states. Never infer, embellish or add facts.
Return ONLY JSON with this shape:
{
 "facts": [{"type": "PERSON_NAME|DATE|TIME|LOCATION|NUMBER|AGE|MONEY|ORGANIZATION|QUOTE|CLAIM|ALLEGATION|OFFICIAL_STATEMENT|EVENT",
            "value": "...", "sourceSentence": "exact sentence from the article", "attributedTo": "who said/claimed it or null",
            "statementType": "DIRECT_QUOTE|REPORTED_STATEMENT|AI_NARRATION|null",
            "verificationStatus": "REPORTED|ALLEGED|UNVERIFIED|UNKNOWN", "isKeyFact": true|false}],
 "timeline": [{"order": 0, "when": "as stated or null", "event": "one neutral factual sentence, hedged if an allegation", "sourceSentence": "...", "isAllegation": true|false}],
 "characters": [{"displayName": "...", "realName": "name as printed or null", "role": "wife|husband|police officer|...",
                 "gender": "MALE|FEMALE|UNKNOWN", "ageGroup": "CHILD|YOUNG|ADULT|ELDERLY|UNKNOWN", "age": number|null,
                 "isMinor": bool, "isOfficial": bool, "speaks": bool}],
 "location": {"label": "...", "state": "... or null", "district": "... or null", "settings": ["home interior", "police station", ...]}
}
Rules: QUOTE values must be verbatim text inside quotation marks in the article. Accusations not proven in court
are ALLEGED. Claims by family/neighbours are UNVERIFIED. Things the publication reports are REPORTED. Never mark VERIFIED.
Timeline in chronological order: background first, then events, then current status.
"speaks" is true only if the article quotes that person directly.`;

interface LlmAnalysis {
  facts: ExtractedFact[];
  timeline: TimelineEvent[];
  characters: (Omit<ExtractedCharacter, "key" | "appearance" | "isRealPerson" | "anonymized"> & { age?: number | null })[];
  location: { label: string; state?: string | null; district?: string | null; settings: string[] };
}

/**
 * Runs the first six stages of the brief's pipeline: CLEANING → FACT
 * EXTRACTION → FACTUAL TIMELINE → CHARACTER EXTRACTION → LOCATION
 * EXTRACTION → CONTENT SAFETY ANALYSIS. Uses the LLM when configured and
 * always validates its output against the article (quotes must be
 * verbatim, minors/survivors are anonymised, no VERIFIED status is ever
 * self-assigned). Falls back to deterministic rule-based extraction.
 */
export async function analyzeArticle(input: AnalyzeInput, llm?: LLMProvider | null): Promise<ArticleAnalysis> {
  const cleaning = cleanArticle(input.text);
  const cleanedText = cleaning.text;
  const fullText = `${input.title}\n\n${cleanedText}`;
  const warnings: string[] = [];
  if (cleaning.redactions.length > 0) warnings.push(`Redacted ${cleaning.redactions.length} personal detail(s) (phone/e-mail/ID numbers/URLs).`);

  const { topics, isSensitive } = detectSensitiveTopics(fullText);
  const declared = (input.contentWarnings ?? []).map((w) => w.toLowerCase().replace(/\s+/g, "_"));
  const sensitiveTopics = [...new Set([...topics, ...declared])];

  const moderation = new ContentModerationService().moderate(fullText, "OTHER_HUMAN_INTEREST");
  for (const flag of moderation) {
    if (flag.rule !== "SENSITIVE_CATEGORY_REQUIRES_HUMAN_REVIEW") warnings.push(`Moderation: ${flag.rule} (${flag.severity})`);
  }

  if (llm?.isConfigured()) {
    try {
      const result = await llm.completeJson<LlmAnalysis>({
        system: LLM_SYSTEM,
        prompt: `Title: ${input.title}\n${input.characterNotes ? `Editor's character notes: ${input.characterNotes}\n` : ""}\nArticle:\n${cleanedText}`,
        maxTokens: 6000,
      });
      return finalizeLlm(result, { cleanedText, fullText, sensitiveTopics, isSensitive: isSensitive || declared.length > 0, warnings, input, provider: `llm:${llm.key}` });
    } catch (err) {
      warnings.push(`LLM analysis failed, used rule-based analysis instead: ${(err as Error).message}`);
    }
  }

  const location = extractLocation(fullText, input.locationHint);
  const locationFacts = [location.district, location.state].filter((v): v is string => !!v);
  const facts = extractFactsRuleBased(cleanedText, locationFacts);
  const characters = extractCharacters(cleanedText, facts, sensitiveTopics);
  const timeline = buildTimeline(facts);
  if (timeline.length < 3) warnings.push("Very few narrative sentences found — the article may be too thin for a 1-minute video.");

  return redactProtectedNames({ cleanedText, facts, timeline, characters, location, sensitiveTopics, isSensitive: isSensitive || declared.length > 0, warnings, provider: "rule-based" });
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Replaces the names of protected people (minors, sexual-violence
 * survivors) with their anonymised description everywhere — cleaned text,
 * facts and timeline — so no later stage (script, translation, subtitles)
 * can ever reintroduce them. The names themselves are then discarded.
 */
export function redactProtectedNames(analysis: ArticleAnalysis): ArticleAnalysis {
  const protectedChars = analysis.characters.filter((c) => c.protectedName);
  if (protectedChars.length === 0) return analysis;
  const rules = protectedChars.flatMap((c) => {
    const full = c.protectedName!;
    const parts = full.split(" ").filter((p) => p.length > 2);
    return [full, ...parts].map((n) => ({ pattern: new RegExp(`\\b${escapeRegex(n)}\\b`, "g"), replacement: c.displayName }));
  });
  const redact = (text: string | undefined) => (text === undefined ? text : rules.reduce((t, r) => t.replace(r.pattern, r.replacement), text));
  const protectedNames = new Set(protectedChars.map((c) => c.protectedName!.toLowerCase()));

  return {
    ...analysis,
    cleanedText: redact(analysis.cleanedText)!,
    facts: analysis.facts
      .filter((f) => !(f.type === "PERSON_NAME" && protectedNames.has(f.value.toLowerCase())))
      .map((f) => ({ ...f, value: redact(f.value)!, sourceSentence: redact(f.sourceSentence), attributedTo: redact(f.attributedTo) })),
    timeline: analysis.timeline.map((t) => ({ ...t, event: redact(t.event)!, sourceSentence: redact(t.sourceSentence)! })),
    characters: analysis.characters.map(({ protectedName: _omit, ...c }) => c),
    warnings: [...analysis.warnings, `Anonymised ${protectedChars.length} protected person(s) (minor or survivor) throughout the text.`],
  };
}

function finalizeLlm(
  result: LlmAnalysis,
  ctx: { cleanedText: string; fullText: string; sensitiveTopics: string[]; isSensitive: boolean; warnings: string[]; input: AnalyzeInput; provider: string }
): ArticleAnalysis {
  const facts: ExtractedFact[] = [];
  for (const f of result.facts ?? []) {
    if (!f?.type || !f.value) continue;
    if (f.type === "QUOTE" && !isQuoteInArticle(f.value, ctx.cleanedText)) {
      ctx.warnings.push(`Dropped a quote not found verbatim in the article: "${f.value.slice(0, 80)}"`);
      continue;
    }
    const status = (f.verificationStatus as string) === "VERIFIED" ? "REPORTED" : f.verificationStatus ?? "REPORTED";
    facts.push({ ...f, verificationStatus: status, statementType: f.type === "QUOTE" ? "DIRECT_QUOTE" : f.statementType ?? undefined, attributedTo: f.attributedTo ?? undefined });
  }

  const location = extractLocation(ctx.fullText, {
    state: ctx.input.locationHint?.state ?? result.location?.state ?? undefined,
    district: ctx.input.locationHint?.district ?? result.location?.district ?? undefined,
    locationText: ctx.input.locationHint?.locationText ?? result.location?.label,
  });
  if (result.location?.settings?.length) location.settings = [...new Set([...result.location.settings, ...location.settings])];

  const characters: ExtractedCharacter[] = (result.characters ?? []).map((c, i) => {
    const ageGroup = c.age != null && c.age < 18 ? "CHILD" : c.ageGroup ?? "UNKNOWN";
    return protect(
      {
        key: `CHAR_${String(i + 1).padStart(2, "0")}`,
        displayName: c.displayName || c.realName || c.role,
        realName: c.realName ?? undefined,
        role: c.role || "person named in the report",
        gender: c.gender ?? "UNKNOWN",
        ageGroup,
        isMinor: !!c.isMinor || ageGroup === "CHILD",
        isOfficial: !!c.isOfficial,
        isRealPerson: true,
        anonymized: !c.realName,
        speaks: !!c.speaks,
        appearance: buildAppearance(c.gender ?? "UNKNOWN", ageGroup, !!c.isOfficial, i),
      },
      ctx.cleanedText,
      ctx.sensitiveTopics
    );
  });

  const timeline = (result.timeline ?? []).filter((t) => t?.event).map((t, order) => ({ ...t, order }));
  return redactProtectedNames({
    cleanedText: ctx.cleanedText,
    facts,
    timeline: timeline.length > 0 ? timeline : buildTimeline(facts),
    characters,
    location,
    sensitiveTopics: ctx.sensitiveTopics,
    isSensitive: ctx.isSensitive,
    warnings: ctx.warnings,
    provider: ctx.provider,
  });
}
