import { LLMProvider } from "../llm/LLMProvider";
import { getLanguageProfile } from "../../language/languageProfiles";
import { LocalizeRequest, LocalizeResult, TranslationProvider } from "./TranslationProvider";

const SYSTEM_PROMPT = `You are a senior Indian broadcast-news writer who writes natively in the target language.
You receive short script items for an animated factual news video and must write each one naturally in the
target language, as a native newsreader would say it — NOT a literal word-for-word translation.

Strict rules:
- Preserve every fact exactly: names, places, dates, times, ages, numbers, amounts, organisations.
- Preserve attribution and uncertainty exactly: "police said", "allegedly", "according to the complaint",
  "has been accused" must keep the same meaning. Never turn an allegation into a fact.
- Do not add, remove, soften or dramatise anything. No opinions, no speculation.
- Formal, respectful, standard news register. No slang, abuse, colloquialisms, memes, internet language,
  exaggeration or sensational phrasing.
- Keep roughly the same length (the video is timed); prefer the shorter natural phrasing.
- Dialogue items marked DIRECT_QUOTE are real quotes: translate faithfully, do not embellish.
- Use the glossary renderings for names/terms when given; otherwise transliterate names consistently.
- Write numbers with Western digits (0-9).
Respond with ONLY a JSON object: {"texts": {"<id>": "<text>", ...}} containing every id.`;

export class LLMTranslationProvider implements TranslationProvider {
  readonly key: string;

  constructor(private readonly llm: LLMProvider) {
    this.key = `llm:${llm.key}`;
  }

  isConfigured(): boolean {
    return this.llm.isConfigured();
  }

  supports(): boolean {
    return true;
  }

  async localize(request: LocalizeRequest): Promise<LocalizeResult> {
    const target = getLanguageProfile(request.targetLanguage);
    const source = getLanguageProfile(request.sourceLanguage);
    const glossary = request.glossary.map((g) => (g.rendering ? `${g.term} => ${g.rendering}` : g.term)).join("\n");

    const response = await this.llm.completeJson<{ texts: Record<string, string> }>({
      system: SYSTEM_PROMPT,
      prompt: [
        `Source language: ${source.englishName}. Target language: ${target.englishName} (${target.nativeName}), script: ${target.script}.`,
        `Story context: ${request.context}`,
        glossary ? `Glossary:\n${glossary}` : "Glossary: (none)",
        `Items (JSON):\n${JSON.stringify(request.items)}`,
      ].join("\n\n"),
      maxTokens: 8000,
    });

    const missing = request.items.filter((item) => typeof response.texts?.[item.id] !== "string" || !response.texts[item.id].trim());
    if (missing.length > 0) {
      throw new Error(`Localisation response missing ${missing.length} item(s): ${missing.map((m) => m.id).join(", ")}`);
    }
    return { texts: response.texts, untranslated: false };
  }
}
