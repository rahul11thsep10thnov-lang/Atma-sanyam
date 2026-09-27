import { env } from "../../../config/env";
import { getLanguageProfile } from "../../language/languageProfiles";
import { wavDurationSeconds } from "./audioProbe";
import { BaseVoiceRef, VoiceProvider, VoiceSynthesisRequest, VoiceSynthesisResult } from "./VoiceProvider";

// Neural2 voices exist for Hindi and Indian English; other languages use
// Standard voices. A/D are female and B/C male for these locales. Admins can
// override per base voice and language (providerVoiceIds.google[lang]).
const NEURAL_LOCALES = new Set(["hi-IN", "en-IN"]);

function defaultGoogleVoiceName(voice: BaseVoiceRef, languageCode: string): string {
  const locale = getLanguageProfile(languageCode).googleLocale;
  const family = NEURAL_LOCALES.has(locale) ? "Neural2" : "Standard";
  const female = voice.gender === "FEMALE";
  const variant = female ? (voice.tone === "AUTHORITATIVE" || voice.ageGroup === "ELDERLY" ? "D" : "A") : voice.tone === "AUTHORITATIVE" || voice.ageGroup === "ELDERLY" ? "C" : "B";
  // Standard voices for most Indic locales only have A (female) / B (male).
  const safeVariant = family === "Standard" ? (female ? "A" : "B") : variant;
  return `${locale}-${family}-${safeVariant}`;
}

/**
 * Google Cloud Text-to-Speech. Broad Indian-language coverage but separate
 * voices per language, so cross-language identity is approximate (same
 * gender/age/tone). Languages via GOOGLE_TTS_LANGUAGES; needs GOOGLE_TTS_API_KEY.
 */
export class GoogleVoiceProvider implements VoiceProvider {
  readonly key = "google";

  constructor(private readonly languages: string[] = env.studio.googleTtsLanguages) {}

  isConfigured(): boolean {
    return !!env.googleTtsApiKey;
  }

  supportsLanguage(languageCode: string): boolean {
    return this.languages.includes(languageCode);
  }

  resolveVoiceId(voice: BaseVoiceRef, languageCode: string): string | null {
    const overrides = voice.providerVoiceIds?.google as Record<string, string> | undefined;
    return overrides?.[languageCode] || defaultGoogleVoiceName(voice, languageCode);
  }

  async synthesize(request: VoiceSynthesisRequest): Promise<VoiceSynthesisResult> {
    const locale = getLanguageProfile(request.languageCode).googleLocale;
    const speakingRate = Number(request.voice.settings?.speakingRate ?? 0.95);
    const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(env.googleTtsApiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text: request.text },
        voice: { languageCode: locale, name: request.providerVoiceId },
        audioConfig: { audioEncoding: "LINEAR16", sampleRateHertz: 24000, speakingRate },
      }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Google TTS request failed (${response.status}): ${detail.slice(0, 300)}`);
    }
    const data = (await response.json()) as { audioContent: string };
    const audio = Buffer.from(data.audioContent, "base64");
    return { audio, format: "wav", durationSeconds: wavDurationSeconds(audio), isPlaceholder: false };
  }
}
