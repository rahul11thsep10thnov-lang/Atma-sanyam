import "@/lib/cms/server-guard";
import { slugify } from "@/lib/master/ids";
import { getDestination, getPipelineJob, getSettings, saveDestination, savePipelineJob, setStatus } from "../store";
import { bootstrapFromSeed } from "../bootstrap";
import { capApproved } from "../admin";
import type { CmsAttraction, CmsDestination, CmsImage, PipelineJob, PipelineStage, SourceRef } from "../types";
import { emptyAttraction } from "../types";
import { nowIso } from "./http";
import { downloadImage } from "./download";
import { wikiLookup, wikiNearbyAttractions } from "./sources/wikipedia";
import { incredibleIndiaLookup } from "./sources/incredibleIndia";
import { collectImageCandidates } from "./sources/images";
import { placesAttractions, placesKey } from "./sources/googlePlaces";
import { seedLookup } from "./sources/seed";

/**
 * One-destination-at-a-time content pipeline.
 *
 *   QUEUED → RESEARCHING → ATTRACTIONS → IMAGES → AWAITING_APPROVAL
 *   → (admin approves images) → FINALIZING → READY_TO_PUBLISH
 *   → (admin publishes) → COMPLETED → next destination
 *
 * Every stage writes its result to the destination document before the next
 * one starts, so a crash or a closed browser resumes from the last finished
 * stage, and a failure at destination 127 restarts at 127 — never at 1.
 * Nothing is published without the two admin checkpoints.
 */

const TERMINAL: PipelineStage[] = ["COMPLETED", "SKIPPED"];
const MAX_ATTRACTIONS = 15;
const MAX_IMAGE_SUBJECTS = 12;

function log(d: CmsDestination, stage: PipelineStage, message: string, level: "info" | "warn" | "error" = "info"): CmsDestination {
  return { ...d, pipeline: { ...d.pipeline, stage, log: [...d.pipeline.log.slice(-60), { at: nowIso(), stage, message, level }] } };
}

const addProv = (d: CmsDestination, field: string, refs: SourceRef[]): CmsDestination => ({ ...d, provenance: { ...d.provenance, [field]: [...(d.provenance[field] ?? []), ...refs] } });

/** Trims a long extract to a short summary at a sentence boundary. */
function condense(text: string, max = 900): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return (end > 200 ? cut.slice(0, end + 1) : cut).trim();
}

// ---- queue ------------------------------------------------------------------

export function enqueue(importId: string | null, ids: string[]): PipelineJob {
  const job = getPipelineJob();
  const queue = [...job.queue, ...ids.filter((id) => !job.queue.includes(id))];
  ids.forEach((id, i) => {
    const d = getDestination(id);
    if (d && (d.pipeline.stage === "NOT_IN_PIPELINE" || TERMINAL.includes(d.pipeline.stage)))
      saveDestination({ ...d, pipeline: { ...d.pipeline, stage: "QUEUED", import_id: importId, position: queue.indexOf(id) + 1, started_at: null, completed_at: null, last_error: null, log: [...d.pipeline.log, { at: nowIso(), stage: "QUEUED", message: `Queued (position ${queue.indexOf(id) + 1 + (i - i)})`, level: "info" }] } });
  });
  return savePipelineJob({ ...job, import_id: importId ?? job.import_id, queue, cursor: job.cursor ?? (queue.length ? 0 : null) });
}

/** The destination the pipeline is working on: the first queued item at or after the cursor that is not finished. */
export function currentDestination(): CmsDestination | null {
  const job = getPipelineJob();
  if (job.cursor === null) return null;
  for (let i = job.cursor; i < job.queue.length; i++) {
    const d = getDestination(job.queue[i]);
    if (d && !TERMINAL.includes(d.pipeline.stage)) {
      if (i !== job.cursor) savePipelineJob({ ...job, cursor: i });
      return d;
    }
  }
  return null;
}

export function overview() {
  bootstrapFromSeed();
  const job = getPipelineJob();
  const docs = job.queue.map((id) => getDestination(id)).filter((d): d is CmsDestination => Boolean(d));
  const count = (s: PipelineStage[]) => docs.filter((d) => s.includes(d.pipeline.stage)).length;
  const current = currentDestination();
  return {
    job,
    total: docs.length,
    completed: count(["COMPLETED"]),
    pending: count(["QUEUED"]),
    in_progress: count(["RESEARCHING", "ATTRACTIONS", "IMAGES", "FINALIZING"]),
    needs_review: count(["AWAITING_APPROVAL", "READY_TO_PUBLISH"]),
    failed: count(["FAILED"]),
    skipped: count(["SKIPPED"]),
    current: current ? { id: current.id, name: current.name, slug: current.slug, stage: current.pipeline.stage, position: job.queue.indexOf(current.id) + 1, last_error: current.pipeline.last_error, log: current.pipeline.log.slice(-12) } : null,
    items: docs.map((d) => ({ id: d.id, name: d.name, slug: d.slug, stage: d.pipeline.stage, status: d.status, position: job.queue.indexOf(d.id) + 1, attractions: d.attractions.length, candidates: d.attractions.reduce((n, a) => n + a.images.filter((i) => i.approval_status === "CANDIDATE").length, 0) + d.images.filter((i) => i.approval_status === "CANDIDATE").length, approved: d.attractions.reduce((n, a) => n + a.images.filter((i) => i.approval_status === "APPROVED").length, 0), last_error: d.pipeline.last_error }))
  };
}

// ---- stages -------------------------------------------------------------------

async function research(d0: CmsDestination): Promise<CmsDestination> {
  const settings = getSettings();
  void settings;
  let d = log({ ...d0, pipeline: { ...d0.pipeline, started_at: d0.pipeline.started_at ?? nowIso(), last_error: null } }, "RESEARCHING", "Research started");

  // 1. Our own seed database (editorial drafts with their own sources).
  const seed = seedLookup(d.slug, d.name);
  if (seed) {
    d = {
      ...d,
      state: d.state ?? seed.state, state_slug: d.state_slug ?? seed.state_slug, district: d.district ?? seed.district, region: d.region ?? seed.region,
      latitude: d.latitude ?? seed.latitude, longitude: d.longitude ?? seed.longitude, headline: d.headline ?? seed.headline,
      short_description: d.short_description ?? seed.short_description, about: d.about ?? seed.about, history: d.history ?? seed.history,
      transportation: d.transportation ?? seed.transportation, travel_info: d.travel_info ?? seed.travel_info, best_time_text: d.best_time_text ?? seed.best_time_text,
      ideal_duration_text: d.ideal_duration_text ?? seed.ideal_duration_text, nearest_airport: d.nearest_airport ?? seed.nearest_airport,
      nearest_railway_station: d.nearest_railway_station ?? seed.nearest_railway_station,
      categories: d.categories.length ? d.categories : seed.categories, companions: d.companions.length ? d.companions : seed.companions,
      legacy_slug: seed.legacy_slug, hero_image: d.hero_image ?? seed.hero_image
    };
    for (const f of ["about", "history", "transportation", "hero_image"] as const) if (seed.provenance[f]?.length) d = addProv(d, f, seed.provenance[f]);
    d = log(d, "RESEARCHING", "Matched the master seed database — editorial draft text imported with its source ids");
  }

  // 2. Incredible India (primary) — "About the place".
  const ii = await incredibleIndiaLookup(d.slug, d.state_slug ?? null);
  if (ii.page) {
    const text = ii.page.text ?? ii.page.description;
    if (text) d = { ...d, about: d.about ? d.about : condense(text, 1200), short_description: d.short_description ?? condense(ii.page.description ?? text, 220) };
    d = addProv(d, "about", [ii.source]);
    d = log(d, "RESEARCHING", `Incredible India: ${ii.page.text ? "page text" : "page summary"} retrieved`);
  } else {
    d = addProv(d, "about", [ii.source]);
    d = log(d, "RESEARCHING", `Incredible India: source unavailable (${ii.source.note ?? "no page"})`, "warn");
  }

  // 3. Wikipedia (supplementary) — summary, coordinates, history.
  const wiki = await wikiLookup(d.name, d.state);
  if (wiki.page) {
    const s = wiki.page.summary;
    d = {
      ...d,
      latitude: d.latitude ?? s.lat, longitude: d.longitude ?? s.lon,
      headline: d.headline ?? (s.description ? s.description.replace(/^\w/, (c) => c.toUpperCase()) : null),
      short_description: d.short_description ?? condense(s.extract, 220),
      about: d.about ?? condense(s.extract, 900),
      history: d.history ?? wiki.page.history,
      history_verified: false
    };
    d = addProv(d, "about", [wiki.source]);
    if (wiki.page.history) d = addProv(d, "history", [wiki.source]);
    if (s.lat !== null) d = addProv(d, "coordinates", [wiki.source]);
    d = log(d, "RESEARCHING", `Wikipedia: "${s.title}" — summary${wiki.page.history ? ", history section" : ""}${s.lat !== null ? ", coordinates" : ""}`);
  } else {
    d = addProv(d, "about", [wiki.source]);
    d = log(d, "RESEARCHING", `Wikipedia: source unavailable (${wiki.source.note ?? "not found"})`, "warn");
  }

  if (!d.history) d = log(d, "RESEARCHING", "No verifiable history retrieved — the page will say so", "warn");
  if (!d.about) d = log(d, "RESEARCHING", "No source supplied an About summary — left empty for the admin", "warn");
  return log(d, "ATTRACTIONS", "Research finished");
}

function mergeAttraction(list: CmsAttraction[], incoming: CmsAttraction): CmsAttraction[] {
  const key = slugify(incoming.name);
  const i = list.findIndex((a) => a.slug === key || slugify(a.name) === key);
  if (i === -1) return [...list, incoming];
  const cur = list[i];
  const merged: CmsAttraction = {
    ...cur,
    short_description: cur.short_description || incoming.short_description,
    latitude: cur.latitude ?? incoming.latitude, longitude: cur.longitude ?? incoming.longitude,
    map_url: cur.map_url ?? incoming.map_url, official_website: cur.official_website ?? incoming.official_website,
    category: cur.category ?? incoming.category,
    rating: incoming.rating ?? cur.rating, review_count: incoming.review_count ?? cur.review_count,
    rating_source: incoming.rating !== null ? incoming.rating_source : cur.rating_source,
    rating_retrieved_at: incoming.rating !== null ? incoming.rating_retrieved_at : cur.rating_retrieved_at,
    sources: [...cur.sources, ...incoming.sources]
  };
  return list.map((a, k) => (k === i ? merged : a));
}

/** Rating first (where an authorised source supplied one), review count as tie-break, unrated after; manual orders are never moved. */
export function rankAttractions(list: CmsAttraction[]): CmsAttraction[] {
  const manual = list.filter((a) => a.manual_order).sort((a, b) => a.sort_order - b.sort_order);
  const auto = list.filter((a) => !a.manual_order).sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1) || (b.review_count ?? -1) - (a.review_count ?? -1) || a.name.localeCompare(b.name));
  // Pinned attractions keep their slot; the automatically ranked ones fill the gaps around them.
  const slots: Array<CmsAttraction | null> = Array(list.length).fill(null);
  for (const a of manual) {
    let i = Math.min(Math.max(0, Math.trunc(a.sort_order)), slots.length - 1);
    while (slots[i]) i = (i + 1) % slots.length;
    slots[i] = a;
  }
  let next = 0;
  return slots.map((slot, i) => ({ ...(slot ?? auto[next++]), sort_order: i }));
}

async function attractions(d0: CmsDestination): Promise<CmsDestination> {
  let d = log(d0, "ATTRACTIONS", "Collecting attractions");
  const settings = getSettings();
  let list = [...d.attractions];

  const seed = seedLookup(d.slug, d.name);
  if (seed?.attractions.length) {
    for (const a of seed.attractions) list = mergeAttraction(list, a);
    d = log(d, "ATTRACTIONS", `Seed database: ${seed.attractions.length} attractions`);
  }

  const key = placesKey(settings);
  if (key) {
    const g = await placesAttractions(d.name, d.state, key, d.latitude, d.longitude);
    d = addProv(d, "attractions", [g.source]);
    if (g.hits.length) {
      for (const h of g.hits.slice(0, MAX_ATTRACTIONS)) {
        const a = emptyAttraction(`${d.slug}-att-${slugify(h.name)}`, slugify(h.name), h.name);
        list = mergeAttraction(list, { ...a, latitude: h.lat, longitude: h.lng, map_url: h.map_url, official_website: h.website, location_text: h.address, rating: h.rating, review_count: h.review_count, rating_source: "Google Places API", rating_retrieved_at: nowIso(), category: h.types.find((t) => t !== "point_of_interest" && t !== "establishment")?.replace(/_/g, " ") ?? null, sources: [g.source] });
      }
      d = log(d, "ATTRACTIONS", `Google Places API: ${g.hits.length} rated places`);
    } else d = log(d, "ATTRACTIONS", `Google Places API: ${g.source.note ?? "no results"}`, "warn");
  } else {
    d = log(d, "ATTRACTIONS", "Google Places API key not configured — ratings will show as unavailable", "warn");
  }

  if (d.latitude !== null && d.longitude !== null) {
    const w = await wikiNearbyAttractions(d.latitude, d.longitude);
    d = addProv(d, "attractions", [w.source]);
    if (w.list.length) {
      for (const h of w.list.slice(0, MAX_ATTRACTIONS)) {
        const a = emptyAttraction(`${d.slug}-att-${slugify(h.title)}`, slugify(h.title), h.title);
        list = mergeAttraction(list, { ...a, short_description: h.description ? h.description.replace(/^\w/, (c) => c.toUpperCase()) : "", latitude: h.lat, longitude: h.lon, map_url: `https://www.openstreetmap.org/?mlat=${h.lat}&mlon=${h.lon}#map=16/${h.lat}/${h.lon}`, category: h.description ? h.description.split(/ in | of /)[0].replace(/^\w/, (c) => c.toUpperCase()).slice(0, 60) : null, sources: [{ label: "Wikipedia", url: h.page_url, retrieved_at: nowIso(), status: "OK" }] });
      }
      d = log(d, "ATTRACTIONS", `Wikipedia nearby: ${w.list.length} places with coordinates`);
    } else d = log(d, "ATTRACTIONS", `Wikipedia nearby: ${w.source.note ?? "none"}`, "warn");
  } else {
    d = log(d, "ATTRACTIONS", "No coordinates known — nearby search skipped", "warn");
  }

  list = rankAttractions(list).slice(0, Math.max(MAX_ATTRACTIONS, list.filter((a) => a.manual_order).length));
  d = { ...d, attractions: list };
  if (!list.length) d = log(d, "ATTRACTIONS", "No attractions could be collected from any reachable source", "warn");
  return log(d, "IMAGES", `${list.length} attractions stored`);
}

async function imagesStage(d0: CmsDestination): Promise<CmsDestination> {
  let d = log(d0, "IMAGES", "Collecting image candidates");
  const settings = getSettings();
  const context = [d.name, d.state].filter(Boolean).join(" ");
  const subjects = d.attractions.filter((a) => a.status === "ACTIVE").slice(0, MAX_IMAGE_SUBJECTS);
  const nextAttractions: CmsAttraction[] = [...d.attractions];
  let total = 0;
  const seenNotes = new Set<string>();
  for (const a of subjects) {
    const r = await collectImageCandidates(a.name, context, settings);
    const existing = new Set(a.images.map((i) => i.url));
    const fresh = r.images.filter((i) => !existing.has(i.url));
    total += fresh.length;
    const idx = nextAttractions.findIndex((x) => x.id === a.id);
    nextAttractions[idx] = { ...a, images: [...a.images, ...fresh].map((img, i) => ({ ...img, sort_order: i })), sources: [...a.sources, ...r.sources.filter((s) => s.status === "SOURCE_UNAVAILABLE")] };
    for (const s of r.sources) if (s.status === "SOURCE_UNAVAILABLE") seenNotes.add(`${s.label}: ${s.note ?? "unavailable"}`);
  }
  const hero = await collectImageCandidates(d.name, d.state ?? "India", settings);
  const existingDest = new Set(d.images.map((i) => i.url));
  const destFresh = hero.images.filter((i) => !existingDest.has(i.url));
  d = { ...d, attractions: nextAttractions, images: [...d.images, ...destFresh].map((img, i) => ({ ...img, sort_order: i })) };
  d = addProv(d, "images", hero.sources);
  for (const n of seenNotes) d = log(d, "IMAGES", n, "warn");
  d = log(d, "IMAGES", `${total + destFresh.length} candidate images collected for ${subjects.length} attractions + the destination`);
  if (total + destFresh.length === 0) d = log(d, "IMAGES", "No candidates from any reachable source — upload licensed photographs manually or retry when sources are reachable", "warn");
  return log(d, "AWAITING_APPROVAL", "Waiting for the admin to approve images");
}

export async function finalize(d0: CmsDestination): Promise<CmsDestination> {
  let d = log(d0, "FINALIZING", "Saving approved images");
  let failed = 0;
  const dl = async (img: CmsImage) => {
    if (img.approval_status !== "APPROVED") return img;
    const out = await downloadImage(img, d.slug);
    if (out.download_status === "FAILED") failed++;
    return out;
  };
  const attractions: CmsAttraction[] = [];
  for (const a of d.attractions) {
    const images: CmsImage[] = [];
    for (const img of capApproved(a.images)) images.push(await dl(img));
    attractions.push({ ...a, images: images.filter((i) => i.approval_status !== "REJECTED") });
  }
  const images: CmsImage[] = [];
  for (const img of d.images) images.push(await dl(img));
  let hero = d.hero_image ? await dl(d.hero_image) : null;
  if (!hero || hero.url.startsWith("placeholder://")) {
    const pick = images.find((i) => i.approval_status === "APPROVED") ?? attractions.flatMap((a) => a.images).find((i) => i.approval_status === "APPROVED");
    if (pick) hero = pick;
  }
  d = { ...d, attractions, images: images.filter((i) => i.approval_status !== "REJECTED"), hero_image: hero };
  if (failed) d = log(d, "FINALIZING", `${failed} approved image(s) could not be downloaded and will be served from their source URL`, "warn");
  return log(d, "READY_TO_PUBLISH", "Attractions and images saved — ready for final review");
}

/** Runs the next automatic stage for one destination and stores the result. */
export async function stepDestination(id: string): Promise<CmsDestination | null> {
  const d = getDestination(id);
  if (!d) return null;
  try {
    let next: CmsDestination;
    switch (d.pipeline.stage) {
      case "QUEUED":
      case "RESEARCHING": next = await research(d); break;
      case "ATTRACTIONS": next = await attractions(d); break;
      case "IMAGES": next = await imagesStage(d); break;
      case "AWAITING_APPROVAL": return d; // admin checkpoint
      case "FINALIZING": next = await finalize(d); break;
      case "READY_TO_PUBLISH": return d; // admin checkpoint
      case "FAILED": next = await retryFailed(d); break;
      default: return d;
    }
    return saveDestination(next);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return saveDestination({ ...log(d, "FAILED", `Failed during ${d.pipeline.stage}: ${message}`, "error"), pipeline: { ...d.pipeline, stage: "FAILED", last_error: `${d.pipeline.stage}: ${message}` } });
  }
}

async function retryFailed(d: CmsDestination): Promise<CmsDestination> {
  const failedStage = (d.pipeline.last_error?.split(":")[0] ?? "RESEARCHING") as PipelineStage;
  const resume = (["RESEARCHING", "ATTRACTIONS", "IMAGES", "FINALIZING"] as PipelineStage[]).includes(failedStage) ? failedStage : "RESEARCHING";
  const reset: CmsDestination = { ...d, pipeline: { ...d.pipeline, stage: resume, last_error: null } };
  switch (resume) {
    case "ATTRACTIONS": return attractions(reset);
    case "IMAGES": return imagesStage(reset);
    case "FINALIZING": return finalize(reset);
    default: return research(reset);
  }
}

/** Runs every automatic stage for the current destination until it reaches an admin checkpoint or fails. */
export async function runUntilCheckpoint(): Promise<CmsDestination | null> {
  let d = currentDestination();
  if (!d) return null;
  for (let guard = 0; guard < 6; guard++) {
    const stage = d.pipeline.stage;
    if (stage === "AWAITING_APPROVAL" || stage === "READY_TO_PUBLISH" || stage === "FAILED" || TERMINAL.includes(stage)) return d;
    const next = await stepDestination(d.id);
    if (!next) return d;
    d = next;
  }
  return d;
}

export function approveAndContinue(id: string): CmsDestination | null {
  const d = getDestination(id);
  if (!d || d.pipeline.stage !== "AWAITING_APPROVAL") return d;
  return saveDestination(log(d, "FINALIZING", "Images approved by admin"));
}

export function publishFromPipeline(id: string): CmsDestination | null {
  const d = getDestination(id);
  if (!d) return null;
  setStatus(d.id, "PUBLISHED");
  const done = saveDestination({ ...log({ ...getDestination(id)! }, "COMPLETED", "Published by admin"), pipeline: { ...getDestination(id)!.pipeline, stage: "COMPLETED", completed_at: nowIso() } });
  advance();
  return done;
}

export function skipDestination(id: string): CmsDestination | null {
  const d = getDestination(id);
  if (!d) return null;
  const out = saveDestination({ ...log(d, "SKIPPED", "Skipped by admin"), pipeline: { ...d.pipeline, stage: "SKIPPED", completed_at: nowIso() } });
  advance();
  return out;
}

export function sendBackToResearch(id: string): CmsDestination | null {
  const d = getDestination(id);
  if (!d) return null;
  return saveDestination({ ...log(d, "QUEUED", "Reset to the start of the pipeline by admin"), pipeline: { ...d.pipeline, stage: "QUEUED", last_error: null } });
}

function advance() {
  const job = getPipelineJob();
  if (job.cursor === null) return;
  savePipelineJob({ ...job, cursor: Math.min(job.cursor + 1, job.queue.length) });
  currentDestination();
}

export function clearQueue(): PipelineJob {
  const job = getPipelineJob();
  for (const id of job.queue) {
    const d = getDestination(id);
    if (d && !TERMINAL.includes(d.pipeline.stage)) saveDestination({ ...d, pipeline: { ...d.pipeline, stage: "NOT_IN_PIPELINE" } });
  }
  return savePipelineJob({ import_id: null, queue: [], cursor: null, auto_advance: false, updated_at: nowIso() });
}
