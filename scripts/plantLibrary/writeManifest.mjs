// Writes assets/plants/FOCUS_PLANT_LIBRARY/plant_manifest.json from species.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORIES, manifestRows } from './species.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
export const LIBRARY_DIR = path.resolve(here, '..', '..', 'assets', 'plants', 'FOCUS_PLANT_LIBRARY');
export const MANIFEST_PATH = path.join(LIBRARY_DIR, 'plant_manifest.json');

export function buildManifest(existing) {
  const previous = new Map((existing?.plants ?? []).map((p) => [p.id, p]));
  const plants = manifestRows().map((row) => ({
    ...row,
    // `placeholder` is owned by the generators: true for the procedural
    // stand-in, false once a real generated asset has been written.
    placeholder: previous.get(row.id)?.placeholder ?? true,
  }));
  return {
    library: 'FOCUS_PLANT_LIBRARY',
    version: 1,
    imageSize: 2048,
    rootZoneFraction: 0.2,
    categories: CATEGORIES,
    plants,
  };
}

export function readManifest() {
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  } catch {
    return null;
  }
}

export function writeManifest(manifest) {
  fs.mkdirSync(LIBRARY_DIR, { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = buildManifest(readManifest());
  writeManifest(manifest);
  console.log(`wrote ${MANIFEST_PATH} (${manifest.plants.length} plants)`);
}
