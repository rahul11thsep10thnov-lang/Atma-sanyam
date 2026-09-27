// Language registry. Codes are BCP-47 so new languages need no schema change:
// add an entry and set `enabled: true`. `script` drives the validator's
// "question is in the requested language" check.

export type Script = 'Latin' | 'Devanagari' | 'Bengali' | 'Tamil' | 'Telugu' | 'Kannada' | 'Malayalam';

export interface LanguageInfo {
  code: string;
  name: string;
  /** How the generator prompt names the language. */
  promptName: string;
  script: Script;
  enabled: boolean;
}

export const LANGUAGES: LanguageInfo[] = [
  // The website's current content language: Hindi written in Latin script.
  { code: 'hi-Latn', name: 'Hinglish', promptName: 'Hinglish (Hindi written in Roman/Latin script, with common English terms)', script: 'Latin', enabled: true },
  { code: 'hi', name: 'Hindi', promptName: 'Hindi (Devanagari script)', script: 'Devanagari', enabled: true },
  { code: 'en', name: 'English', promptName: 'English', script: 'Latin', enabled: true },
  { code: 'bn', name: 'Bengali', promptName: 'Bengali (Bengali script)', script: 'Bengali', enabled: false },
  { code: 'mr', name: 'Marathi', promptName: 'Marathi (Devanagari script)', script: 'Devanagari', enabled: false },
  { code: 'ta', name: 'Tamil', promptName: 'Tamil (Tamil script)', script: 'Tamil', enabled: false },
  { code: 'te', name: 'Telugu', promptName: 'Telugu (Telugu script)', script: 'Telugu', enabled: false },
  { code: 'kn', name: 'Kannada', promptName: 'Kannada (Kannada script)', script: 'Kannada', enabled: false },
  { code: 'ml', name: 'Malayalam', promptName: 'Malayalam (Malayalam script)', script: 'Malayalam', enabled: false },
  { code: 'as', name: 'Assamese', promptName: 'Assamese (Bengali-Assamese script)', script: 'Bengali', enabled: false },
];

export const LANGUAGE_MAP = new Map(LANGUAGES.map((l) => [l.code, l]));
export const ENABLED_LANGUAGE_CODES = LANGUAGES.filter((l) => l.enabled).map((l) => l.code) as [string, ...string[]];

const SCRIPT_RANGES: Record<Script, RegExp> = {
  Latin: /[A-Za-z]/g,
  Devanagari: /[ऀ-ॿ]/g,
  Bengali: /[ঀ-৿]/g,
  Tamil: /[஀-௿]/g,
  Telugu: /[ఀ-౿]/g,
  Kannada: /[ಀ-೿]/g,
  Malayalam: /[ഀ-ൿ]/g,
};

/** Share of letters in `text` that belong to `script` (0–1); 1 when no letters. */
export function scriptShare(text: string, script: Script): number {
  const letters = text.match(/\p{L}/gu)?.length ?? 0;
  if (letters === 0) return 1;
  const matching = text.match(SCRIPT_RANGES[script])?.length ?? 0;
  return matching / letters;
}
