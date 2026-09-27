import { buildSilentWav } from "../../../modules/tts/wavUtils";
import { estimateSpeechSeconds } from "../../language/languageProfiles";
import { VoiceProvider, VoiceSynthesisRequest, VoiceSynthesisResult } from "./VoiceProvider";

/**
 * Offline fallback: a silent WAV whose length matches a calm speaking pace
 * for the language, so timing, subtitles, mixing and rendering all run
 * end-to-end without any TTS key. Segments are flagged `isPlaceholder`
 * and the QC reports them.
 */
export class MockVoiceProvider implements VoiceProvider {
  readonly key = "mock";

  isConfigured(): boolean {
    return true;
  }

  supportsLanguage(): boolean {
    return true;
  }

  resolveVoiceId(voice: { code: string }, languageCode: string): string {
    return `mock-${voice.code}-${languageCode}`;
  }

  async synthesize(request: VoiceSynthesisRequest): Promise<VoiceSynthesisResult> {
    const durationSeconds = Math.max(0.8, Math.round(estimateSpeechSeconds(request.text, request.languageCode) * 100) / 100);
    return { audio: buildSilentWav(durationSeconds, 24000), format: "wav", durationSeconds, isPlaceholder: true };
  }
}
