import { TranslationInput, TranslationResult, TranslationService } from "./TranslationService";
import { callClaudeForJson } from "../../lib/anthropicClient";
import { env } from "../../config/env";
import { PassthroughTranslationService } from "./PassthroughTranslationService";

const SYSTEM_PROMPT = `You are a professional Indian-language news translator/localizer. Rewrite the given
English news script naturally and journalistically in the target language — do not translate
word-for-word; write as a native journalist would. Preserve every fact exactly (names, places,
dates, allegation-vs-fact wording, numbers) — do not add, remove, or soften facts. Keep the same
section structure.
Respond with ONLY a JSON object: {"localizedTitle": "...", "localizedSummary": "...",
"introduction": "...", "location": "...", "people": "...", "background": "...", "sequence": "...",
"authorities": "...", "currentStatus": "...", "context": "...", "sourceAttribution": "..."}`;

export class AnthropicTranslationService implements TranslationService {
  private readonly fallback = new PassthroughTranslationService();

  async translate(input: TranslationInput): Promise<TranslationResult> {
    try {
      const result = await callClaudeForJson<{
        localizedTitle: string;
        localizedSummary: string;
        introduction: string;
        location: string;
        people: string;
        background: string;
        sequence: string;
        authorities: string;
        currentStatus: string;
        context: string;
        sourceAttribution: string;
      }>({
        model: env.scriptGenerationModel,
        system: SYSTEM_PROMPT,
        prompt: `Target language: ${input.targetLanguageName} (${input.targetLanguageCode})\n\nTitle: ${input.title}\nSummary: ${input.summary}\n\nScript sections (JSON):\n${JSON.stringify(input.sections, null, 2)}`,
        maxTokens: 1800,
      });

      return {
        localizedTitle: result.localizedTitle,
        localizedSummary: result.localizedSummary,
        localizedSections: {
          introduction: result.introduction,
          location: result.location,
          people: result.people,
          background: result.background,
          sequence: result.sequence,
          authorities: result.authorities,
          currentStatus: result.currentStatus,
          context: result.context,
          sourceAttribution: result.sourceAttribution,
        },
      };
    } catch {
      return this.fallback.translate(input);
    }
  }
}
