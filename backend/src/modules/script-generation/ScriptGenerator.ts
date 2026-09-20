import { ExtractedStory } from "../extraction/StoryExtractor";

/** Section-structured script matching spec §9. */
export interface StoryScriptSections {
  introduction: string;
  location: string;
  people: string;
  background: string;
  sequence: string;
  authorities: string;
  currentStatus: string;
  context: string;
  sourceAttribution: string;
}

export interface ScriptGenerationInput {
  extracted: ExtractedStory;
  sourceNames: string[];
}

export interface GeneratedScript {
  sections: StoryScriptSections;
  fullText: string;
  wordCount: number;
  estimatedDurationSeconds: number;
}

export interface ScriptGenerator {
  generate(input: ScriptGenerationInput): Promise<GeneratedScript>;
}

const WORDS_PER_MINUTE = 130;

export function assembleScript(sections: StoryScriptSections): GeneratedScript {
  const fullText = Object.values(sections).join(" ");
  const wordCount = fullText.split(/\s+/).filter(Boolean).length;
  const estimatedDurationSeconds = Math.round((wordCount / WORDS_PER_MINUTE) * 60);
  return { sections, fullText, wordCount, estimatedDurationSeconds };
}
