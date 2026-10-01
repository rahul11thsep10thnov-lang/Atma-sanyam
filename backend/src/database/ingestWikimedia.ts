// Ingests a content pack from Wikimedia Commons into the content library.
//
//   npm run ingest:wikimedia -- [--manifest <csv>] [--limit N] [--collection Hindu]
//                               [--dry-run] [--draft] [--report <csv>]
//
// Reads a manifest (id, collection, region_or_category, search_query), asks the
// Commons API for the best-matching bitmap for each query, keeps only files
// whose licence allows reuse with attribution (CC0 / CC BY / CC BY-SA / public
// domain — never NC or ND), and upserts:
//   categories: <collection>  →  <collection>-<region>
//   content:    one published row per manifest line, with Commons-hosted
//               thumbnail / medium / full URLs and full attribution metadata.
//
// Idempotent: a manifest id already present (tag `ref:<id>`) is skipped, so the
// script can be re-run after a partial failure. Images stay on Wikimedia's CDN;
// the row's URLs can be repointed to your own bucket later without touching
// the app. Respect Commons etiquette: identify yourself, stay under a few
// requests per second (we sleep between calls).
import { readFileSync, writeFileSync } from 'node:fs';
import { createDatabase } from './client.js';
import { categories, content } from './schema.js';
import { eq } from 'drizzle-orm';

const API = 'https://commons.wikimedia.org/w/api.php';
const USER_AGENT = 'FOCUS-content-ingest/1.0 (https://github.com/rahul11thsep10thnov-lang/Atma-sanyam; content pack import)';
const PACK_TAG = 'pack:triptoe-india-450';
const MIN_WIDTH = 1200;
const MIN_HEIGHT = 800;
const SIZES = { thumbnail: 320, medium: 900, full: 1800 } as const;

// ---- CLI ------------------------------------------------------------------
const argv = process.argv.slice(2);
const flag = (name: string) => argv.includes(`--${name}`);
const opt = (name: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const manifestPath = opt('manifest') ?? new URL('../../content-packs/triptoe_india_450/manifest.csv', import.meta.url).pathname;
const reportPath = opt('report') ?? manifestPath.replace(/manifest\.csv$/, 'report.csv');
const limit = Number(opt('limit') ?? Infinity);
const onlyCollection = opt('collection');
const dryRun = flag('dry-run');
const status: 'draft' | 'published' = flag('draft') ? 'draft' : 'published';

// ---- manifest ---------------------------------------------------------------
interface ManifestRow {
  id: string;
  collection: string;
  region_or_category: string;
  search_query: string;
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const header = splitCsvLine(lines[0] ?? '');
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    return Object.fromEntries(header.map((h, i) => [h, cells[i] ?? '']));
  });
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else quoted = !quoted;
    } else if (ch === ',' && !quoted) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

// ---- naming -----------------------------------------------------------------
const COLLECTION_NAMES: Record<string, string> = {
  hindu: 'Hindu Temples & Deities',
  islam: 'Mosques & Dargahs',
  sikh: 'Gurdwaras',
  landscape: 'Landscapes of India',
};

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const pretty = (s: string) => s.replace(/_/g, ' ').replace(/\b(Sunrise) (Sunset)\b|\b(Lakes) (Rivers)\b/g, (m) => m.replace(' ', ' & '));

// ---- Commons API ------------------------------------------------------------
interface ImageInfo {
  url: string;
  width: number;
  height: number;
  mime: string;
  descriptionurl: string;
  extmetadata?: Record<string, { value: string }>;
}
interface Page {
  title: string;
  imageinfo?: ImageInfo[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function searchFiles(query: string): Promise<Page[]> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    generator: 'search',
    gsrsearch: `${query} filetype:bitmap`,
    gsrnamespace: '6',
    gsrlimit: '8',
    prop: 'imageinfo',
    iiprop: 'url|size|mime|extmetadata',
    maxlag: '5',
  });
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${API}?${params}`, { headers: { 'User-Agent': USER_AGENT } });
    if (res.status === 429 || res.status === 503) {
      await sleep(2000 * (attempt + 1));
      continue;
    }
    if (!res.ok) throw new Error(`Commons API ${res.status}`);
    const data = (await res.json()) as { query?: { pages?: Record<string, Page> } };
    return Object.values(data.query?.pages ?? {});
  }
  throw new Error('Commons API kept rate-limiting');
}

const stripHtml = (s: string) =>
  s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

function licenseAllowed(license: string): boolean {
  const l = license.trim();
  if (!l) return false;
  if (/\b(NC|ND)\b/i.test(l)) return false; // non-commercial / no-derivatives
  return /^(CC0|CC[ -]BY(-SA)?|Public domain|PD|GFDL|FAL|Attribution|No restrictions|Copyrighted free use)/i.test(l);
}

function thumbUrl(original: string, originalWidth: number, width: number): string {
  if (originalWidth <= width) return original;
  const base = original.slice(original.lastIndexOf('/') + 1);
  return `${original.replace('/wikipedia/commons/', '/wikipedia/commons/thumb/')}/${width}px-${base}`;
}

interface Chosen {
  fileTitle: string;
  info: ImageInfo;
  license: string;
  author: string;
}

function choose(pages: Page[]): Chosen | { reason: string } {
  const candidates = pages
    .map((p) => ({ p, info: p.imageinfo?.[0] }))
    .filter((c): c is { p: Page; info: ImageInfo } => !!c.info && /^image\/(jpeg|png|webp)$/.test(c.info.mime))
    .sort((a, b) => b.info.width * b.info.height - a.info.width * a.info.height);
  if (candidates.length === 0) return { reason: 'no bitmap result' };
  let sizeRejected = 0;
  let licenseRejected = 0;
  for (const { p, info } of candidates) {
    if (info.width < MIN_WIDTH || info.height < MIN_HEIGHT) {
      sizeRejected++;
      continue;
    }
    const license = stripHtml(info.extmetadata?.LicenseShortName?.value ?? '');
    if (!licenseAllowed(license)) {
      licenseRejected++;
      continue;
    }
    const author = stripHtml(info.extmetadata?.Artist?.value ?? '') || 'Unknown author';
    return { fileTitle: p.title.replace(/^File:/, ''), info, license, author };
  }
  return { reason: `no usable file (${sizeRejected} too small, ${licenseRejected} licence not allowed)` };
}

// ---- main ---------------------------------------------------------------------
async function main() {
  const rowsAll = parseCsv(readFileSync(manifestPath, 'utf8')) as unknown as ManifestRow[];
  const rows = rowsAll.filter((r) => !onlyCollection || r.collection === onlyCollection).slice(0, limit);
  console.log(`Manifest: ${rowsAll.length} rows, processing ${rows.length}${dryRun ? ' (dry run)' : ''}, status=${status}`);

  const url = process.env.DATABASE_URL;
  if (!url && !dryRun) throw new Error('DATABASE_URL is required (or pass --dry-run)');
  const database = url && !dryRun ? createDatabase(url, 1) : null;

  const existingRefs = new Set<string>();
  if (database) {
    const existing = await database.db.select({ tags: content.tags }).from(content).where(eq(content.source, 'Wikimedia Commons'));
    for (const row of existing) for (const t of row.tags) if (t.startsWith('ref:')) existingRefs.add(t.slice(4));
    console.log(`Already ingested: ${existingRefs.size}`);
  }

  const ensuredCategories = new Set<string>();
  async function ensureCategory(id: string, name: string, parentId: string | null, sortOrder: number) {
    if (ensuredCategories.has(id)) return;
    ensuredCategories.add(id);
    if (!database) return;
    await database.db.insert(categories).values({ id, name, parentId, sortOrder }).onConflictDoNothing();
  }

  const report: string[][] = [['id', 'status', 'title', 'file', 'license', 'author', 'full_url', 'note']];
  let done = 0;
  let skipped = 0;
  let failed = 0;
  try {
    for (const [i, row] of rows.entries()) {
      const ref = row.id;
      if (existingRefs.has(ref)) {
        skipped++;
        continue;
      }
      const colId = slug(row.collection);
      const regionId = `${colId}-${slug(row.region_or_category)}`;
      const colName = COLLECTION_NAMES[colId] ?? pretty(row.collection);
      const regionName = pretty(row.region_or_category);
      try {
        const pages = await searchFiles(row.search_query);
        const chosen = choose(pages);
        if ('reason' in chosen) {
          failed++;
          report.push([ref, 'skipped', row.search_query, '', '', '', '', chosen.reason]);
          console.log(`  ✗ ${ref} ${row.search_query}: ${chosen.reason}`);
          continue;
        }
        const { fileTitle, info, license, author } = chosen;
        const attributionRequired = !/^(CC0|Public domain|PD|No restrictions)/i.test(license);
        const title = row.search_query.trim();
        const tags = Array.from(
          new Set([
            PACK_TAG,
            `ref:${ref}`,
            colId,
            ...regionName.toLowerCase().split(/[^a-z0-9]+/),
            ...title.toLowerCase().split(/[^a-z0-9]+/),
          ].filter((t) => t.length > 1)),
        ).slice(0, 16);
        const record = {
          title,
          categoryId: colId,
          subcategoryId: regionId,
          tags,
          thumbnailUrl: thumbUrl(info.url, info.width, SIZES.thumbnail),
          mediumUrl: thumbUrl(info.url, info.width, SIZES.medium),
          fullUrl: thumbUrl(info.url, info.width, SIZES.full),
          source: 'Wikimedia Commons',
          creator: author,
          license,
          attributionRequired,
          attributionText: `${fileTitle.replace(/\.[a-z]+$/i, '')} · ${author} · ${license} · Wikimedia Commons (${info.descriptionurl})`,
          status,
          publishedAt: status === 'published' ? new Date() : null,
        };
        await ensureCategory(colId, colName, null, 100 + Object.keys(COLLECTION_NAMES).indexOf(colId));
        await ensureCategory(regionId, regionName, colId, i);
        if (database) await database.db.insert(content).values(record);
        done++;
        report.push([ref, status, title, fileTitle, license, author, record.fullUrl, '']);
        console.log(`  ✓ ${ref} ${title} ← ${fileTitle} [${license}]`);
      } catch (err) {
        failed++;
        const msg = err instanceof Error ? err.message : String(err);
        report.push([ref, 'error', row.search_query, '', '', '', '', msg]);
        console.log(`  ! ${ref} ${row.search_query}: ${msg}`);
      }
      await sleep(250);
    }
  } finally {
    await database?.close();
    const csv = report.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    writeFileSync(reportPath, csv);
  }
  console.log(`\nIngested ${done}, skipped ${skipped} already present, ${failed} without a usable file. Report: ${reportPath}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
