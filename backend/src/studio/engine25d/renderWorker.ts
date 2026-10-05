import { parentPort, workerData } from "node:worker_threads";
import { FrameRenderer, FrameSize } from "./frameRenderer";
import { SceneData } from "./scene";

// Render worker: owns one FrameRenderer over the shared scene buffers and
// renders whichever frames the coordinator sends. Each worker keeps its own
// caches (blur levels, painted faces), so no locking is needed.
const { scene, size } = workerData as { scene: SceneData; size: FrameSize };
const renderer = new FrameRenderer(scene, size);

parentPort!.on("message", (msg: { frame: number }) => {
  try {
    const rgb = renderer.renderFrame(msg.frame);
    parentPort!.postMessage({ frame: msg.frame, rgb }, [rgb.buffer as ArrayBuffer]);
  } catch (e) {
    parentPort!.postMessage({ frame: msg.frame, error: (e as Error).stack ?? String(e) });
  }
});
