export interface SubtitleCue {
  startSeconds: number;
  endSeconds: number;
  text: string;
}

const MAX_WORDS_PER_CUE = 12;

/**
 * Generates subtitle cues from narration text and the actual synthesized
 * audio duration, so subtitles stay in sync with audio (spec §17) even
 * though we don't have word-level forced-alignment timestamps in the MVP:
 * time is allocated proportionally to each cue's share of the total word
 * count. Swap this for a forced-aligner (e.g. based on the TTS provider's
 * own timepoints, when available) without changing callers.
 */
export function generateSubtitleCues(fullText: string, totalDurationSeconds: number): SubtitleCue[] {
  const words = fullText.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const chunks: string[][] = [];
  for (let i = 0; i < words.length; i += MAX_WORDS_PER_CUE) {
    chunks.push(words.slice(i, i + MAX_WORDS_PER_CUE));
  }

  const secondsPerWord = totalDurationSeconds / words.length;
  let cursor = 0;
  return chunks.map((chunk) => {
    const start = cursor;
    const duration = chunk.length * secondsPerWord;
    cursor += duration;
    return { startSeconds: start, endSeconds: cursor, text: chunk.join(" ") };
  });
}

export function cuesToVtt(cues: SubtitleCue[]): string {
  const lines = ["WEBVTT", ""];
  for (const cue of cues) {
    lines.push(`${formatVttTime(cue.startSeconds)} --> ${formatVttTime(cue.endSeconds)}`);
    lines.push(cue.text);
    lines.push("");
  }
  return lines.join("\n");
}

export function cuesToSrt(cues: SubtitleCue[]): string {
  const lines: string[] = [];
  cues.forEach((cue, index) => {
    lines.push(String(index + 1));
    lines.push(`${formatSrtTime(cue.startSeconds)} --> ${formatSrtTime(cue.endSeconds)}`);
    lines.push(cue.text);
    lines.push("");
  });
  return lines.join("\n");
}

function formatVttTime(totalSeconds: number): string {
  return formatTime(totalSeconds, ".");
}

function formatSrtTime(totalSeconds: number): string {
  return formatTime(totalSeconds, ",");
}

function formatTime(totalSeconds: number, msSeparator: string): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const millis = Math.round((totalSeconds - Math.floor(totalSeconds)) * 1000);
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}${msSeparator}${pad(millis, 3)}`;
}
