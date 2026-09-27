export interface LanguageDefinition {
  code: string;
  englishName: string;
  nativeName: string;
  isDefault?: boolean;
}

// The 12 launch languages. Backend and Android both derive their language
// lists from this single source of truth (Android fetches /languages), so a
// new Indian language can be added in one place. Android UI strings are
// only bundled for some of these; the app falls back to English UI text
// for the rest while still playing videos in the chosen language.
// Studio-specific metadata (script, digits, speech rate, ISO 639-2) lives
// in src/studio/language/languageProfiles.ts.
export const SUPPORTED_LANGUAGES: LanguageDefinition[] = [
  { code: "hi", englishName: "Hindi", nativeName: "हिन्दी" },
  { code: "en", englishName: "English", nativeName: "English", isDefault: true },
  { code: "bn", englishName: "Bengali", nativeName: "বাংলা" },
  { code: "mr", englishName: "Marathi", nativeName: "मराठी" },
  { code: "gu", englishName: "Gujarati", nativeName: "ગુજરાતી" },
  { code: "ta", englishName: "Tamil", nativeName: "தமிழ்" },
  { code: "te", englishName: "Telugu", nativeName: "తెలుగు" },
  { code: "kn", englishName: "Kannada", nativeName: "ಕನ್ನಡ" },
  { code: "ml", englishName: "Malayalam", nativeName: "മലയാളം" },
  { code: "pa", englishName: "Punjabi", nativeName: "ਪੰਜਾਬੀ" },
  { code: "or", englishName: "Odia", nativeName: "ଓଡ଼ିଆ" },
  { code: "as", englishName: "Assamese", nativeName: "অসমীয়া" },
];

// The automated news pipeline fully wires TTS + translation for these two;
// the rest are enabled in the schema/UI and fall back gracefully if a
// provider lacks coverage (see TranslationService / TextToSpeechProvider).
// The Video Studio supports all 12 (subject to provider coverage).
export const MVP_FULLY_WIRED_LANGUAGES = ["hi", "en"];
