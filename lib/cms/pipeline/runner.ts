import "@/lib/cms/server-guard";
import { slugify } from "@/lib/master/ids";
import { allDestinations, getDestination, getPipelineJob, getSettings, saveDestination, savePipelineJob, setStatus } from "../store";
import { bootstrapFromSeed } from "../bootstrap";
import { capApproved, MAX_APPROVED_PER_ATTRACTION } from "../admin";
import type { CmsAttraction, CmsDestination, CmsImage, ImageSearchState, PipelineJob, PipelineStage, SourceRef } from "../types";
import { emptyAttraction, PROVIDER_LABEL } from "../types";
import { discoverImages, newRunContext, type DiscoveryResult } from "../discovery";
import { aliasesOf } from "../discovery/quality";
import type { Subject } from "../discovery/types";
import { sendUnsplashDownloadEvent } from "../discovery/providers/unsplash";
import { nowIso } from "./http";
import { downloadImage } from "./download";
import { wikiLookup, wikiNearbyAttractions } from "./sources/wikipedia";
import { incredibleIndiaLookup } from "./sources/incredibleIndia";
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
const maxAttractions = () => Math.max(1, Math.min(getSettings().attractions_per_destination || 10, 30));

function log(d: CmsDestination, stage: PipelineStage, message: string, level: "info" | "warn" | "error" = "info"): CmsDestination {
  return { ...d, pipeline: { ...d.pipeline, stage, log: [...d.pipeline.log.slice(-60), { at: nowIso(), stage, message, level }] } };
}

/** Records sources for a field; a newer result from the same source replaces the older one (re-runs don't pile up). */
const addProv = (d: CmsDestination, field: string, refs: SourceRef[]): CmsDestination => ({
  ...d,
  provenance: { ...d.provenance, [field]: [...(d.provenance[field] ?? []).filter((old) => !refs.some((r) => r.label === old.label)), ...refs] }
});

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

/** The destination the pipeline is working on: the first queued item (in PDF order) that is not finished. */
export function currentDestination(): CmsDestination | null {
  const job = getPipelineJob();
  if (!job.queue.length) return null;
  for (let i = 0; i < job.queue.length; i++) {
    const d = getDestination(job.queue[i]);
    if (d && !TERMINAL.includes(d.pipeline.stage)) {
      if (i !== job.cursor) savePipelineJob({ ...job, cursor: i });
      return d;
    }
  }
  if (job.cursor !== job.queue.length) savePipelineJob({ ...job, cursor: job.queue.length });
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
    current: current ? {
      id: current.id, name: current.name, slug: current.slug, state: current.state, stage: current.pipeline.stage, position: job.queue.indexOf(current.id) + 1, last_error: current.pipeline.last_error, log: current.pipeline.log.slice(-14),
      searches: [
        ...current.attractions.filter((a) => a.status === "ACTIVE").map((a) => ({ id: a.id, name: a.name, search: a.image_search ?? null, pending: a.images.filter((i) => i.approval_status === "PENDING").length })),
        { id: "__destination", name: "Destination gallery", search: current.gallery_search ?? null, pending: current.images.filter((i) => i.approval_status === "PENDING").length }
      ]
    } : null,
    preparing: Boolean((globalThis as unknown as { __pipelinePreparing?: boolean }).__pipelinePreparing),
    items: docs.map((d) => ({ id: d.id, name: d.name, slug: d.slug, state: d.state, stage: d.pipeline.stage, status: d.status, position: job.queue.indexOf(d.id) + 1, attractions: d.attractions.length, candidates: d.attractions.reduce((n, a) => n + a.images.filter((i) => i.approval_status === "PENDING").length, 0) + d.images.filter((i) => i.approval_status === "PENDING").length, approved: d.attractions.reduce((n, a) => n + a.images.filter((i) => i.approval_status === "APPROVED").length, 0), search_failed: d.attractions.filter((a) => a.image_search?.status === "FAILED").length + (d.gallery_search?.status === "FAILED" ? 1 : 0), last_error: d.pipeline.last_error }))
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
      for (const h of g.hits.slice(0, maxAttractions())) {
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
      for (const h of w.list.slice(0, maxAttractions())) {
        const a = emptyAttraction(`${d.slug}-att-${slugify(h.title)}`, slugify(h.title), h.title);
        list = mergeAttraction(list, { ...a, short_description: h.description ? h.description.replace(/^\w/, (c) => c.toUpperCase()) : "", latitude: h.lat, longitude: h.lon, map_url: `https://www.openstreetmap.org/?mlat=${h.lat}&mlon=${h.lon}#map=16/${h.lat}/${h.lon}`, category: h.description ? h.description.split(/ in | of /)[0].replace(/^\w/, (c) => c.toUpperCase()).slice(0, 60) : null, sources: [{ label: "Wikipedia", url: h.page_url, retrieved_at: nowIso(), status: "OK" }] });
      }
      d = log(d, "ATTRACTIONS", `Wikipedia nearby: ${w.list.length} places with coordinates`);
    } else d = log(d, "ATTRACTIONS", `Wikipedia nearby: ${w.source.note ?? "none"}`, "warn");
  } else {
    d = log(d, "ATTRACTIONS", "No coordinates known — nearby search skipped", "warn");
  }

  list = rankAttractions(list).slice(0, Math.max(maxAttractions(), list.filter((a) => a.manual_order).length));
  d = { ...d, attractions: list };
  if (!list.length) d = log(d, "ATTRACTIONS", "No attractions could be collected from any reachable source", "warn");
  return log(d, "IMAGES", `${list.length} attractions stored`);
}

// ---- images ------------------------------------------------------------------

/** Names of every other destination — a candidate that only mentions one of these is the wrong place. */
function otherPlaceNames(d: CmsDestination): string[] {
  return allDestinations().filter((x) => x.id !== d.id).map((x) => x.name);
}

function subjectFor(d: CmsDestination, a: CmsAttraction | null, others: string[]): Subject {
  const base = { city: d.name, cityAliases: aliasesOf(d.name), state: d.state, otherPlaces: others };
  return a
    ? { ...base, kind: "attraction", name: a.name, lat: a.latitude ?? null, lon: a.longitude ?? null }
    : { ...base, kind: "destination", name: d.name, lat: d.latitude, lon: d.longitude };
}

/** Keeps approved and hand-uploaded images, replaces the previous automatic candidates with the new ones. */
function mergeCandidates(existing: CmsImage[], found: DiscoveryResult): CmsImage[] {
  const keep = existing.filter((i) => i.approval_status === "APPROVED" || i.provider === "manual" || i.provider === "seed");
  const keepIds = new Set(keep.map((i) => i.id));
  return [...keep, ...found.candidates.filter((c) => !keepIds.has(c.id)), ...found.rejected.filter((c) => !keepIds.has(c.id))].map((img, i) => ({ ...img, sort_order: i }));
}

const activeSubjects = (d: CmsDestination) => d.attractions.filter((a) => a.status === "ACTIVE").slice(0, Math.max(1, getSettings().attractions_per_destination || 10));

const searchSummary = (st: ImageSearchState) => `${st.status} — ${st.providers.filter((p) => !["DISABLED", "NOT_CONFIGURED", "SKIPPED"].includes(p.status) || p.found).map((p) => `${PROVIDER_LABEL[p.provider]} ${p.status === "OK" ? p.found : p.status}`).join(", ") || "no provider available"}; ${st.final_candidates} candidates`;

/** Runs the image discovery service for every attraction of the destination (and its gallery). Provider failures never fail the stage. */
async function imagesStage(d0: CmsDestination): Promise<CmsDestination> {
  let d = log(d0, "IMAGES", "Searching for image candidates");
  const settings = getSettings();
  const ctx = newRunContext();
  const others = otherPlaceNames(d);
  const subjects = activeSubjects(d);
  const attractions = [...d.attractions];
  for (const a of subjects) {
    const r = await discoverImages(subjectFor(d, a, others), settings, ctx);
    const i = attractions.findIndex((x) => x.id === a.id);
    attractions[i] = { ...a, images: mergeCandidates(a.images, r), image_search: r.state };
    d = log(d, "IMAGES", `${a.name}: ${searchSummary(r.state)}`, r.state.status === "FAILED" ? "warn" : "info");
  }
  const g = await discoverImages(subjectFor(d, null, others), settings, ctx);
  d = { ...d, attractions, images: mergeCandidates(d.images, g), gallery_search: g.state };
  d = log(d, "IMAGES", `Destination gallery: ${searchSummary(g.state)}`, g.state.status === "FAILED" ? "warn" : "info");
  for (const [id, down] of ctx.down) d = log(d, "IMAGES", `${PROVIDER_LABEL[id]}: ${down.status}${down.note ? ` — ${down.note}` : ""}. Marked unavailable for this destination; other providers were used.`, "warn");
  const total = attractions.reduce((n, a) => n + a.images.filter((i) => i.approval_status === "PENDING").length, 0) + d.images.filter((i) => i.approval_status === "PENDING").length;
  d = addProv(d, "images", [{ label: "Image discovery service", url: null, retrieved_at: nowIso(), status: total ? "OK" : "SOURCE_UNAVAILABLE", note: `${total} candidates` }]);
  if (!total) d = log(d, "IMAGES", "No candidates found. Re-run the image search when providers are reachable, or upload licensed photographs.", "warn");
  return log(d, "AWAITING_APPROVAL", `${total} candidates ready for review`);
}

/** Re-runs the image search for one attraction ("__destination" for the gallery) or all of them, keeping approved images. */
export async function researchImages(id: string, target: string | "all"): Promise<CmsDestination | null> {
  const d0 = getDestination(id);
  if (!d0) return null;
  if (target === "all") {
    const busy = busySet();
    if (busy.has(d0.id)) return d0;
    busy.add(d0.id);
    try {
      return saveDestination(await imagesStage(d0));
    } finally {
      busy.delete(d0.id);
    }
  }
  const settings = getSettings();
  const others = otherPlaceNames(d0);
  if (target === "__destination") {
    const g = await discoverImages(subjectFor(d0, null, others), settings);
    return saveDestination(log({ ...d0, images: mergeCandidates(d0.images, g), gallery_search: g.state }, d0.pipeline.stage, `Gallery image search re-run: ${searchSummary(g.state)}`));
  }
  const a = d0.attractions.find((x) => x.id === target);
  if (!a) return d0;
  const r = await discoverImages(subjectFor(d0, a, others), settings);
  return saveDestination(log({ ...d0, attractions: d0.attractions.map((x) => (x.id === a.id ? { ...a, images: mergeCandidates(a.images, r), image_search: r.state } : x)) }, d0.pipeline.stage, `${a.name}: image search re-run — ${searchSummary(r.state)}`));
}

// ---- finalisation ------------------------------------------------------------

export interface FinalizeIssue {
  target: string;
  message: string;
}

/**
 * Stores one approved image according to its provider's terms:
 * Pixabay and Wikimedia files are copied to our media storage (Pixabay does not allow hotlinking);
 * Unsplash photos stay on Unsplash's servers and the download event is reported.
 */
async function storeApproved(img: CmsImage, destSlug: string): Promise<{ img: CmsImage; issue: string | null }> {
  if (img.approval_status !== "APPROVED") return { img, issue: null };
  if (img.provider === "unsplash" || img.hotlink_required) {
    if (img.download_event_sent_at) return { img, issue: null };
    const sent = await sendUnsplashDownloadEvent(img);
    if (sent) return { img: { ...img, download_status: "HOTLINKED", download_event_sent_at: nowIso() }, issue: null };
    return { img: { ...img, download_status: "HOTLINKED" }, issue: "Unsplash download event could not be sent yet — it is retried on the next pipeline action" };
  }
  if (img.download_status === "DOWNLOADED" || img.download_status === "LOCAL" || img.url.startsWith("/") || img.url.startsWith("placeholder://")) return { img, issue: null };
  const out = await downloadImage(img, destSlug);
  if (out.download_status === "DOWNLOADED") return { img: out, issue: null };
  if (img.provider === "pixabay") return { img: out, issue: "Pixabay image could not be downloaded — Pixabay does not allow hotlinking, so it cannot be used until the download succeeds" };
  return { img: out, issue: `could not be copied to media storage — served from ${img.source} (permitted by its licence) until a later finalisation copies it` };
}

/**
 * The admin's one action per destination: approve 1–4 images for each attraction (plus optional gallery/hero),
 * validate, store the files, save licence metadata, mark the page READY (or PUBLISHED, per settings) and move the
 * pipeline on to the next destination. Candidates that were not chosen are discarded.
 */
export async function finalizeDestination(id: string, selection: Record<string, string[]>, opts: { allowEmpty?: boolean } = {}): Promise<{ destination: CmsDestination | null; issues: FinalizeIssue[]; finalized: boolean }> {
  const d0 = getDestination(id);
  if (!d0) return { destination: null, issues: [{ target: id, message: "Destination not found" }], finalized: false };
  const issues: FinalizeIssue[] = [];
  const pick = (images: CmsImage[], ids: string[] | undefined, label: string, max: number) => {
    const chosen = (ids ?? []).filter((x, i, arr) => arr.indexOf(x) === i);
    if (chosen.length > max) issues.push({ target: label, message: `${chosen.length} images selected — at most ${max} are allowed` });
    for (const cid of chosen) {
      const img = images.find((i) => i.id === cid);
      if (!img) issues.push({ target: label, message: `Selected image ${cid} is no longer a candidate — reload the page` });
      else if (!img.license || !img.source_page_url) issues.push({ target: label, message: `“${img.alt}” has no recorded licence or source page` });
    }
    return chosen;
  };
  const attractions = d0.attractions.map((a) => {
    const already = a.images.filter((i) => i.approval_status === "APPROVED").map((i) => i.id);
    const chosen = pick(a.images, selection[a.id] ?? already, a.name, MAX_APPROVED_PER_ATTRACTION);
    return { a, chosen };
  });
  const galleryChosen = pick(d0.images, selection.__destination ?? d0.images.filter((i) => i.approval_status === "APPROVED").map((i) => i.id), "Destination gallery", 12);
  const empty = attractions.filter(({ a, chosen }) => a.status === "ACTIVE" && chosen.length === 0 && a.images.some((i) => i.approval_status === "PENDING"));
  if (empty.length && !opts.allowEmpty) issues.push({ target: empty.map(({ a }) => a.name).join(", "), message: "No image selected although candidates exist — select 1–4 or confirm that these attractions should show “No approved image available”" });
  if (issues.length) return { destination: d0, issues, finalized: false };

  let d = log(d0, "FINALIZING", "Finalising: storing approved images");
  const apply = (images: CmsImage[], chosen: string[]) =>
    images
      .filter((i) => chosen.includes(i.id) || i.provider === "manual" && i.approval_status === "APPROVED")
      .map((i) => ({ ...i, approval_status: "APPROVED" as const, rejection_reason: null, sort_order: chosen.indexOf(i.id) }));
  const storeIssues: FinalizeIssue[] = [];
  const store = async (images: CmsImage[], label: string) => {
    const out: CmsImage[] = [];
    for (const img of images) {
      const r = await storeApproved(img, d.slug);
      if (r.issue) storeIssues.push({ target: `${label}: ${img.alt}`, message: r.issue });
      out.push(r.img);
    }
    return out;
  };
  const nextAttractions: CmsAttraction[] = [];
  for (const { a, chosen } of attractions) nextAttractions.push({ ...a, images: await store(capApproved(apply(a.images, chosen)), a.name) });
  const gallery = await store(apply(d0.images, galleryChosen), "Gallery");

  const blocking = storeIssues.filter((i) => /Pixabay/.test(i.message));
  if (blocking.length) {
    // Nothing is changed on the record: the admin can retry, or pick a different image for that attraction.
    const kept = saveDestination(log(d0, "AWAITING_APPROVAL", `Finalisation stopped: ${blocking.length} image(s) could not be stored`, "error"));
    return { destination: kept, issues: blocking, finalized: false };
  }

  const pool = [...gallery, ...nextAttractions.flatMap((a) => a.images)];
  const heroId = selection.__hero?.[0];
  let hero = (heroId && pool.find((i) => i.id === heroId)) || (d0.hero_image && !d0.hero_image.url.startsWith("placeholder://") ? d0.hero_image : null) || gallery[0] || pool[0] || d0.hero_image;
  if (hero && hero.approval_status !== "APPROVED") hero = { ...hero, approval_status: "APPROVED" };

  const settings = getSettings();
  const status = d0.status === "PUBLISHED" ? "PUBLISHED" : settings.on_finalize === "PUBLISH" ? "PUBLISHED" : "IN_REVIEW";
  const approvedCount = pool.length;
  d = { ...d, attractions: nextAttractions, images: gallery, hero_image: hero ?? null, status, published_at: status === "PUBLISHED" ? d0.published_at ?? nowIso() : d0.published_at };
  for (const w of storeIssues) d = log(d, "FINALIZING", `${w.target}: ${w.message}`, "warn");
  d = log(d, "COMPLETED", `Finalised by admin: ${approvedCount} approved images; page ${status === "PUBLISHED" ? "published" : "ready for review"}`);
  d = { ...d, pipeline: { ...d.pipeline, stage: "COMPLETED", completed_at: nowIso(), last_error: null } };
  const saved = saveDestination(d);
  advance();
  return { destination: saved, issues: storeIssues, finalized: true };
}

/** Retries Unsplash download events that could not be sent at finalisation time. */
export async function flushUnsplashEvents(): Promise<number> {
  let sent = 0;
  for (const d of allDestinations()) {
    let changed = false;
    const fix = async (img: CmsImage) => {
      if (img.provider !== "unsplash" || img.approval_status !== "APPROVED" || img.download_event_sent_at) return img;
      if (await sendUnsplashDownloadEvent(img)) {
        changed = true;
        sent++;
        return { ...img, download_event_sent_at: nowIso() };
      }
      return img;
    };
    const attractions: CmsAttraction[] = [];
    for (const a of d.attractions) attractions.push({ ...a, images: await Promise.all(a.images.map(fix)) });
    const images = await Promise.all(d.images.map(fix));
    if (changed) saveDestination({ ...d, attractions, images });
  }
  return sent;
}

/** Legacy FINALIZING stage (records from before one-step finalisation): store what is approved and complete. */
export async function finalize(d0: CmsDestination): Promise<CmsDestination> {
  const sel: Record<string, string[]> = { __destination: d0.images.filter((i) => i.approval_status === "APPROVED").map((i) => i.id) };
  for (const a of d0.attractions) sel[a.id] = a.images.filter((i) => i.approval_status === "APPROVED").map((i) => i.id);
  const r = await finalizeDestination(d0.id, sel, { allowEmpty: true });
  return r.destination ?? d0;
}

/** Runs the next automatic stage for one destination and stores the result. */
export async function stepDestination(id: string): Promise<CmsDestination | null> {
  const d = getDestination(id);
  if (!d) return null;
  const busy = busySet();
  if (busy.has(d.id)) return d; // already being processed (e.g. by the background prepare-ahead run)
  busy.add(d.id);
  try {
    let next: CmsDestination;
    switch (d.pipeline.stage) {
      case "QUEUED":
      case "RESEARCHING": next = await research(d); break;
      case "ATTRACTIONS": next = await attractions(d); break;
      case "IMAGES": next = await imagesStage(d); break;
      case "AWAITING_APPROVAL": return d; // admin checkpoint
      case "FINALIZING": busy.delete(d.id); return await finalize(d);
      case "READY_TO_PUBLISH": return d; // admin checkpoint (legacy records)
      case "FAILED": next = await retryFailed(d); break;
      default: return d;
    }
    return saveDestination(next);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return saveDestination({ ...log(d, "FAILED", `Failed during ${d.pipeline.stage}: ${message}`, "error"), pipeline: { ...d.pipeline, stage: "FAILED", last_error: `${d.pipeline.stage}: ${message}` } });
  } finally {
    busy.delete(d.id);
  }
}

async function retryFailed(d: CmsDestination): Promise<CmsDestination> {
  const failedStage = (d.pipeline.last_error?.split(":")[0] ?? "RESEARCHING") as PipelineStage;
  const resume = (["RESEARCHING", "ATTRACTIONS", "IMAGES"] as PipelineStage[]).includes(failedStage) ? failedStage : "RESEARCHING";
  const reset: CmsDestination = { ...d, pipeline: { ...d.pipeline, stage: resume, last_error: null } };
  switch (resume) {
    case "ATTRACTIONS": return attractions(reset);
    case "IMAGES": return imagesStage(reset);
    default: return research(reset);
  }
}

/** True when a destination is at review but every image search failed because providers were unreachable. */
export function imageSearchUnavailable(d: CmsDestination): boolean {
  const searches = [...d.attractions.filter((a) => a.status === "ACTIVE").map((a) => a.image_search), d.gallery_search].filter(Boolean);
  const pending = d.attractions.some((a) => a.images.some((i) => i.approval_status === "PENDING")) || d.images.some((i) => i.approval_status === "PENDING");
  return !pending && searches.length > 0 && searches.every((x) => x!.status === "FAILED");
}

/** Runs every automatic stage for the current destination until it reaches an admin checkpoint or fails. */
export async function runUntilCheckpoint(): Promise<CmsDestination | null> {
  let d = currentDestination();
  if (!d) return null;
  // Providers were down when this destination was prepared: try again now (a failure is cheap and is recorded again).
  if (d.pipeline.stage === "AWAITING_APPROVAL" && imageSearchUnavailable(d)) {
    const lastTry = Date.parse(d.gallery_search?.searched_at ?? "") || 0;
    if (Date.now() - lastTry > 10 * 60 * 1000) d = (await researchImages(d.id, "all")) ?? d;
  }
  for (let guard = 0; guard < 6; guard++) {
    const stage = d.pipeline.stage;
    if (stage === "AWAITING_APPROVAL" || stage === "READY_TO_PUBLISH" || stage === "FAILED" || TERMINAL.includes(stage)) return d;
    const next = await stepDestination(d.id);
    if (!next) return d;
    d = next;
  }
  return d;
}

const PRE_APPROVAL: PipelineStage[] = ["QUEUED", "RESEARCHING", "ATTRACTIONS", "IMAGES"];

/**
 * Background preparation: researches and image-searches the next few queued destinations so the admin's
 * next review screen is ready the moment the current one is finalised. Approval and finalisation stay
 * strictly one destination at a time. Only one preparation run happens at a time per server process.
 */
export async function prepareAhead(n = getSettings().prepare_ahead): Promise<number> {
  const g = globalThis as unknown as { __pipelinePreparing?: boolean };
  if (n <= 0 || g.__pipelinePreparing) return 0;
  g.__pipelinePreparing = true;
  let prepared = 0;
  try {
    const job = getPipelineJob();
    const cur = currentDestination();
    const from = cur ? job.queue.indexOf(cur.id) + 1 : 0;
    let ready = 0;
    for (let i = from; i < job.queue.length && ready < n; i++) {
      let d = getDestination(job.queue[i]);
      if (!d || TERMINAL.includes(d.pipeline.stage) || d.pipeline.stage === "FAILED") continue;
      for (let guard = 0; guard < 5 && d && PRE_APPROVAL.includes(d.pipeline.stage); guard++) {
        d = await stepDestination(d.id);
        prepared++;
      }
      if (d && d.pipeline.stage === "AWAITING_APPROVAL") ready++;
    }
  } finally {
    g.__pipelinePreparing = false;
  }
  return prepared;
}

/**
 * After a finalisation: brings the next destination to its review screen and prepares the ones after it,
 * without making the admin's request wait. Safe to call repeatedly — work already running is not duplicated.
 */
export function continueInBackground() {
  const g = globalThis as unknown as { __pipelineContinuing?: boolean };
  if (g.__pipelineContinuing) return;
  g.__pipelineContinuing = true;
  void (async () => {
    try {
      await runUntilCheckpoint();
      await prepareAhead();
      await flushUnsplashEvents();
    } catch {
      /* failures are recorded on the destination itself */
    } finally {
      g.__pipelineContinuing = false;
    }
  })();
}

const busySet = (): Set<string> => {
  const g = globalThis as unknown as { __pipelineBusy?: Set<string> };
  return (g.__pipelineBusy ??= new Set<string>());
};

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
  const cleared = { ...d, gallery_search: null, attractions: d.attractions.map((a) => ({ ...a, image_search: null })) };
  return saveDestination({ ...log(cleared, "QUEUED", "Reset to the start of the pipeline by admin"), pipeline: { ...d.pipeline, stage: "QUEUED", last_error: null } });
}

function advance() {
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
