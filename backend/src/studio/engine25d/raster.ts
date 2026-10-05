import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { decodePng, encodePngGray, encodePngRgba } from "../media/png";

const execFileAsync = promisify(execFile);

/**
 * Premultiplied-alpha float image (0..1). Every layer is converted to this
 * once; compositing, blurring and sampling all work on premultiplied data so
 * semi-transparent edges never show dark or light fringes.
 */
export interface PImage {
  width: number;
  height: number;
  data: Float32Array; // RGBA premultiplied
}

export function createImage(width: number, height: number): PImage {
  return { width, height, data: new Float32Array(width * height * 4) };
}

/** Straight-alpha RGBA8 → premultiplied float. */
export function fromRgba8(width: number, height: number, rgba: Uint8Array | Uint8ClampedArray): PImage {
  const out = createImage(width, height);
  const d = out.data;
  for (let i = 0; i < width * height * 4; i += 4) {
    const a = rgba[i + 3] / 255;
    d[i] = (rgba[i] / 255) * a;
    d[i + 1] = (rgba[i + 1] / 255) * a;
    d[i + 2] = (rgba[i + 2] / 255) * a;
    d[i + 3] = a;
  }
  return out;
}

/** Premultiplied float → straight-alpha RGBA8. */
export function toRgba8(img: PImage): Uint8ClampedArray {
  const out = new Uint8ClampedArray(img.width * img.height * 4);
  const d = img.data;
  for (let i = 0; i < out.length; i += 4) {
    const a = d[i + 3];
    if (a > 1e-6) {
      out[i] = (d[i] / a) * 255 + 0.5;
      out[i + 1] = (d[i + 1] / a) * 255 + 0.5;
      out[i + 2] = (d[i + 2] / a) * 255 + 0.5;
    }
    out[i + 3] = a * 255 + 0.5;
  }
  return out;
}

export function encodePng(img: PImage): Buffer {
  return encodePngRgba(img.width, img.height, toRgba8(img));
}

export function encodeGrayPng(width: number, height: number, values01: Float32Array): Buffer {
  const g = new Uint8Array(width * height);
  for (let i = 0; i < g.length; i++) g[i] = Math.max(0, Math.min(255, Math.round(values01[i] * 255)));
  return encodePngGray(width, height, g);
}

/** Decodes an image buffer: fast path for 8-bit PNGs, FFmpeg for everything else. */
export async function decodeImageBuffer(buf: Buffer): Promise<PImage> {
  const png = decodePng(buf);
  if (png) return fromRgba8(png.width, png.height, png.rgba);
  const dir = await mkdtemp(join(tmpdir(), "atma-img-"));
  try {
    const p = join(dir, "in");
    await writeFile(p, buf);
    return await decodeWithFfmpeg(p);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** Decodes any image FFmpeg understands (PNG, JPEG, WebP…) into a premultiplied float image. */
export async function decodeImageFile(path: string): Promise<PImage> {
  const buf = await readFile(path);
  const png = decodePng(buf);
  if (png) return fromRgba8(png.width, png.height, png.rgba);
  return decodeWithFfmpeg(path);
}

async function decodeWithFfmpeg(path: string): Promise<PImage> {
  const { stdout: probe } = await execFileAsync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0:s=x", path]);
  const [w, h] = probe.trim().split("x").map(Number);
  if (!w || !h) throw new Error(`Could not read image size: ${path}`);
  const { stdout } = await execFileAsync("ffmpeg", ["-v", "error", "-i", path, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgba", "-"], {
    encoding: "buffer",
    maxBuffer: w * h * 4 + 1024 * 1024,
  });
  const buf = stdout as unknown as Buffer;
  if (buf.length < w * h * 4) throw new Error(`Short decode for ${path}`);
  return fromRgba8(w, h, new Uint8Array(buf.buffer, buf.byteOffset, w * h * 4));
}

/** Reads a greyscale image (depth/mask) as 0..1 floats. */
export async function decodeGrayFile(path: string): Promise<{ width: number; height: number; data: Float32Array }> {
  return grayOf(await decodeImageFile(path));
}

export async function decodeGrayBuffer(buf: Buffer): Promise<{ width: number; height: number; data: Float32Array }> {
  return grayOf(await decodeImageBuffer(buf));
}

function grayOf(img: PImage): { width: number; height: number; data: Float32Array } {
  const out = new Float32Array(img.width * img.height);
  for (let i = 0, j = 0; i < out.length; i++, j += 4) {
    const a = img.data[j + 3];
    out[i] = a > 1e-6 ? img.data[j] / a : 0;
  }
  return { width: img.width, height: img.height, data: out };
}

export async function readFileBuffer(path: string): Promise<Buffer> {
  return readFile(path);
}

/** Separable box blur on premultiplied data (3 passes ≈ Gaussian). Radius in pixels. */
export function blurImage(src: PImage, radius: number): PImage {
  if (radius < 0.5) return src;
  const r = Math.max(1, Math.round(radius / 1.7)); // 3 box passes of r ≈ gaussian sigma radius/1.7*…
  let a = src;
  for (let pass = 0; pass < 3; pass++) {
    a = boxBlurH(a, r);
    a = boxBlurV(a, r);
  }
  return a;
}

function boxBlurH(src: PImage, r: number): PImage {
  const { width: w, height: h } = src;
  const out = createImage(w, h);
  const s = src.data;
  const d = out.data;
  const inv = 1 / (2 * r + 1);
  for (let y = 0; y < h; y++) {
    const row = y * w * 4;
    for (let c = 0; c < 4; c++) {
      let acc = 0;
      for (let k = -r; k <= r; k++) acc += s[row + Math.min(w - 1, Math.max(0, k)) * 4 + c];
      for (let x = 0; x < w; x++) {
        d[row + x * 4 + c] = acc * inv;
        const add = Math.min(w - 1, x + r + 1);
        const sub = Math.max(0, x - r);
        acc += s[row + add * 4 + c] - s[row + sub * 4 + c];
      }
    }
  }
  return out;
}

function boxBlurV(src: PImage, r: number): PImage {
  const { width: w, height: h } = src;
  const out = createImage(w, h);
  const s = src.data;
  const d = out.data;
  const inv = 1 / (2 * r + 1);
  const stride = w * 4;
  for (let x = 0; x < w; x++) {
    for (let c = 0; c < 4; c++) {
      const col = x * 4 + c;
      let acc = 0;
      for (let k = -r; k <= r; k++) acc += s[Math.min(h - 1, Math.max(0, k)) * stride + col];
      for (let y = 0; y < h; y++) {
        d[y * stride + col] = acc * inv;
        const add = Math.min(h - 1, y + r + 1);
        const sub = Math.max(0, y - r);
        acc += s[add * stride + col] - s[sub * stride + col];
      }
    }
  }
  return out;
}

/** Box-filter downscale by an integer factor (used for bloom and low-res light maps). */
export function downscale(src: PImage, factor: number): PImage {
  const w = Math.max(1, Math.floor(src.width / factor));
  const h = Math.max(1, Math.floor(src.height / factor));
  const out = createImage(w, h);
  const inv = 1 / (factor * factor);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0;
      for (let j = 0; j < factor; j++) {
        const sy = y * factor + j;
        for (let i = 0; i < factor; i++) {
          const o = (sy * src.width + x * factor + i) * 4;
          r += src.data[o];
          g += src.data[o + 1];
          b += src.data[o + 2];
          a += src.data[o + 3];
        }
      }
      const o = (y * w + x) * 4;
      out.data[o] = r * inv;
      out.data[o + 1] = g * inv;
      out.data[o + 2] = b * inv;
      out.data[o + 3] = a * inv;
    }
  }
  return out;
}

/** Bilinear sample of a premultiplied image at (x, y) in pixel units; writes into out[0..3]. Outside = transparent. */
export function sampleBilinear(img: PImage, x: number, y: number, out: Float32Array): void {
  const w = img.width;
  const h = img.height;
  const fx = x - 0.5;
  const fy = y - 0.5;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = fx - x0;
  const ty = fy - y0;
  out[0] = out[1] = out[2] = out[3] = 0;
  const d = img.data;
  for (let j = 0; j < 2; j++) {
    const yy = y0 + j;
    if (yy < 0 || yy >= h) continue;
    const wy = j === 0 ? 1 - ty : ty;
    for (let i = 0; i < 2; i++) {
      const xx = x0 + i;
      if (xx < 0 || xx >= w) continue;
      const wgt = (i === 0 ? 1 - tx : tx) * wy;
      const o = (yy * w + xx) * 4;
      out[0] += d[o] * wgt;
      out[1] += d[o + 1] * wgt;
      out[2] += d[o + 2] * wgt;
      out[3] += d[o + 3] * wgt;
    }
  }
}

/** Alpha channel as a mask (0..1). */
export function alphaMask(img: PImage): Float32Array {
  const m = new Float32Array(img.width * img.height);
  for (let i = 0, j = 3; i < m.length; i++, j += 4) m[i] = img.data[j];
  return m;
}
