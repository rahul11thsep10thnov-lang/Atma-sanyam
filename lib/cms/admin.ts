import "@/lib/cms/server-guard";
import { slugify } from "@/lib/master/ids";
import { getDb } from "@/lib/master/repo";
import { bootstrapFromSeed } from "./bootstrap";
import { allDestinations, deleteDestination, getDestination, saveDestination, setStatus, uniqueSlug } from "./store";
import {
  CMS_CATEGORIES, COMPANION_TYPES, PUBLICATION_STATUSES, emptyAttraction, emptyDestination, emptyHotel, emptyPipeline, emptyRestaurant,
  type CmsAttraction, type CmsCategory, type CmsDestination, type CmsFaq, type CmsHotel, type CmsImage, type CmsRestaurant, type CmsSeo,
  type CompanionType, type ImageSearchState, type ProvenanceMap, type PublicationStatus, type SourceRef, IMAGE_PROVIDERS
} from "./types";

/**
 * Write side of the CMS used by the admin API. Every incoming document is
 * re-validated field by field (types, lengths, enums, image limits) before it
 * is stored — the editor's JSON is never trusted as-is.
 */

const now = () => new Date().toISOString();
const str = (v: unknown, max = 4000): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const text = (v: unknown, max = 20000): string | null => (typeof v === "string" && v.trim() ? v.replace(/<[^>]*>/g, "").trim().slice(0, max) : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : null);
const bool = (v: unknown): boolean | null => (typeof v === "boolean" ? v : v === "true" ? true : v === "false" ? false : null);
const strList = (v: unknown, max = 40): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "").map((x) => x.trim().slice(0, 200)).slice(0, max) : typeof v === "string" ? v.split(",").map((x) => x.trim()).filter(Boolean).slice(0, max) : []);
const url = (v: unknown): string | null => {
  const s = str(v, 2000);
  if (!s) return null;
  if (s.startsWith("/")) return s;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
};
const enumOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T => (typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback);
const enumList = <T extends string>(v: unknown, allowed: readonly T[]): T[] => (Array.isArray(v) ? [...new Set(v.filter((x): x is T => typeof x === "string" && (allowed as readonly string[]).includes(x)))] : []);
const id = (v: unknown, prefix: string) => str(v, 120)?.replace(/[^A-Za-z0-9_./-]/g, "") || `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

export const MAX_APPROVED_PER_ATTRACTION = 4;

export function sanitiseImage(v: unknown, order = 0): CmsImage | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const u = url(o.url) ?? (typeof o.url === "string" && o.url.startsWith("placeholder://") ? o.url : null);
  if (!u) return null;
  return {
    id: id(o.id, "IMG"),
    url: u,
    thumbnail_url: url(o.thumbnail_url),
    original_url: url(o.original_url),
    source: str(o.source, 200) ?? "unknown",
    source_page_url: url(o.source_page_url),
    photographer: str(o.photographer, 200),
    license: str(o.license, 200),
    license_url: url(o.license_url),
    attribution_required: bool(o.attribution_required) ?? false,
    attribution_text: str(o.attribution_text, 500),
    download_status: enumOf(o.download_status, ["NOT_DOWNLOADED", "DOWNLOADED", "FAILED", "LOCAL", "HOTLINKED"] as const, "NOT_DOWNLOADED"),
    local_path: typeof o.local_path === "string" && o.local_path.startsWith("/") ? o.local_path.slice(0, 500) : null,
    approval_status: enumOf(o.approval_status === "CANDIDATE" ? "PENDING" : o.approval_status, ["PENDING", "APPROVED", "REJECTED"] as const, "PENDING"),
    preview_url: url(o.preview_url),
    provider: enumOf(o.provider, ["wikimedia", "pixabay", "unsplash", "pexels", "manual", "seed"] as const, "manual"),
    provider_image_id: str(o.provider_image_id, 120),
    photographer_url: url(o.photographer_url),
    description: str(o.description, 1000),
    source_query: str(o.source_query, 300),
    discovered_at: str(o.discovered_at, 40),
    rejection_reason: str(o.rejection_reason, 300),
    latitude: num(o.latitude),
    longitude: num(o.longitude),
    hotlink_required: bool(o.hotlink_required) ?? false,
    download_location: url(o.download_location),
    download_event_sent_at: str(o.download_event_sent_at, 40),
    relevance_score: num(o.relevance_score),
    caption: str(o.caption, 300),
    alt: str(o.alt, 300) ?? "",
    width: num(o.width),
    height: num(o.height),
    retrieved_at: str(o.retrieved_at, 40),
    sort_order: num(o.sort_order) ?? order
  };
}

const images = (v: unknown): CmsImage[] => (Array.isArray(v) ? v.map(sanitiseImage).filter((x): x is CmsImage => Boolean(x)).slice(0, 80) : []);

/** Approved images are capped per attraction; extras beyond the cap fall back to candidates. */
export function capApproved(list: CmsImage[], max = MAX_APPROVED_PER_ATTRACTION): CmsImage[] {
  let n = 0;
  return list.map((img) => (img.approval_status === "APPROVED" ? (++n <= max ? img : { ...img, approval_status: "PENDING" as const }) : img));
}

function sanitiseSource(v: unknown): SourceRef | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const label = str(o.label, 200);
  if (!label) return null;
  return { label, url: url(o.url), retrieved_at: str(o.retrieved_at, 40), status: enumOf(o.status, ["OK", "SOURCE_UNAVAILABLE", "MANUAL", "SEED", "WEB_SEARCH"] as const, "MANUAL"), note: str(o.note, 500) ?? undefined };
}
const sources = (v: unknown): SourceRef[] => (Array.isArray(v) ? v.map(sanitiseSource).filter((x): x is SourceRef => Boolean(x)).slice(0, 20) : []);

/** Image-search state is written by the pipeline; an editor save may only carry it through unchanged in shape. */
function searchState(v: unknown): ImageSearchState | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const status = enumOf(o.status, ["COMPLETED", "PARTIAL", "NO_RESULTS", "FAILED", "NOT_RUN"] as const, "NOT_RUN");
  const providers = Array.isArray(o.providers) ? (o.providers as Array<Record<string, unknown>>).slice(0, 8).map((p) => ({
    provider: enumOf(p.provider, IMAGE_PROVIDERS, "wikimedia"),
    status: enumOf(p.status, ["OK", "NO_RESULTS", "PROVIDER_UNAVAILABLE", "RATE_LIMITED", "NOT_CONFIGURED", "DISABLED", "SKIPPED", "ERROR"] as const, "ERROR"),
    found: num(p.found) ?? 0, kept: num(p.kept) ?? 0, requests: num(p.requests) ?? 0, http_status: num(p.http_status), note: str(p.note, 300)
  })) : [];
  return { status, searched_at: str(o.searched_at, 40), providers, final_candidates: num(o.final_candidates) ?? 0, auto_rejected: num(o.auto_rejected) ?? 0, queries: strList(o.queries, 30) };
}

export function sanitiseAttraction(v: unknown, order: number, destSlug: string): CmsAttraction | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const name = str(o.name, 160);
  if (!name) return null;
  const base = emptyAttraction(id(o.id, `${destSlug}-att`), str(o.slug, 120) ?? slugify(name), name);
  return {
    ...base,
    slug: slugify(str(o.slug, 120) ?? name),
    short_description: text(o.short_description, 3000) ?? "",
    location_text: str(o.location_text, 300),
    latitude: num(o.latitude),
    longitude: num(o.longitude),
    map_url: url(o.map_url),
    official_website: url(o.official_website),
    category: str(o.category, 80),
    rating: (() => { const r = num(o.rating); return r !== null && r >= 0 && r <= 5 ? r : null; })(),
    review_count: (() => { const r = num(o.review_count); return r !== null && r >= 0 ? Math.round(r) : null; })(),
    rating_source: str(o.rating_source, 200),
    rating_retrieved_at: str(o.rating_retrieved_at, 40),
    images: capApproved(images(o.images)),
    sources: sources(o.sources),
    sort_order: num(o.sort_order) ?? order,
    manual_order: bool(o.manual_order) ?? false,
    status: enumOf(o.status, ["ACTIVE", "HIDDEN"] as const, "ACTIVE"),
    image_search: searchState(o.image_search)
  };
}

function sanitiseHotel(v: unknown, order: number): CmsHotel | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const base = emptyHotel(id(o.id, "HOTEL"), now());
  return {
    ...base,
    name: str(o.name, 200) ?? "",
    images: images(o.images),
    address: str(o.address, 500), map_url: url(o.map_url), google_rating: (() => { const r = num(o.google_rating); return r !== null && r >= 0 && r <= 5 ? r : null; })(),
    review_count: num(o.review_count), rating_source: str(o.rating_source, 200), phone: str(o.phone, 40), website: url(o.website),
    check_in_time: str(o.check_in_time, 40), check_out_time: str(o.check_out_time, 40), initial_fare: num(o.initial_fare), discounted_fare: num(o.discounted_fare),
    room_type: str(o.room_type, 120), amenities: strList(o.amenities), breakfast_included: bool(o.breakfast_included), parking: bool(o.parking), wifi: bool(o.wifi),
    air_conditioning: bool(o.air_conditioning), family_rooms: bool(o.family_rooms), cancellation_policy: str(o.cancellation_policy, 1000),
    distance_from_attraction_km: num(o.distance_from_attraction_km), distance_from_railway_km: num(o.distance_from_railway_km), distance_from_airport_km: num(o.distance_from_airport_km),
    contact_person: str(o.contact_person, 200), collaboration_status: enumOf(o.collaboration_status, ["NONE", "CONTACTED", "IN_TALKS", "PARTNER", "DECLINED"] as const, "NONE"),
    admin_notes: str(o.admin_notes, 2000), status: enumOf(o.status, ["DRAFT", "PUBLISHED"] as const, "DRAFT"), sort_order: num(o.sort_order) ?? order, last_updated: now()
  };
}

function sanitiseRestaurant(v: unknown, order: number): CmsRestaurant | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const base = emptyRestaurant(id(o.id, "REST"), now());
  return {
    ...base,
    name: str(o.name, 200) ?? "",
    images: images(o.images), cuisine: str(o.cuisine, 200), address: str(o.address, 500), map_url: url(o.map_url),
    google_rating: (() => { const r = num(o.google_rating); return r !== null && r >= 0 && r <= 5 ? r : null; })(), review_count: num(o.review_count), rating_source: str(o.rating_source, 200),
    price_range: str(o.price_range, 120), phone: str(o.phone, 40), website: url(o.website), opening_hours: str(o.opening_hours, 200),
    veg_type: (() => { const s = str(o.veg_type, 10); return s === "VEG" || s === "NON_VEG" || s === "BOTH" ? s : null; })(),
    specialities: strList(o.specialities), popular_dishes: strList(o.popular_dishes), amenities: strList(o.amenities), delivery_available: bool(o.delivery_available),
    contact_details: str(o.contact_details, 500), collaboration_status: enumOf(o.collaboration_status, ["NONE", "CONTACTED", "IN_TALKS", "PARTNER", "DECLINED"] as const, "NONE"),
    admin_notes: str(o.admin_notes, 2000), status: enumOf(o.status, ["DRAFT", "PUBLISHED"] as const, "DRAFT"), sort_order: num(o.sort_order) ?? order, last_updated: now()
  };
}

function sanitiseSeo(v: unknown): CmsSeo {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const canonical = str(o.canonical_path, 300);
  return { title: str(o.title, 120), description: str(o.description, 320), keywords: strList(o.keywords, 20), canonical_path: canonical && canonical.startsWith("/") ? canonical : null, og_image: url(o.og_image) };
}

function sanitiseProvenance(v: unknown): ProvenanceMap {
  const out: ProvenanceMap = {};
  if (!v || typeof v !== "object") return out;
  for (const [k, list] of Object.entries(v as Record<string, unknown>)) if (/^[a-z_]{1,40}$/.test(k)) out[k] = sources(list);
  return out;
}

/** Merges an incoming (untrusted) document over the stored one; system fields (id, timestamps, pipeline) are preserved. */
export function sanitiseDestination(input: unknown, existing: CmsDestination): CmsDestination {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const name = str(o.name, 160) ?? existing.name;
  const requestedSlug = slugify(str(o.slug, 120) ?? existing.slug) || slugify(name);
  const slug = requestedSlug === existing.slug ? existing.slug : uniqueSlug(requestedSlug, existing.id);
  const stateName = str(o.state, 120);
  const stateRec = stateName ? getDb().states.find((s) => s.name.toLowerCase() === stateName.toLowerCase() || s.slug === slugify(stateName)) : undefined;
  const faq: CmsFaq[] = Array.isArray(o.faq) ? o.faq.map((f) => (f && typeof f === "object" ? { question: str((f as Record<string, unknown>).question, 300) ?? "", answer: text((f as Record<string, unknown>).answer, 3000) ?? "" } : null)).filter((f): f is CmsFaq => Boolean(f && f.question && f.answer)).slice(0, 30) : existing.faq;
  const status = enumOf(o.status, PUBLICATION_STATUSES, existing.status);
  return {
    ...existing,
    name,
    slug,
    state: stateRec?.name ?? stateName,
    state_slug: stateRec?.slug ?? (stateName ? slugify(stateName) : null),
    district: str(o.district, 120),
    region: str(o.region, 60),
    latitude: num(o.latitude),
    longitude: num(o.longitude),
    hero_image: sanitiseImage(o.hero_image),
    headline: str(o.headline, 200),
    short_description: text(o.short_description, 1000),
    about: text(o.about),
    history: text(o.history),
    history_verified: bool(o.history_verified) ?? false,
    transportation: text(o.transportation, 5000),
    travel_info: text(o.travel_info, 5000),
    best_time_text: str(o.best_time_text, 200),
    ideal_duration_text: str(o.ideal_duration_text, 100),
    nearest_airport: str(o.nearest_airport, 200),
    nearest_railway_station: str(o.nearest_railway_station, 200),
    categories: enumList<CmsCategory>(o.categories, CMS_CATEGORIES),
    companions: enumList<CompanionType>(o.companions, COMPANION_TYPES),
    attractions: (Array.isArray(o.attractions) ? o.attractions : existing.attractions).map((a, i) => sanitiseAttraction(a, i, slug)).filter((a): a is CmsAttraction => Boolean(a)).slice(0, 100),
    hotels: (Array.isArray(o.hotels) ? o.hotels : existing.hotels).map((h, i) => sanitiseHotel(h, i)).filter((h): h is CmsHotel => Boolean(h)).slice(0, 200),
    restaurants: (Array.isArray(o.restaurants) ? o.restaurants : existing.restaurants).map((r, i) => sanitiseRestaurant(r, i)).filter((r): r is CmsRestaurant => Boolean(r)).slice(0, 200),
    images: Array.isArray(o.images) ? images(o.images) : existing.images,
    gallery_search: "gallery_search" in o ? searchState(o.gallery_search) : existing.gallery_search ?? null,
    faq,
    seo: sanitiseSeo(o.seo ?? existing.seo),
    provenance: o.provenance ? sanitiseProvenance(o.provenance) : existing.provenance,
    legacy_slug: str(o.legacy_slug, 120),
    verification_status: o.verification_status === "VERIFIED" ? "VERIFIED" : o.verification_status === "UNVERIFIED" ? "UNVERIFIED" : existing.verification_status,
    status,
    published_at: status === "PUBLISHED" ? existing.published_at ?? now() : existing.published_at
  };
}

// ---- operations -------------------------------------------------------------

export function createDestination(name: string, state?: string | null, extra: Partial<CmsDestination> = {}): CmsDestination {
  bootstrapFromSeed();
  const clean = name.trim().slice(0, 160);
  const slug = uniqueSlug(slugify(clean));
  const doc = emptyDestination(`CMS-${slug}`, clean, slug, now());
  const stateRec = state ? getDb().states.find((s) => s.name.toLowerCase() === state.toLowerCase() || s.slug === slugify(state) || s.iso_code.replace(/^IN-/, "") === state.toUpperCase()) : undefined;
  return saveDestination({ ...doc, ...extra, state: stateRec?.name ?? (state?.trim() || null), state_slug: stateRec?.slug ?? (state ? slugify(state) : null), provenance: { ...(extra.provenance ?? {}), created: [{ label: "Admin entry", url: null, retrieved_at: now(), status: "MANUAL" }] } });
}

export function duplicateDestination(id: string): CmsDestination | null {
  const src = getDestination(id);
  if (!src) return null;
  const name = `${src.name} (copy)`;
  const slug = uniqueSlug(slugify(name));
  const stamp = now();
  return saveDestination({ ...structuredClone(src), id: `CMS-${slug}`, name, slug, status: "DRAFT", published_at: null, created_at: stamp, updated_at: stamp, pipeline: emptyPipeline(), seo: { ...src.seo, canonical_path: null } });
}

export type BulkAction = "publish" | "unpublish" | "archive" | "delete" | "set_state" | "add_category" | "remove_category" | "set_companions" | "seo_template";

export interface BulkPayload {
  state?: string;
  category?: CmsCategory;
  companions?: CompanionType[];
  seo_title?: string; // may use {name} and {state}
  seo_description?: string;
}

export function bulkApply(ids: string[], action: BulkAction, payload: BulkPayload = {}): { changed: number; errors: string[] } {
  let changed = 0;
  const errors: string[] = [];
  for (const did of ids.slice(0, 500)) {
    const d = getDestination(did);
    if (!d) { errors.push(`${did}: not found`); continue; }
    switch (action) {
      case "publish": setStatus(d.id, "PUBLISHED"); changed++; break;
      case "unpublish": setStatus(d.id, "DRAFT"); changed++; break;
      case "archive": setStatus(d.id, "ARCHIVED"); changed++; break;
      case "delete": if (deleteDestination(d.id)) changed++; break;
      case "set_state": {
        const stateRec = payload.state ? getDb().states.find((s) => s.name.toLowerCase() === payload.state!.toLowerCase() || s.slug === slugify(payload.state!)) : undefined;
        saveDestination({ ...d, state: stateRec?.name ?? payload.state ?? null, state_slug: stateRec?.slug ?? (payload.state ? slugify(payload.state) : null) }); changed++; break;
      }
      case "add_category": if (payload.category && (CMS_CATEGORIES as readonly string[]).includes(payload.category)) { saveDestination({ ...d, categories: [...new Set([...d.categories, payload.category])] }); changed++; } break;
      case "remove_category": if (payload.category) { saveDestination({ ...d, categories: d.categories.filter((c) => c !== payload.category) }); changed++; } break;
      case "set_companions": saveDestination({ ...d, companions: enumList<CompanionType>(payload.companions, COMPANION_TYPES) }); changed++; break;
      case "seo_template": {
        const fill = (t?: string) => (t ? t.replace(/\{name\}/g, d.name).replace(/\{state\}/g, d.state ?? "India").slice(0, 320) : null);
        saveDestination({ ...d, seo: { ...d.seo, title: fill(payload.seo_title)?.slice(0, 120) ?? d.seo.title, description: fill(payload.seo_description) ?? d.seo.description } }); changed++; break;
      }
      default: errors.push(`${did}: unknown action`);
    }
  }
  return { changed, errors };
}

/** Compact rows for the admin table. */
export function adminRows() {
  bootstrapFromSeed();
  return allDestinations().map((d) => ({
    id: d.id,
    name: d.name,
    slug: d.slug,
    state: d.state,
    status: d.status,
    categories: d.categories,
    attractions: d.attractions.length,
    images: d.attractions.reduce((n, a) => n + a.images.filter((i) => i.approval_status === "APPROVED").length, 0) + (d.hero_image && d.hero_image.approval_status === "APPROVED" ? 1 : 0),
    pending_images: d.attractions.reduce((n, a) => n + a.images.filter((i) => i.approval_status === "PENDING").length, 0),
    hotels: d.hotels.length,
    restaurants: d.restaurants.length,
    stage: d.pipeline.stage,
    has_photo: Boolean(d.hero_image && !d.hero_image.url.startsWith("placeholder://")),
    incomplete: !d.about || !d.history || d.attractions.length === 0 || !d.state,
    updated_at: d.updated_at
  }));
}

export type AdminRow = ReturnType<typeof adminRows>[number];

export function dashboardCounts() {
  const rows = adminRows();
  const all = allDestinations();
  const by = (s: PublicationStatus) => rows.filter((r) => r.status === s).length;
  return {
    total: rows.length,
    published: by("PUBLISHED"),
    draft: by("DRAFT"),
    in_review: by("IN_REVIEW"),
    archived: by("ARCHIVED"),
    pending_approval: all.filter((d) => d.pipeline.stage === "AWAITING_APPROVAL" || d.pipeline.stage === "READY_TO_PUBLISH").length,
    incomplete: rows.filter((r) => r.incomplete).length,
    missing_images: rows.filter((r) => !r.has_photo).length,
    attractions_pending_images: all.reduce((n, d) => n + d.attractions.filter((a) => a.images.some((i) => i.approval_status === "PENDING") && !a.images.some((i) => i.approval_status === "APPROVED")).length, 0),
    attractions: all.reduce((n, d) => n + d.attractions.length, 0),
    hotels: all.reduce((n, d) => n + d.hotels.length, 0),
    restaurants: all.reduce((n, d) => n + d.restaurants.length, 0),
    recent: [...rows].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 8)
  };
}
