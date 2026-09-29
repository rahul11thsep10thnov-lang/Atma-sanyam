import type {
  AccommodationArea, AttractionRecord, CircuitRecord, DestinationConnection, DestinationRecord, DestinationSuitability,
  DestinationWeather, EmergencyService, ExperienceRecord, FactRecord, FestivalRecord, HistoricalEvent, HistoricalPeriod,
  LocalFood, PracticalInformation, ShoppingItem, SourceRecord, StateRecord, TransportHub, Tradition, TravelCost
} from "../types";

/**
 * The structured JSON handed to the writer (spec section 45). The writer sees
 * records — never a vague prompt — and may only state what is in here.
 */
export interface GenerationInput {
  destination: {
    id: string;
    slug: string;
    name: string;
    level: DestinationRecord["destination_level"];
    entity_type: DestinationRecord["entity_type"];
    destination_type: string;
    state: Pick<StateRecord, "id" | "slug" | "name">;
    district: string | null;
    parent: { id: string; name: string; slug: string } | null;
    coordinates: { latitude: number; longitude: number };
    tagline: string | null;
    one_line_description: string;
    short_description: string;
    best_months: { start: number | null; end: number | null; text: string | null };
    recommended_days: { min: number; recommended: number; max: number };
    ideal_duration_text: string | null;
    budget_category: DestinationRecord["budget_category"];
    languages: string[];
    best_known_for: string[];
    elevation: number | null;
  };
  categories: string[];
  descriptions: Record<string, string>;
  ancient_story: {
    title: string | null;
    short: string | null;
    long: string | null;
    status: DestinationRecord["ancient_story_status"];
  } | null;
  history: Array<HistoricalEvent & { period_name: string; entity_name: string }>;
  periods: HistoricalPeriod[];
  traditions: Array<Tradition & { entity_name: string }>;
  attractions: AttractionRecord[];
  hidden_places: AttractionRecord[];
  child_destinations: Array<{ id: string; name: string; slug: string }>;
  transport: { hubs: TransportHub[]; notes: FactRecord[] };
  accommodation_areas: AccommodationArea[];
  food: LocalFood[];
  shopping: ShoppingItem[];
  weather: DestinationWeather[];
  festivals: FestivalRecord[];
  practical_information: PracticalInformation[];
  emergency: { national: EmergencyService[]; local: EmergencyService[] };
  experiences: ExperienceRecord[];
  suitability: DestinationSuitability | null;
  costs: TravelCost[];
  nearby_destinations: Array<{
    destination: { id: string; name: string; slug: string; state_slug: string };
    connection: DestinationConnection;
  }>;
  circuits: Array<{ circuit: CircuitRecord; stops: Array<{ id: string; name: string; days: number }> }>;
  itineraries: Array<{ days: number; slug: string }>;
  sources: SourceRecord[];
  /** Records the page needs but the database does not yet hold. Never filled with guesses. */
  gaps: string[];
  data_version: string;
}

export type Cell = string | { text: string; href: string };

export type VerificationStatus = "VERIFIED" | "PARTIAL" | "UNVERIFIED" | "NO_DATA";

export interface SectionBlockTable {
  headers: string[];
  rows: Cell[][];
}

/** One section of a generated page. Purely data — the page components decide how to draw it. */
export interface GeneratedSection {
  id: string;
  title: string;
  paragraphs: Array<{ text: string; kind: "fact" | "tradition" | "history" | "estimate" | "note"; label?: string }>;
  bullets: Cell[];
  table: SectionBlockTable | null;
  /** "Not yet collected" messages — shown instead of inventing content. */
  missing: string[];
  /** Caveats to display, e.g. unverified time-sensitive facts. */
  notices: string[];
  verification: { status: VerificationStatus; verified: number; total: number };
  /** Oldest verification date among the records used (null if none verified). */
  last_verified: string | null;
  source_ids: string[];
}

export interface GeneratedPage {
  entity_id: string;
  page_type: "DESTINATION_PAGE";
  title: string;
  subtitle: string | null;
  sections: GeneratedSection[];
  faq: Array<{ question: string; answer: string }>;
  data_version: string;
  writer: { name: string; version: string };
}

export interface ContentWriter {
  readonly name: string;
  readonly version: string;
  write(input: GenerationInput): GeneratedPage | Promise<GeneratedPage>;
}
