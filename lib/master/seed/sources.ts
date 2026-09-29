import type { SourceRecord } from "../types";

/** IDs referenced from seed data. Real institutions are listed as *places to verify against*; nothing below is claimed as verified. */
export const SRC = {
  MOT: "SRC-MOT",
  INCREDIBLE_INDIA: "SRC-INCREDIBLE-INDIA",
  ASI: "SRC-ASI",
  UNESCO: "SRC-UNESCO-WHC",
  UP_TOURISM: "SRC-ST-UP",
  KASHI_TRUST: "SRC-KASHI-VISHWANATH-TRUST",
  IRCTC: "SRC-IRCTC",
  AAI: "SRC-AAI",
  OSM: "SRC-OSM",
  OPENWEATHER: "SRC-OPENWEATHER",
  IMD: "SRC-IMD",
  /** AI-assisted editorial draft: what the seed dataset was written from. Never treated as verified. */
  EDITORIAL_AI: "SRC-BT-EDITORIAL-AI",
  /** Values computed by the engine (e.g. road time from distance). */
  DERIVED: "SRC-BT-DERIVED"
} as const;

const BASE = { country: "India", publication_date: null, accessed_at: null } as const;

export const SOURCES: SourceRecord[] = [
  {
    ...BASE, id: SRC.MOT, source_name: "Ministry of Tourism, Government of India", source_type: "GOVERNMENT",
    url: "https://tourism.gov.in", publisher: "Ministry of Tourism", organization: "Government of India",
    state: null, reliability_class: "A", content_type: "statistics, policy, destination directory",
    notes: "Tourism statistics and national context."
  },
  {
    ...BASE, id: SRC.INCREDIBLE_INDIA, source_name: "Incredible India", source_type: "GOVERNMENT",
    url: "https://www.incredibleindia.gov.in", publisher: "Ministry of Tourism", organization: "Government of India",
    state: null, reliability_class: "A", content_type: "destinations, attractions, experiences, itineraries",
    notes: "State/UT destination groupings (North, East, West, Central, Northeast, South) used as the seed taxonomy."
  },
  {
    ...BASE, id: SRC.ASI, source_name: "Archaeological Survey of India", source_type: "ASI",
    url: "https://asi.nic.in", publisher: "Archaeological Survey of India", organization: "Ministry of Culture",
    state: null, reliability_class: "A", content_type: "protected monuments, ticketing, timings",
    notes: "Authoritative for centrally protected monuments."
  },
  {
    ...BASE, id: SRC.UNESCO, source_name: "UNESCO World Heritage Centre", source_type: "UNESCO",
    url: "https://whc.unesco.org/en/statesparties/in", publisher: "UNESCO", organization: "UNESCO",
    state: null, reliability_class: "A", content_type: "World Heritage inscriptions", notes: null
  },
  {
    ...BASE, id: SRC.UP_TOURISM, source_name: "Uttar Pradesh Tourism", source_type: "STATE_TOURISM",
    url: "https://uptourism.gov.in", publisher: "Department of Tourism, Government of Uttar Pradesh",
    organization: "Government of Uttar Pradesh", state: "Uttar Pradesh", reliability_class: "A",
    content_type: "destinations, events", notes: null
  },
  {
    ...BASE, id: SRC.KASHI_TRUST, source_name: "Shri Kashi Vishwanath Temple Trust", source_type: "OFFICIAL_SITE",
    url: "https://shrikashivishwanath.org", publisher: "Shri Kashi Vishwanath Temple Trust", organization: null,
    state: "Uttar Pradesh", reliability_class: "A", content_type: "temple timings, darshan, aarti", notes: null
  },
  {
    ...BASE, id: SRC.IRCTC, source_name: "IRCTC / Indian Railways", source_type: "TRANSPORT_OPERATOR",
    url: "https://www.irctc.co.in", publisher: "Indian Railway Catering and Tourism Corporation",
    organization: "Ministry of Railways", state: null, reliability_class: "A", content_type: "train schedules, fares",
    notes: "Short verification interval — schedules change."
  },
  {
    ...BASE, id: SRC.AAI, source_name: "Airports Authority of India", source_type: "TRANSPORT_OPERATOR",
    url: "https://www.aai.aero", publisher: "Airports Authority of India", organization: "Ministry of Civil Aviation",
    state: null, reliability_class: "A", content_type: "airport information", notes: null
  },
  {
    ...BASE, id: SRC.IMD, source_name: "India Meteorological Department", source_type: "GOVERNMENT",
    url: "https://mausam.imd.gov.in", publisher: "India Meteorological Department", organization: "Ministry of Earth Sciences",
    state: null, reliability_class: "A", content_type: "climatology", notes: "Reference for monthly climate normals."
  },
  {
    ...BASE, id: SRC.OPENWEATHER, source_name: "OpenWeather", source_type: "WEATHER_PROVIDER",
    url: "https://openweathermap.org", publisher: "OpenWeather", organization: null, state: null,
    reliability_class: "B", content_type: "live weather / forecast", notes: "Live trip-date weather is fetched, not stored."
  },
  {
    ...BASE, id: SRC.OSM, source_name: "OpenStreetMap contributors", source_type: "MAP_PROVIDER",
    url: "https://www.openstreetmap.org", publisher: "OpenStreetMap Foundation", organization: null, state: null,
    reliability_class: "B", content_type: "map data", notes: "ODbL licence — attribution required."
  },
  {
    ...BASE, id: SRC.EDITORIAL_AI, source_name: "budgettourism AI-assisted editorial draft", source_type: "AI_GENERATED",
    url: null, publisher: "budgettourism", organization: null, state: null, reliability_class: "D",
    content_type: "seed content", notes: "Seed content drafted with AI assistance from general knowledge. Every record citing this source is UNVERIFIED until checked against its `verify_against` source."
  },
  {
    ...BASE, id: SRC.DERIVED, source_name: "budgettourism derived estimate", source_type: "AI_GENERATED",
    url: null, publisher: "budgettourism", organization: null, state: null, reliability_class: "D",
    content_type: "computed values", notes: "Computed by the engine from other records (e.g. road time from distance). Not an observation."
  }
];

export const stateTourismSourceId = (stateCode: string) => `SRC-ST-${stateCode}`;

/** State tourism department placeholders (no URL until an admin confirms the official site). */
export function stateTourismSource(stateCode: string, stateName: string): SourceRecord {
  return {
    ...BASE,
    id: stateTourismSourceId(stateCode),
    source_name: `${stateName} Tourism Department`,
    source_type: "STATE_TOURISM",
    url: null,
    publisher: `Department of Tourism, ${stateName}`,
    organization: `Government of ${stateName}`,
    state: stateName,
    reliability_class: "A",
    content_type: "destinations, events, permits",
    notes: "Official site URL to be confirmed by an admin."
  };
}
