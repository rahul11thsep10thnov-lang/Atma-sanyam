import { AgeGroupKey, GenderKey } from "../../types";

/** The subset of a `voices` row a provider needs. */
export interface BaseVoiceRef {
  code: string;
  gender: GenderKey;
  ageGroup: AgeGroupKey;
  tone: string;
  /** { elevenlabs: "id", chatterbox: "name", google: { hi: "hi-IN-…" } } */
  providerVoiceIds: Record<string, unknown>;
  settings?: Record<string, unknown> | null;
}

export interface VoiceSynthesisRequest {
  text: string;
  languageCode: string;
  voice: BaseVoiceRef;
  providerVoiceId: string;
}

export interface VoiceSynthesisResult {
  audio: Buffer;
  format: "wav" | "mp3";
  durationSeconds: number;
  isPlaceholder: boolean;
}

/**
 * Text-to-speech provider for the Studio (brief §9). Implementations must
 * declare which languages they support — support for every Indian language
 * is never assumed — and how a base voice maps to their own voice ID.
 */
export interface VoiceProvider {
  readonly key: string;
  isConfigured(): boolean;
  supportsLanguage(languageCode: string): boolean;
  /** Provider voice ID for this base voice in this language, or null if none is configured. */
  resolveVoiceId(voice: BaseVoiceRef, languageCode: string): string | null;
  synthesize(request: VoiceSynthesisRequest): Promise<VoiceSynthesisResult>;
}
