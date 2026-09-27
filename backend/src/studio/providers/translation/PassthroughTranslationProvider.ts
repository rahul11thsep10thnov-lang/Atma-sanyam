import { LocalizeRequest, LocalizeResult, TranslationProvider } from "./TranslationProvider";

/**
 * Offline fallback: copies the master text unchanged and marks the result
 * `untranslated`, which the QC turns into a NEEDS_REVIEW issue. Lets the
 * whole pipeline run without any translation key, but never silently
 * publishes English text labelled as another language.
 */
export class PassthroughTranslationProvider implements TranslationProvider {
  readonly key = "passthrough";

  isConfigured(): boolean {
    return true;
  }

  supports(): boolean {
    return true;
  }

  async localize(request: LocalizeRequest): Promise<LocalizeResult> {
    const texts = Object.fromEntries(request.items.map((i) => [i.id, i.text]));
    return { texts, untranslated: request.sourceLanguage !== request.targetLanguage };
  }
}
