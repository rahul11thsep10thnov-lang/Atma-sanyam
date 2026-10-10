import "@/lib/cms/server-guard";
import { getDb } from "@/lib/master/repo";
import { bootstrapFromSeed } from "./bootstrap";
import { fetchJson, nowIso } from "./pipeline/http";
import { MASTER_SOURCE } from "./masterImport";
import { allDestinations, getDestination, saveDestination } from "./store";
import type { CmsDestination, SourceRef } from "./types";

/**
 * Location enrichment for master-list records: district and coordinates, each with the source it came
 * from. Values only ever fill EMPTY fields, never change a published record's existing data, and never
 * mark a record verified — an editor does that. Coordinates must fall inside India and within a
 * plausible distance of the state's capital, otherwise they are rejected.
 */

export interface LocationHint {
  /** Master-list row id (IN-0001) or record id (CMS-…). */
  source_id?: string;
  id?: string;
  name: string;
  state: string;
  district?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  source_url: string | null;
  source_label: string;
  /** WEB_SEARCH: from a web-search answer citing source_url; OK: fetched from source_url directly. */
  method: "WEB_SEARCH" | "OK";
  retrieved_at?: string;
  note?: string;
}

export interface ApplyHintsResult {
  applied: Array<{ id: string; fields: string[] }>;
  unchanged: number;
  not_found: string[];
  rejected: Array<{ id: string; reason: string }>;
}

const R = 6371;
export function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const rad = (x: number) => (x * Math.PI) / 180;
  const h = Math.sin(rad(bLat - aLat) / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(rad(bLon - aLon) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Largest plausible distance from the capital, per state/UT (generous: a sanity check, not verification). */
const MAX_KM: Record<string, number> = { Delhi: 60, Chandigarh: 40, Puducherry: 750, Lakshadweep: 500, "Andaman and Nicobar Islands": 900, "Dadra and Nagar Haveli and Daman and Diu": 400, Goa: 120, Sikkim: 150, Tripura: 250, Mizoram: 300, Manipur: 250, Nagaland: 250, Meghalaya: 300 };

export function plausibleLocation(state: string, lat: number, lon: number): string | null {
  if (!(lat > 6 && lat < 37.5 && lon > 68 && lon < 97.5)) return "outside India";
  const st = getDb().states.find((s) => s.name === state);
  if (!st) return null;
  const km = distanceKm(st.latitude, st.longitude, lat, lon);
  const max = MAX_KM[state] ?? 900;
  return km > max ? `${Math.round(km)} km from ${st.capital}, more than ${max} km — probably another place` : null;
}

const ref = (h: LocationHint): SourceRef => ({ label: h.source_label, url: h.source_url, retrieved_at: h.retrieved_at ?? nowIso(), status: h.method, note: h.note ?? "unverified — check before publishing" });

/** Applies hints to the matching records. Idempotent: a field that already has a value is left alone. */
export function applyLocationHints(hints: LocationHint[]): ApplyHintsResult {
  bootstrapFromSeed();
  const bySource = new Map<string, CmsDestination>();
  for (const d of allDestinations()) if (d.seed?.source === MASTER_SOURCE) for (const s of [d.seed.source_id, ...(d.seed.other_source_ids ?? [])]) bySource.set(s, d);
  const out: ApplyHintsResult = { applied: [], unchanged: 0, not_found: [], rejected: [] };
  for (const h of hints) {
    const d0 = (h.id && getDestination(h.id)) || (h.source_id && bySource.get(h.source_id)) || null;
    if (!d0) { out.not_found.push(h.source_id ?? h.id ?? h.name); continue; }
    const d = getDestination(d0.id)!; // fresh copy (an earlier hint may have changed it)
    if (!h.source_url) { out.rejected.push({ id: d.id, reason: "no source URL" }); continue; }
    const fields: string[] = [];
    const next: CmsDestination = { ...d, provenance: { ...d.provenance } };
    const state = d.state ?? h.state;
    const district = h.district?.replace(/\s+district$/i, "").trim();
    if (district && !d.district) { next.district = district; next.provenance.district = [...(d.provenance.district ?? []), ref(h)]; fields.push("district"); }
    if (typeof h.latitude === "number" && typeof h.longitude === "number" && d.latitude === null && d.longitude === null) {
      const why = plausibleLocation(state, h.latitude, h.longitude);
      if (why) out.rejected.push({ id: d.id, reason: `coordinates ${h.latitude}, ${h.longitude}: ${why}` });
      else { next.latitude = Math.round(h.latitude * 1e5) / 1e5; next.longitude = Math.round(h.longitude * 1e5) / 1e5; next.provenance.coordinates = [...(d.provenance.coordinates ?? []), ref(h)]; fields.push("coordinates"); }
    }
    if (!fields.length) { out.unchanged++; continue; }
    if (d.status === "PUBLISHED" && d.verification_status !== "UNVERIFIED") {
      // A published page shows these fields directly; leave them for an editor.
      out.rejected.push({ id: d.id, reason: "published record — not changed automatically" });
      continue;
    }
    saveDestination({ ...next, verification_status: d.status === "PUBLISHED" ? d.verification_status : "UNVERIFIED" });
    out.applied.push({ id: d.id, fields });
  }
  return out;
}

// ---- Wikipedia + Wikidata (run where these APIs are reachable) -------------------------------------

interface Summary { title: string; type?: string; description?: string; extract?: string; coordinates?: { lat: number; lon: number }; wikibase_item?: string; content_urls?: { desktop?: { page: string } } }
interface Entities { entities: Record<string, { labels?: { en?: { value: string } }; claims?: Record<string, Array<{ mainsnak: { datavalue?: { value: { id?: string } } } }>> }> }

const DISTRICT_OF_INDIA = "Q1149652";
const claimIds = (e: Entities["entities"][string] | undefined, p: string) => (e?.claims?.[p] ?? []).map((c) => c.mainsnak.datavalue?.value.id).filter((x): x is string => Boolean(x));

/** Walks "located in the administrative territorial entity" (P131) up to the district (Q1149652). */
async function wikidataDistrict(qid: string): Promise<string | null> {
  let ids = [qid];
  for (let depth = 0; depth < 4 && ids.length; depth++) {
    const r = await fetchJson<Entities>(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ids.slice(0, 20).join("|")}&props=claims|labels&languages=en&format=json`);
    if (!r.ok || !r.data) return null;
    const next: string[] = [];
    for (const id of ids) {
      const e = r.data.entities[id];
      if (depth > 0 && claimIds(e, "P31").includes(DISTRICT_OF_INDIA)) return e?.labels?.en?.value ?? null;
      next.push(...claimIds(e, "P131"));
    }
    ids = [...new Set(next)];
  }
  return null;
}

const stateWords = (state: string) => (state === "Dadra and Nagar Haveli and Daman and Diu" ? ["Daman", "Diu", "Dadra"] : state === "Andaman and Nicobar Islands" ? ["Andaman", "Nicobar"] : [state]);

/** District and coordinates from Wikipedia/Wikidata for one record; null when no article clearly matches the state. */
export async function wikiLocationHint(d: CmsDestination): Promise<{ hint: LocationHint | null; error: string | null }> {
  const state = d.state ?? "";
  const titles = [`${d.name}, ${state}`, d.name, `${d.name}, India`];
  for (const t of titles) {
    const r = await fetchJson<Summary>(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(t.replace(/ /g, "_"))}?redirect=true`);
    if (!r.ok) { if (r.status === 404) continue; return { hint: null, error: r.error }; }
    const s = r.data!;
    if (s.type === "disambiguation" || !s.extract) continue;
    const text = `${s.description ?? ""} ${s.extract}`;
    if (!stateWords(state).some((w) => text.includes(w))) continue; // another place with the same name
    const district = s.wikibase_item ? await wikidataDistrict(s.wikibase_item) : null;
    const url = s.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(s.title.replace(/ /g, "_"))}`;
    return { hint: { id: d.id, name: d.name, state, district, latitude: s.coordinates?.lat ?? null, longitude: s.coordinates?.lon ?? null, source_url: url, source_label: district ? "Wikipedia / Wikidata" : "Wikipedia", method: "OK" }, error: null };
  }
  return { hint: null, error: null };
}

/** Master-list records still missing a district or coordinates. */
export function recordsNeedingLocation(): CmsDestination[] {
  bootstrapFromSeed();
  return allDestinations().filter((d) => d.seed?.source === MASTER_SOURCE && d.status !== "PUBLISHED" && (d.latitude === null || !d.district));
}
