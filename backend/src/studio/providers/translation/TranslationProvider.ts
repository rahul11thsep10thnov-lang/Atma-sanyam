export interface LocalizeItem {
  id: string; // e.g. "3.narrator", "3.dialogue.0", "title"
  text: string;
  kind: "narration" | "dialogue" | "on-screen" | "title";
}

export interface LocalizeRequest {
  sourceLanguage: string;
  targetLanguage: string;
  items: LocalizeItem[];
  /** Names/terms with required renderings, e.g. { "Sunita": "सुनीता" }. */
  glossary: { term: string; rendering?: string }[];
  /** Story context so the localisation reads naturally. */
  context: string;
}

export interface LocalizeResult {
  texts: Record<string, string>;
  untranslated: boolean;
}

/**
 * Produces natural, formal news-register text in the target language — not
 * a literal word-for-word translation — while preserving every fact.
 */
export interface TranslationProvider {
  readonly key: string;
  isConfigured(): boolean;
  supports(languageCode: string): boolean;
  localize(request: LocalizeRequest): Promise<LocalizeResult>;
}
