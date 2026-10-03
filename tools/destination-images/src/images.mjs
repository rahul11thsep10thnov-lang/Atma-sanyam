// Image generation through Hugging Face Inference Providers.
//
// The 150-word prompts written for FLUX/Leonardo are too long for Stable
// Diffusion models (their text encoder reads roughly the first 77 tokens), so
// this builds a compact prompt from the same package fields instead.

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { InferenceClient } from '@huggingface/inference';
import sharp from 'sharp';
import { NEGATIVE_PROMPT } from './spec.mjs';

export const DEFAULT_HF_MODEL = 'stabilityai/stable-diffusion-xl-base-1.0';
// 1344×768 is one of SDXL's native training sizes (≈16:9). Other models may prefer others.
export const DEFAULT_SIZE = { width: 1344, height: 768 };

const firstClause = (s, maxWords) => (s ?? '').split(/[.;]/)[0].trim().split(/\s+/).slice(0, maxWords).join(' ');

/** ≈60-word prompt that keeps what identifies the place and the shot. */
export function compactPrompt(pkg) {
  const place = [pkg.name, pkg.city_district, pkg.state].filter(Boolean).join(', ');
  const parts = [
    `aerial drone photograph of ${place}, India`,
    firstClause(pkg.primary_subject, 22),
    firstClause(pkg.environmental_details, 16),
    `${pkg.drone_altitude_m} m altitude, ${pkg.camera_angle_deg}° downward oblique view, 28mm`,
    `${pkg.time_of_day} light`,
    firstClause(pkg.weather, 10),
    'ultra-realistic professional travel photograph, natural colors, realistic shadows, high detail, 16:9',
  ];
  return parts.filter(Boolean).join(', ');
}

/**
 * Size setting some providers need. fal-ai ignores width/height and wants `image_size`
 * (a preset name such as "landscape_16_9", or {width, height}).
 */
export function resolveImageSize(flag, provider) {
  if (flag) {
    const m = /^(\d+)x(\d+)$/.exec(flag);
    return m ? { width: Number(m[1]), height: Number(m[2]) } : flag;
  }
  return provider === 'fal-ai' ? 'landscape_16_9' : undefined;
}

export function createHfClient(token = process.env.HF_TOKEN) {
  if (!token) throw new Error('Set HF_TOKEN to a Hugging Face access token (https://huggingface.co/settings/tokens).');
  return new InferenceClient(token);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class StopRun extends Error {}

const DEFAULT_TIMEOUT_MS = 180_000;

/** Rejects after `ms` even if the client ignores the abort signal; keeps the process alive meanwhile. */
function withTimeout(start, ms, label) {
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`No answer from ${label} after ${Math.round(ms / 1000)} s. Try another provider, for example --provider hf-inference.`));
    }, ms);
  });
  return Promise.race([start(controller.signal), timeout]).finally(() => clearTimeout(timer));
}

function statusOf(err) {
  if (err?.httpResponse?.status) return err.httpResponse.status;
  const m = /\b([45]\d\d)\b/.exec(String(err?.message));
  return m ? Number(m[1]) : null;
}

/** Calls the model, retrying rate limits / cold starts. Throws StopRun when the account can't continue. */
export async function generateImage(client, record, opts, { retries = 4, wait = sleep } = {}) {
  const request = {
    model: opts.model,
    ...(opts.provider ? { provider: opts.provider } : {}),
    inputs: opts.compact ? compactPrompt(record.package) : record.prompt,
    parameters: {
      negative_prompt: NEGATIVE_PROMPT,
      width: opts.width,
      height: opts.height,
      ...(opts.imageSize ? { image_size: opts.imageSize } : {}),
      ...(opts.steps ? { num_inference_steps: opts.steps } : {}),
    },
  };
  for (let attempt = 0; ; attempt++) {
    try {
      const blob = await withTimeout(
        (signal) => client.textToImage(request, { outputType: 'blob', signal }),
        opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        opts.provider ?? 'the auto-selected provider',
      );
      return Buffer.from(await blob.arrayBuffer());
    } catch (err) {
      const status = statusOf(err);
      if (status === 401 || status === 403) throw new StopRun(`Hugging Face rejected the token (${status}). Check HF_TOKEN permissions.`);
      if (status === 402) throw new StopRun('Hugging Face reports your free credits are used up (402). Resume later or switch provider/model; finished images are kept.');
      if (/^No answer from/.test(err.message)) throw err;
      const retryable = status === 429 || status === 503 || status === 504 || status === 500 || status == null;
      if (!retryable || attempt >= retries) throw err;
      await wait(Math.min(60_000, 2_000 * 2 ** attempt));
    }
  }
}

/** Saves a WebP (optionally resized to exactly width×height) and returns its dimensions. */
export async function saveWebp(buffer, file, { upscaleTo } = {}) {
  let img = sharp(buffer);
  if (upscaleTo) img = img.resize(upscaleTo.width, upscaleTo.height, { fit: 'cover', kernel: 'lanczos3' });
  const { data, info } = await img.webp({ quality: 88 }).toBuffer({ resolveWithObject: true });
  try {
    writeFileSync(file, data);
  } catch (err) {
    if (['EBUSY', 'EPERM', 'EACCES', 'UNKNOWN'].includes(err.code)) {
      throw new Error(`Cannot overwrite ${file}. Close the image if it is open in Explorer's preview pane or a photo viewer, then run again.`);
    }
    throw err;
  }
  return { width: info.width, height: info.height };
}

export function imagePath(dir, record) {
  return join(dir, 'images', record.filename);
}

export function ensureImagesDir(dir) {
  mkdirSync(join(dir, 'images'), { recursive: true });
}

export const hasImage = (dir, record) => existsSync(imagePath(dir, record));
