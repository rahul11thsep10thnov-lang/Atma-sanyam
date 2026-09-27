import { env } from "../../../config/env";
import { mp3DurationSeconds } from "./audioProbe";
import { BaseVoiceRef, VoiceProvider, VoiceSynthesisRequest, VoiceSynthesisResult } from "./VoiceProvider";

const OUTPUT_KBPS = 128;

/**
 * ElevenLabs TTS. One ElevenLabs voice ID per base voice is reused for
 * every language (multilingual models keep the same timbre across
 * languages), which is how a character keeps one identity in Hindi, Tamil
 * and English. Supported languages depend on the model/plan, so they are
 * configured via ELEVENLABS_LANGUAGES rather than assumed.
 * Needs ELEVENLABS_API_KEY; voice IDs are set per base voice in the admin console.
 */
export class ElevenLabsVoiceProvider implements VoiceProvider {
  readonly key = "elevenlabs";

  constructor(private readonly languages: string[] = env.studio.elevenLabsLanguages) {}

  isConfigured(): boolean {
    return !!env.studio.elevenLabsApiKey;
  }

  supportsLanguage(languageCode: string): boolean {
    return this.languages.includes(languageCode);
  }

  resolveVoiceId(voice: BaseVoiceRef): string | null {
    const id = voice.providerVoiceIds?.elevenlabs;
    return typeof id === "string" && id.trim() ? id.trim() : null;
  }

  async synthesize(request: VoiceSynthesisRequest): Promise<VoiceSynthesisResult> {
    const settings = request.voice.settings ?? {};
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(request.providerVoiceId)}?output_format=mp3_44100_${OUTPUT_KBPS}`,
      {
        method: "POST",
        headers: { "xi-api-key": env.studio.elevenLabsApiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
        body: JSON.stringify({
          text: request.text,
          model_id: env.studio.elevenLabsModelId,
          language_code: request.languageCode,
          voice_settings: {
            stability: Number(settings.stability ?? 0.6),
            similarity_boost: Number(settings.similarity ?? 0.8),
            style: Number(settings.style ?? 0),
            use_speaker_boost: true,
          },
        }),
      }
    );
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`ElevenLabs request failed (${response.status}): ${detail.slice(0, 300)}`);
    }
    const audio = Buffer.from(await response.arrayBuffer());
    return { audio, format: "mp3", durationSeconds: await mp3DurationSeconds(audio, OUTPUT_KBPS), isPlaceholder: false };
  }
}
