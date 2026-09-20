import { StoryScriptSections } from "../script-generation/ScriptGenerator";

export interface VideoRenderInput {
  title: string;
  locationLabel: string;
  dateLabel: string;
  sections: StoryScriptSections;
  audioStoragePath: string; // local filesystem path to the narration audio
  audioDurationSeconds: number;
  subtitleVttPath: string; // local filesystem path to the .vtt file to burn in
  sourceAttribution: string;
  outputKey: string; // storage key to write the finished mp4 to
}

export interface VideoRenderResult {
  storageUrl: string;
  thumbnailUrl: string;
  durationSeconds: number;
  resolution: string;
}

/**
 * Template-based video renderer (spec §14/§15): a fixed set of animated
 * "scenes" (headline, location, people, background, sequence, authorities,
 * status, source) driven by the script JSON, narrated audio muxed in, and
 * subtitles burned in. No AI-generated faces — text/silhouette/icon based
 * visuals only, clean/sober/newspaper-inspired style, never sensationalist.
 */
export interface VideoRenderer {
  readonly key: string;
  render(input: VideoRenderInput): Promise<VideoRenderResult>;
}
