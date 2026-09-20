import { StoryScriptSections } from "../script-generation/ScriptGenerator";

export interface TranslationInput {
  title: string;
  summary: string;
  sections: StoryScriptSections;
  targetLanguageCode: string;
  targetLanguageName: string;
}

export interface TranslationResult {
  localizedTitle: string;
  localizedSummary: string;
  localizedSections: StoryScriptSections;
}

/**
 * Produces a natural, journalistic localization — not a literal
 * word-for-word translation (spec §8). One implementation per translation
 * strategy; the pipeline only depends on this interface.
 */
export interface TranslationService {
  translate(input: TranslationInput): Promise<TranslationResult>;
}
