import type { CmsImage, ImageProviderId, ProviderRunStatus } from "../types";

/** What an image search is about: one attraction, or the destination itself (gallery / hero). */
export interface Subject {
  kind: "attraction" | "destination";
  /** Attraction name, or the destination name for kind "destination". */
  name: string;
  /** Destination (city / town / area) the subject belongs to. */
  city: string;
  /** Other names the destination is known by, e.g. "Katra" for "Vaishno Devi (Katra)". */
  cityAliases: string[];
  state: string | null;
  lat: number | null;
  lon: number | null;
  /** Names of other destinations — a candidate that only mentions one of those is the wrong place. */
  otherPlaces: string[];
}

export type Query = { kind: "text"; text: string } | { kind: "geo"; lat: number; lon: number; radius_m: number };

export const queryLabel = (q: Query) => (q.kind === "text" ? q.text : `geo:${q.lat.toFixed(4)},${q.lon.toFixed(4)} r=${q.radius_m}m`);

/** A normalised result from any provider, before filtering. */
export interface Found {
  image: CmsImage;
  /** Searchable text: title, description, tags, categories. */
  text: string;
  /** e.g. image/jpeg; null when the provider does not say (stock providers only serve photos as JPEG). */
  mime: string | null;
  /** Provider-specific reason this cannot be used at all (non-free licence, premium content, illustration…). */
  hardReject: string | null;
  /** Distance from the geosearch point, for geo results. */
  distance_m: number | null;
  /** Commons quality markers (Featured / Quality / Valued image). */
  quality_mark: boolean;
}

export interface ProviderResponse {
  status: ProviderRunStatus;
  http_status: number | null;
  note: string | null;
  items: Found[];
}

export interface ProviderAdapter {
  id: ImageProviderId;
  /** True when the provider needs an API key. */
  needsKey: boolean;
  search(q: Query, subject: Subject): Promise<ProviderResponse>;
  /** Text queries for this subject, most specific first. Geo queries are added by the service for providers that support them. */
  queries(subject: Subject): string[];
  supportsGeo: boolean;
}
