import { SubtitleCue, cuesToSrt, cuesToVtt } from "../../modules/subtitles/SubtitleGenerator";
import { PlacedSegment } from "./audioTimeline";

export { cuesToSrt, cuesToVtt };
export type { SubtitleCue };

const MAX_LINE_CHARS = 42;
const MAX_CUE_CHARS = MAX_LINE_CHARS * 2;

/** Splits a line into cue-sized chunks at sentence, then clause, then word boundaries. */
export function chunkText(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= MAX_CUE_CHARS) return clean ? [clean] : [];
  const sentences = clean.split(/(?<=[.!?।])\s+/);
  const chunks: string[] = [];
  for (const sentence of sentences) {
    if (sentence.length <= MAX_CUE_CHARS) {
      chunks.push(sentence);
      continue;
    }
    let current = "";
    for (const word of sentence.split(" ")) {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length > MAX_CUE_CHARS && current) {
        chunks.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) chunks.push(current);
  }
  // Merge tiny trailing chunks into the previous one when they fit.
  return chunks.reduce<string[]>((acc, c) => {
    const last = acc[acc.length - 1];
    if (last && c.length < 20 && last.length + c.length + 1 <= MAX_CUE_CHARS) acc[acc.length - 1] = `${last} ${c}`;
    else acc.push(c);
    return acc;
  }, []);
}

/** Wraps a cue into at most two balanced lines. */
export function wrapCue(text: string): string {
  if (text.length <= MAX_LINE_CHARS) return text;
  const words = text.split(" ");
  let best = text;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" ");
    const b = words.slice(i).join(" ");
    const diff = Math.abs(a.length - b.length);
    if (diff < bestDiff && a.length <= MAX_LINE_CHARS + 6 && b.length <= MAX_LINE_CHARS + 6) {
      best = `${a}\n${b}`;
      bestDiff = diff;
    }
  }
  return best;
}

/**
 * Stage: SUBTITLE GENERATION. Cues come from the exact approved language
 * script and the real synthesised duration of every line, so captions
 * start and end with the voice that speaks them. Within a line, time is
 * shared by character count (no forced alignment).
 */
export function buildSubtitleCues(segments: PlacedSegment[]): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  for (const seg of [...segments].sort((a, b) => a.startSeconds - b.startSeconds)) {
    const chunks = chunkText(seg.text);
    const totalChars = chunks.reduce((s, c) => s + c.length, 0) || 1;
    let t = seg.startSeconds;
    for (const chunk of chunks) {
      const d = (chunk.length / totalChars) * seg.durationSeconds;
      cues.push({ startSeconds: round(t), endSeconds: round(t + d), text: wrapCue(chunk) });
      t += d;
    }
  }
  return cues;
}

function round(n: number) {
  return Math.round(n * 1000) / 1000;
}

function assTime(t: number): string {
  const cs = Math.round(t * 100);
  const h = Math.floor(cs / 360000);
  const m = Math.floor((cs % 360000) / 6000);
  const sec = Math.floor((cs % 6000) / 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(cs % 100).padStart(2, "0")}`;
}

/**
 * ASS subtitles for burning into the picture. Rendered with libass complex
 * (HarfBuzz) shaping so Indic scripts — matras, conjuncts — shape correctly,
 * in the language's Noto font, as a semi-opaque box for legibility.
 */
export function cuesToAss(cues: SubtitleCue[], opts: { fontName: string; width: number; height: number }): string {
  const fontSize = Math.round(opts.height / 20);
  const header = [
    "[Script Info]",
    "ScriptType: v4.00+",
    `PlayResX: ${opts.width}`,
    `PlayResY: ${opts.height}`,
    "WrapStyle: 2",
    "ScaledBorderAndShadow: yes",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: Default,${opts.fontName},${fontSize},&H00FFFFFF,&H00FFFFFF,&H80000000,&H80000000,0,0,0,0,100,100,0,0,3,${Math.round(fontSize / 6)},0,2,${Math.round(opts.width * 0.08)},${Math.round(opts.width * 0.08)},${Math.round(opts.height * 0.06)},1`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ];
  const events = cues.map((c) => `Dialogue: 0,${assTime(c.startSeconds)},${assTime(c.endSeconds)},Default,,0,0,0,,${c.text.replace(/\n/g, "\\N").replace(/[{}]/g, "")}`);
  return [...header, ...events, ""].join("\n");
}

/** A single top-left caption card for a scene, rendered by libass (handles every Indic script and mixed text). */
export function captionToAss(text: string, durationSeconds: number, opts: { fontName: string; width: number; height: number }): string {
  const fontSize = Math.round(opts.height / 26);
  return [
    "[Script Info]",
    "ScriptType: v4.00+",
    `PlayResX: ${opts.width}`,
    `PlayResY: ${opts.height}`,
    "ScaledBorderAndShadow: yes",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: Caption,${opts.fontName},${fontSize},&H00FFFFFF,&H00FFFFFF,&H73000000,&H73000000,1,0,0,0,100,100,0,0,3,${Math.round(fontSize / 3)},0,7,${Math.round(opts.width * 0.05)},${Math.round(opts.width * 0.05)},${Math.round(opts.height * 0.07)},1`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    `Dialogue: 0,${assTime(0)},${assTime(durationSeconds)},Caption,,0,0,0,,${text.replace(/\n/g, "\\N").replace(/[{}]/g, "")}`,
    "",
  ].join("\n");
}
