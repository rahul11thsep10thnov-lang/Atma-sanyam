import { TextToSpeechProvider, TtsInput, TtsResult } from "./TextToSpeechProvider";
import { buildSilentWav } from "./wavUtils";
import { saveBuffer } from "../../lib/storage";

const WORDS_PER_MINUTE = 130;

/**
 * Offline/dev/test TTS provider: produces a real, playable (silent) WAV
 * file with a duration estimated from word count, so the rest of the
 * pipeline (subtitle sync, video muxing) can be exercised end-to-end
 * without any paid TTS API. Never used in production (see getTtsProvider).
 */
export class MockTtsProvider implements TextToSpeechProvider {
  readonly key = "mock";

  async synthesize(input: TtsInput): Promise<TtsResult> {
    const wordCount = input.text.split(/\s+/).filter(Boolean).length;
    const durationSeconds = Math.max(1, Math.round((wordCount / WORDS_PER_MINUTE) * 60));
    const wav = buildSilentWav(durationSeconds);
    const key = `audio/${input.languageCode}/${hash(input.text)}.wav`;
    const storageUrl = await saveBuffer(key, wav);

    return {
      storageUrl,
      storageKey: key,
      durationSeconds,
      voiceId: `mock-${input.languageCode}`,
      provider: this.key,
    };
  }
}

function hash(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}
