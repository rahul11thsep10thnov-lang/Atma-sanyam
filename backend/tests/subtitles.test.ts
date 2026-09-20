import { describe, expect, it } from "vitest";
import { generateSubtitleCues, cuesToVtt } from "../src/modules/subtitles/SubtitleGenerator";

describe("generateSubtitleCues", () => {
  it("splits text into cues that together span the full audio duration", () => {
    const text = Array.from({ length: 50 }, (_, i) => `word${i}`).join(" ");
    const cues = generateSubtitleCues(text, 60);

    expect(cues.length).toBeGreaterThan(1);
    expect(cues[0].startSeconds).toBe(0);
    expect(cues[cues.length - 1].endSeconds).toBeCloseTo(60, 1);
  });

  it("returns an empty array for empty text", () => {
    expect(generateSubtitleCues("", 60)).toHaveLength(0);
  });

  it("produces valid WEBVTT output", () => {
    const cues = generateSubtitleCues("hello world this is a test", 10);
    const vtt = cuesToVtt(cues);
    expect(vtt.startsWith("WEBVTT")).toBe(true);
    expect(vtt).toContain("-->");
  });
});
