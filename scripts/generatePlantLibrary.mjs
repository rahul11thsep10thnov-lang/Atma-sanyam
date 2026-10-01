#!/usr/bin/env node
// FOCUS Plant Library — production pipeline.
//
// Generates the 100 photorealistic plant assets as 100 SEPARATE image
// generation jobs (one plant per job, never a collage), each from the same
// master prompt with only the species swapped, then inspects every result
// with a vision QC pass, writes the manifest and packs the ZIP.
//
//   node scripts/generatePlantLibrary.mjs --provider openai            # generate missing/placeholder assets
//   node scripts/generatePlantLibrary.mjs --provider openai --only 1,4  # specific ids
//   node scripts/generatePlantLibrary.mjs --qc                          # QC pass only (Claude vision)
//   node scripts/generatePlantLibrary.mjs --zip                         # package what's on disk
//   node scripts/generatePlantLibrary.mjs --print-prompt 34             # show one job's prompt
//
// Providers (image generation):
//   openai     OPENAI_API_KEY   gpt-image-1 (2048 is not a native size: renders 1536×1536 /
//              1024×1024 and the file is kept at that size; set --size to request another)
//   stability  STABILITY_API_KEY  Stable Image Ultra, with the negative prompt honoured natively
//   Any other HTTP image API is a ~20-line addition to PROVIDERS below.
//
// QC (section 24 of the brief) uses Claude vision via the Anthropic SDK
// (ANTHROPIC_API_KEY). A rejected asset is regenerated up to --retries times.
//
// Resumable: a plant whose file exists with manifest placeholder:false is
// skipped unless --force. Every write updates plant_manifest.json, so a run
// interrupted at job 61 continues from 61.
import fs from 'node:fs';
import path from 'node:path';
import { IMAGE_SIZE, NEGATIVE_PROMPT, QC_CRITERIA, masterPrompt } from './plantLibrary/prompt.mjs';
import { LIBRARY_DIR, MANIFEST_PATH, buildManifest, readManifest, writeManifest } from './plantLibrary/writeManifest.mjs';
import { writeZip } from './plantLibrary/zip.mjs';

const ZIP_NAME = 'FOCUS_100_INDIAN_PLANTS_LIBRARY.zip';
const ZIP_FOLDER = 'FOCUS_100_INDIAN_PLANTS_LIBRARY';

// --- args -------------------------------------------------------------------

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] !== undefined && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const has = (name) => args.includes(name);

const provider = flag('--provider', process.env.PLANT_IMAGE_PROVIDER ?? null);
const only = flag('--only', null)?.split(',').map(Number) ?? null;
const size = Number(flag('--size', IMAGE_SIZE));
const retries = Number(flag('--retries', 2));
const force = has('--force');
const qcOnly = has('--qc');
const zipOnly = has('--zip');
const skipQc = has('--no-qc');
const printPrompt = flag('--print-prompt', null);

// --- providers ----------------------------------------------------------------

async function fetchJson(url, init) {
  const res = await fetch(url, init);
  const text = await res.text();
  if (!res.ok) throw new Error(`${url} → ${res.status}: ${text.slice(0, 400)}`);
  return JSON.parse(text);
}

const PROVIDERS = {
  async openai(prompt, negative, px) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY is not set');
    const native = px >= 1536 ? '1536x1536' : '1024x1024';
    const body = await fetchJson('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: `${prompt}\n\nAvoid: ${negative}`,
        n: 1,
        size: native,
        quality: 'high',
        output_format: 'png',
        background: 'opaque',
      }),
    });
    const b64 = body.data?.[0]?.b64_json;
    if (!b64) throw new Error('openai: no image in response');
    return Buffer.from(b64, 'base64');
  },
  async stability(prompt, negative) {
    const key = process.env.STABILITY_API_KEY;
    if (!key) throw new Error('STABILITY_API_KEY is not set');
    const form = new FormData();
    form.set('prompt', prompt);
    form.set('negative_prompt', negative);
    form.set('aspect_ratio', '1:1');
    form.set('output_format', 'png');
    const res = await fetch('https://api.stability.ai/v2beta/stable-image/generate/ultra', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, Accept: 'image/*' },
      body: form,
    });
    if (!res.ok) throw new Error(`stability → ${res.status}: ${(await res.text()).slice(0, 400)}`);
    return Buffer.from(await res.arrayBuffer());
  },
};

// --- QC (Claude vision) ---------------------------------------------------------

let anthropic = null;
async function qcClient() {
  if (anthropic) return anthropic;
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  anthropic = new Anthropic();
  return anthropic;
}

/** Returns { pass: boolean, reasons: string[] } for one asset. */
async function inspect(plant, png) {
  const client = await qcClient();
  const response = await client.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 1024,
    system:
      'You are the quality-control inspector for a botanical photo library. Judge the image strictly against the criteria and answer with JSON only: {"pass": boolean, "reasons": string[]} where reasons lists every failed criterion in a few words each (empty when it passes).',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/png', data: png.toString('base64') } },
          {
            type: 'text',
            text: `This should be a single photorealistic ${plant.name} (${plant.botanicalName}). Criteria, all of which must hold:\n- ${QC_CRITERIA.join('\n- ')}\n\nReply with the JSON object only.`,
          },
        ],
      },
    ],
  });
  if (response.stop_reason === 'refusal') return { pass: false, reasons: ['QC refused: ' + (response.stop_details?.explanation ?? 'no explanation')] };
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { pass: false, reasons: ['QC returned no JSON: ' + text.slice(0, 120)] };
  try {
    const parsed = JSON.parse(match[0]);
    return { pass: Boolean(parsed.pass), reasons: Array.isArray(parsed.reasons) ? parsed.reasons.map(String) : [] };
  } catch {
    return { pass: false, reasons: ['QC JSON unparsable: ' + match[0].slice(0, 120)] };
  }
}

// --- validation + packaging -------------------------------------------------------

export function pngSize(buf) {
  if (buf.length < 24 || buf.toString('ascii', 1, 4) !== 'PNG') return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function validate(manifest) {
  const problems = [];
  const dims = new Set();
  const names = new Set();
  const files = new Set();
  for (const p of manifest.plants) {
    if (names.has(p.name)) problems.push(`duplicate plant name: ${p.name}`);
    if (files.has(p.filename)) problems.push(`duplicate filename: ${p.filename}`);
    names.add(p.name);
    files.add(p.filename);
    const file = path.join(LIBRARY_DIR, p.filename);
    if (!fs.existsSync(file)) {
      problems.push(`missing: ${p.filename}`);
      continue;
    }
    const s = pngSize(fs.readFileSync(file));
    if (!s) problems.push(`not a PNG: ${p.filename}`);
    else {
      if (s.width !== s.height) problems.push(`not square: ${p.filename} (${s.width}×${s.height})`);
      dims.add(`${s.width}x${s.height}`);
    }
  }
  if (manifest.plants.length !== 100) problems.push(`expected 100 plants, manifest has ${manifest.plants.length}`);
  if (dims.size > 1) problems.push(`mixed image dimensions: ${[...dims].join(', ')}`);
  return problems;
}

function pack(manifest) {
  const entries = manifest.plants.map((p) => ({ name: `${ZIP_FOLDER}/${p.filename}`, data: fs.readFileSync(path.join(LIBRARY_DIR, p.filename)) }));
  entries.push({ name: `${ZIP_FOLDER}/plant_manifest.json`, data: fs.readFileSync(MANIFEST_PATH) });
  const out = path.resolve(LIBRARY_DIR, '..', ZIP_NAME);
  writeZip(out, entries);
  return out;
}

// --- main -----------------------------------------------------------------------

async function main() {
  const manifest = buildManifest(readManifest());

  if (printPrompt) {
    const plant = manifest.plants.find((p) => p.id === Number(printPrompt));
    if (!plant) throw new Error(`no plant ${printPrompt}`);
    console.log(`JOB ${String(plant.id).padStart(3, '0')} — ${plant.filename}\n\n${masterPrompt(plant)}\n\nNEGATIVE PROMPT:\n${NEGATIVE_PROMPT}`);
    return;
  }

  if (zipOnly) {
    const problems = validate(manifest);
    if (problems.length) {
      console.error('Cannot package — fix these first:\n' + problems.map((p) => `  • ${p}`).join('\n'));
      process.exit(1);
    }
    console.log(`wrote ${pack(manifest)}`);
    return;
  }

  const targets = manifest.plants.filter((p) => !only || only.includes(p.id));
  const log = [];

  if (!qcOnly) {
    const generate = provider ? PROVIDERS[provider] : null;
    if (!generate) {
      console.error(`Pick an image provider: --provider ${Object.keys(PROVIDERS).join(' | ')} (or PLANT_IMAGE_PROVIDER). Placeholders come from generatePlantPlaceholders.mjs.`);
      process.exit(2);
    }
    for (const plant of targets) {
      const out = path.join(LIBRARY_DIR, plant.filename);
      if (!force && plant.placeholder === false && fs.existsSync(out)) {
        log.push(`${plant.filename}: kept`);
        continue;
      }
      const prompt = masterPrompt(plant);
      let accepted = false;
      for (let attempt = 0; attempt <= retries && !accepted; attempt++) {
        process.stdout.write(`JOB ${String(plant.id).padStart(3, '0')} ${plant.name}${attempt ? ` (retry ${attempt})` : ''} … `);
        let png;
        try {
          png = await generate(prompt, NEGATIVE_PROMPT, size);
        } catch (error) {
          console.log(`generation failed: ${error.message}`);
          continue;
        }
        const dims = pngSize(png);
        if (!dims) {
          console.log('provider did not return a PNG');
          continue;
        }
        let verdict = { pass: true, reasons: [] };
        if (!skipQc && process.env.ANTHROPIC_API_KEY) verdict = await inspect(plant, png);
        if (verdict.pass) {
          fs.writeFileSync(out, png);
          plant.placeholder = false;
          writeManifest(manifest);
          accepted = true;
          console.log(`ok ${dims.width}×${dims.height}`);
          log.push(`${plant.filename}: generated`);
        } else {
          console.log(`rejected — ${verdict.reasons.join('; ')}`);
          fs.writeFileSync(out.replace(/\.png$/, `.rejected${attempt}.png`), png);
        }
      }
      if (!accepted) log.push(`${plant.filename}: FAILED after ${retries + 1} attempts`);
    }
  } else {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('QC needs ANTHROPIC_API_KEY');
      process.exit(2);
    }
    for (const plant of targets) {
      const file = path.join(LIBRARY_DIR, plant.filename);
      if (!fs.existsSync(file)) {
        log.push(`${plant.filename}: missing`);
        continue;
      }
      const verdict = await inspect(plant, fs.readFileSync(file));
      console.log(`${plant.filename}: ${verdict.pass ? 'pass' : 'FAIL — ' + verdict.reasons.join('; ')}`);
      log.push(`${plant.filename}: ${verdict.pass ? 'pass' : 'FAIL ' + verdict.reasons.join('; ')}`);
    }
  }

  // Section 27 — output validation
  const problems = validate(manifest);
  const real = manifest.plants.filter((p) => p.placeholder === false).length;
  console.log('\nOUTPUT VALIDATION');
  console.log(`  TOTAL FILES            = ${manifest.plants.filter((p) => fs.existsSync(path.join(LIBRARY_DIR, p.filename))).length}`);
  console.log(`  UNIQUE PLANTS          = ${new Set(manifest.plants.map((p) => p.name)).size}`);
  console.log(`  GENERATED (non-placeholder) = ${real}`);
  console.log(`  PLACEHOLDERS REMAINING = ${manifest.plants.length - real}`);
  console.log(`  FAILED JOBS            = ${log.filter((l) => l.includes('FAILED') || l.includes('FAIL ')).length}`);
  if (problems.length) console.log('  PROBLEMS:\n' + problems.map((p) => `    • ${p}`).join('\n'));
  fs.writeFileSync(path.join(LIBRARY_DIR, 'generation_log.txt'), log.join('\n') + '\n');
  if (!problems.length && real === manifest.plants.length) console.log(`\nwrote ${pack(manifest)}`);
  else if (!problems.length) console.log(`\nZIP not written: ${manifest.plants.length - real} placeholders remain (pass --zip to package anyway).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
