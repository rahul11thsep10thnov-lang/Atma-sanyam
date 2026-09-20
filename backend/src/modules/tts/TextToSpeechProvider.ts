export interface TtsInput {
  text: string;
  languageCode: string;
  /** e.g. "hi-IN-Neural2-A" for providers that support voice selection */
  voiceHint?: string;
}

export interface TtsResult {
  storageUrl: string;
  storageKey: string;
  durationSeconds: number;
  voiceId: string;
  provider: string;
}

/**
 * Text-to-speech provider interface (spec §16). Implementations are
 * pluggable; the pipeline never talks to a TTS vendor directly.
 */
export interface TextToSpeechProvider {
  readonly key: string;
  synthesize(input: TtsInput): Promise<TtsResult>;
}
