import { env } from "../../../config/env";
import { AnimateRequest, VideoProvider } from "./VideoProvider";

const POLL_INTERVAL_MS = 5000;
const TIMEOUT_MS = 10 * 60 * 1000;

/**
 * Generic asynchronous image-to-video adapter. Contract:
 *   POST {VIDEO_PROVIDER_BASE_URL}/generations
 *        { image_base64, prompt, duration_seconds, width, height, fps, camera_motion }
 *        → { id }
 *   GET  {VIDEO_PROVIDER_BASE_URL}/generations/{id}
 *        → { status: "queued"|"running"|"succeeded"|"failed", video_url?, error? }
 * Vendors differ (Runway, Luma, Kling, Veo…); point this at a thin proxy
 * that speaks this contract, or adapt the two calls below to the vendor.
 */
export class HttpVideoProvider implements VideoProvider {
  readonly key = "http";
  readonly rendersInline = false;

  isConfigured(): boolean {
    return !!env.studio.videoProviderBaseUrl && !!env.studio.videoProviderApiKey;
  }

  private headers() {
    return { Authorization: `Bearer ${env.studio.videoProviderApiKey}`, "Content-Type": "application/json" };
  }

  async animate(request: AnimateRequest): Promise<{ video: Buffer }> {
    const base = env.studio.videoProviderBaseUrl.replace(/\/$/, "");
    const created = await fetch(`${base}/generations`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        image_base64: request.image.toString("base64"),
        prompt: request.prompt,
        duration_seconds: request.durationSeconds,
        width: request.width,
        height: request.height,
        fps: request.fps,
        camera_motion: request.motion,
      }),
    });
    if (!created.ok) throw new Error(`Video provider create failed (${created.status})`);
    const { id } = (await created.json()) as { id: string };

    const deadline = Date.now() + TIMEOUT_MS;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      const poll = await fetch(`${base}/generations/${encodeURIComponent(id)}`, { headers: this.headers() });
      if (!poll.ok) throw new Error(`Video provider poll failed (${poll.status})`);
      const body = (await poll.json()) as { status: string; video_url?: string; error?: string };
      if (body.status === "failed") throw new Error(`Video generation failed: ${body.error ?? "unknown error"}`);
      if (body.status === "succeeded" && body.video_url) {
        const file = await fetch(body.video_url);
        if (!file.ok) throw new Error(`Failed to download generated clip (${file.status})`);
        return { video: Buffer.from(await file.arrayBuffer()) };
      }
    }
    throw new Error("Video generation timed out");
  }
}
