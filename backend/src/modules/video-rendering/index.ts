import { VideoRenderer } from "./VideoRenderer";
import { FfmpegTemplateRenderer, isFfmpegAvailable } from "./FfmpegTemplateRenderer";
import { MockVideoRenderer } from "./MockVideoRenderer";

export * from "./VideoRenderer";

export async function getVideoRenderer(): Promise<VideoRenderer> {
  return (await isFfmpegAvailable()) ? new FfmpegTemplateRenderer() : new MockVideoRenderer();
}
