import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../../config/env";
import { CameraMotion } from "../providers/video/VideoProvider";
import {
  AmbientSceneSpec,
  buildAmbientTrackArgs,
  buildConcatArgs,
  buildMixArgs,
  buildMusicTrackArgs,
  buildMuxArgs,
  buildPlacedTrackArgs,
  buildSceneClipArgs,
  buildThumbnailArgs,
  concatListContent,
  MuxAudio,
  MuxSubtitle,
  Transition,
} from "./ffmpegCommands";
import { TimelineScene, PlacedSegment } from "./audioTimeline";

const execFileAsync = promisify(execFile);

export class FfmpegError extends Error {
  constructor(message: string, public readonly stderrTail: string) {
    super(message);
  }
}

export async function runFfmpeg(args: string[], timeoutMs = 15 * 60 * 1000): Promise<void> {
  try {
    await execFileAsync("ffmpeg", ["-hide_banner", "-loglevel", "error", ...args], { timeout: timeoutMs, maxBuffer: 32 * 1024 * 1024 });
  } catch (err) {
    const e = err as { stderr?: string; message: string };
    const tail = (e.stderr ?? "").split("\n").slice(-15).join("\n");
    throw new FfmpegError(`ffmpeg failed: ${e.message.split("\n")[0]}`, tail);
  }
}

export async function isFfmpegAvailable(): Promise<boolean> {
  try {
    await execFileAsync("ffmpeg", ["-version"]);
    return true;
  } catch {
    return false;
  }
}

const fontCache = new Map<string, string | null>();

/** Resolves a font family (e.g. "Noto Sans Devanagari") to a file: STUDIO_FONT_DIR first, then fontconfig. */
export async function resolveFontFile(family: string, bold = false): Promise<string | null> {
  const cacheKey = `${family}:${bold}`;
  if (fontCache.has(cacheKey)) return fontCache.get(cacheKey)!;
  let found: string | null = null;
  if (env.studio.fontDir) {
    try {
      const files = await readdir(env.studio.fontDir);
      const compact = family.replace(/\s+/g, "");
      const match = files.find((file) => file.startsWith(`${compact}-${bold ? "Bold" : "Regular"}`)) ?? files.find((file) => file.startsWith(compact));
      if (match) found = path.join(env.studio.fontDir, match);
    } catch {
      // fall through to fontconfig
    }
  }
  if (!found) {
    try {
      const { stdout } = await execFileAsync("fc-match", ["-f", "%{file}", `${family}:style=${bold ? "Bold" : "Regular"}`]);
      // fontconfig returns its closest match; a missing script font shows as boxes, which reviewers catch.
      found = stdout.trim() || null;
    } catch {
      found = null;
    }
  }
  fontCache.set(cacheKey, found);
  return found;
}

export interface RenderScene {
  sceneNumber: number;
  imagePath?: string;
  clipPath?: string;
  motion: CameraMotion;
  transition: Transition;
  caption?: string;
  ambience: string;
  ambienceLibraryPath?: string;
  sfx: { path: string; offsetSeconds: number }[];
}

export interface RenderLanguage {
  languageCode: string;
  iso6392: string;
  title: string;
  segments: (PlacedSegment & { path: string })[];
  srtPath: string;
  assPath: string;
}

export interface RenderJob {
  workDir: string;
  width: number;
  height: number;
  fps: number;
  scenes: RenderScene[];
  timeline: TimelineScene[];
  totalSeconds: number;
  languages: RenderLanguage[]; // 1 = per-language MP4, >1 = multi-audio package
  captionFontFamily: string;
  labelText?: string;
  musicPath?: string;
  burnSubtitles: boolean;
  outputPath: string;
  thumbnailPath: string;
  onProgress?: (message: string) => Promise<void> | void;
}

/**
 * Stage: FINAL RENDER. Renders each scene clip over its timeline duration
 * (Ken Burns or provider clip), concatenates them, builds the separate
 * narration / dialogue / ambient / music tracks, mixes them with ducking,
 * and muxes the MP4 with per-language audio and subtitle tracks.
 * Intermediate tracks are kept in the work dir so they can be stored as
 * independently editable audio files.
 */
export async function renderWithFfmpeg(job: RenderJob): Promise<{ tracks: Record<string, Record<string, string>> }> {
  await mkdir(job.workDir, { recursive: true });
  const progress = async (m: string) => {
    if (job.onProgress) await job.onProgress(m);
  };

  const captionFont = (await resolveFontFile(job.captionFontFamily, true)) ?? (await resolveFontFile("Noto Sans", true));
  const labelFont = await resolveFontFile("Noto Sans");

  // 1. Scene clips.
  const clipPaths: string[] = [];
  for (let i = 0; i < job.scenes.length; i++) {
    const scene = job.scenes[i];
    const t = job.timeline.find((s) => s.sceneNumber === scene.sceneNumber);
    if (!t) throw new Error(`Timeline has no entry for scene ${scene.sceneNumber}`);
    const clipPath = path.join(job.workDir, `scene_${String(scene.sceneNumber).padStart(3, "0")}.mp4`);
    let caption: { textFile: string; fontFile: string } | undefined;
    if (scene.caption && captionFont) {
      const textFile = path.join(job.workDir, `caption_${scene.sceneNumber}.txt`);
      await writeFile(textFile, scene.caption);
      caption = { textFile, fontFile: captionFont };
    }
    let label: { textFile: string; fontFile: string } | undefined;
    if (job.labelText && labelFont) {
      const textFile = path.join(job.workDir, "label.txt");
      await writeFile(textFile, job.labelText);
      label = { textFile, fontFile: labelFont };
    }
    await runFfmpeg(
      buildSceneClipArgs({
        imagePath: scene.imagePath,
        clipPath: scene.clipPath,
        durationSeconds: t.durationSeconds,
        width: job.width,
        height: job.height,
        fps: job.fps,
        motion: scene.motion,
        transitionIn: i === 0 ? "fade" : scene.transition,
        transitionOut: i === job.scenes.length - 1 ? "fade" : job.scenes[i + 1].transition,
        caption,
        label,
        outputPath: clipPath,
      })
    );
    clipPaths.push(clipPath);
    await progress(`Rendered scene ${scene.sceneNumber}/${job.scenes.length}`);
  }
  const listFile = path.join(job.workDir, "scenes.txt");
  await writeFile(listFile, concatListContent(clipPaths));
  const videoPath = path.join(job.workDir, "video.mp4");
  await runFfmpeg(buildConcatArgs(listFile, videoPath));

  // 2. Shared beds: ambience/SFX and music (same for every language on this timeline).
  const ambientSpecs: AmbientSceneSpec[] = job.scenes.map((s) => {
    const t = job.timeline.find((x) => x.sceneNumber === s.sceneNumber)!;
    return { startSeconds: t.startSeconds, durationSeconds: t.durationSeconds, ambience: s.ambience, libraryPath: s.ambienceLibraryPath, sfx: s.sfx };
  });
  const ambientPath = path.join(job.workDir, "track_ambient.wav");
  await runFfmpeg(buildAmbientTrackArgs(ambientSpecs, job.totalSeconds, ambientPath));
  let musicPath: string | undefined;
  if (job.musicPath) {
    musicPath = path.join(job.workDir, "track_music.wav");
    await runFfmpeg(buildMusicTrackArgs(job.musicPath, job.totalSeconds, musicPath));
  }
  await progress("Built ambience and music beds");

  // 3. Per-language speech tracks and mix.
  const tracks: Record<string, Record<string, string>> = {};
  const muxAudio: MuxAudio[] = [];
  const muxSubs: MuxSubtitle[] = [];
  for (const lang of job.languages) {
    const narrationPath = path.join(job.workDir, `track_narration_${lang.languageCode}.wav`);
    const dialoguePath = path.join(job.workDir, `track_dialogue_${lang.languageCode}.wav`);
    const mixPath = path.join(job.workDir, `mix_${lang.languageCode}.wav`);
    await runFfmpeg(buildPlacedTrackArgs(lang.segments.filter((s) => s.track === "NARRATION").map((s) => ({ path: s.path, startSeconds: s.startSeconds })), job.totalSeconds, narrationPath));
    await runFfmpeg(buildPlacedTrackArgs(lang.segments.filter((s) => s.track === "DIALOGUE").map((s) => ({ path: s.path, startSeconds: s.startSeconds })), job.totalSeconds, dialoguePath));
    await runFfmpeg(buildMixArgs({ narrationPath, dialoguePath, ambientPath, musicPath, outputPath: mixPath }));
    tracks[lang.languageCode] = { NARRATION: narrationPath, DIALOGUE: dialoguePath, AMBIENT: ambientPath, MIX: mixPath, ...(musicPath ? { MUSIC: musicPath } : {}) };
    muxAudio.push({ path: mixPath, iso6392: lang.iso6392, title: lang.title });
    muxSubs.push({ path: lang.srtPath, iso6392: lang.iso6392 });
    await progress(`Mixed audio for ${lang.languageCode}`);
  }

  // 4. Mux (optionally burning the first language's subtitles into the picture).
  const first = job.languages[0];
  await runFfmpeg(
    buildMuxArgs({
      videoPath,
      audio: muxAudio,
      subtitles: muxSubs,
      burnIn: job.burnSubtitles ? { assPath: first.assPath, fontsDir: env.studio.fontDir || undefined } : undefined,
      outputPath: job.outputPath,
    })
  );
  await runFfmpeg(buildThumbnailArgs(job.outputPath, Math.min(3, job.totalSeconds / 2), job.thumbnailPath));
  await progress("Muxed final MP4");
  return { tracks };
}
