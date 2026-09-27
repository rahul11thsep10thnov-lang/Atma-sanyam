import { env } from "../../../config/env";
import { wavDurationSeconds } from "./audioProbe";
import { BaseVoiceRef, VoiceProvider, VoiceSynthesisRequest, VoiceSynthesisResult } from "./VoiceProvider";

/**
 * Chatterbox (Resemble AI's open-source multilingual TTS) running on your
 * own GPU server behind an OpenAI-compatible speech endpoint
 * (POST {CHATTERBOX_BASE_URL}/v1/audio/speech → WAV), as exposed by the
 * common Chatterbox API server wrappers. Each base voice maps to a voice
 * name / reference clip registered on that server, reused across
 * languages for a consistent identity. Languages are configured via
 * CHATTERBOX_LANGUAGES.
 */
export class ChatterboxVoiceProvider implements VoiceProvider {
  readonly key = "chatterbox";

  constructor(private readonly languages: string[] = env.studio.chatterboxLanguages) {}

  isConfigured(): boolean {
    return !!env.studio.chatterboxBaseUrl;
  }

  supportsLanguage(languageCode: string): boolean {
    return this.languages.includes(languageCode);
  }

  resolveVoiceId(voice: BaseVoiceRef): string | null {
    const id = voice.providerVoiceIds?.chatterbox;
    return typeof id === "string" && id.trim() ? id.trim() : null;
  }

  async synthesize(request: VoiceSynthesisRequest): Promise<VoiceSynthesisResult> {
    const settings = request.voice.settings ?? {};
    const response = await fetch(`${env.studio.chatterboxBaseUrl.replace(/\/$/, "")}/v1/audio/speech`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(env.studio.chatterboxApiKey ? { Authorization: `Bearer ${env.studio.chatterboxApiKey}` } : {}),
      },
      body: JSON.stringify({
        model: "chatterbox-multilingual",
        input: request.text,
        voice: request.providerVoiceId,
        language: request.languageCode,
        response_format: "wav",
        exaggeration: Number(settings.exaggeration ?? 0.4), // low = calm, news-appropriate delivery
        cfg_weight: Number(settings.cfgWeight ?? 0.5),
      }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Chatterbox request failed (${response.status}): ${detail.slice(0, 300)}`);
    }
    const audio = Buffer.from(await response.arrayBuffer());
    return { audio, format: "wav", durationSeconds: wavDurationSeconds(audio), isPlaceholder: false };
  }
}
