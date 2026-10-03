import "@/lib/cms/server-guard";
import { fetchJson, nowIso } from "../http";
import { getSecret } from "../../secrets";
import type { SiteSettings, SourceRef } from "../../types";

/**
 * Google Places (official API, key required). Used only through the
 * authorised Places API — never by scraping Google Maps. Supplies the rating,
 * review count, Maps link and website for an attraction. Without a key the
 * pipeline records "Rating unavailable" and ranks attractions without ratings.
 */
export interface PlaceHit {
  name: string;
  rating: number | null;
  review_count: number | null;
  map_url: string | null;
  website: string | null;
  lat: number | null;
  lng: number | null;
  address: string | null;
  types: string[];
  place_id: string;
}

export const placesKey = (_settings?: SiteSettings) => getSecret("google_places");

const ATTRACTION_TYPES = new Set(["tourist_attraction", "museum", "park", "place_of_worship", "hindu_temple", "church", "mosque", "zoo", "aquarium", "art_gallery", "natural_feature", "amusement_park", "campground", "stadium", "landmark", "historical_landmark", "monument"]);

export async function placesTextSearch(query: string, key: string, lat?: number | null, lng?: number | null): Promise<{ hits: PlaceHit[]; source: SourceRef }> {
  const loc = lat != null && lng != null ? `&location=${lat},${lng}&radius=15000` : "";
  const r = await fetchJson<{ status: string; error_message?: string; results?: Array<{ place_id: string; name: string; rating?: number; user_ratings_total?: number; website?: string; formatted_address?: string; geometry?: { location: { lat: number; lng: number } }; types?: string[] }> }>(
    `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}${loc}&key=${encodeURIComponent(key)}`
  );
  const ok = r.ok && r.data?.status === "OK";
  const source: SourceRef = { label: "Google Places API", url: null, retrieved_at: nowIso(), status: ok ? "OK" : "SOURCE_UNAVAILABLE", note: ok ? undefined : r.data?.error_message ?? r.data?.status ?? r.error ?? undefined };
  if (!ok) return { hits: [], source };
  const hits = (r.data!.results ?? []).map((p) => ({
    name: p.name,
    rating: typeof p.rating === "number" ? p.rating : null,
    review_count: typeof p.user_ratings_total === "number" ? p.user_ratings_total : null,
    map_url: `https://www.google.com/maps/place/?q=place_id:${p.place_id}`,
    website: p.website ?? null,
    lat: p.geometry?.location.lat ?? null,
    lng: p.geometry?.location.lng ?? null,
    address: p.formatted_address ?? null,
    types: p.types ?? [],
    place_id: p.place_id
  }));
  return { hits, source };
}

/** "Tourist attractions in X" search, limited to attraction-like place types. */
export async function placesAttractions(destination: string, state: string | null, key: string, lat?: number | null, lng?: number | null) {
  const res = await placesTextSearch(`tourist attractions in ${destination}${state ? `, ${state}` : ""}, India`, key, lat, lng);
  return { ...res, hits: res.hits.filter((h) => h.types.some((t) => ATTRACTION_TYPES.has(t))) };
}
