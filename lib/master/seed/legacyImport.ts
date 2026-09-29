/**
 * Import pipeline for the original demo dataset: NORMALISE → ID → STRUCTURE → FACT STORAGE.
 * Free-text records (lib/data/destinations/*) are turned into master-database rows.
 * Everything imported here is UNVERIFIED and cites the AI editorial source — the
 * importer never upgrades confidence.
 */
import type { Destination as Legacy, ThingsToDoCategory } from "@/lib/types";
import type { DestinationCategory, EntityType, FestivalDateType, PracticalInfoType, FoodType } from "../enums";
import { attractionId, destinationId, districtId, mintCode, slugify, stateId } from "../ids";
import type {
  AttractionRecord, DestinationRecord, MasterDatabase, TransportHub
} from "../types";
import { DESTINATION_CODES } from "./codes";
import {
  haversineKm, parseDays, parseEntryFee, parseHours, parseKm, parseMonthRange,
  parseRupeeRange, parseVisitDuration
} from "./parsers";
import { SRC, stateTourismSourceId } from "./sources";
import { STATE_CODE_BY_NAME } from "./states";
import { SEED_DATE, addFact, addMedia } from "./builder";

const TAG_TO_CATEGORY: Record<string, DestinationCategory[]> = {
  spiritual: ["SPIRITUAL", "PILGRIMAGE"],
  heritage: ["HERITAGE"],
  historical: ["HISTORY"],
  riverside: ["NATURE"],
  family: ["FAMILY"],
  romantic: ["ROMANTIC"],
  beaches: ["BEACH"],
  adventure: ["ADVENTURE"],
  mountains: ["MOUNTAIN"],
  nature: ["NATURE"],
  "famous-food": ["FOOD"]
};

const ATTRACTION_CATEGORY: Record<ThingsToDoCategory, DestinationCategory | null> = {
  historical: "HISTORY",
  religious: "SPIRITUAL",
  adventure: "ADVENTURE",
  nature: "NATURE",
  family: "FAMILY",
  photography: null,
  nightlife: "NIGHTLIFE",
  culture: "CULTURAL",
  shopping: "SHOPPING",
  food: "FOOD",
  museums: "MUSEUM",
  entertainment: "CULTURAL"
};

const SCORE_GROUPS: Record<string, DestinationCategory[]> = {
  heritage_score: ["HERITAGE", "HISTORY", "ARCHITECTURE"],
  nature_score: ["NATURE", "ECO_TOURISM"],
  spiritual_score: ["SPIRITUAL", "PILGRIMAGE"],
  adventure_score: ["ADVENTURE"],
  food_score: ["FOOD"],
  family_score: ["FAMILY"],
  shopping_score: ["SHOPPING"],
  culture_score: ["CULTURAL", "ART", "MUSEUM"],
  wildlife_score: ["WILDLIFE"],
  beach_score: ["BEACH"],
  mountain_score: ["MOUNTAIN", "HILL_STATION"]
};

/** Classification attributes are heuristics from category membership (present → 80, absent → 10) — not measurements. */
function scoresFor(categories: Set<DestinationCategory>) {
  const out: Record<string, number> = {};
  for (const [key, group] of Object.entries(SCORE_GROUPS)) {
    out[key] = group.some((c) => categories.has(c)) ? 80 : 10;
  }
  return out as Record<keyof typeof SCORE_GROUPS, number>;
}

export function inferAttractionType(name: string, categories: ThingsToDoCategory[]): EntityType {
  const n = name.toLowerCase();
  if (/golden temple|harmandir|gurdwara/.test(n)) return "GURDWARA";
  if (/basilica|church|cathedral/.test(n)) return "CHURCH";
  if (/mosque|masjid|dargah/.test(n)) return "MOSQUE";
  if (/synagogue/.test(n)) return "MONUMENT";
  if (/temple|mandir|devi\b|kali\b|garhi|jhula/.test(n) && !/group of temples/.test(n)) return "TEMPLE";
  if (/monastery|gompa/.test(n)) return "MONASTERY";
  if (/museum|bhavan.*museum|kala bhavan/.test(n)) return "MUSEUM";
  if (/fort\b|garh\b|garhi\b/.test(n)) return "FORT";
  if (/palace|mahal|bhawan|haveli/.test(n)) return "PALACE";
  if (/beach/.test(n)) return "BEACH";
  if (/\blake\b|sagar\b/.test(n)) return "LAKE";
  if (/falls|waterfall/.test(n)) return "WATERFALL";
  if (/caves?\b/.test(n)) return "CAVE";
  if (/tiger hill|viewpoint|peak/.test(n)) return "VIEWPOINT";
  if (/bazaar|market|haat/.test(n)) return "MARKET";
  if (/railway|toy train/.test(n)) return "EXPERIENCE";
  if (/tomb|minar|gate|stupa|memorial|bridge|imambara|ruins/.test(n)) return "MONUMENT";
  if (/group of temples|western group|eastern group/.test(n)) return "ARCHAEOLOGICAL_SITE";
  if (categories.includes("museums")) return "MUSEUM";
  return "ATTRACTION";
}

/** Permanent attraction codes for landmark attractions; everything else is minted from the name once. */
const ATTRACTION_CODE_OVERRIDES: Record<string, string> = {
  "kashi-vishwanath-temple": "KVT",
  "dashashwamedh-ghat": "DSG",
  "assi-ghat": "ASG",
  "banaras-hindu-university": "BHU",
  "dhamek-stupa": "DHM",
  "sarnath-archaeological-museum": "SAM",
  "ramnagar-fort": "RNF",
  "taj-mahal": "TAJ",
  "agra-fort": "AGF",
  "fatehpur-sikri": "FTS",
  "red-fort": "RDF",
  "qutub-minar": "QTB",
  "humayun-s-tomb": "HMT",
  "india-gate": "IGT",
  "amber-fort": "AMF",
  "hawa-mahal": "HWM",
  "jantar-mantar": "JTM",
  "mehrangarh-fort": "MHG",
  "golden-temple-harmandir-sahib": "GTH",
  "jallianwala-bagh": "JLB",
  "meenakshi-amman-temple": "MAT",
  "charminar": "CHM",
  "golconda-fort": "GLK",
  "gateway-of-india": "GWI",
  "victoria-memorial": "VMK"
};

function firstSentence(text: string, max = 180): string {
  const s = text.split(/(?<=[.!?])\s/)[0] ?? text;
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

function classifyPractical(text: string, fallback: PracticalInfoType): PracticalInfoType {
  if (/photograph/i.test(text)) return "PHOTOGRAPHY_RULE";
  if (/touts?|scam|invest|fare|agree|overcharg/i.test(text)) return "SCAM_WARNING";
  if (/dress|modest|footwear|cover (up|your)|head and remove/i.test(text)) return /footwear|head/i.test(text) ? "RELIGIOUS_ETIQUETTE" : "DRESS_CODE";
  if (/permit/i.test(text)) return "PERMIT";
  if (/monsoon|rain|flood|waterlog|fog|landslide|snow/i.test(text)) return "WEATHER_WARNING";
  if (/road|ghat road|highway|ramparts|route/i.test(text)) return "ROAD_WARNING";
  return fallback;
}

function foodType(t: Legacy["localFoods"][number]["type"]): FoodType {
  return ({ dish: "SPECIALTY", "street-food": "STREET_FOOD", sweet: "SWEET", breakfast: "BREAKFAST", drink: "DRINK" } as const)[t];
}

function vegetarianGuess(name: string, desc: string): boolean | null {
  const text = `${name} ${desc}`.toLowerCase();
  if (/kebab|chicken|fish|lamb|mutton|meat|biryani|seafood|trout|rogan/.test(text)) return false;
  if (/chaat|kachori|sweet|lassi|dosa|idli|petha|paan|tea|coffee|halwa|pak|kulcha|thali|momo/.test(text)) return null;
  return null;
}

const LUNAR = /deepawali|shivratri|durga|dasara|dussehra|navami|deepotsav|teej|bonalu|thirukalyanam|karaga|mewar/i;
function festivalDateType(name: string): FestivalDateType {
  if (/baisakhi|republic day|cochin carnival/i.test(name)) return "FIXED";
  if (LUNAR.test(name)) return "ANNUAL_LUNAR";
  return "VARIABLE";
}

function stripParens(text: string): string {
  return text.replace(/\s*\([^)]*\)/g, "").split(",")[0].trim();
}

export interface ImportOptions {
  level?: "A" | "B";
  parentDestinationId?: string | null;
}

export function importLegacyDestination(db: MasterDatabase, legacy: Legacy, options: ImportOptions = {}): DestinationRecord {
  const stateCode = STATE_CODE_BY_NAME[legacy.state];
  if (!stateCode) throw new Error(`Unknown state "${legacy.state}" for ${legacy.slug}`);
  const codes = DESTINATION_CODES[legacy.slug];
  if (!codes) throw new Error(`No permanent destination code registered for "${legacy.slug}"`);

  const id = destinationId(stateCode, codes.code);
  const sid = stateId(stateCode);
  const state = db.states.find((s) => s.id === sid)!;

  // ---- district (only where the source names one)
  let district_id: string | null = null;
  if (legacy.district) {
    district_id = districtId(stateCode, codes.code);
    if (!db.districts.some((d) => d.id === district_id)) {
      db.districts.push({
        id: district_id, state_id: sid, name: legacy.district, official_name: null,
        latitude: null, longitude: null, headquarters: legacy.district, description: null,
        tourism_importance: null, official_source: null, source_url: null, verified_at: null,
        status: "DATA_COLLECTION", source_id: SRC.EDITORIAL_AI, last_verified_at: null
      });
    }
  }

  // ---- categories
  const entityType: EntityType = codes.entityType ?? "DESTINATION";
  const categories = new Set<DestinationCategory>();
  legacy.tags.forEach((t) => (TAG_TO_CATEGORY[t] ?? []).forEach((c) => categories.add(c)));
  if (entityType === "HILL_STATION") categories.add("HILL_STATION");
  legacy.attractions.forEach((a) =>
    a.categories.forEach((c) => {
      const mapped = ATTRACTION_CATEGORY[c];
      if (mapped) categories.add(mapped);
    })
  );

  const days = parseDays(legacy.idealDuration) ?? { min: 1, max: 2, rec: 2 };
  const months = parseMonthRange(legacy.bestTimeToVisit);
  const rupees = parseRupeeRange(legacy.approximateBudget);
  const mid = rupees ? (rupees[0] + rupees[1]) / 2 : null;
  const elevation = legacy.geography.match(/(?:at|around)\s+(?:around\s+|roughly\s+)?([\d,]+)\s*m\b/i);

  const scores = scoresFor(categories);
  const tags = new Set(legacy.tags);

  const dest: DestinationRecord = {
    id,
    state_id: sid,
    district_id,
    parent_destination_id: options.parentDestinationId ?? null,
    name: legacy.name,
    official_name: null,
    local_names: [],
    alternate_names: [],
    slug: legacy.slug,
    entity_type: entityType,
    destination_level: options.level ?? "A",
    latitude: legacy.latitude,
    longitude: legacy.longitude,
    elevation: elevation ? Number(elevation[1].replace(/,/g, "")) : null,
    region: state.region,
    sub_region: state.sub_region,
    short_description: legacy.shortDescription,
    one_line_description: legacy.tagline,
    destination_type: codes.destinationType ?? "Destination",
    heritage_score: scores.heritage_score,
    nature_score: scores.nature_score,
    spiritual_score: scores.spiritual_score,
    adventure_score: scores.adventure_score,
    food_score: scores.food_score,
    family_score: scores.family_score,
    shopping_score: scores.shopping_score,
    culture_score: scores.culture_score,
    wildlife_score: scores.wildlife_score,
    beach_score: scores.beach_score,
    mountain_score: scores.mountain_score,
    recommended_min_days: days.min,
    recommended_max_days: days.max,
    recommended_days: days.rec,
    best_month_start: months?.[0] ?? null,
    best_month_end: months?.[1] ?? null,
    budget_category: mid === null ? null : mid < 3000 ? "BUDGET" : mid < 5500 ? "MID_RANGE" : "PREMIUM",
    crowd_level: "UNKNOWN",
    difficulty_level: "UNKNOWN",
    family_suitable: tags.has("family") ? true : null,
    children_suitable: null,
    elderly_suitable: null,
    solo_suitable: null,
    couple_suitable: tags.has("romantic") ? true : null,
    accessible_travel_possible: null,
    nearest_airport: legacy.nearestAirport || null,
    nearest_railway_station: legacy.nearestRailwayStation || null,
    nearest_bus_station: legacy.transportation.majorBusStations[0] ?? null,
    primary_language: legacy.languages[0] ?? null,
    secondary_languages: legacy.languages.slice(1),
    mobile_connectivity: null,
    internet_availability: null,
    upi_availability: null,
    atm_availability: null,
    ancient_story_title: null,
    ancient_story_short: null,
    ancient_story_long: null,
    ancient_story_status: null,
    ancient_story_sources: [],
    popularity: legacy.popularity,
    best_time_text: legacy.bestTimeToVisit,
    ideal_duration_text: legacy.idealDuration,
    tagline: legacy.tagline,
    status: "DATA_COLLECTION",
    is_sample_data: legacy.isSampleData,
    created_at: SEED_DATE,
    updated_at: SEED_DATE,
    source_id: SRC.EDITORIAL_AI,
    last_verified_at: null
  };
  db.destinations.push(dest);

  [...categories].forEach((category) =>
    db.destination_categories.push({ destination_id: id, category, confidence: "UNVERIFIED", source_id: SRC.EDITORIAL_AI })
  );

  // ---- descriptions (history stays a description until structured events are collected)
  const descriptions: Array<[DestinationRecord["id"], "CURRENT_OVERVIEW" | "HISTORICAL_OVERVIEW" | "GEOGRAPHY_OVERVIEW" | "CULTURAL_OVERVIEW" | "RELIGION_OVERVIEW", string, string]> = [
    [id, "CURRENT_OVERVIEW", `${legacy.name} today`, legacy.introduction],
    [id, "HISTORICAL_OVERVIEW", `History of ${legacy.name}`, legacy.history],
    [id, "GEOGRAPHY_OVERVIEW", `Geography of ${legacy.name}`, legacy.geography],
    [id, "CULTURAL_OVERVIEW", `Culture of ${legacy.name}`, legacy.culture],
    [id, "RELIGION_OVERVIEW", `Religion in ${legacy.name}`, legacy.religion]
  ];
  descriptions.forEach(([destination_id, description_type, title, content]) =>
    db.destination_descriptions.push({
      id: `${destination_id}/desc/${description_type.toLowerCase()}`,
      destination_id, description_type, title, content, language: "en",
      source_id: SRC.EDITORIAL_AI, generated_by: "seed-import", review_status: "PENDING",
      created_at: SEED_DATE, updated_at: SEED_DATE
    })
  );

  // ---- top-level facts (traceable claims)
  addFact(db, { entity_id: id, fact_type: "best_time_to_visit", fact_text: `Best time to visit ${legacy.name}: ${legacy.bestTimeToVisit}`, value: legacy.bestTimeToVisit, verify_against: stateTourismSourceId(stateCode) });
  addFact(db, { entity_id: id, fact_type: "ideal_duration", fact_text: `Ideal duration: ${legacy.idealDuration}`, value: legacy.idealDuration, verify_against: stateTourismSourceId(stateCode) });
  addFact(db, { entity_id: id, fact_type: "cost.daily_budget_range", fact_text: `Approximate daily budget: ${legacy.approximateBudget}`, value: legacy.approximateBudget, verify_against: stateTourismSourceId(stateCode) });
  legacy.bestKnownFor.forEach((item) =>
    addFact(db, { entity_id: id, fact_type: "best_known_for", fact_text: `${legacy.name} is known for ${item}`, value: item, verify_against: stateTourismSourceId(stateCode) })
  );

  // ---- media
  addMedia(db, id, "HERO", `${legacy.name} skyline`, 1600, 900);
  legacy.watermarkImages.forEach((img) => addMedia(db, id, "WATERMARK", img.alt, 1600, 900));

  // ---- attractions
  const takenCodes = new Set(db.attractions.filter((a) => a.destination_id === id).map((a) => a.id.split("-").pop()!));
  legacy.attractions.forEach((a) => {
    const code = ATTRACTION_CODE_OVERRIDES[a.slug] ?? mintCode(a.name, takenCodes);
    takenCodes.add(code);
    const hours = parseHours(a.openingHours);
    const visit = parseVisitDuration(a.timeRequired);
    const fee = parseEntryFee(a.entryFee);
    const attrCategories = [...new Set(a.categories.map((c) => ATTRACTION_CATEGORY[c]).filter((c): c is DestinationCategory => Boolean(c)))];
    const attrId = attractionId(id, code);

    const record: AttractionRecord = {
      id: attrId, destination_id: id, name: a.name, official_name: null, alternate_names: [], local_name: null,
      slug: a.slug, attraction_type: inferAttractionType(a.name, a.categories),
      latitude: a.geo?.lat ?? null, longitude: a.geo?.lng ?? null,
      short_description: firstSentence(a.description), current_description: a.description,
      historical_importance: null, cultural_importance: null, religious_importance: null,
      opening_time: hours.opening_time, closing_time: hours.closing_time, weekly_closed_day: hours.weekly_closed_day,
      opening_hours_text: a.openingHours,
      entry_required: fee.required, entry_fee: fee.fee, foreign_entry_fee: null, child_entry_fee: null, senior_entry_fee: null,
      entry_fee_notes: a.entryFee,
      online_booking_required: null, advance_booking_required: null,
      average_visit_minutes: visit?.avg ?? null, minimum_visit_minutes: visit?.min ?? null,
      best_time_of_day: a.bestVisitingTime,
      photography_allowed: null, video_allowed: null, drone_allowed: null,
      dress_code: null, footwear_rules: null,
      wheelchair_accessibility: "UNKNOWN", stroller_accessibility: "UNKNOWN",
      parking_available: null, cloakroom_available: null, toilet_available: null, drinking_water_available: null,
      nearby_transport: null, official_website: a.officialWebsite ?? null, map_url: a.mapUrl ?? null,
      categories: attrCategories, is_hidden_gem: false, status: "DATA_COLLECTION",
      source_id: SRC.EDITORIAL_AI, last_verified_at: null
    };
    db.attractions.push(record);

    const verifyAgainst = a.officialWebsite?.includes("asi.nic.in") ? SRC.ASI : stateTourismSourceId(stateCode);
    addFact(db, { entity_id: attrId, fact_type: "attraction.opening_hours", fact_text: `${a.name} — reported opening hours: ${a.openingHours}`, value: a.openingHours, verify_against: verifyAgainst });
    addFact(db, { entity_id: attrId, fact_type: "attraction.entry_fee", fact_text: `${a.name} — reported entry fee: ${a.entryFee}`, value: a.entryFee, verify_against: verifyAgainst });
    if (/UNESCO World Heritage/i.test(a.description)) {
      addFact(db, { entity_id: attrId, fact_type: "unesco.world_heritage", fact_text: `${a.name} is described as a UNESCO World Heritage Site`, value: true, verify_against: SRC.UNESCO });
    }
    addMedia(db, attrId, "GALLERY", a.name);
  });

  // ---- hidden places → attractions flagged as hidden gems
  legacy.hiddenPlaces.forEach((text) => {
    const [rawName, ...rest] = text.split(/\s[—–-]\s/);
    const name = rawName.trim();
    const code = mintCode(name, takenCodes);
    takenCodes.add(code);
    db.attractions.push({
      id: attractionId(id, code), destination_id: id, name, official_name: null, alternate_names: [], local_name: null,
      slug: slugify(name), attraction_type: inferAttractionType(name, []), latitude: null, longitude: null,
      short_description: rest.join(" — ") || name, current_description: text,
      historical_importance: null, cultural_importance: null, religious_importance: null,
      opening_time: null, closing_time: null, weekly_closed_day: null, opening_hours_text: null,
      entry_required: null, entry_fee: null, foreign_entry_fee: null, child_entry_fee: null, senior_entry_fee: null, entry_fee_notes: null,
      online_booking_required: null, advance_booking_required: null, average_visit_minutes: null, minimum_visit_minutes: null,
      best_time_of_day: null, photography_allowed: null, video_allowed: null, drone_allowed: null, dress_code: null, footwear_rules: null,
      wheelchair_accessibility: "UNKNOWN", stroller_accessibility: "UNKNOWN",
      parking_available: null, cloakroom_available: null, toilet_available: null, drinking_water_available: null,
      nearby_transport: null, official_website: null, map_url: null, categories: [], is_hidden_gem: true,
      status: "DATA_COLLECTION", source_id: SRC.EDITORIAL_AI, last_verified_at: null
    });
  });

  // ---- transport hubs
  const t = legacy.transportation;
  const hubs: TransportHub[] = [];
  const hubBase = { source_id: SRC.EDITORIAL_AI, last_verified_at: null, latitude: null, longitude: null, official_url: null, typical_transfer_time: null };
  (legacy.nearestAirport ? legacy.nearestAirport.split(/\s\/\s/) : []).forEach((part, i) => {
    hubs.push({
      ...hubBase, id: `${id}/hub/airport-${i + 1}`, destination_id: id, hub_type: "AIRPORT", name: stripParens(part),
      code: part.match(/\(([A-Z]{3})\)/)?.[1] ?? (i === 0 ? codes.airport?.code ?? null : null),
      distance_from_destination: parseKm(part)
    });
  });
  if (legacy.nearestRailwayStation) {
    hubs.push({
      ...hubBase, id: `${id}/hub/railway-1`, destination_id: id, hub_type: "RAILWAY",
      name: stripParens(legacy.nearestRailwayStation.split(/\s\/\s/)[0]), code: codes.railway?.code ?? null,
      distance_from_destination: parseKm(legacy.nearestRailwayStation)
    });
  }
  t.majorBusStations.forEach((name, i) =>
    hubs.push({ ...hubBase, id: `${id}/hub/bus-${i + 1}`, destination_id: id, hub_type: "BUS_TERMINAL", name, code: null, distance_from_destination: null })
  );
  db.transport_hubs.push(...hubs);

  // ---- transport notes stored as traceable facts
  const transportFacts: Array<[string, string, string | undefined]> = [
    ["transport.road_connectivity", "Road connectivity", t.roadConnectivity],
    ["transport.taxi", "Taxi", t.taxiInfo],
    ["transport.metro", "Metro", t.metroInfo],
    ["transport.local", "Local transport", t.localTransport.join(", ")],
    ["transport.auto_rickshaw", "Auto-rickshaw", t.autoRickshaw],
    ["transport.rental", "Rental vehicles", t.rentalVehicles],
    ["transport.from_delhi", "How to reach from Delhi", t.fromDelhi]
  ];
  transportFacts.forEach(([type, label, text]) => {
    if (text) addFact(db, { entity_id: id, fact_type: type, fact_text: `${label}: ${text}`, value: text, verify_against: SRC.IRCTC });
  });

  // ---- local food
  legacy.localFoods.forEach((f) =>
    db.local_foods.push({
      id: `${id}/food/${slugify(f.name)}`, destination_id: id, name: f.name, local_name: null, food_type: foodType(f.type),
      vegetarian: vegetarianGuess(f.name, f.description), vegan_possible: null, jain_possible: null, halal_possible: null,
      description: f.description, history: null, cultural_significance: null, typical_price_min: null, typical_price_max: null,
      best_time: null, where_to_find: f.whereToTry ?? [], confidence: "UNVERIFIED", source_id: SRC.EDITORIAL_AI, last_verified_at: null
    })
  );

  // ---- shopping (one row per famous product)
  legacy.markets.forEach((m) =>
    m.famousProducts.forEach((product) =>
      db.shopping.push({
        id: `${id}/shop/${slugify(m.name)}/${slugify(product)}`, destination_id: id, item: product,
        category: m.whatToBuy[0] ?? "Local specialties", description: `${product} — available at ${m.name} (${m.location}).`,
        famous_market: m.name, market_location: m.location, typical_price_range: m.typicalPriceRange,
        bargaining_expected: /bargain/i.test(m.bargainingInfo) && !/no bargain/i.test(m.bargainingInfo) ? true : null,
        bargaining_notes: m.bargainingInfo, authenticity_tips: null, opening_hours_text: m.openingHours,
        confidence: "UNVERIFIED", source_id: SRC.EDITORIAL_AI, last_verified_at: null
      })
    )
  );

  // ---- festivals
  legacy.festivals.forEach((f) =>
    db.festivals.push({
      id: `${id}/festival/${slugify(f.name)}`, name: f.name, destination_id: id, state_id: sid, festival_type: "Cultural / religious",
      religion: LUNAR.test(f.name) ? "Hindu" : /baisakhi/i.test(f.name) ? "Sikh" : null, month: f.month,
      start_date: null, end_date: null, date_type: festivalDateType(f.name), description: f.description,
      tourism_significance: null, crowd_level: "UNKNOWN", special_rules: null, confidence: "UNVERIFIED",
      source_id: SRC.EDITORIAL_AI, last_verified_at: null
    })
  );

  // ---- local (non-national) emergency contacts; national numbers live once, at national level
  legacy.emergencyContacts
    .filter((e) => e.scope === "local")
    .forEach((e, i) =>
      db.emergency_services.push({
        id: `${id}/emergency/local-${i + 1}`, destination_id: id, scope: "LOCAL",
        service_type: /tourist police/i.test(e.label) ? "TOURIST_POLICE" : /disaster/i.test(e.label) ? "DISASTER_MANAGEMENT" : "POLICE",
        name: e.label, address: null, phone: /^[\d\s\-+/]+$/.test(e.number) ? e.number : null, website: null,
        latitude: null, longitude: null, open_24_hours: null, confidence: "UNVERIFIED", source_id: SRC.EDITORIAL_AI, last_verified_at: null
      })
    );

  // ---- practical information
  const practical: Array<[string, PracticalInfoType]> = [
    ...legacy.localCustoms.map((c) => [c, classifyPractical(c, "LOCAL_CUSTOM")] as [string, PracticalInfoType]),
    ...legacy.safety.map((s) => [s, classifyPractical(s, "SAFETY")] as [string, PracticalInfoType])
  ];
  practical.forEach(([content, information_type], i) =>
    db.practical_information.push({
      id: `${id}/practical/${i + 1}`, destination_id: id, information_type, title: firstSentence(content, 70), content,
      severity: information_type === "SCAM_WARNING" || information_type === "WEATHER_WARNING" || information_type === "ROAD_WARNING" ? "CAUTION" : "INFO",
      confidence: "UNVERIFIED", source_id: SRC.EDITORIAL_AI, last_verified_at: null
    })
  );

  // ---- suitability: only what the category tags support; everything else stays UNKNOWN
  db.destination_suitability.push({
    destination_id: id,
    values: {
      solo: "UNKNOWN", couple: tags.has("romantic") ? "YES" : "UNKNOWN", family: tags.has("family") ? "YES" : "UNKNOWN",
      children: "UNKNOWN", elderly: "UNKNOWN", wheelchair: "UNKNOWN", backpacking: "UNKNOWN", luxury: "UNKNOWN",
      budget: "UNKNOWN", pilgrimage: tags.has("spiritual") ? "YES" : "UNKNOWN", business: "UNKNOWN"
    },
    confidence: "UNVERIFIED", source_id: SRC.EDITORIAL_AI, last_verified_at: null
  });

  return dest;
}

/** Straight-line distance helper reused by the connection seeding. */
export function destinationDistanceKm(a: DestinationRecord, b: DestinationRecord): number {
  return haversineKm(a.latitude, a.longitude, b.latitude, b.longitude);
}
