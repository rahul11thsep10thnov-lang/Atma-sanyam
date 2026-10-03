#!/usr/bin/env node
// Trip-Toe destination image pipeline.
//
//   node bin/cli.mjs plan     <list.txt|.csv|.tsv|.md>            normalise + dedupe only (no API calls)
//   node bin/cli.mjs generate <list> [--out DIR] [options]       generate packages (resumable)
//   node bin/cli.mjs render   <DIR>                               rebuild batches/manifest/CSV from DIR/records.jsonl
//   node bin/cli.mjs images   <DIR> [options]                    generate the pictures with Hugging Face (needs HF_TOKEN)
//
// generate options:
//   --out DIR            output folder (default: out/<input file name>)
//   --limit N            only the first N not-yet-done destinations
//   --only 001,014       only these destination numbers
//   --concurrency N      parallel destinations (default 4)
//   --effort LEVEL       low|medium|high|xhigh|max (default high)
//   --model ID           default claude-opus-5-5
//   --research           let the model verify facts with web search (slower, more accurate)
//   --redo-review        regenerate destinations whose QC ended in NEEDS REVIEW
//
// images options:
//   --model ID           Hugging Face model (default stabilityai/stable-diffusion-xl-base-1.0)
//   --provider NAME      Inference provider (default: Hugging Face picks one)
//   --size WxH           generation size (default 1344x768)
//   --upscale            resize each result to exactly 3840x2160 (Lanczos; adds pixels, not detail)
//   --full-prompt        send the long FLUX-style prompt instead of the compact one
//   --steps N            denoising steps
//   --timeout SECONDS    give up on one image after this long (default 180)
//   --limit N / --only 001,014 / --concurrency N (default 2) / --redo

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { parseDestinations } from '../src/normalize.mjs';
import { DEFAULT_MODEL, createClient, generateDestination } from '../src/generate.mjs';
import { manifestEntry, renderBatches, renderCsv } from '../src/render.mjs';
import {
  DEFAULT_HF_MODEL, DEFAULT_SIZE, StopRun, createHfClient, ensureImagesDir, generateImage,
  hasImage, imagePath, saveWebp,
} from '../src/images.mjs';

const RECENT_WINDOW = 12;

function parseArgs(argv) {
  const [command, target, ...rest] = argv;
  const flags = {};
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (!a.startsWith('--')) throw new Error(`Unexpected argument "${a}"`);
    const key = a.slice(2);
    if (['research', 'redo-review', 'upscale', 'full-prompt', 'redo'].includes(key)) flags[key] = true;
    else flags[key] = rest[++i];
  }
  return { command, target, flags };
}

function readRecords(dir) {
  const file = join(dir, 'records.jsonl');
  if (!existsSync(file)) return [];
  // Later lines win, so a regenerated destination replaces its earlier record.
  const byKey = new Map();
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const rec = JSON.parse(line);
    byKey.set(rec.key, rec);
  }
  return [...byKey.values()];
}

function readImageLog(dir) {
  const file = join(dir, 'images.jsonl');
  const byFile = new Map();
  if (existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').split('\n')) if (line.trim()) { const e = JSON.parse(line); byFile.set(e.filename, e); }
  }
  return byFile;
}

function render(dir) {
  const records = readRecords(dir);
  if (!records.length) { console.log('No records yet.'); return; }
  const imageLog = readImageLog(dir);
  for (const r of records) r.image = imageLog.get(r.filename) ?? null;
  mkdirSync(join(dir, 'batches'), { recursive: true });
  for (const b of renderBatches(records)) {
    writeFileSync(join(dir, 'batches', `batch_${b.number}_${b.from}-${b.to}.txt`), b.text);
  }
  const sorted = [...records].sort((a, b) => a.id.localeCompare(b.id));
  writeFileSync(join(dir, 'manifest.json'), `${JSON.stringify(sorted.map(manifestEntry), null, 2)}\n`);
  writeFileSync(join(dir, 'library.csv'), renderCsv(records));
  const review = records.filter((r) => r.status !== 'pass');
  console.log(`Rendered ${records.length} destinations → ${dir}/batches, manifest.json, library.csv`);
  if (review.length) console.log(`${review.length} need human review: ${review.map((r) => `#${r.id}`).join(', ')}`);
}

function plan(file) {
  const { destinations, duplicates, warnings } = parseDestinations(readFileSync(file, 'utf8'));
  for (const d of destinations) {
    console.log(`#${d.id}  ${d.name}${d.district ? ` — ${d.district}` : ''}${d.state ? ` — ${d.state}` : ''}${d.category ? `  [${d.category}]` : ''}`);
  }
  console.log(`\n${destinations.length} destinations, ${duplicates.length} exact duplicates removed.`);
  for (const dup of duplicates) console.log(`  duplicate: "${dup.input}" (same as #${dup.duplicateOf})`);
  for (const w of warnings) console.log(`  note: ${w}`);
  return destinations;
}

async function generate(file, flags) {
  const { destinations, duplicates, warnings } = parseDestinations(readFileSync(file, 'utf8'));
  const dir = flags.out ?? join('out', basename(file, extname(file)));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'normalized.json'), `${JSON.stringify({ destinations, duplicates, warnings }, null, 2)}\n`);

  const existing = readRecords(dir);
  const done = new Map(existing.map((r) => [r.key, r]));
  const only = flags.only ? new Set(flags.only.split(',').map((s) => s.trim().padStart(3, '0'))) : null;
  let todo = destinations.filter((d) => {
    if (only && !only.has(d.id)) return false;
    const prev = done.get(d.key);
    return !prev || (flags['redo-review'] && prev.status !== 'pass');
  });
  if (flags.limit) todo = todo.slice(0, Number(flags.limit));

  const opts = {
    model: flags.model ?? DEFAULT_MODEL,
    effort: flags.effort ?? 'high',
    research: Boolean(flags.research),
  };
  const ctx = {
    recent: existing.slice(-RECENT_WINDOW).map((r) => ({ id: r.id, ...r.package })),
    usedFilenames: new Set(existing.filter((r) => !todo.some((t) => t.key === r.key)).map((r) => r.filename)),
  };
  console.log(`${destinations.length} destinations; ${existing.length} already generated; ${todo.length} to do now (${opts.model}, effort ${opts.effort}${opts.research ? ', web research' : ''}).`);

  const client = createClient();
  const failures = [];
  const totals = {};
  let next = 0;
  async function worker() {
    while (next < todo.length) {
      const dest = todo[next++];
      try {
        const rec = await generateDestination(client, dest, ctx, opts);
        appendFileSync(join(dir, 'records.jsonl'), `${JSON.stringify(rec)}\n`);
        ctx.recent = [...ctx.recent, { id: rec.id, ...rec.package }].slice(-RECENT_WINDOW);
        for (const [k, v] of Object.entries(rec.usage)) totals[k] = (totals[k] ?? 0) + v;
        console.log(`#${dest.id} ${rec.package.name} → ${rec.filename} [${rec.status.toUpperCase()}]`);
      } catch (err) {
        failures.push({ id: dest.id, input: dest.input, error: String(err?.message ?? err) });
        console.error(`#${dest.id} ${dest.name} FAILED: ${err?.message ?? err}`);
      }
    }
  }
  const concurrency = Math.max(1, Number(flags.concurrency ?? 4));
  await Promise.all(Array.from({ length: concurrency }, worker));

  if (failures.length) writeFileSync(join(dir, 'failures.json'), `${JSON.stringify(failures, null, 2)}\n`);
  console.log(`Tokens: ${JSON.stringify(totals)}`);
  if (failures.length) console.log(`${failures.length} failed (see failures.json); re-run the same command to retry them.`);
  render(dir);
}

async function images(dir, flags) {
  const records = readRecords(dir).sort((a, b) => a.id.localeCompare(b.id));
  if (!records.length) throw new Error(`No records in ${dir}. Run "generate" first.`);
  const [width, height] = flags.size ? flags.size.split('x').map(Number) : [DEFAULT_SIZE.width, DEFAULT_SIZE.height];
  if (!(width > 0 && height > 0)) throw new Error('--size must look like 1344x768');
  const only = flags.only ? new Set(flags.only.split(',').map((s) => s.trim().padStart(3, '0'))) : null;
  let todo = records.filter((r) => (!only || only.has(r.id)) && (flags.redo || !hasImage(dir, r)));
  if (flags.limit) todo = todo.slice(0, Number(flags.limit));
  const opts = {
    model: flags.model ?? process.env.HF_MODEL ?? DEFAULT_HF_MODEL,
    provider: flags.provider, width, height,
    compact: !flags['full-prompt'],
    steps: flags.steps ? Number(flags.steps) : undefined,
    timeoutMs: flags.timeout ? Number(flags.timeout) * 1000 : undefined,
  };
  const upscaleTo = flags.upscale ? { width: 3840, height: 2160 } : undefined;
  console.log(`${records.length} records; ${todo.length} images to make (${opts.model}, ${width}×${height}${upscaleTo ? ' → 3840×2160' : ''}).`);

  ensureImagesDir(dir);
  const client = createHfClient();
  let next = 0;
  let stopped = null;
  let made = 0;
  const failed = [];
  async function worker() {
    while (next < todo.length && !stopped) {
      const rec = todo[next++];
      try {
        const buffer = await generateImage(client, rec, opts);
        const dims = await saveWebp(buffer, imagePath(dir, rec), { upscaleTo });
        appendFileSync(join(dir, 'images.jsonl'), `${JSON.stringify({ filename: rec.filename, ...dims, model: opts.model })}\n`);
        made++;
        console.log(`#${rec.id} ${rec.package.name} → images/${rec.filename} (${dims.width}×${dims.height})`);
      } catch (err) {
        if (err instanceof StopRun) { stopped = err.message; break; }
        failed.push(rec.id);
        console.error(`#${rec.id} ${rec.package.name} FAILED: ${err?.message ?? err}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Number(flags.concurrency ?? 2)) }, worker));
  console.log(`${made} images made${failed.length ? `, ${failed.length} failed (#${failed.join(', #')})` : ''}.`);
  if (stopped) console.log(`Stopped: ${stopped}`);
  render(dir);
}

const { command, target, flags } = parseArgs(process.argv.slice(2));
if (!target || !['plan', 'generate', 'render', 'images'].includes(command)) {
  const header = readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1).filter(Boolean);
  console.log(header.slice(0, header.findIndex((l) => !l.startsWith('//'))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(command ? 1 : 0);
}
// Node exits with code 13 when a top-level await can never finish. Say so plainly.
process.on('exit', (code) => {
  if (code === 13) {
    console.error('\nError: the program stopped because a request never finished (no error was returned).\n' +
      'If this was "images", try a specific provider, e.g.  --provider hf-inference  or  --provider together');
  }
});

try {
  if (command === 'plan') plan(target);
  else if (command === 'render') render(target);
  else if (command === 'images') await images(target, flags);
  else await generate(target, flags);
} catch (err) {
  console.error(`Error: ${err?.message ?? err}`);
  process.exit(1);
}
