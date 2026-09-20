import { TranslationInput, TranslationResult, TranslationService } from "./TranslationService";

/**
 * Offline/dev/test fallback: returns the source-language text unchanged.
 * This is explicitly NOT a real translation — it exists only so the
 * pipeline is runnable end-to-end without an LLM key. Real deployments
 * must have ANTHROPIC_API_KEY configured for any non-English language.
 */
export class PassthroughTranslationService implements TranslationService {
  async translate(input: TranslationInput): Promise<TranslationResult> {
    return {
      localizedTitle: input.title,
      localizedSummary: input.summary,
      localizedSections: input.sections,
    };
  }
}
