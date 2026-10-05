/* eslint-disable no-console */
// Usage: npm run demo:railway -- [--out ./demo-output] [--preview] [--stills-only] [--workers N]
import { resolve } from "node:path";
import { buildRailwayDemo } from "../src/studio/demo/railwayDemo";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const preview = process.argv.includes("--preview");
  const outDir = resolve(arg("out") ?? "demo-output");
  const started = Date.now();
  let last = 0;
  const res = await buildRailwayDemo({
    outDir,
    width: preview ? 540 : 1080,
    height: preview ? 960 : 1920,
    fps: 30,
    durationSeconds: 5,
    workers: arg("workers") ? Number(arg("workers")) : undefined,
    renderVideo: !process.argv.includes("--stills-only"),
    onProgress: (done, total) => {
      if (done === total || Date.now() - last > 2000) {
        last = Date.now();
        console.log(`  rendered ${done}/${total} frames`);
      }
    },
  });
  console.log(`Shot: ${res.shot.shotType}, camera ${res.shot.cameraMovement}, ${res.manifest.layers.length} layers, ${res.manifest.environment.particles.length} particle systems, ${res.manifest.lighting.lights.length} lights`);
  console.log(`Assets generated in ${res.assetMs} ms (procedural; placeholders: ${res.placeholders.join(", ") || "none"})`);
  if (res.render) console.log(`Rendered ${res.render.frames} frames ${res.render.width}x${res.render.height}@${res.render.fps} in ${res.render.renderMs} ms → ${res.videoPath}`);
  console.log(`Stills: ${res.stills.join(", ")}`);
  console.log(`Manifest: ${res.manifestPath}`);
  console.log(`Total ${(Date.now() - started) / 1000}s`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
