import { VideoRenderer, VideoRenderInput, VideoRenderResult } from "./VideoRenderer";
import { saveBuffer } from "../../lib/storage";

/**
 * Offline/dev/test renderer used when ffmpeg is not available on the host.
 * Writes a small JSON manifest describing what a real render would have
 * produced, so the rest of the pipeline (publishing, feed, admin review)
 * is fully exercisable without ffmpeg installed. Never used in production.
 */
export class MockVideoRenderer implements VideoRenderer {
  readonly key = "mock";

  async render(input: VideoRenderInput): Promise<VideoRenderResult> {
    const manifest = {
      note: "MOCK RENDER — ffmpeg not available on this host. This is not a real video file.",
      title: input.title,
      locationLabel: input.locationLabel,
      dateLabel: input.dateLabel,
      durationSeconds: input.audioDurationSeconds,
      sections: input.sections,
      sourceAttribution: input.sourceAttribution,
    };
    const storageUrl = await saveBuffer(input.outputKey.replace(/\.mp4$/, ".json"), Buffer.from(JSON.stringify(manifest, null, 2)));
    const thumbnailUrl = storageUrl;

    return {
      storageUrl,
      thumbnailUrl,
      durationSeconds: Math.round(input.audioDurationSeconds),
      resolution: "1080x1920",
    };
  }
}
