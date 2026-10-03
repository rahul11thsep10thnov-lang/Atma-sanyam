import "@/lib/cms/server-guard";
import { fetchJson, nowIso } from "../http";
import type { SourceRef } from "../../types";

/**
 * Wikipedia (English) — supplementary source for the "About" summary, the
 * history section, coordinates and nearby places. Text is condensed into
 * short original summaries by the pipeline; we never copy whole articles.
 */

const API = "https://en.wikipedia.org/w/api.php";
const REST = "https://en.wikipedia.org/api/rest_v1";

export interface WikiSummary {
  title: string;
  extract: string;
  description: string | null;
  lat: number | null;
  lon: number | null;
  page_url: string;
  thumbnail: string | null;
}

export interface WikiPage {
  summary: WikiSummary;
  history: string | null; // plain text of the History section (first ~2,000 chars)
  source: SourceRef;
}

const source = (url: string | null, ok: boolean, note?: string): SourceRef => ({ label: "Wikipedia", url, retrieved_at: nowIso(), status: ok ? "OK" : "SOURCE_UNAVAILABLE", note });

interface SummaryJson {
  title: string;
  extract?: string;
  description?: string;
  coordinates?: { lat: number; lon: number };
  thumbnail?: { source: string };
  content_urls?: { desktop?: { page: string } };
  type?: string;
}

/** Resolves the best article for a place name; adds ", India" / the state to disambiguate. */
export async function wikiLookup(name: string, state: string | null): Promise<{ page: WikiPage | null; source: SourceRef }> {
  const attempts = [name, state ? `${name}, ${state}` : null, `${name}, India`].filter((x): x is string => Boolean(x));
  let lastError = "not found";
  for (const title of attempts) {
    const r = await fetchJson<SummaryJson>(`${REST}/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}?redirect=true`);
    if (!r.ok) { lastError = r.error ?? "unreachable"; if (r.status !== 404) break; continue; }
    const j = r.data!;
    if (j.type === "disambiguation" || !j.extract) continue;
    const pageUrl = j.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(j.title.replace(/ /g, "_"))}`;
    const summary: WikiSummary = { title: j.title, extract: j.extract, description: j.description ?? null, lat: j.coordinates?.lat ?? null, lon: j.coordinates?.lon ?? null, page_url: pageUrl, thumbnail: j.thumbnail?.source ?? null };
    const history = await wikiHistorySection(j.title);
    return { page: { summary, history, source: source(pageUrl, true) }, source: source(pageUrl, true) };
  }
  return { page: null, source: source(null, false, lastError) };
}

/** The article's History section as plain text, if it has one. */
export async function wikiHistorySection(title: string): Promise<string | null> {
  const r = await fetchJson<{ query?: { pages?: Record<string, { extract?: string }> } }>(`${API}?action=query&prop=extracts&explaintext=1&format=json&redirects=1&titles=${encodeURIComponent(title)}`);
  const page = r.data?.query?.pages ? Object.values(r.data.query.pages)[0] : undefined;
  const text = page?.extract;
  if (!text) return null;
  const m = text.match(/\n==\s*(History|Historical background|Early history)\s*==\n([\s\S]*?)(?=\n==\s[^=]|$)/i);
  if (!m) return null;
  return m[2].replace(/\n===?\s*([^=]+?)\s*===?\n/g, "\n\n**$1.** ").replace(/\n{3,}/g, "\n\n").trim().slice(0, 2400);
}

export interface NearbyArticle {
  title: string;
  description: string | null;
  lat: number;
  lon: number;
  distance_m: number;
  page_url: string;
}

const PLACE_WORDS = /\b(temple|fort|palace|museum|ghat|lake|park|garden|beach|waterfall|monument|mosque|masjid|church|cathedral|stupa|sanctuary|zoo|dam|hill|cave|bridge|market|bazaar|tomb|mausoleum|memorial|gurdwara|gurudwara|monastery|basilica|shrine|observatory|aquarium|planetarium|viewpoint|valley|island|falls|reservoir|wildlife|national park|heritage|archaeological|ruins|stepwell|baoli|haveli|minar|gate|darwaza|mahal|bagh|mandir|dargah|synagogue|lighthouse|promenade|botanical|rock|peak|glacier|hot spring|sangam|ashram)\b/i;
const NOT_PLACE = /\b(district|tehsil|taluk|railway station|junction|airport|university|college|school|hospital|bus stand|constituency|village|census town|municipal|company|stadium|mall|hotel)\b/i;

/** Articles with coordinates near the destination that read like visitor attractions. */
export async function wikiNearbyAttractions(lat: number, lon: number, radiusM = 12000, limit = 40): Promise<{ list: NearbyArticle[]; source: SourceRef }> {
  const r = await fetchJson<{ query?: { geosearch?: Array<{ pageid: number; title: string; lat: number; lon: number; dist: number }> } }>(`${API}?action=query&list=geosearch&gscoord=${lat}|${lon}&gsradius=${radiusM}&gslimit=${limit}&format=json`);
  if (!r.ok || !r.data?.query?.geosearch) return { list: [], source: source(null, false, r.error ?? "no results") };
  const hits = r.data.query.geosearch;
  const ids = hits.map((h) => h.pageid).join("|");
  const d = await fetchJson<{ query?: { pages?: Record<string, { pageid: number; title: string; description?: string }> } }>(`${API}?action=query&pageids=${ids}&prop=description&format=json`);
  const descs = new Map<number, string | null>();
  if (d.data?.query?.pages) for (const p of Object.values(d.data.query.pages)) descs.set(p.pageid, p.description ?? null);
  const list = hits
    .map((h) => ({ title: h.title, description: descs.get(h.pageid) ?? null, lat: h.lat, lon: h.lon, distance_m: h.dist, page_url: `https://en.wikipedia.org/wiki/${encodeURIComponent(h.title.replace(/ /g, "_"))}` }))
    .filter((a) => PLACE_WORDS.test(`${a.title} ${a.description ?? ""}`) && !NOT_PLACE.test(`${a.title} ${a.description ?? ""}`));
  return { list, source: source(`https://en.wikipedia.org/wiki/Special:Nearby#/coord/${lat},${lon}`, true) };
}
