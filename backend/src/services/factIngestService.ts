// Turns permitted source content into "Did You Know?" facts.
//
//   approved source → fetch → extract → claim check → age review →
//   duplicate check → language → store (verified, or published if enabled)
//
// Hard rules enforced here:
//   * a source that is not approved with a verified licence, or whose ingestion
//     is suspended, supplies nothing (canIngestFrom);
//   * a fact's text must be derived from the fetched source passage and add
//     no words of its own (isSupportedBy) — no invented claims;
//   * every fact keeps its page URL, the supporting passage, the licence and
//     the attribution text;
//   * we keep short extracts only, never whole articles;
//   * delivery to children reads the database, never the live API.
import { createHash } from 'node:crypto';
import { and, eq, ne } from 'drizzle-orm';
import type { Db } from '../database/client.js';
import { factSources, facts, sourceVerificationEvents } from '../database/schema.js';
import { FACT_TOPICS, type FactCategoryKey } from '../catalogue/factCategories.js';
import { slugify } from '../lib/strings.js';
import { safeFetchText } from '../lib/safeFetch.js';
import type { RobotsRules } from '../lib/safeFetch.js';
import { buildHostAllowed, canIngestFrom, type RegistryRuntime, type SourceRow } from './sourceRegistryService.js';

// ---------------------------------------------------------------------------
// Pure helpers (unit-tested)
// ---------------------------------------------------------------------------
const WORD = /[\p{L}\p{N}]+/gu;
export const tokens = (s: string) => (s.toLowerCase().match(WORD) ?? []) as string[];

/** Removes parentheticals (pronunciations, dates in brackets) and footnote marks, and tidies spacing. */
export function cleanExtract(s: string): string {
  return s
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+([,.;:!?।])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function splitSentences(s: string): string[] {
  return s
    .split(/(?<=[.!?।])\s+(?=[\p{Lu}\p{N}"'‘“])/u)
    .map((x) => x.trim())
    .filter(Boolean);
}

/** True when every word of `fact` appears, in order, in `source`: the fact adds nothing the source did not say. */
export function isSupportedBy(fact: string, source: string): boolean {
  const f = tokens(fact);
  const s = tokens(source);
  let i = 0;
  for (const w of s) if (i < f.length && w === f[i]) i++;
  return f.length > 0 && i === f.length;
}

const UNSUITABLE =
  /\b(kill(?:s|ed|ing|er|ers)?|murder\w*|death|deaths|die|dies|died|dead|deadly|suicid\w*|war|wars|battle\w*|massacre\w*|genocide|terror\w*|sex\w*|porn\w*|drug\w*|alcohol\w*|beer|wine|whisk(?:e)?y|cigarette\w*|tobacco|weapon\w*|bomb\w*|gun\w*|rape\w*|abus\w*|slave\w*|nazi\w*|violen\w*|blood\w*|tortur\w*|execut\w*|gambl\w*|casino\w*|erotic\w*|nude|naked|hate|racis\w*|disease\w*|cancer|epidemic|pandemic|poison\w*|toxic)\b/i;
const UNSUITABLE_HI = ['हत्या', 'मृत्यु', 'मौत', 'युद्ध', 'यौन', 'शराब', 'हिंसा', 'बलात्कार', 'आतंक', 'नशा', 'जहर', 'कैंसर', 'महामारी'];

export function isUnsuitable(text: string, lang: 'en' | 'hi' = 'en'): string | null {
  if (lang === 'hi') {
    const hit = UNSUITABLE_HI.find((w) => text.includes(w));
    return hit ? `contains "${hit}"` : null;
  }
  const m = text.match(UNSUITABLE);
  return m ? `contains "${m[0]}"` : null;
}

export interface AgeAssessment {
  bracket: 'A' | 'B' | 'C' | 'D';
  brackets: string[];
  minimumAge: number;
  maximumAge: number;
  readingLevel: number;
}

/** Reading-difficulty heuristic: words per sentence and share of long words. Returns null when too complex for 12-year-olds. */
export function assessAge(body: string): AgeAssessment | null {
  const sentences = splitSentences(body);
  const words = tokens(body);
  if (sentences.length === 0 || words.length === 0) return null;
  const wps = words.length / sentences.length;
  const longRatio = words.filter((w) => w.length >= 9).length / words.length;
  const table: [number, number, AgeAssessment['bracket'], number][] = [
    [8, 0.05, 'A', 3],
    [14, 0.1, 'B', 6],
    [22, 0.16, 'C', 9],
    [32, 0.22, 'D', 11],
  ];
  const hit = table.find(([w, l]) => wps <= w && longRatio <= l);
  if (!hit) return null;
  const order = ['A', 'B', 'C', 'D'];
  return { bracket: hit[2], brackets: order.slice(order.indexOf(hit[2])), minimumAge: hit[3], maximumAge: 12, readingLevel: order.indexOf(hit[2]) + 1 };
}

const STOP = new Set('a an the of and or to in on at for from by with as is are was were be been it its this that these those which who whom has have had not but also than then can may'.split(' '));
export const significant = (s: string) => new Set(tokens(s).filter((w) => !STOP.has(w) && w.length > 1));

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

export const contentHash = (text: string) => createHash('sha256').update([...significant(text)].sort().join(' ')).digest('hex');

export function fillAttribution(template: string | null, vars: { title: string; pageUrl: string; licence: string | null }): string {
  const t = template ?? 'Source: {title} ({pageUrl}), {licence}.';
  return t.split('{title}').join(vars.title).split('{pageUrl}').join(vars.pageUrl).split('{licence}').join(vars.licence ?? 'see source');
}

// ---------------------------------------------------------------------------
// Wikipedia summary connector
// ---------------------------------------------------------------------------
// Curated, child-friendly article titles per topic; the connector fetches
// each article's short REST summary (never the full article).
export const WIKIPEDIA_TITLES: Record<string, string[]> = {
  animals_wildlife: ['Blue whale', 'Cheetah'],
  plants_flowers: ['Sunflower', 'Banyan'],
  space_astronomy: ['Jupiter', 'Moon'],
  science_inventions: ['Printing press', 'Telephone'],
  maths_logic: ['Pi', 'Zero'],
  geography_countries: ['Mount Everest', 'Sahara'],
  indian_history_culture: ['Taj Mahal', 'Ashoka'],
  human_body_health: ['Heart', 'Skeleton'],
  environment_climate: ['Rainforest', 'Water cycle'],
  oceans_marine: ['Octopus', 'Coral reef'],
  technology_computers: ['Computer', 'Robot'],
  food_nutrition: ['Honey', 'Rice'],
  art_music_literature: ['Piano', 'Rabindranath Tagore'],
  general_knowledge: ['Leap year', 'Time zone'],
  critical_thinking: ['Möbius strip', 'Optical illusion'],
};

interface WikiSummary {
  title: string;
  extract: string;
  pageUrl: string;
}

const summaryUrl = (lang: string, title: string) => `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`;

async function getJson(url: string, rt: RegistryRuntime, robotsCache: Map<string, RobotsRules | 'unavailable'>): Promise<unknown | null> {
  const res = await safeFetchText(url, {
    userAgent: rt.userAgent,
    timeoutMs: rt.timeoutMs,
    maxBytes: 500_000,
    retries: rt.retries,
    hostAllowed: buildHostAllowed(['wikipedia.org']),
    fetchImpl: rt.fetchImpl,
    resolve: rt.resolve,
    sleep: rt.sleep,
    respectRobots: true,
    robotsCache,
    accept: 'application/json',
  });
  if (res.status === 404) return null;
  if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
  return JSON.parse(res.text);
}

async function fetchSummary(lang: string, title: string, rt: RegistryRuntime, cache: Map<string, RobotsRules | 'unavailable'>): Promise<WikiSummary | null> {
  const j = (await getJson(summaryUrl(lang, title), rt, cache)) as { type?: string; title?: string; extract?: string; content_urls?: { desktop?: { page?: string } } } | null;
  if (!j || j.type === 'disambiguation' || !j.extract || !j.title) return null;
  return { title: j.title, extract: j.extract, pageUrl: j.content_urls?.desktop?.page ?? `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(j.title.replace(/ /g, '_'))}` };
}

async function hindiTitle(title: string, rt: RegistryRuntime, cache: Map<string, RobotsRules | 'unavailable'>): Promise<string | null> {
  const url = `https://en.wikipedia.org/w/api.php?action=query&prop=langlinks&lllang=hi&redirects=1&format=json&formatversion=2&titles=${encodeURIComponent(title)}`;
  const j = (await getJson(url, rt, cache)) as { query?: { pages?: { langlinks?: { title?: string; lang?: string }[] }[] } } | null;
  return j?.query?.pages?.[0]?.langlinks?.[0]?.title ?? null;
}

// ---------------------------------------------------------------------------
// The pipeline
// ---------------------------------------------------------------------------
export interface IngestReport {
  sources: { key: string | null; attempted: number; created: number; rejected: Record<string, number>; skippedReason?: string }[];
  created: number;
}

export interface IngestOptions {
  maxPerRun: number;
  autoPublish: boolean;
  /** Restrict to one source (used by the console's manual action). */
  sourceId?: string;
}

const bump = (o: Record<string, number>, k: string) => {
  o[k] = (o[k] ?? 0) + 1;
};

export async function runIngestion(db: Db, rt: RegistryRuntime, opts: IngestOptions): Promise<IngestReport> {
  const report: IngestReport = { sources: [], created: 0 };
  const sources = await db.select().from(factSources).where(opts.sourceId ? eq(factSources.id, opts.sourceId) : ne(factSources.connector, ''));
  const robotsCache = new Map<string, RobotsRules | 'unavailable'>();
  let budget = opts.maxPerRun;

  for (const source of sources.filter((s) => s.connector === 'wikipedia_summary')) {
    const entry: IngestReport['sources'][number] = { key: source.sourceKey, attempted: 0, created: 0, rejected: {} };
    report.sources.push(entry);
    // Gate 1: only an approved, licence-verified, non-suspended source with text permission.
    if (!canIngestFrom(source, 'text')) {
      entry.skippedReason = `source is ${source.verificationStatus}${source.ingestionSuspended ? ' (ingestion suspended)' : ''}${source.licenceVerified ? '' : ', licence not verified'}`;
      rt.log(`ingestion skipped for ${source.sourceKey}: ${entry.skippedReason}`);
      continue;
    }
    for (const topic of FACT_TOPICS) {
      for (const title of WIKIPEDIA_TITLES[topic.key] ?? []) {
        if (budget <= 0) break;
        const slug = `wiki-${slugify(title)}`;
        const [have] = await db.select({ id: facts.id }).from(facts).where(eq(facts.slug, slug)).limit(1);
        if (have) continue; // already ingested (or rejected earlier and stored as nothing: we simply try again later)
        entry.attempted++;
        try {
          const outcome = await ingestOne(db, rt, source, topic.category, title, slug, opts.autoPublish, robotsCache);
          if (outcome === 'created') {
            entry.created++;
            report.created++;
            budget--;
          } else bump(entry.rejected, outcome);
        } catch (err) {
          // A broken endpoint must not crash the run.
          bump(entry.rejected, 'fetch_error');
          rt.log(`ingest ${slug} failed: ${err instanceof Error ? err.message : 'error'}`);
        }
      }
    }
    if (entry.created > 0) {
      await db.insert(sourceVerificationEvents).values({ sourceId: source.id, trigger: 'ingest', outcome: 'ingested', fromStatus: source.verificationStatus, toStatus: source.verificationStatus, detail: `${entry.created} fact(s) created` });
    }
  }
  return report;
}

export async function ingestOne(db: Db, rt: RegistryRuntime, source: SourceRow, category: FactCategoryKey, title: string, slug: string, autoPublish: boolean, robotsCache: Map<string, RobotsRules | 'unavailable'>): Promise<string> {
  const sleep = rt.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  if (rt.minIntervalMs > 0) await sleep(rt.minIntervalMs);
  const en = await fetchSummary('en', title, rt, robotsCache);
  if (!en) return 'no_article';

  const cleaned = cleanExtract(en.extract);
  const sentences = splitSentences(cleaned);
  if (sentences.length === 0) return 'empty';
  const body = sentences.slice(0, 2).join(' ').slice(0, 320).trim();
  const headline = sentences[0]!.length <= 120 ? sentences[0]! : en.title;

  // Claim check: the fact may contain nothing the source passage did not say.
  if (!isSupportedBy(body, en.extract) || !isSupportedBy(headline === en.title ? en.title : headline, en.extract + ' ' + en.title)) return 'not_supported_by_source';

  const unsuitable = isUnsuitable(`${headline} ${body}`);
  if (unsuitable) return 'age_inappropriate';
  const age = assessAge(body);
  if (!age) return 'too_complex';

  // Duplicates: exact (hash) and near (similar wording in the same category).
  const hash = contentHash(`${headline} ${body}`);
  const same = await db.select({ id: facts.id, headline: facts.headline, body: facts.body, hash: facts.contentHash }).from(facts).where(eq(facts.category, category));
  if (same.some((f) => f.hash === hash)) return 'duplicate';
  const mine = significant(`${headline} ${body}`);
  if (same.some((f) => jaccard(mine, significant(`${f.headline} ${f.body}`)) >= 0.7)) return 'near_duplicate';

  // Hindi: the Hindi Wikipedia's own summary of the same topic (no machine translation).
  const translations: Record<string, Record<string, string>> = {};
  let hiRef = '';
  try {
    const hiTitle = await hindiTitle(en.title, rt, robotsCache);
    const hi = hiTitle ? await fetchSummary('hi', hiTitle, rt, robotsCache) : null;
    if (hi) {
      const hs = splitSentences(cleanExtract(hi.extract));
      const hiBody = hs.slice(0, 2).join(' ').slice(0, 320);
      if (hs.length && !isUnsuitable(hiBody, 'hi') && isSupportedBy(hiBody, hi.extract)) {
        translations.hi = { headline: hs[0]!.length <= 120 ? hs[0]! : hi.title, body: hiBody };
        hiRef = ` | Hindi: ${hi.pageUrl}`;
      }
    }
  } catch {
    // Hindi is optional; English facts do not wait on it.
  }

  const attribution = fillAttribution(source.attributionTemplate, { title: en.title, pageUrl: en.pageUrl, licence: source.licenceName });
  const now = rt.now();
  const publish = autoPublish && canIngestFrom(source, 'text');
  const [row] = await db
    .insert(facts)
    .values({
      slug,
      category,
      headline,
      body,
      brackets: age.brackets,
      readingLevel: age.readingLevel,
      illustration: 'sparkles',
      sourceId: source.id,
      status: publish ? 'published' : 'verified',
      verifiedAt: now,
      publishedAt: publish ? now : null,
      translations,
      ingestionKind: 'ingested',
      language: 'en',
      minimumAge: age.minimumAge,
      maximumAge: age.maximumAge,
      sourceUrl: en.pageUrl,
      supportingReference: `${en.extract.slice(0, 500)}${hiRef}`,
      licenceName: source.licenceName,
      attributionText: attribution,
      claimCheck: 'source_supported',
      reviewedAt: now,
      contentHash: hash,
    })
    .onConflictDoNothing()
    .returning({ id: facts.id });
  return row ? 'created' : 'duplicate';
}

