import "@/lib/cms/server-guard";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_SETTINGS, type CmsDestination, type ImportRecord, type PipelineJob, type PublicationStatus, type SiteSettings
} from "./types";

/**
 * File-backed CMS store. Every destination is one JSON document under
 * data/cms/destinations/, written atomically (temp file + rename). The
 * directory is the database: it needs no server, survives restarts, can be
 * committed, and maps one-to-one onto the Prisma models when Postgres is
 * attached (the repository functions below are the seam — pages and admin
 * routes only ever call these).
 *
 * Reads are cached in memory and invalidated whenever a write goes through
 * this module or the directory's mtime changes (edits made by hand or by a
 * script are picked up on the next request).
 */

const ROOT = join(process.cwd(), "data", "cms");
const DEST_DIR = join(ROOT, "destinations");
const IMPORT_DIR = join(ROOT, "imports");
const SETTINGS_FILE = join(ROOT, "settings.json");
const PIPELINE_FILE = join(ROOT, "pipeline.json");

interface Cache {
  destinations: Map<string, CmsDestination> | null;
  dirStamp: string;
}
const g = globalThis as unknown as { __cmsCache?: Cache; __cmsBootstrapped?: boolean };
const cache = (g.__cmsCache ??= { destinations: null, dirStamp: "" });

function ensureDirs() {
  for (const d of [ROOT, DEST_DIR, IMPORT_DIR]) if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

function writeAtomic(file: string, data: unknown) {
  ensureDirs();
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n", "utf8");
  renameSync(tmp, file);
}

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T;
  } catch {
    return null;
  }
}

/** Directory fingerprint: mtime plus file count, cheap enough to check on every read. */
function dirStamp(): string {
  ensureDirs();
  const st = statSync(DEST_DIR);
  return `${st.mtimeMs}:${readdirSync(DEST_DIR).length}`;
}

function loadAll(): Map<string, CmsDestination> {
  const stamp = dirStamp();
  if (cache.destinations && cache.dirStamp === stamp) return cache.destinations;
  const map = new Map<string, CmsDestination>();
  for (const f of readdirSync(DEST_DIR)) {
    if (!f.endsWith(".json")) continue;
    const doc = readJson<CmsDestination>(join(DEST_DIR, f));
    if (doc?.id) map.set(doc.id, doc);
  }
  cache.destinations = map;
  cache.dirStamp = stamp;
  return map;
}

function invalidate() {
  cache.destinations = null;
  cache.dirStamp = "";
}

const fileFor = (id: string) => join(DEST_DIR, `${id.replace(/[^A-Za-z0-9_-]/g, "_")}.json`);

// ---- destinations --------------------------------------------------------

export function allDestinations(): CmsDestination[] {
  return [...loadAll().values()].sort((a, b) => a.name.localeCompare(b.name));
}

export const destinationCount = () => loadAll().size;

export function getDestination(idOrSlug: string): CmsDestination | null {
  const all = loadAll();
  return all.get(idOrSlug) ?? [...all.values()].find((d) => d.slug === idOrSlug) ?? null;
}

export function getDestinationBySlug(slug: string): CmsDestination | null {
  for (const d of loadAll().values()) if (d.slug === slug) return d;
  return null;
}

export function publishedDestinations(): CmsDestination[] {
  return allDestinations().filter((d) => d.status === "PUBLISHED");
}

export function saveDestination(doc: CmsDestination): CmsDestination {
  const now = new Date().toISOString();
  const next = { ...doc, updated_at: now };
  writeAtomic(fileFor(doc.id), next);
  invalidate();
  return next;
}

export function deleteDestination(id: string): boolean {
  const f = fileFor(id);
  if (!existsSync(f)) return false;
  unlinkSync(f);
  invalidate();
  return true;
}

/** Slugs are the public URL — they must be unique across every status. */
export function uniqueSlug(base: string, exceptId?: string): string {
  const taken = new Set([...loadAll().values()].filter((d) => d.id !== exceptId).map((d) => d.slug));
  let slug = base || "destination";
  let n = 2;
  while (taken.has(slug)) slug = `${base}-${n++}`;
  return slug;
}

export function setStatus(id: string, status: PublicationStatus): CmsDestination | null {
  const d = getDestination(id);
  if (!d) return null;
  return saveDestination({ ...d, status, published_at: status === "PUBLISHED" ? d.published_at ?? new Date().toISOString() : d.published_at });
}

// ---- settings --------------------------------------------------------------

export function getSettings(): SiteSettings {
  const stored = existsSync(SETTINGS_FILE) ? readJson<Partial<SiteSettings>>(SETTINGS_FILE) : null;
  return { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
}

export function saveSettings(patch: Partial<SiteSettings>): SiteSettings {
  const next = { ...getSettings(), ...patch, updated_at: new Date().toISOString() };
  writeAtomic(SETTINGS_FILE, next);
  return next;
}

// ---- imports ---------------------------------------------------------------

export function listImports(): ImportRecord[] {
  ensureDirs();
  return readdirSync(IMPORT_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => readJson<ImportRecord>(join(IMPORT_DIR, f)))
    .filter((x): x is ImportRecord => Boolean(x))
    .sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at));
}

export const getImport = (id: string): ImportRecord | null => (existsSync(join(IMPORT_DIR, `${id}.json`)) ? readJson<ImportRecord>(join(IMPORT_DIR, `${id}.json`)) : null);

export function saveImport(rec: ImportRecord): ImportRecord {
  writeAtomic(join(IMPORT_DIR, `${rec.id.replace(/[^A-Za-z0-9_-]/g, "_")}.json`), rec);
  return rec;
}

// ---- pipeline job ----------------------------------------------------------

export function getPipelineJob(): PipelineJob {
  return (existsSync(PIPELINE_FILE) && readJson<PipelineJob>(PIPELINE_FILE)) || { import_id: null, queue: [], cursor: null, auto_advance: false, updated_at: new Date(0).toISOString() };
}

export function savePipelineJob(job: PipelineJob): PipelineJob {
  const next = { ...job, updated_at: new Date().toISOString() };
  writeAtomic(PIPELINE_FILE, next);
  return next;
}

/** Hook for the seed bootstrap: true when no destination document exists yet. */
export const storeIsEmpty = () => loadAll().size === 0;
export const markBootstrapped = () => {
  g.__cmsBootstrapped = true;
};
export const wasBootstrapped = () => Boolean(g.__cmsBootstrapped);
export const cmsRoot = () => ROOT;
