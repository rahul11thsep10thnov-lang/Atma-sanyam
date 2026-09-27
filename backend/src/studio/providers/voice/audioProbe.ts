import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const execFileAsync = promisify(execFile);

/** Exact duration of a PCM WAV buffer, read from its RIFF header. */
export function wavDurationSeconds(buffer: Buffer): number {
  if (buffer.length < 44 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("Not a RIFF/WAVE buffer");
  }
  let offset = 12;
  let byteRate = 0;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString("ascii", offset, offset + 4);
    let size = buffer.readUInt32LE(offset + 4);
    if (id === "fmt ") byteRate = buffer.readUInt32LE(offset + 16);
    if (id === "data") {
      if (!byteRate) throw new Error("WAV data chunk before fmt chunk");
      // Streaming TTS servers sometimes write 0 or 0xFFFFFFFF as the size.
      if (size === 0 || size === 0xffffffff || offset + 8 + size > buffer.length) size = buffer.length - offset - 8;
      return size / byteRate;
    }
    offset += 8 + size + (size % 2);
  }
  throw new Error("WAV has no data chunk");
}

/** Duration via ffprobe (works for any format); null if ffprobe is unavailable. */
export async function probeDurationSeconds(audio: Buffer, extension: string): Promise<number | null> {
  const dir = await mkdtemp(path.join(tmpdir(), "atma-probe-"));
  try {
    const file = path.join(dir, `audio.${extension}`);
    await writeFile(file, audio);
    const { stdout } = await execFileAsync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file]);
    const value = Number(stdout.trim());
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

/** MP3 duration: ffprobe when present, else constant-bitrate estimate. */
export async function mp3DurationSeconds(audio: Buffer, kbps: number): Promise<number> {
  return (await probeDurationSeconds(audio, "mp3")) ?? (audio.length * 8) / (kbps * 1000);
}
