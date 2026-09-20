import { StoryScriptSections } from "../script-generation/ScriptGenerator";

export interface Scene {
  heading: string; // e.g. "WHAT HAPPENED", "LOCATION"
  body: string;
  startSeconds: number;
  endSeconds: number;
}

const SCENE_HEADINGS: Record<keyof StoryScriptSections, string> = {
  introduction: "FAMILY NEWS",
  location: "LOCATION",
  people: "PEOPLE INVOLVED",
  background: "BACKGROUND",
  sequence: "WHAT HAPPENED",
  authorities: "POLICE / AUTHORITIES",
  currentStatus: "CURRENT STATUS",
  context: "CONTEXT",
  sourceAttribution: "SOURCE",
};

/**
 * Splits the narration duration across scenes proportionally to each
 * section's word count, so on-screen text timing tracks the (proportional)
 * audio timing used for subtitles too — keeping visuals, narration and
 * captions consistent without word-level alignment (MVP-level fidelity;
 * see SubtitleGenerator for the same tradeoff).
 */
export function buildSceneTimeline(sections: StoryScriptSections, totalDurationSeconds: number): Scene[] {
  const entries = Object.entries(sections) as [keyof StoryScriptSections, string][];
  const wordCounts = entries.map(([, text]) => text.split(/\s+/).filter(Boolean).length || 1);
  const totalWords = wordCounts.reduce((a, b) => a + b, 0);

  let cursor = 0;
  return entries.map(([key, text], i) => {
    const duration = (wordCounts[i] / totalWords) * totalDurationSeconds;
    const start = cursor;
    cursor += duration;
    return { heading: SCENE_HEADINGS[key], body: text, startSeconds: start, endSeconds: cursor };
  });
}
