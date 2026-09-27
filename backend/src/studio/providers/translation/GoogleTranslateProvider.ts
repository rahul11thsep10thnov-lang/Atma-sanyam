import { env } from "../../../config/env";
import { LocalizeRequest, LocalizeResult, TranslationProvider } from "./TranslationProvider";

interface GoogleTranslateResponse {
  data: { translations: { translatedText: string }[] };
}

/**
 * Google Cloud Translation (v2 REST). Faster and cheaper than LLM
 * localisation but closer to literal translation, so every result still
 * passes through the register lint and fact-parity checks and the admin
 * review. Requires GOOGLE_TRANSLATE_API_KEY.
 */
export class GoogleTranslateProvider implements TranslationProvider {
  readonly key = "google-translate";

  isConfigured(): boolean {
    return !!env.studio.googleTranslateApiKey;
  }

  supports(languageCode: string): boolean {
    return ["hi", "en", "bn", "mr", "gu", "ta", "te", "kn", "ml", "pa", "or", "as"].includes(languageCode);
  }

  async localize(request: LocalizeRequest): Promise<LocalizeResult> {
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(env.studio.googleTranslateApiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: request.items.map((i) => i.text),
          source: request.sourceLanguage,
          target: request.targetLanguage,
          format: "text",
        }),
      }
    );
    if (!response.ok) throw new Error(`Google Translate request failed with status ${response.status}`);
    const data = (await response.json()) as GoogleTranslateResponse;
    const texts: Record<string, string> = {};
    request.items.forEach((item, i) => {
      texts[item.id] = data.data.translations[i]?.translatedText ?? item.text;
    });
    return { texts, untranslated: false };
  }
}
