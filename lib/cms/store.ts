import "@/lib/cms/server-guard";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_SETTINGS, type CmsDestination, type CmsImage, type ImportRecord, type PipelineJob, type PublicationStatus, type SiteSettings
} from "./types";
import { setSecret, type SecretName } from "./secrets";

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

/** Upgrades images stored by older versions (CANDIDATE → PENDING, direct_url → original_url, provider). */
function normaliseImage(img: CmsImage): CmsImage {
  const o = img as CmsImage & { direct_url?: string | null };
  const status = (o.approval_status as string) === "CANDIDATE" ? "PENDING" : o.approval_status;
  const provider = o.provider ?? (/commons/i.test(o.source) ? "wikimedia" : /pixabay/i.test(o.source) ? "pixabay" : /unsplash/i.test(o.source) ? "unsplash" : /pexels/i.test(o.source) ? "pexels" : /manual/i.test(o.source) ? "manual" : "seed");
  const { direct_url, ...rest } = o;
  return { ...rest, original_url: o.original_url ?? direct_url ?? null, approval_status: status, provider };
}

function normalise(doc: CmsDestination): CmsDestination {
  return {
    ...doc,
    hero_image: doc.hero_image ? normaliseImage(doc.hero_image) : null,
    images: (doc.images ?? []).map(normaliseImage),
    attractions: (doc.attractions ?? []).map((a) => ({ ...a, images: (a.images ?? []).map(normaliseImage) })),
    hotels: (doc.hotels ?? []).map((h) => ({ ...h, images: (h.images ?? []).map(normaliseImage) })),
    restaurants: (doc.restaurants ?? []).map((r) => ({ ...r, images: (r.images ?? []).map(normaliseImage) }))
  };
}

function loadAll(): Map<string, CmsDestination> {
  const stamp = dirStamp();
  if (cache.destinations && cache.dirStamp === stamp) return cache.destinations;
  const map = new Map<string, CmsDestination>();
  for (const f of readdirSync(DEST_DIR)) {
    if (!f.endsWith(".json")) continue;
    const doc = readJson<CmsDestination>(join(DEST_DIR, f));
    if (doc?.id) map.set(doc.id, normalise(doc));
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

/**
 * Writes one document and updates the in-memory cache in place (re-reading the whole directory after
 * every save would make bulk imports quadratic). If the directory changed in some other way since the
 * cache was built, the cache is simply dropped and rebuilt on the next read.
 */
function afterWrite(update: (map: Map<string, CmsDestination>) => void, stampBefore: string) {
  if (cache.destinations && cache.dirStamp === stampBefore) {
    update(cache.destinations);
    cache.dirStamp = dirStamp();
  } else invalidate();
}

export function saveDestination(doc: CmsDestination): CmsDestination {
  const now = new Date().toISOString();
  const next = { ...doc, updated_at: now };
  const before = cache.destinations ? dirStamp() : "";
  writeAtomic(fileFor(doc.id), next);
  afterWrite((m) => m.set(next.id, normalise(next)), before);
  return next;
}

export function deleteDestination(id: string): boolean {
  const f = fileFor(id);
  if (!existsSync(f)) return false;
  const before = cache.destinations ? dirStamp() : "";
  unlinkSync(f);
  afterWrite((m) => m.delete(id), before);
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

const LEGACY_KEYS: Record<string, SecretName> = { google_places_api_key: "google_places", unsplash_access_key: "unsplash", pexels_api_key: "pexels", pixabay_api_key: "pixabay" };

export function getSettings(): SiteSettings {
  const stored = (existsSync(SETTINGS_FILE) ? readJson<Record<string, unknown>>(SETTINGS_FILE) : null) ?? {};
  // Older versions kept API keys in settings.json: move them to the git-ignored secrets store once.
  const legacy = Object.keys(LEGACY_KEYS).filter((k) => k in stored);
  if (legacy.length) {
    for (const k of legacy) if (typeof stored[k] === "string" && stored[k]) setSecret(LEGACY_KEYS[k], stored[k] as string);
    for (const k of legacy) delete stored[k];
    const old = stored.image_sources as Record<string, boolean> | undefined;
    if (old && !stored.image_providers) stored.image_providers = { wikimedia: { enabled: old.wikimedia_commons !== false }, pixabay: { enabled: old.pixabay !== false }, unsplash: { enabled: old.unsplash !== false }, pexels: { enabled: false } };
    delete stored.image_sources;
    writeAtomic(SETTINGS_FILE, stored);
  }
  const s = stored as Partial<SiteSettings>;
  const merged = { ...DEFAULT_SETTINGS, ...s, image_providers: { ...DEFAULT_SETTINGS.image_providers, ...(s.image_providers ?? {}) } };
  // Values that were only ever the old defaults follow the new defaults (a deliberately chosen value is kept).
  if (merged.site_name === "budgettourism") merged.site_name = DEFAULT_SETTINGS.site_name;
  if (merged.default_hero_image === "/images/home-meadow.jpg") merged.default_hero_image = DEFAULT_SETTINGS.default_hero_image;
  if (merged.default_seo_title === "budgettourism — Discover India, Better.") merged.default_seo_title = DEFAULT_SETTINGS.default_seo_title;
  return merged;
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
