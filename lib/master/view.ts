import { placeholderImage } from "@/lib/data/placeholder";
import type { DestinationSummary, ImageAsset } from "@/lib/types";
import { getDb, destinationById, destinationBySlug, stateById } from "./repo";
import type { AttractionRecord, DestinationRecord, MediaRecord, StateRecord } from "./types";

/**
 * Presentation helpers over the master database. Pages and components read
 * through here; nothing in this file stores data of its own. Never import this
 * module from a client component (it pulls in the whole database) — pass small
 * serialisable props down from server components instead.
 */

export function imageFromMedia(m: MediaRecord): ImageAsset {
  if (m.url.startsWith("placeholder://")) {
    const w = Number(m.url.match(/[?&]w=(\d+)/)?.[1] ?? 1200);
    const h = Number(m.url.match(/[?&]h=(\d+)/)?.[1] ?? 800);
    return placeholderImage(m.caption ?? m.alt_text, w, h);
  }
  return {
    url: m.url,
    alt: m.alt_text,
    source: m.source ?? "unknown",
    copyright: m.license ?? m.copyright_status
  };
}

const mediaFor = (entityId: string, role: MediaRecord["role"]) => getDb().media.filter((m) => m.entity_id === entityId && m.role === role);

export function heroImageOf(destId: string, name: string): ImageAsset {
  const hero = mediaFor(destId, "HERO")[0];
  return hero ? imageFromMedia(hero) : placeholderImage(name, 1600, 900);
}

/** Watermark images for the 15-second crossfade: the destination's own set, else its attraction photos, else the hero. */
export function watermarkImagesOf(destId: string, name: string): ImageAsset[] {
  const own = mediaFor(destId, "WATERMARK").map(imageFromMedia);
  if (own.length) return own;
  const attractionIds = new Set(getDb().attractions.filter((a) => a.destination_id === destId && !a.is_hidden_gem).map((a) => a.id));
  const gallery = getDb().media.filter((m) => attractionIds.has(m.entity_id)).slice(0, 4).map(imageFromMedia);
  return gallery.length ? gallery : [heroImageOf(destId, name)];
}

export interface DestinationView {
  record: DestinationRecord;
  state: StateRecord;
  summary: DestinationSummary;
  heroImage: ImageAsset;
  watermarkImages: ImageAsset[];
  /** Locale-less path, e.g. /india/uttar-pradesh/varanasi */
  path: string;
}

export function summaryOf(d: DestinationRecord): DestinationSummary {
  const state = stateById(d.state_id)!;
  const categories = getDb().destination_categories.filter((c) => c.destination_id === d.id).map((c) => c.category.toLowerCase());
  return {
    id: d.id,
    slug: d.slug,
    name: d.name,
    state: state.name,
    stateSlug: state.slug,
    district: undefined,
    tagline: d.tagline ?? d.one_line_description,
    shortDescription: d.short_description,
    heroImage: heroImageOf(d.id, d.name),
    bestTimeToVisit: d.best_time_text ?? "Not yet collected",
    popularity: d.popularity,
    tags: categories
  };
}

export function viewOf(d: DestinationRecord): DestinationView {
  const state = stateById(d.state_id)!;
  return {
    record: d,
    state,
    summary: summaryOf(d),
    heroImage: heroImageOf(d.id, d.name),
    watermarkImages: watermarkImagesOf(d.id, d.name),
    path: `/india/${state.slug}/${d.slug}`
  };
}

export function viewBySlug(slug: string): DestinationView | undefined {
  const d = destinationBySlug(slug);
  return d ? viewOf(d) : undefined;
}

/** Major (level A) destinations — the ones that can justify a trip on their own; drives homepage, explore, search. */
export function majorSummaries(): DestinationSummary[] {
  return getDb().destinations.filter((d) => d.destination_level === "A").map(summaryOf);
}

export function allSummaries(): DestinationSummary[] {
  return getDb().destinations.map(summaryOf);
}

export const popularSummaries = (limit = 8) => [...majorSummaries()].sort((a, b) => b.popularity - a.popularity).slice(0, limit);

const bySlugs = (slugs: string[]): DestinationSummary[] => {
  const all = new Map(majorSummaries().map((s) => [s.slug, s]));
  return slugs.map((s) => all.get(s)).filter((s): s is DestinationSummary => Boolean(s));
};

export const popularSearchSlugs = ["delhi", "agra", "goa", "jaipur", "varanasi", "kochi", "srinagar", "udaipur"];

/**
 * Curated slug lists for each homepage rail. `wildlife` is intentionally empty until a
 * national-park destination is added — the rail hides itself rather than showing a mismatch.
 */
export function homepageSections() {
  return {
    popularDestinations: popularSummaries(8),
    weekendGetaways: bySlugs(["agra", "rishikesh", "ooty", "khajuraho"]),
    historicalIndia: bySlugs(["delhi", "agra", "khajuraho", "jodhpur"]),
    spiritualIndia: bySlugs(["varanasi", "rishikesh", "amritsar", "ayodhya"]),
    beaches: bySlugs(["goa"]),
    mountains: bySlugs(["manali", "srinagar", "ooty", "darjeeling"]),
    wildlife: bySlugs([]),
    heritageCities: bySlugs(["jaipur", "udaipur", "jodhpur", "varanasi"]),
    familyDestinations: bySlugs(["goa", "ooty", "mysuru", "delhi"]),
    romanticDestinations: bySlugs(["udaipur", "goa", "manali", "darjeeling"]),
    adventureDestinations: bySlugs(["manali", "rishikesh", "goa"]),
    authenticMarkets: bySlugs(["jaipur", "varanasi", "srinagar", "delhi"]),
    famousFood: bySlugs(["lucknow", "amritsar", "hyderabad", "chennai"])
  };
}

/** Compact, serialisable list for client-side autocomplete (passed as a prop — never import the database in client code). */
export interface SuggestionItem {
  label: string;
  sublabel: string;
  href: string; // locale-less
}

export function suggestionIndex(): SuggestionItem[] {
  const db = getDb();
  const states = new Map(db.states.map((s) => [s.id, s]));
  const dests: SuggestionItem[] = db.destinations.map((d) => ({
    label: d.name,
    sublabel: states.get(d.state_id)!.name,
    href: `/india/${states.get(d.state_id)!.slug}/${d.slug}`
  }));
  const stateItems: SuggestionItem[] = db.states
    .filter((s) => db.destinations.some((d) => d.state_id === s.id))
    .map((s) => ({ label: s.name, sublabel: s.type === "STATE" ? "State" : "Union Territory", href: `/india/${s.slug}` }));
  return [...dests, ...stateItems];
}

export const localeAware = (locale: string, path: string) => `/${locale}${path}`;

// ---- links -----------------------------------------------------------------

/** Locale-less page path of an attraction: /india/{state}/{destination}/{attraction}. */
export function attractionPath(a: AttractionRecord): string {
  const d = destinationById(a.destination_id)!;
  const s = stateById(d.state_id)!;
  return `/india/${s.slug}/${d.slug}/${a.slug}`;
}

/** attraction id → path, for the given ids (used to link plan activities). */
export function attractionHrefs(ids: Iterable<string>): Record<string, string> {
  const wanted = new Set(ids);
  const out: Record<string, string> = {};
  for (const a of getDb().attractions) if (wanted.has(a.id)) out[a.id] = attractionPath(a);
  return out;
}

/** Looks up a stored translation for an entity field; falls back to the source-language text. */
export function translated(entityId: string, field: string, locale: string, fallback: string): string {
  if (locale === "en") return fallback;
  const t = getDb().translations.find((x) => x.entity_id === entityId && x.language_code === locale && x.field_name === field);
  return t ? t.translated_text : fallback;
}

// ---- festivals ---------------------------------------------------------------

export interface FestivalCardData {
  id: string;
  name: string;
  month: string;
  description: string;
  destinationName: string;
  href: string; // locale-less
  image: ImageAsset;
  verified: boolean;
}

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

/** Month numbers (1–12) mentioned in a free-text festival month such as "February/March". */
function monthsMentioned(text: string): number[] {
  const t = text.toLowerCase();
  return MONTHS.map((m, i) => (t.includes(m) ? i + 1 : 0)).filter(Boolean);
}

/** Festivals attached to a destination, soonest-first by calendar month from `now`. Dates are never invented — the month text is shown as stored. */
export function upcomingFestivalCards(limit = 8, now = new Date()): FestivalCardData[] {
  const db = getDb();
  const current = now.getMonth() + 1;
  return db.festivals
    .filter((f) => f.destination_id && destinationById(f.destination_id))
    .map((f) => {
      const months = monthsMentioned(f.month);
      const distance = months.length ? Math.min(...months.map((m) => (m - current + 12) % 12)) : 12;
      const d = destinationById(f.destination_id!)!;
      return {
        distance,
        card: {
          id: f.id,
          name: f.name,
          month: f.month,
          description: f.description,
          destinationName: d.name,
          href: `/india/${stateById(d.state_id)!.slug}/${d.slug}#festivals`,
          image: placeholderImage(`${f.name} ${d.name}`, 800, 600),
          verified: f.confidence === "VERIFIED" || f.confidence === "MULTIPLE_SOURCES" || f.confidence === "PROVISIONALLY_VERIFIED"
        } satisfies FestivalCardData
      };
    })
    .sort((a, b) => a.distance - b.distance || a.card.name.localeCompare(b.card.name))
    .slice(0, limit)
    .map((x) => x.card);
}
