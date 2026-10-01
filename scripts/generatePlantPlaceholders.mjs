#!/usr/bin/env node
// Generates the 100 PLACEHOLDER plant files for the FOCUS Plant Library.
//
//   node scripts/generatePlantPlaceholders.mjs [--size 512] [--only 1,4,34] [--force]
//
// Writes assets/plants/FOCUS_PLANT_LIBRARY/NNN_name.png on the exact FOCUS
// template (soil line at 80%, root cutaway, upper-left sunbeam, light pool)
// and refreshes plant_manifest.json. Files already replaced by a real
// generated image (manifest placeholder:false) are left alone unless --force.
import fs from 'node:fs';
import path from 'node:path';
import { renderPlant, writePng } from './plantLibrary/renderPlaceholder.mjs';
import { LIBRARY_DIR, buildManifest, readManifest, writeManifest } from './plantLibrary/writeManifest.mjs';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};
const size = Number(flag('--size', 512));
const only = flag('--only', null)?.split(',').map((n) => Number(n)) ?? null;
const force = args.includes('--force');

const manifest = buildManifest(readManifest());
fs.mkdirSync(LIBRARY_DIR, { recursive: true });

let written = 0;
let skipped = 0;
const started = Date.now();
for (const plant of manifest.plants) {
  if (only && !only.includes(plant.id)) continue;
  const out = path.join(LIBRARY_DIR, plant.filename);
  if (!force && plant.placeholder === false && fs.existsSync(out)) {
    skipped++;
    continue;
  }
  const img = renderPlant(plant, size);
  await writePng(img, out);
  plant.placeholder = true;
  written++;
  process.stdout.write(`\r${plant.filename.padEnd(36)} ${written} written`);
}
process.stdout.write('\n');
writeManifest(manifest);
console.log(`placeholders: ${written} written, ${skipped} kept (real assets), ${((Date.now() - started) / 1000).toFixed(1)}s, size ${size}px`);
