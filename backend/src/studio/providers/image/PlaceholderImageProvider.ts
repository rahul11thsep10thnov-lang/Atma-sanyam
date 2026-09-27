import { encodePng } from "../../media/png";
import { ImageGenerationRequest, ImageGenerationResult, ImageProvider } from "./ImageProvider";

type RGB = [number, number, number];

// Sober palettes per time of day (sky top, sky bottom, ground).
const TIME_PALETTES: Record<string, [RGB, RGB, RGB]> = {
  morning: [[120, 160, 200], [230, 210, 180], [70, 80, 70]],
  afternoon: [[90, 140, 190], [200, 215, 225], [85, 85, 75]],
  evening: [[40, 50, 90], [200, 120, 80], [45, 40, 45]],
  night: [[10, 15, 35], [35, 45, 80], [20, 20, 28]],
  unspecified: [[50, 70, 100], [150, 160, 175], [55, 58, 62]],
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);

/**
 * Offline fallback that draws a calm, abstract establishing shot (sky
 * gradient, building silhouettes, lit windows) with a palette fixed by time
 * of day and a layout fixed by the scene seed — so the same scene always
 * looks the same and neighbouring scenes share a consistent look. No
 * people are ever drawn. Rendered at half resolution; FFmpeg scales up.
 */
export class PlaceholderImageProvider implements ImageProvider {
  readonly key = "placeholder";

  isConfigured(): boolean {
    return true;
  }

  async generate(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const width = Math.max(64, Math.round(request.width / 2));
    const height = Math.max(64, Math.round(request.height / 2));
    const [skyTop, skyBottom, ground] = TIME_PALETTES[request.hints?.timeOfDay ?? "unspecified"] ?? TIME_PALETTES.unspecified;
    const random = mulberry32(request.seed);
    const pixels = new Uint8Array(width * height * 3);
    const horizon = Math.round(height * (0.62 + random() * 0.08));

    // Skyline: a row of building blocks with deterministic heights.
    const skyline = new Int32Array(width).fill(horizon);
    let x = 0;
    while (x < width) {
      const w = Math.round(width * (0.06 + random() * 0.1));
      const h = Math.round(height * (0.12 + random() * 0.3));
      for (let i = x; i < Math.min(width, x + w); i++) skyline[i] = horizon - h;
      x += w + Math.round(random() * width * 0.02);
    }
    const isNight = request.hints?.timeOfDay === "night" || request.hints?.timeOfDay === "evening";
    const windowSeed = Math.floor(random() * 1e9);

    for (let y = 0; y < height; y++) {
      for (let px = 0; px < width; px++) {
        const o = (y * width + px) * 3;
        let c: RGB;
        if (y >= horizon) {
          const t = (y - horizon) / Math.max(1, height - horizon);
          c = [lerp(ground[0], ground[0] * 0.6, t), lerp(ground[1], ground[1] * 0.6, t), lerp(ground[2], ground[2] * 0.6, t)];
        } else if (y >= skyline[px]) {
          const building: RGB = [lerp(ground[0], skyTop[0], 0.25), lerp(ground[1], skyTop[1], 0.25), lerp(ground[2], skyTop[2], 0.25)];
          const cellX = Math.floor(px / 12);
          const cellY = Math.floor(y / 16);
          const inWindow = px % 12 > 3 && px % 12 < 9 && y % 16 > 4 && y % 16 < 11;
          const lit = mulberry32(windowSeed + cellX * 7919 + cellY * 104729)() < (isNight ? 0.35 : 0.12);
          c = inWindow && lit ? (isNight ? [235, 200, 120] : [190, 200, 210]) : building;
        } else {
          const t = y / Math.max(1, horizon);
          c = [lerp(skyTop[0], skyBottom[0], t), lerp(skyTop[1], skyBottom[1], t), lerp(skyTop[2], skyBottom[2], t)];
        }
        pixels[o] = c[0];
        pixels[o + 1] = c[1];
        pixels[o + 2] = c[2];
      }
    }
    return { image: encodePng(width, height, pixels), format: "png", isPlaceholder: true };
  }
}
