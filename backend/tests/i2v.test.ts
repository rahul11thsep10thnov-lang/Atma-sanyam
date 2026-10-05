import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer, Server } from "node:http";
import { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AiModel } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ComfyUIClient } from "../src/studio/localai/comfyui/ComfyUIClient";
import { ComfyVideoProvider } from "../src/studio/localai/comfyui/adapters";
import { conformClip } from "../src/studio/production/cinematicPipeline";
import { findRenderProfile } from "../src/studio/engine25d/profiles";
import { DEFAULT_MODELS } from "../src/studio/models/defaultModels";
import { encodePngRgba } from "../src/studio/media/png";

// Optional local I2V: a mock ComfyUI returns a frame sequence; the provider
// assembles an MP4 and the clip is conformed into a normal shot_NNN.mp4.
let server: Server;
let url = "";
const FRAMES = 49; // Wan-style 4n+1

beforeAll(async () => {
  const frame = (i: number) => encodePngRgba(48, 80, new Uint8Array(48 * 80 * 4).map((_, k) => (k % 4 === 3 ? 255 : (i * 5 + (k % 4) * 40) % 255)));
  server = createServer((req, res) => {
    if (req.url === "/upload/image") return void res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ name: "in.png" }));
    if (req.url === "/prompt") return void res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ prompt_id: "v1" }));
    if (req.url === "/history/v1")
      return void res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ v1: { status: { status_str: "success", completed: true }, outputs: { "13": { images: Array.from({ length: FRAMES }, (_, i) => ({ filename: `f_${String(i).padStart(5, "0")}.png`, subfolder: "atma", type: "output" })) } } } }));
    if (req.url?.startsWith("/view?")) {
      const n = Number(new URL(req.url, "http://x").searchParams.get("filename")!.slice(2, 7));
      return void res.writeHead(200, { "Content-Type": "image/png" }).end(frame(n));
    }
    res.writeHead(404).end();
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server.close());

describe("optional local I2V", () => {
  it("generates a clip through the Wan workflow and conforms it to the shot", async () => {
    const wan = DEFAULT_MODELS.find((m) => m.modelId === "wan2.1-i2v-14b-480p")!;
    const model = { ...wan, id: "w", endpoint: null, workflow: wan.workflow!, config: wan.config as never, licenseVerifiedAt: null, licenseUrl: null, attributionText: null, redistributionNotes: null, gpuRequirement: null, overrideApproved: false, overrideReason: null, overrideBy: null, createdAt: new Date(), updatedAt: new Date() } as AiModel;
    const provider = new ComfyVideoProvider(new ComfyUIClient({ baseUrl: url, timeoutMs: 10_000, pollIntervalMs: 10 }));
    const clip = await provider.generateShot({ image: encodePngRgba(2, 2, new Uint8Array(16).fill(200)), prompt: "a man waits", negativePrompt: "", durationSeconds: 3, fps: 30, width: 1080, height: 1920, seed: 5 }, model);
    expect(clip.frames).toBe(FRAMES);
    expect(clip.fps).toBe(16);
    expect(clip.provenance.license).toBe("Apache-2.0");
    const dir = mkdtempSync(join(tmpdir(), "atma-i2v-"));
    try {
      const raw = join(dir, "raw.mp4");
      writeFileSync(raw, clip.video);
      const out = join(dir, "shot_007.mp4");
      const profile = findRenderProfile("draft-270x480-15");
      await conformClip(raw, out, profile, 4.2, clip.frames / clip.fps, 0.5, 0);
      const probe = execFileSync("ffprobe", ["-v", "error", "-count_frames", "-show_entries", "stream=codec_name,width,height,r_frame_rate,nb_read_frames", "-of", "csv=p=0", out]).toString().trim();
      expect(probe).toBe(`h264,270,480,15/1,${Math.round(4.2 * 15)}`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);
});
