import type { DestinationCategory, EntityType } from "../enums";
import { DESTINATION_CATEGORIES } from "../enums";
import { CircuitEngine, type RouteSuggestion } from "../engine/circuits";
import { destinationId, idKind, mintCode, slugify, attractionId } from "../ids";
import { generateDestinationContent, isServable, type DestinationContent } from "../generation/pipeline";
import { haversineKm, parseHours, parseVisitDuration, parseEntryFee } from "../seed/parsers";
import { addFact, SEED_DATE } from "../seed/builder";
import { SRC } from "../seed/sources";
import type {
  AttractionRecord, DestinationConnection, DestinationRecord, EntityRelationship, MasterDatabase
} from "../types";

/**
 * Automatic page creation (spec sections 47 and 49). Adding a destination should
 * never need a developer to hand-build a page:
 *
 *   VALIDATE → SLUG → CREATE RECORD → NEARBY → ATTRACTIONS → CIRCUITS
 *   → CONTENT → SEO → PAGE → INTERNAL LINKS → INDEX REQUEST
 *
 * `dryRun` (the default) works on a copy of the database and reports what would be created.
 */

export interface NewAttractionInput {
  name: string;
  description: string;
  attraction_type?: EntityType;
  latitude?: number;
  longitude?: number;
  opening_hours_text?: string;
  entry_fee_notes?: string;
  time_required_text?: string;
  categories?: DestinationCategory[];
  official_website?: string;
}

export interface NewDestinationInput {
  name: string;
  /** ISO state code ("UP") or full state name. */
  state: string;
  latitude: number;
  longitude: number;
  short_description: string;
  one_line_description: string;
  categories: DestinationCategory[];
  source_id: string;
  entity_type?: EntityType;
  destination_type?: string;
  level?: "A" | "B";
  parent_slug?: string;
  district?: string;
  best_time_text?: string;
  recommended_days?: { min: number; recommended: number; max: number };
  attractions?: NewAttractionInput[];
}

export interface OnboardStep {
  step: string;
  status: "OK" | "WARN" | "FAILED" | "SKIPPED";
  detail: string;
}

export interface OnboardResult {
  ok: boolean;
  persisted: boolean;
  steps: OnboardStep[];
  destination: DestinationRecord | null;
  attractions: AttractionRecord[];
  connections: DestinationConnection[];
  relationships: EntityRelationship[];
  circuits: RouteSuggestion[];
  content: DestinationContent | null;
  page_url: string | null;
  index_request: { sitemap: string; urls: string[]; submitted: false; note: string } | null;
}

const INDIA = { latMin: 6, latMax: 37.5, lngMin: 68, lngMax: 98 };
const ROAD_FACTOR = 1.3; // straight-line → road distance, an assumption flagged on every derived connection

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
  return dp[a.length][b.length];
}

export function onboardDestination(db: MasterDatabase, input: NewDestinationInput, opts: { dryRun?: boolean } = {}): OnboardResult {
  const dryRun = opts.dryRun ?? true;
  const work: MasterDatabase = dryRun ? structuredClone(db) : db;
  const steps: OnboardStep[] = [];
  const result: OnboardResult = {
    ok: false, persisted: false, steps, destination: null, attractions: [], connections: [], relationships: [],
    circuits: [], content: null, page_url: null, index_request: null
  };
  const fail = (step: string, detail: string) => {
    steps.push({ step, status: "FAILED", detail });
    return result;
  };

  // 1. VALIDATE DATA
  const problems: string[] = [];
  if (!input.name?.trim()) problems.push("name is required");
  if (!input.short_description?.trim() || input.short_description.length < 40) problems.push("short_description must be at least 40 characters");
  if (!input.one_line_description?.trim()) problems.push("one_line_description is required");
  if (input.latitude < INDIA.latMin || input.latitude > INDIA.latMax || input.longitude < INDIA.lngMin || input.longitude > INDIA.lngMax)
    problems.push("coordinates are outside India");
  if (!input.categories?.length) problems.push("at least one category is required");
  input.categories?.forEach((c) => !DESTINATION_CATEGORIES.includes(c) && problems.push(`unknown category ${c}`));
  if (!work.sources.some((s) => s.id === input.source_id)) problems.push(`unknown source ${input.source_id}`);
  const state = work.states.find((s) => s.iso_code === `IN-${input.state.toUpperCase()}` || s.name.toLowerCase() === input.state.toLowerCase() || s.slug === slugify(input.state));
  if (!state) problems.push(`unknown state "${input.state}"`);
  const parent = input.parent_slug ? work.destinations.find((d) => d.slug === input.parent_slug) : null;
  if (input.parent_slug && !parent) problems.push(`unknown parent destination "${input.parent_slug}"`);
  if ((input.level ?? "A") === "B" && !parent) problems.push("a level-B destination needs a parent_slug");
  if (problems.length || !state) return fail("VALIDATE DATA", problems.join("; "));

  const slugBase = slugify(input.name);
  const near = work.destinations.find((d) => d.state_id === state.id && levenshtein(slugify(d.name), slugBase) <= 1 && slugify(d.name) !== slugBase);
  if (near) return fail("VALIDATE DATA", `possible duplicate of existing destination "${near.name}" — check before adding`);
  steps.push({ step: "VALIDATE DATA", status: "OK", detail: "required fields, coordinates, category, source and state check out" });

  // 2. GENERATE SLUG
  let slug = slugBase;
  if (work.destinations.some((d) => d.slug === slug)) slug = `${slugBase}-${state.iso_code.slice(3).toLowerCase()}`;
  if (work.destinations.some((d) => d.slug === slug)) return fail("GENERATE SLUG", `slug "${slug}" already exists`);
  steps.push({ step: "GENERATE SLUG", status: "OK", detail: slug });

  // 3. CREATE DATABASE RECORD (permanent ID minted once)
  const takenCodes = new Set(work.destinations.filter((d) => d.state_id === state.id).map((d) => d.id.split("-").pop()!));
  const id = destinationId(state.iso_code.slice(3), mintCode(input.name, takenCodes));
  if (idKind(id) !== "DESTINATION") return fail("CREATE DATABASE RECORD", `minted id ${id} is invalid`);
  const days = input.recommended_days ?? { min: 1, recommended: 2, max: 3 };
  const cats = new Set(input.categories);
  const scoreOf = (group: DestinationCategory[]) => (group.some((c) => cats.has(c)) ? 80 : 10);
  const dest: DestinationRecord = {
    id, state_id: state.id, district_id: null, parent_destination_id: parent?.id ?? null, name: input.name.trim(), official_name: null,
    local_names: [], alternate_names: [], slug, entity_type: input.entity_type ?? "DESTINATION", destination_level: input.level ?? "A",
    latitude: input.latitude, longitude: input.longitude, elevation: null, region: state.region, sub_region: state.sub_region,
    short_description: input.short_description.trim(), one_line_description: input.one_line_description.trim(),
    destination_type: input.destination_type ?? "Destination",
    heritage_score: scoreOf(["HERITAGE", "HISTORY", "ARCHITECTURE"]), nature_score: scoreOf(["NATURE", "ECO_TOURISM"]),
    spiritual_score: scoreOf(["SPIRITUAL", "PILGRIMAGE"]), adventure_score: scoreOf(["ADVENTURE"]), food_score: scoreOf(["FOOD"]),
    family_score: scoreOf(["FAMILY"]), shopping_score: scoreOf(["SHOPPING"]), culture_score: scoreOf(["CULTURAL", "ART", "MUSEUM"]),
    wildlife_score: scoreOf(["WILDLIFE"]), beach_score: scoreOf(["BEACH"]), mountain_score: scoreOf(["MOUNTAIN", "HILL_STATION"]),
    recommended_min_days: days.min, recommended_max_days: days.max, recommended_days: days.recommended,
    best_month_start: null, best_month_end: null, budget_category: null, crowd_level: "UNKNOWN", difficulty_level: "UNKNOWN",
    family_suitable: null, children_suitable: null, elderly_suitable: null, solo_suitable: null, couple_suitable: null, accessible_travel_possible: null,
    nearest_airport: null, nearest_railway_station: null, nearest_bus_station: null, primary_language: null, secondary_languages: [],
    mobile_connectivity: null, internet_availability: null, upi_availability: null, atm_availability: null,
    ancient_story_title: null, ancient_story_short: null, ancient_story_long: null, ancient_story_status: null, ancient_story_sources: [],
    popularity: 40, best_time_text: input.best_time_text ?? null, ideal_duration_text: null, tagline: input.one_line_description.trim(),
    status: "DATA_COLLECTION", is_sample_data: false, created_at: SEED_DATE, updated_at: SEED_DATE, source_id: input.source_id, last_verified_at: null
  };
  work.destinations.push(dest);
  cats.forEach((category) => work.destination_categories.push({ destination_id: id, category, confidence: "UNVERIFIED", source_id: input.source_id }));
  addFact(work, { entity_id: id, fact_type: "coordinates", fact_text: `${dest.name} is at ${input.latitude}, ${input.longitude}`, value: `${input.latitude},${input.longitude}`, source_id: input.source_id });
  result.destination = dest;
  steps.push({ step: "CREATE DATABASE RECORD", status: "OK", detail: `${id} (status DATA_COLLECTION, unverified)` });

  // 4. FIND NEARBY DESTINATIONS (candidate connections derived from coordinates — flagged for verification)
  const candidates = work.destinations
    .filter((d) => d.id !== id && d.destination_level === "A" && d.id !== parent?.id)
    .map((d) => ({ d, km: haversineKm(dest.latitude, dest.longitude, d.latitude, d.longitude) * ROAD_FACTOR }))
    .filter((x) => x.km <= 450)
    .sort((a, b) => a.km - b.km)
    .slice(0, 5);
  candidates.forEach(({ d, km }, i) => {
    const road = Math.round((km / 45) * 60);
    const conn: DestinationConnection = {
      id: `CONN-NEW-${id}-${i + 1}`, origin_destination_id: id, destination_destination_id: d.id, distance_km: Math.round(km),
      road_time_minutes: road, rail_time_minutes: null, bus_time_minutes: null, air_time_minutes: null, walking_possible: false,
      direct_train_available: null, direct_bus_available: null, direct_flight_available: null, transport_modes: ["ROAD"],
      typical_transport_cost_min: null, typical_transport_cost_max: null,
      connection_quality: road <= 180 ? "GOOD" : road <= 360 ? "FAIR" : "POOR", seasonal: false,
      seasonal_notes: `Candidate: distance is straight-line × ${ROAD_FACTOR} and road time assumes 45 km/h. Verify before publishing.`,
      confidence: "UNVERIFIED", source_id: SRC.DERIVED, last_verified_at: null
    };
    work.destination_connections.push(conn);
    result.connections.push(conn);
  });
  steps.push({
    step: "FIND NEARBY DESTINATIONS", status: candidates.length ? "OK" : "WARN",
    detail: candidates.length ? `${candidates.length} candidate connection(s), nearest ${candidates[0].d.name} (~${Math.round(candidates[0].km)} km, derived)` : "no destinations within 450 km"
  });

  // 5. FIND ATTRACTIONS
  const takenAttr = new Set<string>();
  (input.attractions ?? []).forEach((a) => {
    const code = mintCode(a.name, takenAttr);
    takenAttr.add(code);
    const hours = parseHours(a.opening_hours_text);
    const visit = parseVisitDuration(a.time_required_text);
    const fee = parseEntryFee(a.entry_fee_notes);
    const rec: AttractionRecord = {
      id: attractionId(id, code), destination_id: id, name: a.name, official_name: null, alternate_names: [], local_name: null,
      slug: slugify(a.name), attraction_type: a.attraction_type ?? "ATTRACTION", latitude: a.latitude ?? null, longitude: a.longitude ?? null,
      short_description: a.description.split(/(?<=[.!?])\s/)[0], current_description: a.description,
      historical_importance: null, cultural_importance: null, religious_importance: null,
      opening_time: hours.opening_time, closing_time: hours.closing_time, weekly_closed_day: hours.weekly_closed_day, opening_hours_text: a.opening_hours_text ?? null,
      entry_required: fee.required, entry_fee: fee.fee, foreign_entry_fee: null, child_entry_fee: null, senior_entry_fee: null, entry_fee_notes: a.entry_fee_notes ?? null,
      online_booking_required: null, advance_booking_required: null, average_visit_minutes: visit?.avg ?? null, minimum_visit_minutes: visit?.min ?? null,
      best_time_of_day: null, photography_allowed: null, video_allowed: null, drone_allowed: null, dress_code: null, footwear_rules: null,
      wheelchair_accessibility: "UNKNOWN", stroller_accessibility: "UNKNOWN", parking_available: null, cloakroom_available: null, toilet_available: null,
      drinking_water_available: null, nearby_transport: null, official_website: a.official_website ?? null, map_url: null, categories: a.categories ?? [],
      is_hidden_gem: false, status: "DATA_COLLECTION", source_id: input.source_id, last_verified_at: null
    };
    work.attractions.push(rec);
    result.attractions.push(rec);
  });
  steps.push({
    step: "FIND ATTRACTIONS", status: result.attractions.length ? "OK" : "WARN",
    detail: result.attractions.length ? `${result.attractions.length} attraction(s) created` : "none supplied — the page will report missing attractions instead of inventing them"
  });

  // 6. FIND CIRCUITS
  const engine = new CircuitEngine(work);
  result.circuits = engine.suggestRoutes(id, { days: 5 }, { limit: 3 });
  steps.push({ step: "FIND CIRCUITS", status: "OK", detail: result.circuits.length ? `${result.circuits.length} route suggestion(s)` : "no compatible routes yet (needs verified connections)" });

  // 7–9. GENERATE CONTENT, SEO, PAGE
  const content = generateDestinationContent(work, id);
  result.content = content;
  steps.push({ step: "GENERATE CONTENT", status: "OK", detail: `${content.page.sections.length} sections, ${content.page.faq.length} FAQ, ${content.input.gaps.length} data gap(s) reported` });
  steps.push({ step: "FACT-CHECK", status: content.fact_check.status === "PASSED" ? "OK" : "FAILED", detail: `${content.fact_check.checked_claims} claims checked, ${content.fact_check.violations.length} violation(s)` });
  const seoErrors = content.seo_issues.filter((i) => i.severity === "ERROR");
  steps.push({ step: "GENERATE SEO", status: seoErrors.length ? "FAILED" : "OK", detail: seoErrors.length ? seoErrors.map((i) => i.message).join("; ") : content.seo.meta_title });
  result.page_url = `/en/india/${state.slug}/${slug}`;
  steps.push({ step: "CREATE PAGE", status: isServable(content.record.published_status) ? "OK" : "WARN", detail: `${result.page_url} — content status ${content.record.published_status}` });

  // 10. ADD INTERNAL LINKS
  let n = 0;
  const link = (b: string, type: EntityRelationship["relationship_type"], km: number | null, minutes: number | null, priority: number) => {
    n += 1;
    const rel: EntityRelationship = { id: `REL-NEW-${id}-${n}`, entity_a: id, entity_b: b, relationship_type: type, distance_km: km, travel_time: minutes, priority, source_id: SRC.DERIVED };
    work.entity_relationships.push(rel);
    result.relationships.push(rel);
  };
  result.connections.forEach((c) => {
    if ((c.road_time_minutes ?? Infinity) <= 240) link(c.destination_destination_id, "NEARBY", c.distance_km, c.road_time_minutes, 10);
  });
  work.destinations.filter((d) => d.state_id === state.id && d.id !== id && d.destination_level === "A").forEach((d) => link(d.id, "SAME_STATE", null, null, 1));
  if (parent) link(parent.id, "COMBINE_WITH", null, null, 9);
  steps.push({ step: "ADD INTERNAL LINKS", status: "OK", detail: `${result.relationships.length} relationship(s)` });

  // 11. INDEX REQUEST (prepared, not sent: needs search-console credentials)
  result.index_request = {
    sitemap: "/sitemap.xml",
    urls: [result.page_url],
    submitted: false,
    note: "Prepared only — submit through Search Console / IndexNow once the page is published."
  };
  steps.push({ step: "INDEX REQUEST", status: "SKIPPED", detail: "prepared, not submitted" });

  result.ok = !steps.some((s) => s.status === "FAILED");
  result.persisted = !dryRun && result.ok;
  return result;
}
