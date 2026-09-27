import { AnimateRequest, VideoProvider } from "./VideoProvider";

/** Default, local, deterministic animation: slow pans/zooms applied at render time. */
export class KenBurnsVideoProvider implements VideoProvider {
  readonly key = "kenburns";
  readonly rendersInline = true;

  isConfigured(): boolean {
    return true;
  }

  async animate(_request: AnimateRequest): Promise<{ video: Buffer }> {
    throw new Error("Ken Burns motion is applied inline by the renderer; no clip is generated.");
  }
}
