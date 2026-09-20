export interface LanguageDefinition {
  code: string;
  englishName: string;
  nativeName: string;
  isDefault?: boolean;
}

// The nine initial supported languages (spec §6). Backend and Android both
// derive their language lists from this single source of truth so a new
// Indian language can be added in one place.
export const SUPPORTED_LANGUAGES: LanguageDefinition[] = [
  { code: "hi", englishName: "Hindi", nativeName: "हिन्दी" },
  { code: "bn", englishName: "Bengali", nativeName: "বাংলা" },
  { code: "as", englishName: "Assamese", nativeName: "অসমীয়া" },
  { code: "ta", englishName: "Tamil", nativeName: "தமிழ்" },
  { code: "te", englishName: "Telugu", nativeName: "తెలుగు" },
  { code: "kn", englishName: "Kannada", nativeName: "ಕನ್ನಡ" },
  { code: "mr", englishName: "Marathi", nativeName: "मराठी" },
  { code: "ml", englishName: "Malayalam", nativeName: "മലയാളം" },
  { code: "en", englishName: "English", nativeName: "English", isDefault: true },
];

// MVP fully wires TTS + translation for these two; the rest are enabled in
// the schema/UI from day one but fall back gracefully if a provider lacks
// coverage (see TranslationService / TextToSpeechProvider).
export const MVP_FULLY_WIRED_LANGUAGES = ["hi", "en"];
