import { spawn } from "node:child_process";
import { cpus } from "node:os";
import { join } from "node:path";
import { Worker } from "node:worker_threads";
import { FrameRenderer, FrameSize } from "./frameRenderer";
import { SceneData } from "./scene";
import { encodePngRgba } from "../media/png";

/** Bumped whenever the engine's output for the same manifest changes (invalidates render caches). */
export const ENGINE_VERSION = "engine25d-1.0.0";

export interface ShotRenderOptions extends FrameSize {
  crf: number;
  preset: string;
  /** Worker threads (default: cores − 1, max 8). 1 renders in-process. */
  workers?: number;
  signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
}

export interface ShotRenderResult {
  frames: number;
  width: number;
  height: number;
  fps: number;
  durationSeconds: number;
  renderMs: number;
}

export class RenderCancelledError extends Error {
  constructor() {
    super("Render cancelled");
    this.name = "RenderCancelledError";
  }
}

function defaultWorkers(): number {
  return Math.max(1, Math.min(8, cpus().length - 1));
}

/** Spawns a worker that runs FrameRenderer on the shared scene data. */
function spawnWorker(scene: SceneData, size: FrameSize): Worker {
  const ts = __filename.endsWith(".ts");
  const file = join(__dirname, ts ? "renderWorker.ts" : "renderWorker.js");
  return new Worker(file, { workerData: { scene, size }, execArgv: ts ? ["--require", "tsx/cjs"] : [] });
}

/**
 * Renders a shot to an H.264 MP4: frames are rendered in parallel on worker
 * threads (scene buffers are shared, not copied), re-ordered and streamed to
 * FFmpeg as raw RGB. Deterministic: the same scene and options always
 * produce the same frames.
 */
export async function renderShotToFile(scene: SceneData, outPath: string, opts: ShotRenderOptions): Promise<ShotRenderResult> {
  const started = Date.now();
  const size: FrameSize = { width: opts.width, height: opts.height, fps: opts.fps };
  const total = Math.max(1, Math.round(scene.manifest.canvas.durationSeconds * opts.fps));
  const ff = spawn(
    "ffmpeg",
    ["-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", `${opts.width}x${opts.height}`, "-r", String(opts.fps), "-i", "pipe:0", "-an", "-c:v", "libx264", "-preset", opts.preset, "-crf", String(opts.crf), "-pix_fmt", "yuv420p", "-movflags", "+faststart", outPath],
    { stdio: ["pipe", "ignore", "pipe"] },
  );
  let ffErr = "";
  ff.stderr.on("data", (c) => (ffErr += c.toString()));
  const ffDone = new Promise<void>((resolve, reject) => {
    ff.on("error", reject);
    ff.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}: ${ffErr.slice(-500)}`))));
  });
  const write = (buf: Uint8Array) =>
    new Promise<void>((resolve, reject) => {
      if (!ff.stdin.write(buf, (e) => (e ? reject(e) : undefined))) ff.stdin.once("drain", resolve);
      else resolve();
    });

  const nWorkers = Math.min(opts.workers ?? defaultWorkers(), total);
  try {
    if (nWorkers <= 1) {
      const r = new FrameRenderer(scene, size);
      for (let i = 0; i < total; i++) {
        if (opts.signal?.aborted) throw new RenderCancelledError();
        await write(r.renderFrame(i));
        opts.onProgress?.(i + 1, total);
      }
    } else {
      await renderParallel(scene, size, total, nWorkers, write, opts);
    }
    ff.stdin.end();
    await ffDone;
  } catch (e) {
    ff.stdin.destroy();
    ff.kill("SIGKILL");
    await ffDone.catch(() => undefined);
    throw e;
  }
  return { frames: total, width: opts.width, height: opts.height, fps: opts.fps, durationSeconds: total / opts.fps, renderMs: Date.now() - started };
}

async function renderParallel(scene: SceneData, size: FrameSize, total: number, nWorkers: number, write: (b: Uint8Array) => Promise<void>, opts: ShotRenderOptions): Promise<void> {
  const workers = Array.from({ length: nWorkers }, () => spawnWorker(scene, size));
  const pending = new Map<number, Uint8Array>();
  let next = 0; // next frame to dispatch
  let written = 0; // next frame to write
  let failed: Error | null = null;
  let wake: (() => void) | null = null;
  const signalWake = () => {
    const w = wake;
    wake = null;
    w?.();
  };
  const maxBuffered = nWorkers * 3;
  const dispatch = (w: Worker) => {
    if (failed || next >= total || pending.size >= maxBuffered) return false;
    w.postMessage({ frame: next++ });
    return true;
  };
  const idle: Worker[] = [];
  for (const w of workers) {
    w.on("message", (msg: { frame: number; rgb?: Uint8Array; error?: string }) => {
      if (msg.error) {
        failed = new Error(`Render worker failed on frame ${msg.frame}: ${msg.error}`);
      } else pending.set(msg.frame, msg.rgb!);
      if (!dispatch(w)) idle.push(w);
      signalWake();
    });
    w.on("error", (e) => {
      failed = e;
      signalWake();
    });
    if (!dispatch(w)) idle.push(w);
  }
  const onAbort = () => {
    failed = new RenderCancelledError();
    signalWake();
  };
  opts.signal?.addEventListener("abort", onAbort);
  try {
    while (written < total) {
      if (failed) throw failed;
      const buf = pending.get(written);
      if (buf) {
        pending.delete(written);
        await write(buf);
        written++;
        opts.onProgress?.(written, total);
        while (idle.length && dispatch(idle[idle.length - 1])) idle.pop();
        continue;
      }
      await new Promise<void>((r) => (wake = r));
    }
  } finally {
    opts.signal?.removeEventListener("abort", onAbort);
    await Promise.all(workers.map((w) => w.terminate()));
  }
}

/** Renders a single frame (thumbnails, inspector key frames) as PNG. */
export function renderStillPng(scene: SceneData, size: FrameSize, frame: number): Buffer {
  const r = new FrameRenderer(scene, size);
  const rgb = r.renderFrame(Math.min(frame, r.frameCount - 1));
  const rgba = new Uint8Array(size.width * size.height * 4);
  for (let i = 0, j = 0; i < rgb.length; i += 3, j += 4) {
    rgba[j] = rgb[i];
    rgba[j + 1] = rgb[i + 1];
    rgba[j + 2] = rgb[i + 2];
    rgba[j + 3] = 255;
  }
  return encodePngRgba(size.width, size.height, rgba);
}
