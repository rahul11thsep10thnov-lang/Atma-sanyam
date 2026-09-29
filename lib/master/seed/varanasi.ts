/**
 * Varanasi is the fully-developed reference destination. The generic importer
 * gives it the same baseline as every other city; this module adds the
 * structured layers the spec asks for — history as dated events, traditions
 * kept separate from documented history, accommodation areas, experiences and
 * monthly climate — and creates its two Level-B destinations (Sarnath, Ramnagar).
 *
 * Everything here is UNVERIFIED seed content citing the AI editorial source;
 * each record is queued for human verification (see the admin "Pending Verification" view).
 */
import type { Destination as Legacy } from "@/lib/types";
import { placeholderImage } from "@/lib/data/placeholder";
import type { HistoricalEvent, HistoricalPeriod, MasterDatabase, Tradition } from "../types";
import { SEED_DATE, addFact } from "./builder";
import { importLegacyDestination } from "./legacyImport";
import { SRC } from "./sources";

export const HISTORICAL_PERIODS: HistoricalPeriod[] = [
  { id: "PERIOD-ANCIENT", name: "Ancient", start_year: -3000, end_year: 600, description: "Vedic, Mauryan and Gupta eras." },
  { id: "PERIOD-EARLY-MEDIEVAL", name: "Early Medieval", start_year: 600, end_year: 1200, description: "Regional dynasties before the Delhi Sultanate." },
  { id: "PERIOD-MEDIEVAL", name: "Medieval", start_year: 1200, end_year: 1526, description: "Delhi Sultanate and regional kingdoms." },
  { id: "PERIOD-MUGHAL", name: "Mughal", start_year: 1526, end_year: 1857, description: "Mughal Empire and successor states." },
  { id: "PERIOD-COLONIAL", name: "Colonial", start_year: 1757, end_year: 1947, description: "East India Company and British Crown rule." },
  { id: "PERIOD-FREEDOM-MOVEMENT", name: "Freedom Movement", start_year: 1857, end_year: 1947, description: "The struggle for independence." },
  { id: "PERIOD-POST-INDEPENDENCE", name: "Post-Independence", start_year: 1947, end_year: 2000, description: "The Republic of India, 1947–2000." },
  { id: "PERIOD-MODERN", name: "Modern", start_year: 2000, end_year: null, description: "21st century." }
];

const B_DESTINATIONS: Array<{ legacy: Legacy; parentSlug: string }> = [];

function minimalLegacy(partial: Partial<Legacy> & Pick<Legacy, "slug" | "name" | "state" | "stateSlug" | "latitude" | "longitude">): Legacy {
  return {
    id: `legacy-${partial.slug}`,
    tagline: "",
    shortDescription: "",
    heroImage: placeholderImage(`${partial.name}`, 1600, 900),
    bestTimeToVisit: "",
    popularity: 60,
    tags: [],
    introduction: "",
    history: "",
    geography: "",
    culture: "",
    religion: "",
    idealDuration: "Half a day",
    approximateBudget: "",
    nearestAirport: "",
    nearestRailwayStation: "",
    bestKnownFor: [],
    languages: ["Hindi"],
    currency: "Indian Rupee (₹)",
    timeZone: "IST (UTC+5:30)",
    watermarkImages: [],
    attractions: [],
    hotels: [],
    restaurants: [],
    markets: [],
    localFoods: [],
    emergencyContacts: [],
    transportation: {
      nearestAirport: "", nearestRailwayStation: "", majorBusStations: [], roadConnectivity: "", taxiInfo: "",
      localTransport: [], autoRickshaw: "", rentalVehicles: ""
    },
    festivals: [],
    localCustoms: [],
    safety: [],
    faqs: [],
    nearbyDestinations: [],
    hiddenPlaces: [],
    suggestedItineraryDays: [],
    source: [],
    isSampleData: true,
    ...partial
  } as Legacy;
}

export function enrichVaranasi(db: MasterDatabase): void {
  const vns = db.destinations.find((d) => d.slug === "varanasi")!;

  // ---- Level-B destinations
  const sarnathLegacy = minimalLegacy({
    slug: "sarnath", name: "Sarnath", state: "Uttar Pradesh", stateSlug: "uttar-pradesh", latitude: 25.3811, longitude: 83.0227,
    tagline: "Where the Buddha first taught",
    shortDescription: "A Buddhist heritage site about 10 km from Varanasi, with the Dhamek Stupa, monastery ruins and the museum that holds the Ashoka Lion Capital.",
    introduction: "Sarnath is a compact archaeological and pilgrimage site north-east of Varanasi. It is associated in Buddhist tradition with the Buddha's first sermon and is a common half-day trip from Varanasi.",
    bestTimeToVisit: "October to March",
    idealDuration: "Half a day",
    tags: ["spiritual", "historical"],
    languages: ["Hindi", "English (tourist areas)"],
    attractions: [
      {
        id: "attr-dhamek", slug: "dhamek-stupa", name: "Dhamek Stupa", categories: ["historical", "religious"],
        description: "A large cylindrical stupa at the heart of the Sarnath site, in a park with the ruins of ancient monasteries. It is generally dated to around the 5th–6th century CE.",
        location: "Sarnath archaeological site", geo: { lat: 25.3813, lng: 83.0248 },
        openingHours: "Dawn to dusk", timeRequired: "1–2 hours", entryFee: "Ticketed (ASI)", bestVisitingTime: "Morning",
        mapUrl: "https://www.openstreetmap.org/search?query=Dhamek%20Stupa", officialWebsite: "https://asi.nic.in",
        images: [placeholderImage("Dhamek Stupa Sarnath", 1200, 800)], source: { label: "Archaeological Survey of India (ASI)" }
      },
      {
        id: "attr-sarnath-museum", slug: "sarnath-archaeological-museum", name: "Sarnath Archaeological Museum", categories: ["museums", "historical"],
        description: "Site museum holding sculpture found at Sarnath, including the Ashoka Lion Capital, which is the basis of India's national emblem.",
        location: "Sarnath", geo: { lat: 25.3799, lng: 83.0236 },
        openingHours: "9:00 AM – 5:00 PM (closed Fridays)", timeRequired: "1 hour", entryFee: "Ticketed", bestVisitingTime: "Late morning",
        mapUrl: "https://www.openstreetmap.org/search?query=Sarnath%20Museum", officialWebsite: "https://asi.nic.in",
        images: [placeholderImage("Sarnath Museum Lion Capital", 1200, 800)], source: { label: "Archaeological Survey of India (ASI)" }
      }
    ]
  });
  const ramnagarLegacy = minimalLegacy({
    slug: "ramnagar", name: "Ramnagar", state: "Uttar Pradesh", stateSlug: "uttar-pradesh", latitude: 25.2664, longitude: 83.0243,
    tagline: "The fort across the river",
    shortDescription: "Ramnagar sits on the eastern bank of the Ganga opposite Varanasi's ghats; its fort was the seat of the former ruling family of Kashi.",
    introduction: "Ramnagar is reached by road bridge or seasonal pontoon bridge and is known for its fort-museum and the annual Ramnagar Ramlila.",
    bestTimeToVisit: "October to March",
    idealDuration: "Half a day",
    tags: ["historical", "heritage"],
    languages: ["Hindi", "Bhojpuri"],
    attractions: [
      {
        id: "attr-ramnagar-fort", slug: "ramnagar-fort", name: "Ramnagar Fort", categories: ["historical", "museums"],
        description: "An 18th-century sandstone fort on the eastern bank of the Ganga, seat of the former Kashi Naresh (King of Varanasi), with a museum of vintage cars, weapons and royal artefacts.",
        location: "Ramnagar, across the river from the main ghats", geo: { lat: 25.2652, lng: 83.0226 },
        openingHours: "10:00 AM – 5:00 PM", timeRequired: "1–2 hours", entryFee: "Paid entry", bestVisitingTime: "Afternoon",
        images: [placeholderImage("Ramnagar Fort riverside", 1200, 800)], source: { label: "Kashi Naresh Trust" }
      }
    ]
  });
  B_DESTINATIONS.length = 0;
  B_DESTINATIONS.push({ legacy: sarnathLegacy, parentSlug: "varanasi" }, { legacy: ramnagarLegacy, parentSlug: "varanasi" });
  const sarnath = importLegacyDestination(db, sarnathLegacy, { level: "B", parentDestinationId: vns.id });
  const ramnagar = importLegacyDestination(db, ramnagarLegacy, { level: "B", parentDestinationId: vns.id });
  sarnath.recommended_days = 1;
  ramnagar.recommended_days = 1;

  // ---- ancient story (kept as tradition, explicitly labelled)
  vns.ancient_story_title = "Kashi — the city of light";
  vns.ancient_story_short =
    "According to Hindu tradition, Kashi (Varanasi) is the city of Shiva, said to have been founded by the god himself. It is regarded as one of the oldest continuously inhabited cities and has drawn pilgrims and scholars for well over two thousand years.";
  vns.ancient_story_long =
    "According to Hindu tradition, Kashi — 'the luminous' — is the city of Shiva, and the Puranas describe it as a place of liberation. Ancient Sanskrit literature refers to Kashi, and archaeological excavations at Rajghat indicate settlement from about the 8th century BCE. Nearby Sarnath is where Buddhist tradition places the Buddha's first sermon. The religious accounts and the archaeological record are kept separate on this site: traditions are labelled as traditions.";
  vns.ancient_story_status = "RELIGIOUS_TRADITION";
  vns.ancient_story_sources = [SRC.EDITORIAL_AI];

  // ---- historical events (documented history, separate from tradition)
  const sarnathId = sarnath.id;
  const ev = (
    n: number, entity_id: string, title: string, period_id: string, approximate_date: string,
    date_precision: HistoricalEvent["date_precision"], description: string, significance: string | null,
    extra: Partial<HistoricalEvent> = {}
  ): HistoricalEvent => ({
    id: `${vns.id}/event/${n}`, entity_id, title, period_id, approximate_date, date_precision, description,
    historical_significance: significance, location: null, people_involved: [], dynasties_involved: [], kingdoms_involved: [],
    confidence: "UNVERIFIED", source_id: SRC.EDITORIAL_AI, last_verified_at: null, ...extra
  });
  db.historical_events.push(
    ev(1, vns.id, "Early settlement at Rajghat", "PERIOD-ANCIENT", "c. 8th century BCE", "CENTURY",
      "Excavations at Rajghat, at the northern edge of the modern city, indicate settlement from around the 8th century BCE.",
      "Supports Varanasi's claim to be among the oldest continuously inhabited cities.", { location: "Rajghat" }),
    ev(2, sarnathId, "Ashokan pillar and lion capital at Sarnath", "PERIOD-ANCIENT", "c. 3rd century BCE", "CENTURY",
      "A Mauryan-era pillar surmounted by a lion capital stood at Sarnath; the capital is now in the Sarnath Archaeological Museum and is the basis of India's national emblem.",
      "Marks Sarnath's importance in the Mauryan period.", { dynasties_involved: ["Maurya"], people_involved: ["Ashoka"], location: "Sarnath" }),
    ev(3, sarnathId, "Dhamek Stupa built in its present form", "PERIOD-ANCIENT", "c. 5th–6th century CE", "CENTURY",
      "The Dhamek Stupa is generally dated to the Gupta period, on the site of earlier structures.",
      null, { dynasties_involved: ["Gupta"], location: "Sarnath" }),
    ev(4, vns.id, "Conquest of Varanasi by Delhi's Ghurid forces", "PERIOD-EARLY-MEDIEVAL", "c. 1194 CE", "YEAR",
      "Following the Battle of Chandawar, forces under Qutb-ud-din Aibak took Varanasi; many temples of the period were destroyed.",
      "Began a long period of rebuilding and adaptation of the city's religious architecture.", { people_involved: ["Qutb-ud-din Aibak"] }),
    ev(5, vns.id, "Demolition of the Vishvanatha temple under Mughal rule", "PERIOD-MUGHAL", "c. 1669 CE", "YEAR",
      "Contemporary Mughal records state that the Vishvanatha temple at Varanasi was ordered demolished in 1669 and a mosque was built on part of the site. The site's history remains the subject of ongoing legal proceedings; this record states only what the chronicles report.",
      "Explains why the present Kashi Vishwanath Temple stands beside, not on, the earlier site.", { dynasties_involved: ["Mughal"], location: "Kashi Vishwanath area" }),
    ev(6, vns.id, "Man Mandir Ghat observatory built", "PERIOD-MUGHAL", "1737", "YEAR",
      "Maharaja Jai Singh II of Jaipur built an astronomical observatory on the Man Mandir Ghat, one of his five observatories.",
      null, { people_involved: ["Jai Singh II"], location: "Man Mandir Ghat" }),
    ev(7, vns.id, "Present Kashi Vishwanath Temple built", "PERIOD-MUGHAL", "1780", "YEAR",
      "The present temple was built by Ahilyabai Holkar of Indore beside the earlier site.",
      "The shrine most pilgrims visit today.", { people_involved: ["Ahilyabai Holkar"], dynasties_involved: ["Holkar"], location: "Vishwanath Gali" }),
    ev(8, vns.id, "Gold donated for the temple spires", "PERIOD-COLONIAL", "c. 1835", "YEAR",
      "Gold for the temple's spires is traditionally attributed to Maharaja Ranjit Singh of Punjab.", null,
      { people_involved: ["Ranjit Singh"] }),
    ev(9, vns.id, "Banaras Hindu University founded", "PERIOD-FREEDOM-MOVEMENT", "1916", "YEAR",
      "Madan Mohan Malaviya founded Banaras Hindu University, now one of India's largest residential universities.", null,
      { people_involved: ["Madan Mohan Malaviya"], location: "BHU campus" }),
    ev(10, vns.id, "Kashi Vishwanath Dham corridor opened", "PERIOD-MODERN", "December 2021", "EXACT",
      "A pedestrian corridor linking the temple to the Ganga ghats was inaugurated in December 2021.",
      "Changed how visitors approach the temple.", { location: "Kashi Vishwanath" })
  );

  const bySlug = (slug: string) => db.attractions.find((a) => a.destination_id === vns.id && a.slug === slug);
  const dsgId = bySlug("dashashwamedh-ghat")?.id ?? `${vns.id}-DSG`;

  // ---- traditions (never presented as archaeological fact)
  const tr = (n: number, entity_id: string, t: Omit<Tradition, "id" | "entity_id" | "source_id" | "last_verified_at">): Tradition => ({
    id: `${vns.id}/tradition/${n}`, entity_id, source_id: SRC.EDITORIAL_AI, last_verified_at: null, ...t
  });
  db.traditions.push(
    tr(1, vns.id, {
      title: "Kashi, the city of Shiva", tradition_type: "Founding tradition",
      short_story: "According to Hindu tradition, Kashi was established by Shiva and is said to rest on his trident, outside the cycles of cosmic dissolution.",
      full_story: null, associated_religion: "Hinduism", associated_text: "Puranas", associated_community: "Hindu",
      historical_status: "RELIGIOUS_TRADITION"
    }),
    tr(2, vns.id, {
      title: "Liberation at Kashi", tradition_type: "Belief",
      short_story: "Hindu tradition holds that those who die in Kashi are released from the cycle of rebirth (moksha). This belief is why many pilgrims come to the city at the end of life and why the cremation ghats hold a special place.",
      full_story: null, associated_religion: "Hinduism", associated_text: null, associated_community: "Hindu",
      historical_status: "RELIGIOUS_TRADITION"
    }),
    tr(3, dsgId, {
      title: "Ten horse sacrifices at Dashashwamedh", tradition_type: "Place-name legend",
      short_story: "According to a Puranic legend, Brahma performed ten horse sacrifices (dasha-ashwamedha) at this ghat to welcome Shiva back to Kashi, which is how the ghat is said to have got its name.",
      full_story: null, associated_religion: "Hinduism", associated_text: "Puranas", associated_community: null,
      historical_status: "LEGEND"
    }),
    tr(4, sarnathId, {
      title: "The first sermon at Isipatana", tradition_type: "Founding tradition",
      short_story: "According to Buddhist tradition, the Buddha gave his first sermon to five ascetics at the Deer Park (Isipatana) at Sarnath after his enlightenment, setting the wheel of the Dharma in motion.",
      full_story: null, associated_religion: "Buddhism", associated_text: "Dhammacakkappavattana Sutta", associated_community: "Buddhist",
      historical_status: "RELIGIOUS_TRADITION"
    }),
    tr(5, ramnagar.id, {
      title: "The Ramnagar Ramlila", tradition_type: "Living performance tradition",
      short_story: "A long-running annual staging of the Ramayana at Ramnagar, performed over many evenings at sites around the town under the patronage of the Kashi royal family.",
      full_story: null, associated_religion: "Hinduism", associated_text: "Ramcharitmanas", associated_community: "Hindu",
      historical_status: "TRADITIONAL_ACCOUNT"
    })
  );

  // ---- transport hubs (hand-set to replace the parsed baseline)
  db.transport_hubs = db.transport_hubs.filter((h) => h.destination_id !== vns.id);
  const hub = { latitude: null, longitude: null, official_url: null, source_id: SRC.EDITORIAL_AI, last_verified_at: null };
  db.transport_hubs.push(
    { ...hub, id: `${vns.id}/hub/airport-1`, destination_id: vns.id, hub_type: "AIRPORT", name: "Lal Bahadur Shastri International Airport", code: "VNS", distance_from_destination: 26, typical_transfer_time: 60, official_url: "https://www.aai.aero" },
    { ...hub, id: `${vns.id}/hub/railway-1`, destination_id: vns.id, hub_type: "RAILWAY", name: "Varanasi Junction (Varanasi Cantt)", code: "BSB", distance_from_destination: null, typical_transfer_time: null },
    { ...hub, id: `${vns.id}/hub/railway-2`, destination_id: vns.id, hub_type: "RAILWAY", name: "Banaras (Manduadih)", code: "BSBS", distance_from_destination: null, typical_transfer_time: null },
    { ...hub, id: `${vns.id}/hub/bus-1`, destination_id: vns.id, hub_type: "BUS_TERMINAL", name: "Varanasi Cantt Bus Station (UPSRTC)", code: null, distance_from_destination: null, typical_transfer_time: null }
  );

  // ---- accommodation areas (areas first; individual hotels come later)
  const area = (
    n: number, area_name: string, area_type: string, description: string, budget: "BUDGET" | "MID_RANGE" | "PREMIUM" | "MIXED",
    center: string, attractions: string, flags: { family?: boolean | null; elderly?: boolean | null; nightlife?: boolean | null; quiet?: boolean | null; shopping?: boolean | null; food?: boolean | null },
    transport: string
  ) =>
    db.accommodation_areas.push({
      id: `${vns.id}/area/${n}`, destination_id: vns.id, area_name, area_type, description, budget_range: budget,
      distance_to_center: center, distance_to_major_attractions: attractions,
      family_suitable: flags.family ?? null, elderly_suitable: flags.elderly ?? null, nightlife: flags.nightlife ?? null,
      quiet: flags.quiet ?? null, shopping: flags.shopping ?? null, food: flags.food ?? null, transport_access: transport,
      confidence: "UNVERIFIED", source_id: SRC.EDITORIAL_AI, last_verified_at: null
    });
  area(1, "Assi Ghat and Bhadaini", "Riverside neighbourhood",
    "The southern end of the ghats, popular with backpackers and longer-stay travellers, with riverside cafés, guesthouses and yoga classes.",
    "MIXED", "About 3 km from Dashashwamedh Ghat along the river", "Assi Ghat on the doorstep; the old city is a short auto ride away",
    { quiet: true, food: true, family: true }, "Auto and e-rickshaws to the old city; limited car access to the ghat lanes");
  area(2, "Godowlia, Dashashwamedh and the old city", "Old-city lanes",
    "Walking distance to the main ghats and Kashi Vishwanath, in narrow lanes that cars cannot enter. Convenient, busy and noisy.",
    "BUDGET", "In the centre", "Ghats and temple within walking distance",
    { shopping: true, food: true, elderly: false, quiet: false }, "Walk or e-rickshaw to the edge of the lanes; luggage may need to be carried");
  area(3, "Cantonment", "Business district",
    "Wider roads, larger hotels and easy access to Varanasi Junction and the bus station. Further from the ghats.",
    "MID_RANGE", "Roughly 5–6 km from the ghats", "Short cab or auto ride to the old city",
    { family: true, elderly: true, food: true }, "Adjacent to Varanasi Junction and the Cantt bus station");
  area(4, "Lanka and Sigra", "University district",
    "Around the Banaras Hindu University gate; a mix of mid-range hotels, student cafés and restaurants.",
    "MID_RANGE", "Roughly 4–5 km from the ghats", "BHU campus and Assi Ghat are close",
    { family: true, food: true, quiet: null }, "Autos and app cabs; on the way to Assi Ghat");
  area(5, "Sarnath", "Heritage suburb",
    "A quiet, green suburb near the Buddhist site with monastery guesthouses and a few hotels. About 10 km from the ghats.",
    "MIXED", "About 10 km from the old city", "Dhamek Stupa and the museum are close",
    { quiet: true, family: true, elderly: true, nightlife: false }, "Autos and cabs to the city; fewer options late at night");

  // ---- experiences
  const exp = (
    n: number, name: string, type: "SPIRITUAL" | "BOATING" | "SIGHTSEEING" | "CULTURAL" | "YOGA", description: string,
    duration: number | null, safety: string | null
  ) =>
    db.experiences.push({
      id: `${vns.id}/experience/${n}`, destination_id: vns.id, name, experience_type: type, description, duration_minutes: duration,
      cost_min: null, cost_max: null, age_min: null, age_max: null, season_start: null, season_end: null, booking_required: null,
      difficulty: "EASY", safety_notes: safety, confidence: "UNVERIFIED", source_id: SRC.EDITORIAL_AI, last_verified_at: null
    });
  exp(1, "Evening Ganga Aarti at Dashashwamedh Ghat", "SPIRITUAL",
    "A synchronised fire ritual with bells and chanting at sunset. Arrive early for a good position on the steps or take a boat.", 75,
    "Very crowded; keep valuables secure.");
  exp(2, "Sunrise boat ride along the ghats", "BOATING",
    "Row boats run along the ghats at dawn; the light and the morning rituals are the reason to go.", 90,
    "Agree the fare before boarding; official rate boards are posted at major ghats.");
  exp(3, "Old-city heritage walk", "SIGHTSEEING",
    "A walk through the lanes between Kashi Vishwanath, the Kachori Gali and the ghats, best with a local guide.", 120, null);
  exp(4, "Banarasi silk weaving visit", "CULTURAL",
    "Weavers' workshops around the old city show how brocade and zari sarees are made.", 60, null);
  exp(5, "Morning yoga at Assi Ghat", "YOGA",
    "Informal yoga and meditation sessions are held at Assi Ghat in the early morning.", 60, null);

  // ---- monthly climate (climatology, not a forecast — live weather comes from the API)
  const minT = [9, 12, 17, 23, 27, 28, 26, 26, 25, 20, 14, 10];
  const maxT = [23, 27, 33, 38, 41, 39, 33, 32, 32, 32, 28, 24];
  const rain = [19, 14, 8, 5, 10, 100, 300, 290, 190, 30, 5, 4];
  minT.forEach((mn, i) => {
    const mx = maxT[i];
    db.destination_weather.push({
      destination_id: vns.id, month: i + 1, avg_min_temperature: mn, avg_max_temperature: mx, rainfall: rain[i],
      rain_probability: null, humidity: null,
      weather_description: mx >= 38 ? "Very hot and dry" : rain[i] >= 150 ? "Warm and wet (monsoon)" : mx <= 25 ? "Cool and dry" : "Warm",
      recommended_clothing: mx >= 38 ? "Light cotton, hat, sun protection" : rain[i] >= 150 ? "Rain gear and quick-dry clothes" : mx <= 25 ? "Light woollens for mornings and evenings" : "Light clothing",
      travel_notes: i === 11 || i === 0 ? "Winter fog can delay morning trains and flights." : null,
      confidence: "UNVERIFIED", source_id: SRC.EDITORIAL_AI, last_verified_at: null
    });
  });

  // ---- suitability (replaces the generic row)
  const row = db.destination_suitability.find((s) => s.destination_id === vns.id)!;
  row.values = {
    solo: "POSSIBLE", couple: "POSSIBLE", family: "POSSIBLE", children: "POSSIBLE", elderly: "LIMITED", wheelchair: "LIMITED",
    backpacking: "YES", luxury: "POSSIBLE", budget: "YES", pilgrimage: "YES", business: "UNKNOWN"
  };
  vns.elderly_suitable = null;
  vns.crowd_level = "HIGH";
  vns.difficulty_level = "EASY";
  vns.upi_availability = "Widely accepted in the city (to be verified)";

  // ---- attraction enrichments from the traditions/history
  const kvt = bySlug("kashi-vishwanath-temple");
  const dsg = bySlug("dashashwamedh-ghat");
  if (kvt) {
    kvt.religious_importance = "One of the twelve Jyotirlinga shrines of Shiva in Hindu tradition.";
    kvt.dress_code = "Modest dress; footwear is removed before entering.";
    addFact(db, { entity_id: kvt.id, fact_type: "tradition.jyotirlinga", fact_text: "Kashi Vishwanath is counted among the twelve Jyotirlingas in Hindu tradition", value: true, verify_against: SRC.KASHI_TRUST });
  }
  if (dsg) dsg.religious_importance = "Site of the nightly Ganga Aarti.";
}

export { B_DESTINATIONS };
