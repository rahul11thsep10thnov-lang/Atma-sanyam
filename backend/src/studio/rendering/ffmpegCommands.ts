// Pure FFmpeg argument builders for the Studio renderer. No I/O here, so
// every command is deterministic and unit-tested; ffmpegRunner executes them.

import { CameraMotion } from "../providers/video/VideoProvider";

export type Transition = "cut" | "fade" | "dissolve" | "slide";

const TRANSITION_SECONDS: Record<Transition, number> = { cut: 0, fade: 0.6, dissolve: 0.3, slide: 0.3 };
const VIDEO_ENCODE = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p"];
export const AUDIO_SAMPLE_RATE = 48000;

export interface SceneClipSpec {
  imagePath?: string; // still image (Ken Burns applied here)
  clipPath?: string; // pre-animated clip from a video provider (held on last frame if short)
  durationSeconds: number;
  width: number;
  height: number;
  fps: number;
  motion: CameraMotion;
  transitionIn: Transition;
  transitionOut: Transition;
  /** ASS file with the scene's on-screen caption (libass: complex shaping + font fallback for mixed scripts). */
  caption?: { assPath: string; fontsDir?: string };
  label?: { textFile: string; fontFile: string };
  outputPath: string;
}

function f(n: number): string {
  return Number(n.toFixed(3)).toString();
}

/** zoompan expressions for a slow, calm camera move over `frames` frames. */
export function zoompanFilter(motion: CameraMotion, frames: number, width: number, height: number, fps: number): string {
  const centreX = "iw/2-(iw/zoom/2)";
  const centreY = "ih/2-(ih/zoom/2)";
  const p = `on/${frames}`;
  const exprs: Record<CameraMotion, { z: string; x: string; y: string }> = {
    "slow-zoom-in": { z: `1+0.10*${p}`, x: centreX, y: centreY },
    "slow-zoom-out": { z: `1.10-0.10*${p}`, x: centreX, y: centreY },
    "pan-right": { z: "1.08", x: `(iw-iw/zoom)*${p}`, y: centreY },
    "pan-left": { z: "1.08", x: `(iw-iw/zoom)*(1-${p})`, y: centreY },
    static: { z: "1.0", x: centreX, y: centreY },
  };
  const e = exprs[motion] ?? exprs["slow-zoom-in"];
  return `zoompan=z='${e.z}':x='${e.x}':y='${e.y}':d=${frames}:s=${width}x${height}:fps=${fps}`;
}

function fadeFilters(spec: SceneClipSpec): string[] {
  const out: string[] = [];
  const inD = Math.min(TRANSITION_SECONDS[spec.transitionIn], spec.durationSeconds / 3);
  const outD = Math.min(TRANSITION_SECONDS[spec.transitionOut], spec.durationSeconds / 3);
  if (inD > 0) out.push(`fade=t=in:st=0:d=${f(inD)}`);
  if (outD > 0) out.push(`fade=t=out:st=${f(spec.durationSeconds - outD)}:d=${f(outD)}`);
  return out;
}

function escapeFilterPath(p: string): string {
  return p.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'");
}

function textOverlays(spec: SceneClipSpec): string[] {
  const out: string[] = [];
  if (spec.caption) {
    const fontsDir = spec.caption.fontsDir ? `:fontsdir='${escapeFilterPath(spec.caption.fontsDir)}'` : "";
    out.push(`ass='${escapeFilterPath(spec.caption.assPath)}'${fontsDir}:shaping=complex`);
  }
  if (spec.label) {
    const size = Math.round(spec.height / 48);
    out.push(
      `drawtext=fontfile='${escapeFilterPath(spec.label.fontFile)}':textfile='${escapeFilterPath(spec.label.textFile)}':fontsize=${size}:fontcolor=white@0.75:x=w-tw-${Math.round(spec.width * 0.03)}:y=${Math.round(spec.height * 0.04)}`
    );
  }
  return out;
}

/** Renders one scene (video only) at exactly `durationSeconds`. */
export function buildSceneClipArgs(spec: SceneClipSpec): string[] {
  const frames = Math.max(1, Math.round(spec.durationSeconds * spec.fps));
  const { width: W, height: H } = spec;
  let input: string[];
  let chain: string[];
  if (spec.clipPath) {
    input = ["-i", spec.clipPath];
    chain = [
      `scale=${W}:${H}:force_original_aspect_ratio=increase`,
      `crop=${W}:${H}`,
      `fps=${spec.fps}`,
      `tpad=stop_mode=clone:stop_duration=${f(spec.durationSeconds)}`,
      `trim=duration=${f(spec.durationSeconds)}`,
      "setpts=PTS-STARTPTS",
    ];
  } else if (spec.imagePath) {
    input = ["-i", spec.imagePath];
    chain = [`scale=${W * 2}:${H * 2}:force_original_aspect_ratio=increase`, `crop=${W * 2}:${H * 2}`, zoompanFilter(spec.motion, frames, W, H, spec.fps)];
  } else {
    input = ["-f", "lavfi", "-i", `color=c=0x1b2a3a:s=${W}x${H}:r=${spec.fps}:d=${f(spec.durationSeconds)}`];
    chain = [];
  }
  const filters = [...chain, ...textOverlays(spec), ...fadeFilters(spec), "setsar=1", "format=yuv420p"];
  return ["-y", ...input, "-vf", filters.join(","), "-frames:v", String(frames), "-r", String(spec.fps), "-an", ...VIDEO_ENCODE, spec.outputPath];
}

/** Joins identically-encoded scene clips without re-encoding. */
export function buildConcatArgs(listFile: string, outputPath: string): string[] {
  return ["-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", "-movflags", "+faststart", outputPath];
}

export function concatListContent(paths: string[]): string {
  return paths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n") + "\n";
}

export interface PlacedAudio {
  path: string;
  startSeconds: number;
}

/** A single track (narration or dialogue): every line placed at its timeline position, padded to the full length. */
export function buildPlacedTrackArgs(items: PlacedAudio[], totalSeconds: number, outputPath: string): string[] {
  if (items.length === 0) {
    return ["-y", "-f", "lavfi", "-i", `anullsrc=r=${AUDIO_SAMPLE_RATE}:cl=mono`, "-t", f(totalSeconds), "-c:a", "pcm_s16le", outputPath];
  }
  const inputs = items.flatMap((i) => ["-i", i.path]);
  const parts = items.map((i, idx) => {
    const ms = Math.max(0, Math.round(i.startSeconds * 1000));
    return `[${idx}:a]aresample=${AUDIO_SAMPLE_RATE},aformat=sample_fmts=fltp:channel_layouts=mono,adelay=${ms}:all=1[a${idx}]`;
  });
  const mixInputs = items.map((_, idx) => `[a${idx}]`).join("");
  const graph = `${parts.join(";")};${mixInputs}amix=inputs=${items.length}:normalize=0:dropout_transition=0,apad=whole_dur=${f(totalSeconds)},atrim=duration=${f(totalSeconds)}[out]`;
  return ["-y", ...inputs, "-filter_complex", graph, "-map", "[out]", "-ar", String(AUDIO_SAMPLE_RATE), "-ac", "1", "-c:a", "pcm_s16le", outputPath];
}

// Generated room tone per ambience type, used when the SFX library has no
// recording for it: very quiet filtered noise, never a musical sound.
export const AMBIENCE_PROFILES: Record<string, { color: string; amplitude: number; filter: string }> = {
  "room-tone": { color: "brown", amplitude: 0.02, filter: "lowpass=f=250" },
  "office-murmur": { color: "pink", amplitude: 0.012, filter: "bandpass=f=500:width_type=h:w=400" },
  "traffic-distant": { color: "brown", amplitude: 0.03, filter: "lowpass=f=400" },
  "street-murmur": { color: "pink", amplitude: 0.012, filter: "lowpass=f=900" },
  "hospital-hum": { color: "brown", amplitude: 0.015, filter: "lowpass=f=180" },
  "rural-birds": { color: "pink", amplitude: 0.006, filter: "highpass=f=1500,lowpass=f=5000" },
  "rural-wind": { color: "brown", amplitude: 0.02, filter: "lowpass=f=600" },
  "station-murmur": { color: "pink", amplitude: 0.014, filter: "lowpass=f=1000" },
};

export interface AmbientSceneSpec {
  startSeconds: number;
  durationSeconds: number;
  ambience: string;
  libraryPath?: string; // licensed recording for this ambience, looped
  sfx: { path: string; offsetSeconds: number }[];
}

/** Ambient bed (per-scene ambience with soft crossfades) plus sparse SFX, as one track. */
export function buildAmbientTrackArgs(scenes: AmbientSceneSpec[], totalSeconds: number, outputPath: string): string[] {
  const inputs: string[] = [];
  const graph: string[] = [];
  let idx = 0;
  const pieces: string[] = [];
  for (const scene of scenes) {
    const d = f(scene.durationSeconds);
    if (scene.libraryPath) {
      inputs.push("-stream_loop", "-1", "-i", scene.libraryPath);
      graph.push(`[${idx}:a]aresample=${AUDIO_SAMPLE_RATE},aformat=sample_fmts=fltp:channel_layouts=mono,atrim=duration=${d},asetpts=PTS-STARTPTS,afade=t=in:d=0.5,afade=t=out:st=${f(Math.max(0, scene.durationSeconds - 0.5))}:d=0.5[s${idx}]`);
    } else {
      const p = AMBIENCE_PROFILES[scene.ambience] ?? AMBIENCE_PROFILES["room-tone"];
      inputs.push("-f", "lavfi", "-i", `anoisesrc=color=${p.color}:amplitude=${p.amplitude}:sample_rate=${AUDIO_SAMPLE_RATE}:duration=${d}:seed=${42 + idx}`);
      graph.push(`[${idx}:a]${p.filter},aformat=sample_fmts=fltp:channel_layouts=mono,afade=t=in:d=0.5,afade=t=out:st=${f(Math.max(0, scene.durationSeconds - 0.5))}:d=0.5[s${idx}]`);
    }
    pieces.push(`[s${idx}]`);
    idx++;
  }
  graph.push(`${pieces.join("")}concat=n=${pieces.length}:v=0:a=1[bed]`);

  const sfxLabels: string[] = [];
  scenes.forEach((scene) =>
    scene.sfx.forEach((sfx) => {
      inputs.push("-i", sfx.path);
      const ms = Math.round((scene.startSeconds + sfx.offsetSeconds) * 1000);
      graph.push(`[${idx}:a]aresample=${AUDIO_SAMPLE_RATE},aformat=sample_fmts=fltp:channel_layouts=mono,volume=0.5,adelay=${ms}:all=1[x${idx}]`);
      sfxLabels.push(`[x${idx}]`);
      idx++;
    })
  );
  if (sfxLabels.length > 0) graph.push(`[bed]${sfxLabels.join("")}amix=inputs=${sfxLabels.length + 1}:normalize=0:dropout_transition=0[mixed]`);
  const last = sfxLabels.length > 0 ? "[mixed]" : "[bed]";
  graph.push(`${last}apad=whole_dur=${f(totalSeconds)},atrim=duration=${f(totalSeconds)}[out]`);
  return ["-y", ...inputs, "-filter_complex", graph.join(";"), "-map", "[out]", "-ar", String(AUDIO_SAMPLE_RATE), "-ac", "1", "-c:a", "pcm_s16le", outputPath];
}

/** Music bed: looped licensed track, gentle fades; always mixed low and ducked. */
export function buildMusicTrackArgs(musicPath: string, totalSeconds: number, outputPath: string): string[] {
  const t = f(totalSeconds);
  return [
    "-y",
    "-stream_loop",
    "-1",
    "-i",
    musicPath,
    "-filter_complex",
    `[0:a]aresample=${AUDIO_SAMPLE_RATE},aformat=sample_fmts=fltp:channel_layouts=stereo,atrim=duration=${t},asetpts=PTS-STARTPTS,afade=t=in:d=2,afade=t=out:st=${f(Math.max(0, totalSeconds - 3))}:d=3[out]`,
    "-map",
    "[out]",
    "-c:a",
    "pcm_s16le",
    outputPath,
  ];
}

export interface MixSpec {
  narrationPath: string;
  dialoguePath: string;
  ambientPath?: string;
  musicPath?: string;
  outputPath: string;
}

/**
 * Final mix with priorities dialogue/narration > ambience > music: speech
 * is summed into a voice bus that side-chains (ducks) both the ambience and
 * the music, then everything is loudness-normalised to -16 LUFS.
 */
export function buildMixArgs(spec: MixSpec): string[] {
  const inputs = ["-i", spec.narrationPath, "-i", spec.dialoguePath];
  const graph = [`[0:a][1:a]amix=inputs=2:normalize=0,aformat=channel_layouts=stereo[voice]`];
  const beds: string[] = [];
  const keys: string[] = [];
  let next = 2;
  const extra = (spec.ambientPath ? 1 : 0) + (spec.musicPath ? 1 : 0);
  graph.push(`[voice]asplit=${extra + 1}[vmain]${Array.from({ length: extra }, (_, i) => `[vk${i}]`).join("")}`);
  let keyIdx = 0;
  if (spec.ambientPath) {
    inputs.push("-i", spec.ambientPath);
    graph.push(`[${next}:a]aformat=channel_layouts=stereo,volume=0.35[amb]`);
    graph.push(`[amb][vk${keyIdx}]sidechaincompress=threshold=0.03:ratio=4:attack=20:release=500[ambd]`);
    beds.push("[ambd]");
    keys.push(`vk${keyIdx}`);
    keyIdx++;
    next++;
  }
  if (spec.musicPath) {
    inputs.push("-i", spec.musicPath);
    graph.push(`[${next}:a]aformat=channel_layouts=stereo,volume=0.16[mus]`);
    graph.push(`[mus][vk${keyIdx}]sidechaincompress=threshold=0.02:ratio=10:attack=15:release=600[musd]`);
    beds.push("[musd]");
    keys.push(`vk${keyIdx}`);
    keyIdx++;
    next++;
  }
  graph.push(`[vmain]${beds.join("")}amix=inputs=${1 + beds.length}:normalize=0:dropout_transition=0,loudnorm=I=-16:TP=-1.5:LRA=11[out]`);
  return ["-y", ...inputs, "-filter_complex", graph.join(";"), "-map", "[out]", "-ar", String(AUDIO_SAMPLE_RATE), "-ac", "2", "-c:a", "pcm_s16le", spec.outputPath];
}

export interface MuxAudio {
  path: string;
  iso6392: string;
  title: string;
}
export interface MuxSubtitle {
  path: string; // .srt
  iso6392: string;
}

/**
 * Final MP4: one video stream, one AAC track per language (a single one for
 * per-language files, several for the multi-audio package), soft subtitle
 * tracks, and optionally subtitles burned into the picture (re-encode).
 */
export function buildMuxArgs(spec: {
  videoPath: string;
  audio: MuxAudio[];
  subtitles: MuxSubtitle[];
  burnIn?: { assPath: string; fontsDir?: string };
  outputPath: string;
}): string[] {
  const args = ["-y", "-i", spec.videoPath];
  spec.audio.forEach((a) => args.push("-i", a.path));
  spec.subtitles.forEach((s) => args.push("-i", s.path));
  args.push("-map", "0:v:0");
  spec.audio.forEach((_, i) => args.push("-map", `${i + 1}:a:0`));
  spec.subtitles.forEach((_, i) => args.push("-map", `${spec.audio.length + i + 1}:s:0`));

  if (spec.burnIn) {
    // The `ass` filter (not `subtitles`) exposes libass complex shaping, required for Indic scripts.
    const fontsDir = spec.burnIn.fontsDir ? `:fontsdir='${escapeFilterPath(spec.burnIn.fontsDir)}'` : "";
    args.push("-vf", `ass='${escapeFilterPath(spec.burnIn.assPath)}'${fontsDir}:shaping=complex`, ...VIDEO_ENCODE);
  } else {
    args.push("-c:v", "copy");
  }
  args.push("-c:a", "aac", "-b:a", "192k", "-ar", String(AUDIO_SAMPLE_RATE));
  if (spec.subtitles.length > 0) args.push("-c:s", "mov_text");
  spec.audio.forEach((a, i) => args.push(`-metadata:s:a:${i}`, `language=${a.iso6392}`, `-metadata:s:a:${i}`, `title=${a.title}`));
  spec.subtitles.forEach((s, i) => args.push(`-metadata:s:s:${i}`, `language=${s.iso6392}`));
  if (spec.audio.length > 1) args.push("-disposition:a:0", "default");
  args.push("-movflags", "+faststart", spec.outputPath);
  return args;
}

export function buildThumbnailArgs(videoPath: string, atSeconds: number, outputPath: string): string[] {
  return ["-y", "-ss", f(atSeconds), "-i", videoPath, "-frames:v", "1", "-q:v", "3", outputPath];
}
