export interface LanguageDefinition {
  code: string;
  englishName: string;
  nativeName: string;
  isDefault?: boolean;
}

// Spec §6 calls for 9 initial languages. Assamese is temporarily removed
// (its Android string resources tripped an AAPT2 resource-compiler bug on
// low-memory Windows builds — see android/app/src/main/res, values-as was
// removed) and should be reinstated once that's root-caused. Backend and
// Android both derive their language lists from this single source of
// truth so a new Indian language can be added in one place.
export const SUPPORTED_LANGUAGES: LanguageDefinition[] = [
  { code: "hi", englishName: "Hindi", nativeName: "हिन्दी" },
  { code: "bn", englishName: "Bengali", nativeName: "বাংলা" },
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
