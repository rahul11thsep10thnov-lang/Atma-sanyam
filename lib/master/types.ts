/**
 * Row types for every table in the master India tourism database.
 * Field names are the spec's snake_case names so that:
 *   - the JSON handed to the AI generator matches the spec (section 45),
 *   - the Prisma models in prisma/schema.prisma map 1:1 to these types.
 * Dates are ISO-8601 strings. `null` always means "not yet collected" —
 * never a guess (spec rule 20).
 */
import type {
  BudgetTier, Confidence, ConflictStatus, ConnectionQuality, ContentStatus, CostType, DatePrecision,
  CircuitType, CrowdLevel, DescriptionType, DestinationCategory, DestinationLevel,
  DifficultyLevel, EmergencyServiceType, EntityType, ExperienceType, FestivalDateType,
  FoodType, HistoricalStatus, HubType, MediaType, PageType, PracticalInfoType, Region,
  RelationshipType, ReliabilityClass, ReviewStatus, SourceType, StateType, Suitability,
  SuitabilityAudience, TransportMode, TravellerType, VerificationFrequency
} from "./enums";

/** Provenance carried by most records. */
export interface Provenance {
  source_id: string | null;
  last_verified_at: string | null;
}

// ---------------------------------------------------------------- geography

export interface StateRecord {
  id: string; // IN-UP
  country_id: string; // IN
  slug: string;
  name: string;
  official_name: string;
  type: StateType;
  iso_code: string; // ISO 3166-2:IN
  capital: string;
  region: Region;
  sub_region: string | null;
  latitude: number; // capital coordinates
  longitude: number;
  timezone: string;
  official_tourism_url: string | null;
  official_government_url: string | null;
  description: string | null;
  short_description: string | null;
  languages: string[];
  major_cities: string[];
  major_tourism_themes: string[];
  status: ContentStatus;
  created_at: string;
  updated_at: string;
}

export interface DistrictRecord extends Provenance {
  id: string; // DIST-IN-UP-VNS
  state_id: string;
  name: string;
  official_name: string | null;
  latitude: number | null;
  longitude: number | null;
  headquarters: string | null;
  description: string | null;
  tourism_importance: string | null;
  official_source: string | null;
  source_url: string | null;
  verified_at: string | null;
  status: ContentStatus;
}

export interface DestinationRecord extends Provenance {
  id: string; // IN-UP-VNS
  state_id: string;
  district_id: string | null;
  parent_destination_id: string | null;

  name: string;
  official_name: string | null;
  local_names: string[];
  alternate_names: string[];

  slug: string;
  entity_type: EntityType;
  destination_level: DestinationLevel;

  latitude: number;
  longitude: number;
  elevation: number | null;

  region: Region | null;
  sub_region: string | null;

  short_description: string;
  one_line_description: string;
  destination_type: string;

  // Internal classification attributes (0–100) used for filtering and
  // itinerary construction. NOT user-facing rankings.
  heritage_score: number;
  nature_score: number;
  spiritual_score: number;
  adventure_score: number;
  food_score: number;
  family_score: number;
  shopping_score: number;
  culture_score: number;
  wildlife_score: number;
  beach_score: number;
  mountain_score: number;

  recommended_min_days: number;
  recommended_max_days: number;
  recommended_days: number;

  best_month_start: number | null; // 1–12
  best_month_end: number | null;

  budget_category: BudgetTier | null;
  crowd_level: CrowdLevel;
  difficulty_level: DifficultyLevel;

  family_suitable: boolean | null;
  children_suitable: boolean | null;
  elderly_suitable: boolean | null;
  solo_suitable: boolean | null;
  couple_suitable: boolean | null;
  accessible_travel_possible: boolean | null;

  nearest_airport: string | null;
  nearest_railway_station: string | null;
  nearest_bus_station: string | null;

  primary_language: string | null;
  secondary_languages: string[];

  mobile_connectivity: string | null;
  internet_availability: string | null;
  upi_availability: string | null;
  atm_availability: string | null;

  // Optional ancient story (spec section 13)
  ancient_story_title: string | null;
  ancient_story_short: string | null;
  ancient_story_long: string | null;
  ancient_story_status: HistoricalStatus | null;
  ancient_story_sources: string[]; // source ids

  /** Popularity is an internal ordering signal for homepage rails, not a public rating. */
  popularity: number;
  best_time_text: string | null;
  ideal_duration_text: string | null;
  tagline: string | null;

  status: ContentStatus;
  is_sample_data: boolean;
  created_at: string;
  updated_at: string;
}

export interface DestinationCategoryLink {
  destination_id: string;
  category: DestinationCategory;
  confidence: Confidence;
  source_id: string | null;
}

export interface AttractionRecord extends Provenance {
  id: string; // IN-UP-VNS-KVT
  destination_id: string;

  name: string;
  official_name: string | null;
  alternate_names: string[];
  local_name: string | null;
  slug: string;
  attraction_type: EntityType;

  latitude: number | null;
  longitude: number | null;

  short_description: string;
  current_description: string;

  historical_importance: string | null;
  cultural_importance: string | null;
  religious_importance: string | null;

  opening_time: string | null; // HH:MM 24h
  closing_time: string | null;
  weekly_closed_day: string | null;
  opening_hours_text: string | null; // as reported; parsed values above are derived

  entry_required: boolean | null;
  entry_fee: number | null;
  foreign_entry_fee: number | null;
  child_entry_fee: number | null;
  senior_entry_fee: number | null;
  entry_fee_notes: string | null;

  online_booking_required: boolean | null;
  advance_booking_required: boolean | null;

  average_visit_minutes: number | null;
  minimum_visit_minutes: number | null;

  best_time_of_day: string | null;

  photography_allowed: boolean | null;
  video_allowed: boolean | null;
  drone_allowed: boolean | null;

  dress_code: string | null;
  footwear_rules: string | null;

  wheelchair_accessibility: Suitability;
  stroller_accessibility: Suitability;

  parking_available: boolean | null;
  cloakroom_available: boolean | null;
  toilet_available: boolean | null;
  drinking_water_available: boolean | null;

  nearby_transport: string | null;
  official_website: string | null;
  map_url: string | null;
  categories: DestinationCategory[];
  /** Lesser-known places: shown in "Hidden places", excluded from default itineraries. */
  is_hidden_gem: boolean;

  status: ContentStatus;
}

// ------------------------------------------------------------------ history

export interface HistoricalPeriod {
  id: string;
  name: string;
  start_year: number; // negative = BCE
  end_year: number | null;
  description: string;
}


export interface HistoricalEvent extends Provenance {
  id: string;
  entity_id: string;
  title: string;
  period_id: string;
  approximate_date: string;
  date_precision: DatePrecision;
  description: string;
  historical_significance: string | null;
  location: string | null;
  people_involved: string[];
  dynasties_involved: string[];
  kingdoms_involved: string[];
  confidence: Confidence;
}

export interface Tradition extends Provenance {
  id: string;
  entity_id: string;
  title: string;
  tradition_type: string;
  short_story: string;
  full_story: string | null;
  associated_religion: string | null;
  associated_text: string | null;
  associated_community: string | null;
  historical_status: HistoricalStatus;
}

export interface DestinationDescription {
  id: string;
  destination_id: string;
  description_type: DescriptionType;
  title: string;
  content: string;
  language: string;
  source_id: string | null;
  generated_by: string;
  review_status: ReviewStatus;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------- transport

export interface TransportHub extends Provenance {
  id: string;
  destination_id: string;
  hub_type: HubType;
  name: string;
  code: string | null;
  latitude: number | null;
  longitude: number | null;
  distance_from_destination: number | null; // km
  typical_transfer_time: number | null; // minutes
  official_url: string | null;
}

export interface DestinationConnection extends Provenance {
  id: string;
  origin_destination_id: string;
  destination_destination_id: string;
  distance_km: number;
  road_time_minutes: number | null;
  rail_time_minutes: number | null;
  bus_time_minutes: number | null;
  air_time_minutes: number | null;
  walking_possible: boolean;
  direct_train_available: boolean | null;
  direct_bus_available: boolean | null;
  direct_flight_available: boolean | null;
  transport_modes: TransportMode[];
  typical_transport_cost_min: number | null;
  typical_transport_cost_max: number | null;
  connection_quality: ConnectionQuality;
  seasonal: boolean;
  seasonal_notes: string | null;
  confidence: Confidence;
}

// ----------------------------------------------------------------- circuits

export interface CircuitRecord {
  id: string;
  name: string;
  slug: string;
  description: string;
  circuit_type: CircuitType;
  region: Region | null;
  states_involved: string[]; // state ids
  minimum_days: number;
  recommended_days: number;
  maximum_days: number;
  theme: string;
  start_destination_id: string;
  end_destination_id: string;
  is_round_trip: boolean;
  season_start: number | null;
  season_end: number | null;
  difficulty: DifficultyLevel;
  status: ContentStatus;
  generated_by: "CURATED" | "ENGINE";
}

export interface CircuitDestination {
  circuit_id: string;
  destination_id: string;
  sequence_number: number;
  recommended_days: number;
  mandatory: boolean;
  optional: boolean;
}

// -------------------------------------------------------------- itineraries

export interface ItineraryRecord {
  id: string;
  slug: string;
  title: string;
  origin_destination_id: string | null;
  start_destination_id: string;
  end_destination_id: string;
  duration_days: number;
  duration_nights: number;
  traveller_type: TravellerType;
  budget_min: number | null;
  budget_max: number | null;
  theme: string;
  description: string;
  generated_by: string;
  version: number;
  status: ContentStatus;
  created_at: string;
  updated_at: string;
}

export interface ItineraryDay {
  id: string;
  itinerary_id: string;
  day_number: number;
  date_optional: string | null;
  destination_id: string;
  title: string;
  summary: string;
  morning_activity: string | null;
  afternoon_activity: string | null;
  evening_activity: string | null;
  breakfast_place: string | null;
  lunch_place: string | null;
  dinner_place: string | null;
  overnight_location: string | null;
  estimated_travel_minutes: number;
  estimated_walking_minutes: number | null;
  notes: string | null;
}

export interface ItineraryActivity {
  id: string;
  itinerary_day_id: string;
  attraction_id: string | null;
  label: string;
  start_time: string; // HH:MM
  end_time: string;
  duration_minutes: number;
  sequence_number: number;
  activity_type: string;
  transport_to_next: string | null;
  estimated_cost: number | null;
  mandatory: boolean;
  optional: boolean;
}

// ----------------------------------------------------------- costs & stay

export interface TravelCost extends Provenance {
  id: string;
  destination_id: string | null; // null = national default
  cost_type: CostType;
  item: string;
  unit: string;
  min_cost: number;
  typical_cost: number;
  max_cost: number;
  currency: "INR";
  season: string | null;
  traveller_type: TravellerType;
  budget_tier: BudgetTier | null;
  valid_from: string | null;
  valid_until: string | null;
  confidence: Confidence;
}

export interface AccommodationArea extends Provenance {
  id: string;
  destination_id: string;
  area_name: string;
  area_type: string;
  description: string;
  budget_range: BudgetTier | "MIXED";
  distance_to_center: string | null;
  distance_to_major_attractions: string | null;
  family_suitable: boolean | null;
  elderly_suitable: boolean | null;
  nightlife: boolean | null;
  quiet: boolean | null;
  shopping: boolean | null;
  food: boolean | null;
  transport_access: string | null;
  confidence: Confidence;
}

// ------------------------------------------------------- food, shopping etc.

export interface LocalFood extends Provenance {
  id: string;
  destination_id: string;
  name: string;
  local_name: string | null;
  food_type: FoodType;
  vegetarian: boolean | null;
  vegan_possible: boolean | null;
  jain_possible: boolean | null;
  halal_possible: boolean | null;
  description: string;
  history: string | null;
  cultural_significance: string | null;
  typical_price_min: number | null;
  typical_price_max: number | null;
  best_time: string | null;
  where_to_find: string[];
  confidence: Confidence;
}

export interface ShoppingItem extends Provenance {
  id: string;
  destination_id: string;
  item: string;
  category: string;
  description: string;
  famous_market: string | null;
  market_location: string | null;
  typical_price_range: string | null;
  bargaining_expected: boolean | null;
  bargaining_notes: string | null;
  authenticity_tips: string | null;
  opening_hours_text: string | null;
  confidence: Confidence;
}

export interface FestivalRecord extends Provenance {
  id: string;
  name: string;
  destination_id: string | null;
  state_id: string | null;
  festival_type: string;
  religion: string | null;
  month: string;
  start_date: string | null;
  end_date: string | null;
  date_type: FestivalDateType;
  description: string;
  tourism_significance: string | null;
  crowd_level: CrowdLevel;
  special_rules: string | null;
  confidence: Confidence;
}

export interface DestinationWeather extends Provenance {
  destination_id: string;
  month: number;
  avg_min_temperature: number;
  avg_max_temperature: number;
  rainfall: number; // mm
  rain_probability: number | null;
  humidity: number | null;
  weather_description: string;
  recommended_clothing: string | null;
  travel_notes: string | null;
  confidence: Confidence;
}

export interface PracticalInformation extends Provenance {
  id: string;
  destination_id: string;
  information_type: PracticalInfoType;
  title: string;
  content: string;
  severity: "INFO" | "CAUTION" | "WARNING";
  confidence: Confidence;
}

export interface EmergencyService extends Provenance {
  id: string;
  destination_id: string | null; // null = national
  scope: "NATIONAL" | "LOCAL";
  service_type: EmergencyServiceType;
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  latitude: number | null;
  longitude: number | null;
  open_24_hours: boolean | null;
  confidence: Confidence;
}

export interface ExperienceRecord extends Provenance {
  id: string;
  destination_id: string;
  name: string;
  experience_type: ExperienceType;
  description: string;
  duration_minutes: number | null;
  cost_min: number | null;
  cost_max: number | null;
  age_min: number | null;
  age_max: number | null;
  season_start: number | null;
  season_end: number | null;
  booking_required: boolean | null;
  difficulty: DifficultyLevel;
  safety_notes: string | null;
  confidence: Confidence;
}

export interface DestinationSuitability {
  destination_id: string;
  values: Record<SuitabilityAudience, Suitability>;
  confidence: Confidence;
  source_id: string | null;
  last_verified_at: string | null;
}

// -------------------------------------------- sources, facts, relationships

export interface SourceRecord {
  id: string;
  source_name: string;
  source_type: SourceType;
  url: string | null;
  publisher: string | null;
  organization: string | null;
  country: string;
  state: string | null;
  publication_date: string | null;
  accessed_at: string | null;
  reliability_class: ReliabilityClass;
  content_type: string | null;
  notes: string | null;
}

export interface FactRecord {
  id: string;
  entity_id: string;
  fact_type: string;
  fact_text: string;
  value: string | number | boolean | null;
  unit: string | null;
  source_id: string;
  /** The official source this fact should be verified against (drives the admin verification queue). */
  verify_against: string | null;
  source_quote_optional: string | null;
  confidence: Confidence;
  verified_by: string | null;
  verified_at: string | null;
  valid_from: string | null;
  valid_until: string | null;
  verification_frequency: VerificationFrequency;
  expires_at: string | null;
  status: ContentStatus;
}

export interface ConflictRecord {
  id: string;
  entity_id: string;
  fact_type: string;
  existing_fact_id: string;
  existing_value: string | number | boolean | null;
  existing_source_id: string;
  incoming_value: string | number | boolean | null;
  incoming_source_id: string;
  status: ConflictStatus;
  detected_at: string;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
}

export interface EntityRelationship {
  id: string;
  entity_a: string;
  entity_b: string;
  relationship_type: RelationshipType;
  distance_km: number | null;
  travel_time: number | null; // minutes
  priority: number;
  source_id: string | null;
}

// -------------------------------------------- translations, media, content

export interface TranslationRecord {
  id: string;
  entity_id: string;
  language_code: string;
  field_name: string;
  translated_text: string;
  translation_status: "MACHINE" | "HUMAN" | "REVIEWED" | "PENDING";
  translated_by: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MediaRecord {
  id: string;
  entity_id: string;
  media_type: MediaType;
  url: string; // "placeholder://label|WxH" until licensed media is uploaded
  thumbnail_url: string | null;
  caption: string | null;
  alt_text: string;
  copyright_status: "PLACEHOLDER" | "LICENSED" | "PUBLIC_DOMAIN" | "USER_UPLOADED" | "UNKNOWN";
  license: string | null;
  creator: string | null;
  source: string | null;
  credit_required: boolean;
  usage_allowed: boolean;
  verified_at: string | null;
  role: "HERO" | "GALLERY" | "WATERMARK";
}

export interface AiVisualPrompt {
  entity_id: string;
  hero_prompt: string;
  history_prompt: string;
  map_prompt: string;
  background_prompt: string;
  visual_style: string;
  negative_prompt: string;
  generated_image_id: string | null;
}

export interface GeneratedContent {
  id: string;
  entity_id: string;
  page_type: PageType;
  content_type: string;
  language: string;
  title: string;
  subtitle: string | null;
  content: string; // JSON-serialised GeneratedSection[]
  ai_model: string;
  prompt_version: string;
  source_data_version: string;
  generation_timestamp: string;
  fact_check_status: "PENDING" | "PASSED" | "FAILED" | "NEEDS_REVIEW";
  editor_status: ReviewStatus;
  published_status: ContentStatus;
  content_version: number;
}

export interface SeoMetadata {
  entity_id: string;
  meta_title: string;
  meta_description: string;
  canonical_url: string;
  slug: string;
  h1: string;
  keywords: string[];
  og_title: string;
  og_description: string;
  og_image: string | null;
  schema_type: string;
  robots: string;
  last_updated: string;
}

// ------------------------------------------------------------ the database

export interface MasterDatabase {
  states: StateRecord[];
  districts: DistrictRecord[];
  destinations: DestinationRecord[];
  destination_categories: DestinationCategoryLink[];
  attractions: AttractionRecord[];
  historical_periods: HistoricalPeriod[];
  historical_events: HistoricalEvent[];
  traditions: Tradition[];
  destination_descriptions: DestinationDescription[];
  transport_hubs: TransportHub[];
  destination_connections: DestinationConnection[];
  circuits: CircuitRecord[];
  circuit_destinations: CircuitDestination[];
  itineraries: ItineraryRecord[];
  itinerary_days: ItineraryDay[];
  itinerary_activities: ItineraryActivity[];
  travel_costs: TravelCost[];
  accommodation_areas: AccommodationArea[];
  local_foods: LocalFood[];
  shopping: ShoppingItem[];
  festivals: FestivalRecord[];
  destination_weather: DestinationWeather[];
  practical_information: PracticalInformation[];
  emergency_services: EmergencyService[];
  experiences: ExperienceRecord[];
  destination_suitability: DestinationSuitability[];
  sources: SourceRecord[];
  facts: FactRecord[];
  conflict_records: ConflictRecord[];
  entity_relationships: EntityRelationship[];
  translations: TranslationRecord[];
  media: MediaRecord[];
  ai_visual_prompts: AiVisualPrompt[];
  generated_content: GeneratedContent[];
  seo_metadata: SeoMetadata[];
}

export const emptyDatabase = (): MasterDatabase => ({
  states: [], districts: [], destinations: [], destination_categories: [], attractions: [],
  historical_periods: [], historical_events: [], traditions: [], destination_descriptions: [],
  transport_hubs: [], destination_connections: [], circuits: [], circuit_destinations: [],
  itineraries: [], itinerary_days: [], itinerary_activities: [], travel_costs: [],
  accommodation_areas: [], local_foods: [], shopping: [], festivals: [], destination_weather: [],
  practical_information: [], emergency_services: [], experiences: [], destination_suitability: [],
  sources: [], facts: [], conflict_records: [], entity_relationships: [], translations: [],
  media: [], ai_visual_prompts: [], generated_content: [], seo_metadata: []
});
