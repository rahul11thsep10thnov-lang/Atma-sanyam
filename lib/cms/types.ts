/**
 * CMS record types — the editable, database-driven content behind every
 * /destinations/{slug} page. One `CmsDestination` document holds the
 * destination and everything shown on its page (attractions, image
 * candidates, hotels, restaurants, FAQ, SEO, sources). The admin console
 * edits these records; no page component needs to change when content does.
 *
 * Every automatically collected field keeps its provenance (where it came
 * from and when), and nothing is ever invented: a value that could not be
 * collected is `null` and the page shows an honest "unavailable" label.
 */

export type PublicationStatus = "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "ARCHIVED";

export type CompanionType = "COUPLE" | "FAMILY" | "FRIENDS" | "SOLO";
export const COMPANION_TYPES: CompanionType[] = ["COUPLE", "FAMILY", "FRIENDS", "SOLO"];

/** Public categories used by the homepage sections and filters. */
export const CMS_CATEGORIES = [
  "HISTORICAL", "NATURE", "WILDLIFE", "SPIRITUAL", "BEACH", "MOUNTAIN", "HILL_STATION", "HERITAGE",
  "ADVENTURE", "FOOD", "SHOPPING", "CULTURAL", "FAMILY", "ROMANTIC", "BUDGET", "WELLNESS", "URBAN"
] as const;
export type CmsCategory = (typeof CMS_CATEGORIES)[number];

export type SourceStatus = "OK" | "SOURCE_UNAVAILABLE" | "MANUAL" | "SEED";

/** Where a piece of information came from. */
export interface SourceRef {
  label: string; // "Incredible India", "Wikipedia", "Seed dataset", "Admin entry"
  url: string | null;
  retrieved_at: string | null; // ISO timestamp
  status: SourceStatus;
  note?: string;
}

/** field name → sources that support it (e.g. about → [Incredible India, Wikipedia]). */
export type ProvenanceMap = Record<string, SourceRef[]>;

export type ImageApproval = "PENDING" | "APPROVED" | "REJECTED";
/** HOTLINKED = the provider requires its own URLs to be used (Unsplash); nothing is copied. */
export type DownloadStatus = "NOT_DOWNLOADED" | "DOWNLOADED" | "FAILED" | "LOCAL" | "HOTLINKED";

/** Image providers queried by the discovery service, plus the non-API origins of an image. */
export const IMAGE_PROVIDERS = ["wikimedia", "pixabay", "unsplash", "pexels"] as const;
export type ImageProviderId = (typeof IMAGE_PROVIDERS)[number];
export type ImageOrigin = ImageProviderId | "manual" | "seed";

export const PROVIDER_LABEL: Record<ImageOrigin, string> = {
  wikimedia: "Wikimedia Commons",
  pixabay: "Pixabay",
  unsplash: "Unsplash",
  pexels: "Pexels",
  manual: "Manual upload",
  seed: "Seed dataset"
};

/**
 * An image candidate / approved image (the ImageCandidate record of the spec).
 * Binary files never live in the record: approved files are stored under the
 * media storage directory and served from /media/…; this record is metadata.
 */
export interface CmsImage {
  id: string;
  /** Image URL as served on the site (local /media path once downloaded, else the source URL). */
  url: string;
  thumbnail_url: string | null;
  /** Full-size URL at the provider (what is downloaded on approval, or hotlinked where required). */
  original_url: string | null;
  /** Mid-size URL for the review screen. */
  preview_url?: string | null;
  provider?: ImageOrigin;
  provider_image_id?: string | null;
  photographer_url?: string | null;
  description?: string | null;
  /** The search query (or "geo:lat,lon") that found this candidate. */
  source_query?: string | null;
  discovered_at?: string | null;
  /** Why the image was rejected (automatic quality filter or admin). */
  rejection_reason?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  /** Provider terms require serving from the provider's URL (Unsplash). */
  hotlink_required?: boolean;
  /** Unsplash: endpoint that must be called when the photo is used. */
  download_location?: string | null;
  download_event_sent_at?: string | null;
  relevance_score?: number | null;
  source: string; // "Wikimedia Commons", "Unsplash", "Pexels", "Pixabay", "Manual upload", "Placeholder"
  source_page_url: string | null;
  photographer: string | null;
  license: string | null; // "CC BY-SA 4.0", "Unsplash License", …
  license_url: string | null;
  attribution_required: boolean;
  attribution_text: string | null;
  download_status: DownloadStatus;
  local_path: string | null;
  approval_status: ImageApproval;
  caption: string | null;
  alt: string;
  width: number | null;
  height: number | null;
  retrieved_at: string | null;
  sort_order: number;
}

export type ImageSearchStatus = "COMPLETED" | "PARTIAL" | "NO_RESULTS" | "FAILED" | "NOT_RUN";
export type ProviderRunStatus = "OK" | "NO_RESULTS" | "PROVIDER_UNAVAILABLE" | "RATE_LIMITED" | "NOT_CONFIGURED" | "DISABLED" | "SKIPPED" | "ERROR";

export interface ProviderRun {
  provider: ImageProviderId;
  status: ProviderRunStatus;
  /** Results the provider returned (before filtering). */
  found: number;
  /** Candidates from this provider that made the final list. */
  kept: number;
  requests: number;
  http_status: number | null;
  note: string | null;
}

/** Outcome of the last image search for one attraction (or the destination gallery). */
export interface ImageSearchState {
  status: ImageSearchStatus;
  searched_at: string | null;
  providers: ProviderRun[];
  final_candidates: number;
  auto_rejected: number;
  queries: string[];
}

export interface CmsAttraction {
  id: string;
  slug: string;
  name: string;
  short_description: string;
  location_text: string | null;
  latitude: number | null;
  longitude: number | null;
  map_url: string | null;
  official_website: string | null;
  category: string | null; // "Temple", "Fort", "Museum", "Ghat", …
  /** Null = "Rating unavailable". Only ever filled from an authorised ratings source. */
  rating: number | null;
  review_count: number | null;
  rating_source: string | null;
  rating_retrieved_at: string | null;
  images: CmsImage[];
  sources: SourceRef[];
  sort_order: number;
  /** When true the admin fixed the order by hand; automatic re-ranking must not move it. */
  manual_order: boolean;
  status: "ACTIVE" | "HIDDEN";
  image_search?: ImageSearchState | null;
}

export type CollaborationStatus = "NONE" | "CONTACTED" | "IN_TALKS" | "PARTNER" | "DECLINED";

/** Hotel listing blueprint — every field is optional so a record can start empty and be filled from the admin console. */
export interface CmsHotel {
  id: string;
  name: string;
  images: CmsImage[];
  address: string | null;
  map_url: string | null;
  google_rating: number | null;
  review_count: number | null;
  rating_source: string | null;
  phone: string | null;
  website: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
  initial_fare: number | null; // ₹ per night
  discounted_fare: number | null;
  room_type: string | null;
  amenities: string[];
  breakfast_included: boolean | null;
  parking: boolean | null;
  wifi: boolean | null;
  air_conditioning: boolean | null;
  family_rooms: boolean | null;
  cancellation_policy: string | null;
  distance_from_attraction_km: number | null;
  distance_from_railway_km: number | null;
  distance_from_airport_km: number | null;
  contact_person: string | null;
  collaboration_status: CollaborationStatus;
  admin_notes: string | null;
  status: "DRAFT" | "PUBLISHED";
  sort_order: number;
  last_updated: string;
}

export interface CmsRestaurant {
  id: string;
  name: string;
  images: CmsImage[];
  cuisine: string | null;
  address: string | null;
  map_url: string | null;
  google_rating: number | null;
  review_count: number | null;
  rating_source: string | null;
  price_range: string | null; // "₹200–400 per person"
  phone: string | null;
  website: string | null;
  opening_hours: string | null;
  veg_type: "VEG" | "NON_VEG" | "BOTH" | null;
  specialities: string[];
  popular_dishes: string[];
  amenities: string[];
  delivery_available: boolean | null;
  contact_details: string | null;
  collaboration_status: CollaborationStatus;
  admin_notes: string | null;
  status: "DRAFT" | "PUBLISHED";
  sort_order: number;
  last_updated: string;
}

export interface CmsFaq {
  question: string;
  answer: string;
}

export interface CmsSeo {
  title: string | null;
  description: string | null;
  keywords: string[];
  canonical_path: string | null; // defaults to /destinations/{slug}
  og_image: string | null;
}

export type PipelineStage =
  | "QUEUED"
  | "RESEARCHING"
  | "ATTRACTIONS"
  | "IMAGES"
  | "AWAITING_APPROVAL"
  | "FINALIZING"
  | "READY_TO_PUBLISH"
  | "COMPLETED"
  | "FAILED"
  | "SKIPPED"
  | "NOT_IN_PIPELINE";

export interface PipelineLogEntry {
  at: string;
  stage: PipelineStage;
  message: string;
  level: "info" | "warn" | "error";
}

export interface DestinationPipelineState {
  stage: PipelineStage;
  import_id: string | null;
  position: number | null; // 1-based position in its import
  started_at: string | null;
  completed_at: string | null;
  last_error: string | null;
  log: PipelineLogEntry[];
}

export interface CmsDestination {
  id: string; // CMS-<slug>
  name: string;
  slug: string;
  state: string | null;
  state_slug: string | null;
  district: string | null;
  region: string | null;
  country: "India";
  latitude: number | null;
  longitude: number | null;

  hero_image: CmsImage | null;
  headline: string | null;
  short_description: string | null;

  /** Markdown-lite text (paragraphs, **bold**, "- " lists). */
  about: string | null;
  history: string | null;
  /** When history could not be verified the page prints the standard notice. */
  history_verified: boolean;
  transportation: string | null;
  travel_info: string | null;

  best_time_text: string | null;
  ideal_duration_text: string | null;
  nearest_airport: string | null;
  nearest_railway_station: string | null;

  categories: CmsCategory[];
  companions: CompanionType[];

  attractions: CmsAttraction[];
  hotels: CmsHotel[];
  restaurants: CmsRestaurant[];
  images: CmsImage[]; // destination-level gallery
  gallery_search?: ImageSearchState | null;
  faq: CmsFaq[];
  seo: CmsSeo;

  provenance: ProvenanceMap;
  pipeline: DestinationPipelineState;

  /** Slug of the richer seed guide under /india/{state}/{slug}, when one exists. */
  legacy_slug: string | null;
  is_sample_data: boolean;

  status: PublicationStatus;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface ImportCandidate {
  raw: string;
  name: string;
  slug: string;
  /** State detected from a "Name, State" line or the PDF section heading, if any. */
  state: string | null;
  /** Number printed next to the name in the PDF, if any. */
  position?: number | null;
  /** Existing destination with the same slug — confirming queues that record instead of creating a new one. */
  duplicate_of: string | null;
  selected: boolean;
}

export interface ImportRecord {
  id: string;
  file_name: string;
  uploaded_at: string;
  page_count: number | null;
  raw_line_count: number;
  candidates: ImportCandidate[];
  confirmed_at: string | null;
  created_ids: string[];
}

export interface PipelineJob {
  import_id: string | null;
  /** Destination ids in processing order. */
  queue: string[];
  /** Index into queue of the destination being processed (null = nothing started). */
  cursor: number | null;
  auto_advance: boolean;
  updated_at: string;
}

export interface SiteSettings {
  site_name: string;
  tagline: string;
  logo_url: string | null;
  favicon_url: string | null;
  default_hero_image: string | null;
  default_seo_title: string;
  default_seo_description: string;
  social_links: { label: string; url: string }[];
  contact_email: string | null;
  contact_phone: string | null;
  contact_address: string | null;
  footer_text: string | null;
  copyright_text: string;
  /** Which image providers the discovery service may query (API keys live in the server-only secrets store). */
  image_providers: Record<ImageProviderId, { enabled: boolean }>;
  /** Target number of candidates per attraction (fewer are shown when fewer trustworthy ones exist). */
  images_per_attraction: number;
  /** Candidates whose longer side is below this many pixels are rejected automatically. */
  min_image_long_edge: number;
  /** How many attractions the pipeline keeps per destination. */
  attractions_per_destination: number;
  /** What "Finalize destination" does with the page: mark it ready for review, or publish it. */
  on_finalize: "READY" | "PUBLISH";
  /** Destinations after the current one that are researched and image-searched in the background. */
  prepare_ahead: number;
  analytics_id: string | null;
  updated_at: string;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  site_name: "Budget Tourism",
  tagline: "The Earth laughs in flowers.",
  logo_url: null,
  favicon_url: null,
  default_hero_image: "/images/hero-waterfall.jpg",
  default_seo_title: "Budget Tourism — India travel guides",
  default_seo_description: "Database-driven travel guides for India's destinations: attractions, history, budget hotels and restaurants.",
  social_links: [],
  contact_email: null,
  contact_phone: null,
  contact_address: null,
  footer_text: null,
  copyright_text: "All rights reserved.",
  image_providers: { wikimedia: { enabled: true }, pixabay: { enabled: true }, unsplash: { enabled: true }, pexels: { enabled: false } },
  images_per_attraction: 10,
  min_image_long_edge: 1000,
  attractions_per_destination: 10,
  on_finalize: "READY",
  prepare_ahead: 2,
  analytics_id: null,
  updated_at: "2026-10-03T00:00:00.000Z"
};

export const PUBLICATION_STATUSES: PublicationStatus[] = ["DRAFT", "IN_REVIEW", "PUBLISHED", "ARCHIVED"];

export const emptyPipeline = (): DestinationPipelineState => ({
  stage: "NOT_IN_PIPELINE",
  import_id: null,
  position: null,
  started_at: null,
  completed_at: null,
  last_error: null,
  log: []
});

export const emptySeo = (): CmsSeo => ({ title: null, description: null, keywords: [], canonical_path: null, og_image: null });

export function emptyHotel(id: string, now: string): CmsHotel {
  return {
    id, name: "", images: [], address: null, map_url: null, google_rating: null, review_count: null, rating_source: null,
    phone: null, website: null, check_in_time: null, check_out_time: null, initial_fare: null, discounted_fare: null,
    room_type: null, amenities: [], breakfast_included: null, parking: null, wifi: null, air_conditioning: null,
    family_rooms: null, cancellation_policy: null, distance_from_attraction_km: null, distance_from_railway_km: null,
    distance_from_airport_km: null, contact_person: null, collaboration_status: "NONE", admin_notes: null,
    status: "DRAFT", sort_order: 0, last_updated: now
  };
}

export function emptyRestaurant(id: string, now: string): CmsRestaurant {
  return {
    id, name: "", images: [], cuisine: null, address: null, map_url: null, google_rating: null, review_count: null,
    rating_source: null, price_range: null, phone: null, website: null, opening_hours: null, veg_type: null,
    specialities: [], popular_dishes: [], amenities: [], delivery_available: null, contact_details: null,
    collaboration_status: "NONE", admin_notes: null, status: "DRAFT", sort_order: 0, last_updated: now
  };
}

export function emptyAttraction(id: string, slug: string, name: string): CmsAttraction {
  return {
    id, slug, name, short_description: "", location_text: null, latitude: null, longitude: null, map_url: null,
    official_website: null, category: null, rating: null, review_count: null, rating_source: null,
    rating_retrieved_at: null, images: [], sources: [], sort_order: 0, manual_order: false, status: "ACTIVE"
  };
}

export function emptyDestination(id: string, name: string, slug: string, now: string): CmsDestination {
  return {
    id, name, slug, state: null, state_slug: null, district: null, region: null, country: "India",
    latitude: null, longitude: null, hero_image: null, headline: null, short_description: null,
    about: null, history: null, history_verified: false, transportation: null, travel_info: null,
    best_time_text: null, ideal_duration_text: null, nearest_airport: null, nearest_railway_station: null,
    categories: [], companions: [], attractions: [], hotels: [], restaurants: [], images: [], faq: [],
    seo: emptySeo(), provenance: {}, pipeline: emptyPipeline(), legacy_slug: null, is_sample_data: false,
    status: "DRAFT", created_at: now, updated_at: now, published_at: null
  };
}
