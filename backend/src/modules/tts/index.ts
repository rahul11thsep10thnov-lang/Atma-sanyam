import { TextToSpeechProvider } from "./TextToSpeechProvider";
import { MockTtsProvider } from "./MockTtsProvider";
import { GoogleTtsProvider } from "./GoogleTtsProvider";
import { env } from "../../config/env";

export * from "./TextToSpeechProvider";

export function getTtsProvider(): TextToSpeechProvider {
  if (env.ttsProvider === "google-tts" && env.googleTtsApiKey) {
    return new GoogleTtsProvider();
  }
  return new MockTtsProvider();
}
