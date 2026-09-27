import { SUPPORTED_LANGUAGES } from "../../data/languages";

export interface LanguageProfile {
  code: string; // ISO 639-1 style code used throughout the system
  englishName: string;
  nativeName: string;
  iso6392: string; // container metadata (MP4/MKV audio track language)
  script: "Latin" | "Devanagari" | "Bengali" | "Gujarati" | "Gurmukhi" | "Odia" | "Tamil" | "Telugu" | "Kannada" | "Malayalam";
  /** Code point of the script's native digit zero, if it has native digits. */
  nativeDigitZero?: number;
  /**
   * Calm news-narration speaking rate in words per minute. Agglutinative
   * Dravidian languages pack more meaning into fewer, longer words, so their
   * word rate is lower. Used only for planning; real durations always come
   * from the synthesised audio.
   */
  wordsPerMinute: number;
  /** Google Cloud TTS locale (voice names are configured per base voice). */
  googleLocale: string;
  /** Noto font family that covers the script (burned-in subtitles). */
  notoFont: string;
  sentenceTerminators: RegExp;
}

const PROFILE_DATA: Omit<LanguageProfile, "englishName" | "nativeName">[] = [
  { code: "hi", iso6392: "hin", script: "Devanagari", nativeDigitZero: 0x0966, wordsPerMinute: 140, googleLocale: "hi-IN", notoFont: "Noto Sans Devanagari", sentenceTerminators: /(?<=[।.!?])\s+/ },
  { code: "en", iso6392: "eng", script: "Latin", wordsPerMinute: 150, googleLocale: "en-IN", notoFont: "Noto Sans", sentenceTerminators: /(?<=[.!?])\s+/ },
  { code: "bn", iso6392: "ben", script: "Bengali", nativeDigitZero: 0x09e6, wordsPerMinute: 120, googleLocale: "bn-IN", notoFont: "Noto Sans Bengali", sentenceTerminators: /(?<=[।.!?])\s+/ },
  { code: "mr", iso6392: "mar", script: "Devanagari", nativeDigitZero: 0x0966, wordsPerMinute: 115, googleLocale: "mr-IN", notoFont: "Noto Sans Devanagari", sentenceTerminators: /(?<=[।.!?])\s+/ },
  { code: "gu", iso6392: "guj", script: "Gujarati", nativeDigitZero: 0x0ae6, wordsPerMinute: 125, googleLocale: "gu-IN", notoFont: "Noto Sans Gujarati", sentenceTerminators: /(?<=[।.!?])\s+/ },
  { code: "ta", iso6392: "tam", script: "Tamil", nativeDigitZero: 0x0be6, wordsPerMinute: 95, googleLocale: "ta-IN", notoFont: "Noto Sans Tamil", sentenceTerminators: /(?<=[.!?])\s+/ },
  { code: "te", iso6392: "tel", script: "Telugu", nativeDigitZero: 0x0c66, wordsPerMinute: 100, googleLocale: "te-IN", notoFont: "Noto Sans Telugu", sentenceTerminators: /(?<=[.!?])\s+/ },
  { code: "kn", iso6392: "kan", script: "Kannada", nativeDigitZero: 0x0ce6, wordsPerMinute: 100, googleLocale: "kn-IN", notoFont: "Noto Sans Kannada", sentenceTerminators: /(?<=[.!?])\s+/ },
  { code: "ml", iso6392: "mal", script: "Malayalam", nativeDigitZero: 0x0d66, wordsPerMinute: 85, googleLocale: "ml-IN", notoFont: "Noto Sans Malayalam", sentenceTerminators: /(?<=[.!?])\s+/ },
  { code: "pa", iso6392: "pan", script: "Gurmukhi", nativeDigitZero: 0x0a66, wordsPerMinute: 140, googleLocale: "pa-IN", notoFont: "Noto Sans Gurmukhi", sentenceTerminators: /(?<=[।.!?])\s+/ },
  { code: "or", iso6392: "ori", script: "Odia", nativeDigitZero: 0x0b66, wordsPerMinute: 110, googleLocale: "or-IN", notoFont: "Noto Sans Oriya", sentenceTerminators: /(?<=[।.!?])\s+/ },
  { code: "as", iso6392: "asm", script: "Bengali", nativeDigitZero: 0x09e6, wordsPerMinute: 115, googleLocale: "as-IN", notoFont: "Noto Sans Bengali", sentenceTerminators: /(?<=[।.!?])\s+/ },
];

export const LANGUAGE_PROFILES: Record<string, LanguageProfile> = Object.fromEntries(
  PROFILE_DATA.map((p) => {
    const def = SUPPORTED_LANGUAGES.find((l) => l.code === p.code);
    if (!def) throw new Error(`Language profile ${p.code} missing from SUPPORTED_LANGUAGES`);
    return [p.code, { ...p, englishName: def.englishName, nativeName: def.nativeName }];
  })
);

export const STUDIO_LANGUAGE_CODES = Object.keys(LANGUAGE_PROFILES);

export function getLanguageProfile(code: string): LanguageProfile {
  const profile = LANGUAGE_PROFILES[code];
  if (!profile) throw new Error(`Unsupported studio language "${code}"`);
  return profile;
}

export function isStudioLanguage(code: string): boolean {
  return code in LANGUAGE_PROFILES;
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/** Planned speaking time for text in a language, at a calm news pace. */
export function estimateSpeechSeconds(text: string, languageCode: string): number {
  const words = countWords(text);
  if (words === 0) return 0;
  return (words / getLanguageProfile(languageCode).wordsPerMinute) * 60;
}

export function splitSentences(text: string, languageCode = "en"): string[] {
  const terminators = LANGUAGE_PROFILES[languageCode]?.sentenceTerminators ?? /(?<=[.!?])\s+/;
  return text
    .split(terminators)
    .map((s) => s.trim())
    .filter(Boolean);
}
