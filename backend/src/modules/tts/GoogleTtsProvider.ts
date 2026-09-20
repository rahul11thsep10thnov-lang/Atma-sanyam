import { TextToSpeechProvider, TtsInput, TtsResult } from "./TextToSpeechProvider";
import { env } from "../../config/env";
import { saveBuffer } from "../../lib/storage";
import { logger } from "../../lib/logger";

// Maps our language codes to Google Cloud TTS locale/voice names with good
// Indian-language coverage. Extend this map as new languages are enabled.
const VOICE_MAP: Record<string, { languageCode: string; name: string }> = {
  hi: { languageCode: "hi-IN", name: "hi-IN-Neural2-A" },
  bn: { languageCode: "bn-IN", name: "bn-IN-Standard-A" },
  ta: { languageCode: "ta-IN", name: "ta-IN-Standard-A" },
  te: { languageCode: "te-IN", name: "te-IN-Standard-A" },
  kn: { languageCode: "kn-IN", name: "kn-IN-Standard-A" },
  mr: { languageCode: "mr-IN", name: "mr-IN-Standard-A" },
  ml: { languageCode: "ml-IN", name: "ml-IN-Standard-A" },
  en: { languageCode: "en-IN", name: "en-IN-Neural2-A" },
  // Assamese has limited/no dedicated Google TTS voice as of writing; falls
  // back to Bengali-script-adjacent handling upstream (admin-configurable),
  // logged clearly below so it doesn't silently produce wrong-language audio.
  as: { languageCode: "bn-IN", name: "bn-IN-Standard-A" },
};

interface GoogleTtsResponse {
  audioContent: string; // base64
}

/**
 * Google Cloud Text-to-Speech adapter (spec §16 — broadest good-quality
 * coverage of the 9 target languages). Requires GOOGLE_TTS_API_KEY.
 */
export class GoogleTtsProvider implements TextToSpeechProvider {
  readonly key = "google-tts";

  async synthesize(input: TtsInput): Promise<TtsResult> {
    const voice = VOICE_MAP[input.languageCode];
    if (!voice) {
      throw new Error(`No Google TTS voice mapping for language "${input.languageCode}"`);
    }
    if (input.languageCode === "as") {
      logger.warn("Assamese has no dedicated Google TTS voice; using Bengali voice as an approximation.");
    }

    const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${env.googleTtsApiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text: input.text },
        voice: { languageCode: voice.languageCode, name: voice.name },
        audioConfig: { audioEncoding: "MP3" },
      }),
    });

    if (!response.ok) {
      throw new Error(`Google TTS request failed with status ${response.status}`);
    }

    const data = (await response.json()) as GoogleTtsResponse;
    const audioBuffer = Buffer.from(data.audioContent, "base64");
    const key = `audio/${input.languageCode}/${Date.now()}.mp3`;
    const storageUrl = await saveBuffer(key, audioBuffer);

    // Google TTS doesn't return duration directly; estimate from word count
    // as a placeholder until the audio is probed with a media library.
    const wordCount = input.text.split(/\s+/).filter(Boolean).length;
    const durationSeconds = Math.max(1, Math.round((wordCount / 130) * 60));

    return { storageUrl, storageKey: key, durationSeconds, voiceId: voice.name, provider: this.key };
  }
}
