import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { VideoRenderer, VideoRenderInput, VideoRenderResult } from "./VideoRenderer";
import { buildSceneTimeline } from "./sceneTimeline";
import { saveBuffer } from "../../lib/storage";
import { logger } from "../../lib/logger";

const execFileAsync = promisify(execFile);

// Clean, sober, "newspaper-inspired" palette (spec §15): dark navy
// background, white/off-white text, a single muted accent — no flashing,
// no sensational colors.
const BACKGROUND_COLOR = "0x0b1f3a";
const HEADING_COLOR = "0xf2c14e";
const BODY_COLOR = "0xffffff";
const RESOLUTION = "1080x1920";

const CANDIDATE_FONT_PATHS = [
  "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
];

export async function isFfmpegAvailable(): Promise<boolean> {
  try {
    await execFileAsync("ffmpeg", ["-version"]);
    return true;
  } catch {
    return false;
  }
}

async function findFont(): Promise<string> {
  for (const candidate of CANDIDATE_FONT_PATHS) {
    try {
      await readFile(candidate);
      return candidate;
    } catch {
      // try next
    }
  }
  throw new Error(
    "No usable TrueType font found for video rendering. Install a font package (e.g. fonts-dejavu-core) on the render worker host."
  );
}

function wrapText(text: string, maxCharsPerLine = 42): string {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxCharsPerLine) {
      lines.push(current.trim());
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  }
  if (current) lines.push(current);
  return lines.join("\n");
}

/**
 * Real ffmpeg-based implementation of the template video renderer. Scenes
 * are rendered as text cards (heading + wrapped body) over a solid sober
 * background, timed per buildSceneTimeline, with narration audio and
 * burned-in subtitles. This is the MVP visual template (v1) — future
 * template versions can add icon/illustration overlays and simple motion
 * without changing the VideoRenderer interface.
 */
export class FfmpegTemplateRenderer implements VideoRenderer {
  readonly key = "ffmpeg-template-v1";

  async render(input: VideoRenderInput): Promise<VideoRenderResult> {
    const font = await findFont();
    const workDir = await mkdtemp(path.join(tmpdir(), "atma-render-"));

    try {
      const scenes = buildSceneTimeline(input.sections, input.audioDurationSeconds);
      const drawtextFilters: string[] = [];

      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        const headingFile = path.join(workDir, `heading_${i}.txt`);
        const bodyFile = path.join(workDir, `body_${i}.txt`);
        await writeFile(headingFile, scene.heading);
        await writeFile(bodyFile, wrapText(scene.body));

        const enable = `enable='between(t,${scene.startSeconds.toFixed(2)},${scene.endSeconds.toFixed(2)})'`;
        drawtextFilters.push(
          `drawtext=fontfile=${font}:textfile=${headingFile}:fontsize=58:fontcolor=${HEADING_COLOR}:x=(w-text_w)/2:y=260:${enable}`
        );
        drawtextFilters.push(
          `drawtext=fontfile=${font}:textfile=${bodyFile}:fontsize=42:fontcolor=${BODY_COLOR}:line_spacing=16:x=(w-text_w)/2:y=420:${enable}`
        );
      }

      // Fixed footer caption clarifying this is an illustrative, AI-generated
      // summary — never presented as real footage of real people (§14/§39).
      const footerFile = path.join(workDir, "footer.txt");
      await writeFile(footerFile, "Representative illustration. AI-generated summary.");
      drawtextFilters.push(
        `drawtext=fontfile=${font}:textfile=${footerFile}:fontsize=28:fontcolor=${BODY_COLOR}@0.7:x=(w-text_w)/2:y=h-160`
      );

      const outputPath = path.join(workDir, "output.mp4");
      const args = [
        "-y",
        "-f",
        "lavfi",
        "-i",
        `color=c=${BACKGROUND_COLOR}:s=${RESOLUTION}:d=${input.audioDurationSeconds.toFixed(2)}`,
        "-i",
        input.audioStoragePath,
        "-filter_complex",
        `[0:v]${drawtextFilters.join(",")}[video]`,
        "-map",
        "[video]",
        "-map",
        "1:a",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-shortest",
        outputPath,
      ];

      await execFileAsync("ffmpeg", args);

      const thumbnailPath = path.join(workDir, "thumbnail.jpg");
      await execFileAsync("ffmpeg", ["-y", "-i", outputPath, "-ss", "00:00:01", "-vframes", "1", thumbnailPath]);

      const videoBuffer = await readFile(outputPath);
      const thumbnailBuffer = await readFile(thumbnailPath);

      const storageUrl = await saveBuffer(input.outputKey, videoBuffer);
      const thumbnailUrl = await saveBuffer(input.outputKey.replace(/\.mp4$/, ".jpg"), thumbnailBuffer);

      return {
        storageUrl,
        thumbnailUrl,
        durationSeconds: Math.round(input.audioDurationSeconds),
        resolution: RESOLUTION,
      };
    } finally {
      await rm(workDir, { recursive: true, force: true }).catch((err) =>
        logger.warn({ err }, "Failed to clean up render work directory")
      );
    }
  }
}
