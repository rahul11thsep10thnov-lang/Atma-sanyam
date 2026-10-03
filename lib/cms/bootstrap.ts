import "@/lib/cms/server-guard";
import { getDb, stateById } from "@/lib/master/repo";
import { slugify } from "@/lib/master/ids";
import type { DestinationRecord, MasterDatabase, MediaRecord } from "@/lib/master/types";
import { markBootstrapped, saveDestination, storeIsEmpty, wasBootstrapped } from "./store";
import {
  emptyDestination, emptyPipeline, type CmsAttraction, type CmsCategory, type CmsDestination, type CmsImage,
  type CompanionType, type SourceRef
} from "./types";

/**
 * First run: turn the 27 seed destinations of the master database into
 * editable CMS documents, so the admin console can change everything the
 * public site shows without touching code. The seed records are editorial
 * drafts (their facts are flagged UNVERIFIED in the master database) and keep
 * that provenance here. They were already live on the site, so they start
 * PUBLISHED; the hero images are generated placeholders, never photographs.
 */

const CATEGORY_MAP: Record<string, CmsCategory | undefined> = {
  HERITAGE: "HERITAGE", HISTORY: "HISTORICAL", SPIRITUAL: "SPIRITUAL", PILGRIMAGE: "SPIRITUAL", NATURE: "NATURE",
  WILDLIFE: "WILDLIFE", BEACH: "BEACH", MOUNTAIN: "MOUNTAIN", HILL_STATION: "HILL_STATION", ADVENTURE: "ADVENTURE",
  CULTURAL: "CULTURAL", FOOD: "FOOD", SHOPPING: "SHOPPING", FAMILY: "FAMILY", ROMANTIC: "ROMANTIC",
  WELLNESS: "WELLNESS", BACKPACKING: "BUDGET", ARCHITECTURE: "HERITAGE", MUSEUM: "CULTURAL", ECO_TOURISM: "NATURE"
};

function seedSource(db: MasterDatabase, sourceId: string | null, retrieved: string): SourceRef {
  const s = sourceId ? db.sources.find((x) => x.id === sourceId) : undefined;
  return {
    label: s ? `Seed dataset — ${s.source_name}` : "Seed dataset (editorial draft)",
    url: s?.url ?? null,
    retrieved_at: retrieved,
    status: "SEED",
    note: "Imported from the budgettourism master seed; facts are marked unverified there."
  };
}

export function imageFromSeedMedia(m: MediaRecord, order = 0): CmsImage {
  const placeholder = m.url.startsWith("placeholder://");
  return {
    id: m.id,
    url: m.url,
    thumbnail_url: m.thumbnail_url,
    direct_url: null,
    source: placeholder ? "Placeholder (generated graphic, not a photograph)" : m.source ?? "unknown",
    source_page_url: null,
    photographer: m.creator,
    license: m.license,
    license_url: null,
    attribution_required: m.credit_required,
    attribution_text: m.credit_required ? m.creator : null,
    download_status: placeholder ? "LOCAL" : "NOT_DOWNLOADED",
    local_path: null,
    approval_status: placeholder ? "APPROVED" : "CANDIDATE",
    caption: m.caption,
    alt: m.alt_text,
    width: null,
    height: null,
    retrieved_at: m.verified_at,
    sort_order: order
  };
}

function companionsFor(categories: CmsCategory[], d: DestinationRecord): CompanionType[] {
  const out = new Set<CompanionType>();
  if (categories.includes("ROMANTIC") || d.couple_suitable) out.add("COUPLE");
  if (categories.includes("FAMILY") || d.family_suitable) out.add("FAMILY");
  if (categories.includes("ADVENTURE") || categories.includes("BEACH")) out.add("FRIENDS");
  if (categories.includes("SPIRITUAL") || categories.includes("BUDGET") || categories.includes("WELLNESS") || d.solo_suitable) out.add("SOLO");
  return [...out];
}

export function cmsFromSeed(db: MasterDatabase, d: DestinationRecord, now: string): CmsDestination {
  const state = stateById(d.state_id);
  const descs = db.destination_descriptions.filter((x) => x.destination_id === d.id);
  const desc = (type: string) => descs.find((x) => x.description_type === type);
  const events = db.historical_events.filter((e) => e.entity_id === d.id);
  const hubs = db.transport_hubs.filter((h) => h.destination_id === d.id);
  const media = (entityId: string) => db.media.filter((m) => m.entity_id === entityId);
  const categories = [...new Set(db.destination_categories.filter((c) => c.destination_id === d.id).map((c) => CATEGORY_MAP[c.category]).filter((c): c is CmsCategory => Boolean(c)))];
  if (d.budget_category === "BUDGET" && !categories.includes("BUDGET")) categories.push("BUDGET");

  const aboutParts = [desc("CURRENT_OVERVIEW"), desc("GEOGRAPHY_OVERVIEW"), desc("CULTURAL_OVERVIEW"), desc("RELIGION_OVERVIEW")].filter(Boolean).map((x) => x!.content);
  const historyOverview = desc("HISTORICAL_OVERVIEW")?.content ?? null;
  const historyEvents = events.map((e) => `- **${e.approximate_date} — ${e.title}.** ${e.description}${e.historical_significance ? ` ${e.historical_significance}` : ""}`);
  const history = [historyOverview, historyEvents.length ? historyEvents.join("\n") : null].filter(Boolean).join("\n\n") || null;

  const transportation = hubs.length
    ? hubs.map((h) => `- ${h.name} (${h.hub_type.toLowerCase().replace("_", " ")}${h.distance_from_destination !== null ? `, ~${h.distance_from_destination} km` : ""})`).join("\n")
    : null;

  const attractions: CmsAttraction[] = db.attractions
    .filter((a) => a.destination_id === d.id)
    .map((a, i) => ({
      id: a.id,
      slug: a.slug,
      name: a.name,
      short_description: a.short_description,
      location_text: a.nearby_transport,
      latitude: a.latitude,
      longitude: a.longitude,
      map_url: a.map_url,
      official_website: a.official_website,
      category: a.attraction_type.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()),
      rating: null,
      review_count: null,
      rating_source: null,
      rating_retrieved_at: null,
      images: media(a.id).map(imageFromSeedMedia),
      sources: [seedSource(db, a.source_id, now)],
      sort_order: i,
      manual_order: false,
      status: a.is_hidden_gem ? "HIDDEN" : "ACTIVE"
    }));

  const hero = media(d.id).find((m) => m.role === "HERO");
  const gallery = media(d.id).filter((m) => m.role !== "HERO").map(imageFromSeedMedia);
  const src = seedSource(db, d.source_id, now);

  const doc = emptyDestination(`CMS-${d.slug}`, d.name, d.slug, now);
  return {
    ...doc,
    state: state?.name ?? null,
    state_slug: state?.slug ?? null,
    district: db.districts.find((x) => x.id === d.district_id)?.name ?? null,
    region: d.region,
    latitude: d.latitude,
    longitude: d.longitude,
    hero_image: hero ? imageFromSeedMedia(hero) : null,
    headline: d.tagline ?? d.one_line_description,
    short_description: d.short_description,
    about: aboutParts.length ? aboutParts.join("\n\n") : null,
    history,
    history_verified: false,
    transportation,
    travel_info: [d.primary_language ? `Languages: ${[d.primary_language, ...d.secondary_languages].join(", ")}` : null, d.budget_category ? `Budget: ${d.budget_category.toLowerCase().replace("_", " ")}` : null].filter(Boolean).join("\n") || null,
    best_time_text: d.best_time_text,
    ideal_duration_text: d.ideal_duration_text,
    nearest_airport: d.nearest_airport,
    nearest_railway_station: d.nearest_railway_station,
    categories,
    companions: companionsFor(categories, d),
    attractions,
    images: gallery,
    faq: [],
    provenance: {
      about: aboutParts.length ? [src] : [],
      history: history ? [src] : [],
      attractions: attractions.length ? [src] : [],
      transportation: transportation ? [src] : [],
      hero_image: hero ? [{ ...src, label: "Placeholder graphic (no photograph collected yet)" }] : []
    },
    pipeline: { ...emptyPipeline(), stage: "NOT_IN_PIPELINE" },
    legacy_slug: d.slug,
    is_sample_data: d.is_sample_data,
    status: "PUBLISHED",
    published_at: now
  };
}

/** Creates the CMS documents for every seed destination once, the first time the store is read while empty. */
export function bootstrapFromSeed(): number {
  if (wasBootstrapped()) return 0;
  markBootstrapped();
  if (!storeIsEmpty()) return 0;
  const db = getDb();
  const now = new Date().toISOString();
  let n = 0;
  for (const d of db.destinations) {
    const doc = cmsFromSeed(db, d, now);
    doc.slug = slugify(doc.slug);
    saveDestination(doc);
    n++;
  }
  return n;
}
