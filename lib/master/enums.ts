/**
 * Controlled vocabularies for the master India tourism database.
 * Each list is declared as a const tuple so the same values drive the
 * TypeScript types, runtime validation, the admin UI and the Prisma enums
 * (prisma/schema.prisma mirrors these lists — keep them in sync).
 */

export const ENTITY_TYPES = [
  "STATE", "UNION_TERRITORY", "REGION", "DISTRICT", "DESTINATION", "LOCALITY",
  "ATTRACTION", "MONUMENT", "TEMPLE", "MOSQUE", "CHURCH", "GURDWARA", "MONASTERY",
  "MUSEUM", "PALACE", "FORT", "ARCHAEOLOGICAL_SITE", "NATIONAL_PARK",
  "WILDLIFE_SANCTUARY", "TIGER_RESERVE", "BIRD_SANCTUARY", "BEACH", "HILL_STATION",
  "LAKE", "RIVER", "WATERFALL", "CAVE", "ISLAND", "FOREST", "TREK", "VIEWPOINT",
  "MARKET", "FOOD_DESTINATION", "FESTIVAL", "EVENT", "EXPERIENCE",
  "ADVENTURE_ACTIVITY", "HANDICRAFT", "CIRCUIT", "ITINERARY", "TRANSPORT_HUB"
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

/** Section 35 — confidence in a stored fact. */
export const CONFIDENCE_LEVELS = [
  "VERIFIED", "PROVISIONALLY_VERIFIED", "MULTIPLE_SOURCES", "SINGLE_SOURCE",
  "UNVERIFIED", "CONFLICTING", "OUTDATED"
] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

/** Section 51 (+ READY, the trigger status from section 47). */
export const CONTENT_STATUSES = [
  "DRAFT", "DATA_COLLECTION", "VERIFYING", "VERIFIED", "READY", "AI_GENERATED",
  "FACT_CHECKED", "EDITOR_REVIEW", "PUBLISHED", "OUTDATED", "ARCHIVED"
] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export const SOURCE_TYPES = [
  "GOVERNMENT", "STATE_TOURISM", "ASI", "UNESCO", "OFFICIAL_SITE", "MUNICIPAL",
  "TRANSPORT_OPERATOR", "WEATHER_PROVIDER", "MAP_PROVIDER", "ACADEMIC", "NEWS",
  "TRAVEL_GUIDE", "USER_SUBMITTED", "AI_GENERATED"
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

/** A = official/authoritative, B = institutional/operator, C = secondary, D = unverified / AI-drafted. */
export const RELIABILITY_CLASSES = ["A", "B", "C", "D"] as const;
export type ReliabilityClass = (typeof RELIABILITY_CLASSES)[number];

export const STATE_TYPES = ["STATE", "UNION_TERRITORY"] as const;
export type StateType = (typeof STATE_TYPES)[number];

/** Section 57 — engineering classification, never a public rating. */
export const DESTINATION_LEVELS = ["A", "B", "C"] as const;
export type DestinationLevel = (typeof DESTINATION_LEVELS)[number];

export const DESTINATION_CATEGORIES = [
  "HERITAGE", "HISTORY", "SPIRITUAL", "PILGRIMAGE", "NATURE", "WILDLIFE", "BEACH",
  "MOUNTAIN", "HILL_STATION", "ADVENTURE", "CULTURAL", "FOOD", "SHOPPING",
  "ARCHITECTURE", "ART", "MUSEUM", "RURAL", "TRIBAL", "WELLNESS", "NIGHTLIFE",
  "FAMILY", "ROMANTIC", "BACKPACKING", "ECO_TOURISM"
] as const;
export type DestinationCategory = (typeof DESTINATION_CATEGORIES)[number];

export const HISTORICAL_STATUSES = [
  "HISTORICALLY_DOCUMENTED", "TRADITIONAL_ACCOUNT", "RELIGIOUS_TRADITION", "LEGEND",
  "LOCAL_FOLKLORE", "DISPUTED", "UNCERTAIN"
] as const;
export type HistoricalStatus = (typeof HISTORICAL_STATUSES)[number];

export const SUITABILITY_VALUES = ["YES", "POSSIBLE", "LIMITED", "NO", "UNKNOWN"] as const;
export type Suitability = (typeof SUITABILITY_VALUES)[number];

export const SUITABILITY_AUDIENCES = [
  "solo", "couple", "family", "children", "elderly", "wheelchair", "backpacking",
  "luxury", "budget", "pilgrimage", "business"
] as const;
export type SuitabilityAudience = (typeof SUITABILITY_AUDIENCES)[number];

/** Spec list, plus GEOGRAPHY/RELIGION overviews used by the destination page template. */
export const DESCRIPTION_TYPES = [
  "CURRENT_OVERVIEW", "HISTORICAL_OVERVIEW", "TRAVEL_OVERVIEW", "FAMILY_OVERVIEW",
  "FOOD_OVERVIEW", "CULTURAL_OVERVIEW", "GEOGRAPHY_OVERVIEW", "RELIGION_OVERVIEW"
] as const;
export type DescriptionType = (typeof DESCRIPTION_TYPES)[number];

export const HUB_TYPES = ["AIRPORT", "RAILWAY", "BUS_TERMINAL", "METRO", "PORT", "HELIPAD"] as const;
export type HubType = (typeof HUB_TYPES)[number];

export const TRANSPORT_MODES = ["ROAD", "RAIL", "BUS", "AIR", "WALK", "FERRY"] as const;
export type TransportMode = (typeof TRANSPORT_MODES)[number];

export const CONNECTION_QUALITIES = ["EXCELLENT", "GOOD", "FAIR", "POOR", "UNKNOWN"] as const;
export type ConnectionQuality = (typeof CONNECTION_QUALITIES)[number];

export const CIRCUIT_TYPES = [
  "REGIONAL", "STATE", "INTER_STATE", "RELIGIOUS", "HERITAGE", "BUDDHIST", "RAMAYANA",
  "SHIVA", "KRISHNA", "SIKH", "WILDLIFE", "BEACH", "HIMALAYAN", "DESERT", "FOOD",
  "CULTURAL", "ARCHAEOLOGICAL", "ADVENTURE", "FAMILY"
] as const;
export type CircuitType = (typeof CIRCUIT_TYPES)[number];

export const COST_TYPES = [
  "HOTEL", "FOOD", "TRANSPORT", "ENTRY_FEE", "LOCAL_TRANSPORT", "SHOPPING",
  "ACTIVITY", "PARKING", "PERMIT", "GUIDE", "MISCELLANEOUS"
] as const;
export type CostType = (typeof COST_TYPES)[number];

export const TRAVELLER_TYPES = ["SOLO", "COUPLE", "FAMILY", "ELDERLY", "GROUP", "ANY"] as const;
export type TravellerType = (typeof TRAVELLER_TYPES)[number];

export const BUDGET_TIERS = ["BUDGET", "MID_RANGE", "PREMIUM"] as const;
export type BudgetTier = (typeof BUDGET_TIERS)[number];

export const FOOD_TYPES = [
  "BREAKFAST", "LUNCH", "DINNER", "STREET_FOOD", "SWEET", "SNACK", "DRINK", "SPECIALTY"
] as const;
export type FoodType = (typeof FOOD_TYPES)[number];

export const FESTIVAL_DATE_TYPES = ["FIXED", "ANNUAL_LUNAR", "VARIABLE", "TENTATIVE"] as const;
export type FestivalDateType = (typeof FESTIVAL_DATE_TYPES)[number];

export const PRACTICAL_INFO_TYPES = [
  "SAFETY", "LOCAL_RULE", "RELIGIOUS_ETIQUETTE", "DRESS_CODE", "SCAM_WARNING",
  "ROAD_WARNING", "WEATHER_WARNING", "PERMIT", "PHOTOGRAPHY_RULE", "DRONE_RULE",
  "HEALTH_FACILITY", "EMERGENCY", "LOCAL_CUSTOM"
] as const;
export type PracticalInfoType = (typeof PRACTICAL_INFO_TYPES)[number];

/** Spec list + the national helplines the site must distinguish from local services. */
export const EMERGENCY_SERVICE_TYPES = [
  "POLICE", "HOSPITAL", "AMBULANCE", "FIRE", "TOURIST_POLICE", "PHARMACY",
  "UNIFIED_EMERGENCY", "WOMEN_HELPLINE", "TOURIST_HELPLINE", "RAILWAY_HELPLINE",
  "DISASTER_MANAGEMENT"
] as const;
export type EmergencyServiceType = (typeof EMERGENCY_SERVICE_TYPES)[number];

export const EXPERIENCE_TYPES = [
  "SIGHTSEEING", "TREKKING", "RAFTING", "BOATING", "SCUBA", "SNORKELLING",
  "WILDLIFE_SAFARI", "CULTURAL", "COOKING", "SHOPPING", "FOOD", "SPIRITUAL", "YOGA",
  "MEDITATION", "CAMPING", "PHOTOGRAPHY"
] as const;
export type ExperienceType = (typeof EXPERIENCE_TYPES)[number];

export const RELATIONSHIP_TYPES = [
  "NEARBY", "COMBINE_WITH", "ALTERNATIVE_TO", "PART_OF_CIRCUIT", "HISTORICALLY_CONNECTED",
  "RELIGIOUSLY_CONNECTED", "TRANSPORT_CONNECTED", "SAME_REGION", "SAME_STATE", "SAME_THEME"
] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export const MEDIA_TYPES = ["PHOTO", "VIDEO", "MAP", "PANORAMA_360", "AUDIO", "ILLUSTRATION", "ICON"] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

/** Section 37 (the spec's "DISTINATION_PAGE" is a typo — corrected here). */
export const PAGE_TYPES = [
  "STATE_PAGE", "DESTINATION_PAGE", "ATTRACTION_PAGE", "HISTORY_PAGE", "CIRCUIT_PAGE",
  "ITINERARY_PAGE", "FESTIVAL_PAGE", "NATIONAL_PARK_PAGE", "FOOD_PAGE", "SHOPPING_PAGE",
  "TRAVEL_GUIDE_PAGE"
] as const;
export type PageType = (typeof PAGE_TYPES)[number];

export const CROWD_LEVELS = ["LOW", "MODERATE", "HIGH", "VERY_HIGH", "UNKNOWN"] as const;
export type CrowdLevel = (typeof CROWD_LEVELS)[number];

export const DIFFICULTY_LEVELS = ["EASY", "MODERATE", "CHALLENGING", "UNKNOWN"] as const;
export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

export const REVIEW_STATUSES = ["PENDING", "APPROVED", "REJECTED", "NEEDS_CHANGES"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

/** Section 52 — how often a kind of record must be re-verified. */
export const VERIFICATION_FREQUENCIES = [
  "DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "ANNUAL", "BIENNIAL", "DECENNIAL"
] as const;
export type VerificationFrequency = (typeof VERIFICATION_FREQUENCIES)[number];

export const VERIFICATION_INTERVAL_DAYS: Record<VerificationFrequency, number> = {
  DAILY: 1,
  WEEKLY: 7,
  MONTHLY: 30,
  QUARTERLY: 91,
  ANNUAL: 365,
  BIENNIAL: 730,
  DECENNIAL: 3650
};

export const CONFLICT_STATUSES = ["OPEN", "RESOLVED", "DISMISSED"] as const;
export type ConflictStatus = (typeof CONFLICT_STATUSES)[number];

/** Translation locales: spec initial set, plus the "later" set. */
export const TRANSLATION_LANGUAGES = ["en", "hi", "bn", "mr", "ta", "te", "kn", "ml"] as const;
export const LATER_TRANSLATION_LANGUAGES = ["gu", "pa", "or", "as", "ur"] as const;

export const REGIONS = ["North", "East", "West", "Central", "Northeast", "South"] as const;
export type Region = (typeof REGIONS)[number];

export const DATE_PRECISIONS = ["EXACT", "YEAR", "DECADE", "CENTURY", "APPROXIMATE"] as const;
export type DatePrecision = (typeof DATE_PRECISIONS)[number];

export const SERVICE_SCOPES = ["NATIONAL", "LOCAL"] as const;
export type ServiceScope = (typeof SERVICE_SCOPES)[number];
