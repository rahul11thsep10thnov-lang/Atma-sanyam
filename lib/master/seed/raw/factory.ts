import type {
  Destination,
  Attraction,
  Hotel,
  Restaurant,
  Market,
  LocalFood,
  ThingsToDoCategory,
  HotelCategory,
  RestaurantCategory,
  NearbyDestinationRef
} from "@/lib/types";
import { placeholderImage } from "@/lib/data/placeholder";

const NATIONAL_EMERGENCY_CONTACTS = [
  { label: "All-in-one Emergency (Police/Fire/Ambulance)", number: "112", scope: "national" as const },
  { label: "Police", number: "100", scope: "national" as const },
  { label: "Fire", number: "101", scope: "national" as const },
  { label: "Ambulance", number: "102 / 108", scope: "national" as const },
  { label: "Women Helpline", number: "1091", scope: "national" as const },
  { label: "Tourist Helpline (Incredible India)", number: "1800-11-1363", scope: "national" as const },
  { label: "Railway Enquiry", number: "139", scope: "national" as const }
];

export interface SeedAttractionInput {
  name: string;
  categories: ThingsToDoCategory[];
  description: string;
  location: string;
  openingHours?: string;
  timeRequired?: string;
  entryFee?: string;
}

export interface SeedInput {
  slug: string;
  name: string;
  state: string;
  stateSlug: string;
  district?: string;
  tagline: string;
  shortDescription: string;
  introduction: string;
  history: string;
  geography: string;
  culture: string;
  religion: string;
  bestTimeToVisit: string;
  idealDuration: string;
  approximateBudget: string;
  nearestAirport: string;
  nearestRailwayStation: string;
  bestKnownFor: string[];
  languages: string[];
  tags: string[];
  popularity: number;
  latitude: number;
  longitude: number;
  attractions: SeedAttractionInput[];
  hotelCategories?: HotelCategory[];
  restaurantCategories?: RestaurantCategory[];
  cuisine: string[];
  markets: Array<{ name: string; location: string; whatToBuy: string[]; famousProducts: string[] }>;
  foods: Array<{ name: string; type: LocalFood["type"]; description: string }>;
  transportation: {
    roadConnectivity: string;
    majorBusStations: string[];
    localTransport: string[];
    metroInfo?: string;
    fromDelhi?: string;
  };
  localStateHelpline?: string;
  festivals: Array<{ name: string; month: string; description: string }>;
  localCustoms: string[];
  safety: string[];
  faqs: Array<{ question: string; answer: string }>;
  nearbyDestinations: NearbyDestinationRef[];
  hiddenPlaces: string[];
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function buildDestination(input: SeedInput): Destination {
  const attractions: Attraction[] = input.attractions.map((a) => ({
    id: `attr-${input.slug}-${slugify(a.name)}`,
    slug: slugify(a.name),
    name: a.name,
    categories: a.categories,
    description: a.description,
    location: a.location,
    openingHours: a.openingHours ?? "Timings vary — check locally",
    timeRequired: a.timeRequired ?? "1–2 hours",
    entryFee: a.entryFee ?? "Nominal entry fee",
    bestVisitingTime: "Morning or late afternoon",
    mapUrl: `https://www.openstreetmap.org/search?query=${encodeURIComponent(a.name + " " + input.name)}`,
    images: [placeholderImage(a.name, 1200, 800)],
    source: { label: `${input.state} Tourism Department` }
  }));

  const hotelCats: HotelCategory[] = input.hotelCategories ?? ["luxury", "midRange", "budget"];
  const hotels: Hotel[] = hotelCats.map((cat) => ({
    id: `hotel-${input.slug}-${cat}`,
    name: `Representative ${cat} property in ${input.name}`,
    category: cat,
    image: placeholderImage(`${input.name} ${cat} hotel`, 1200, 800),
    area: `${input.name} city area`,
    facilities: ["Free Wi-Fi", "24-hour front desk"],
    roomTypes: ["Standard", "Deluxe"],
    dataVerified: false
  }));

  const restCats: RestaurantCategory[] = input.restaurantCategories ?? ["localFood", "streetFood", "vegetarian"];
  const restaurants: Restaurant[] = restCats.map((cat) => ({
    id: `rest-${input.slug}-${cat}`,
    name: `Representative ${cat} eatery in ${input.name}`,
    categories: [cat],
    cuisine: input.cuisine,
    location: `${input.name} city area`,
    openingHours: "11:00 AM – 10:00 PM",
    signatureDishes: input.foods.slice(0, 2).map((f) => f.name),
    vegNonVeg: "both",
    dataVerified: false
  }));

  const markets: Market[] = input.markets.map((m) => ({
    id: `market-${input.slug}-${slugify(m.name)}`,
    name: m.name,
    location: m.location,
    whatToBuy: m.whatToBuy,
    typicalPriceRange: "₹100–₹5,000",
    bargainingInfo: "Bargaining is customary; compare a few stalls before buying",
    openingHours: "10:00 AM – 9:00 PM",
    famousProducts: m.famousProducts
  }));

  const localFoods: LocalFood[] = input.foods.map((f) => ({
    id: `food-${input.slug}-${slugify(f.name)}`,
    name: f.name,
    type: f.type,
    description: f.description
  }));

  return {
    id: `dest-${input.slug}`,
    slug: input.slug,
    name: input.name,
    state: input.state,
    stateSlug: input.stateSlug,
    district: input.district,
    tagline: input.tagline,
    shortDescription: input.shortDescription,
    heroImage: placeholderImage(`${input.name} skyline`, 1600, 900),
    bestTimeToVisit: input.bestTimeToVisit,
    popularity: input.popularity,
    tags: input.tags,
    latitude: input.latitude,
    longitude: input.longitude,
    introduction: input.introduction,
    history: input.history,
    geography: input.geography,
    culture: input.culture,
    religion: input.religion,
    idealDuration: input.idealDuration,
    approximateBudget: input.approximateBudget,
    nearestAirport: input.nearestAirport,
    nearestRailwayStation: input.nearestRailwayStation,
    bestKnownFor: input.bestKnownFor,
    languages: input.languages,
    currency: "Indian Rupee (₹)",
    timeZone: "IST (UTC+5:30)",
    watermarkImages: input.attractions
      .slice(0, 4)
      .map((a) => placeholderImage(a.name, 1600, 900)),
    attractions,
    hotels,
    restaurants,
    markets,
    localFoods,
    emergencyContacts: [
      ...NATIONAL_EMERGENCY_CONTACTS,
      ...(input.localStateHelpline
        ? [{ label: `${input.state} Tourist Helpline`, number: input.localStateHelpline, scope: "local" as const }]
        : [])
    ],
    transportation: {
      nearestAirport: input.nearestAirport,
      nearestRailwayStation: input.nearestRailwayStation,
      majorBusStations: input.transportation.majorBusStations,
      roadConnectivity: input.transportation.roadConnectivity,
      taxiInfo: "Prepaid taxi counters at airport/station; app-based cabs widely available",
      metroInfo: input.transportation.metroInfo,
      localTransport: input.transportation.localTransport,
      autoRickshaw: "Widely available; agree on fare or insist on the meter",
      rentalVehicles: "Self-drive and chauffeur-driven rentals available",
      fromDelhi: input.transportation.fromDelhi
    },
    festivals: input.festivals.map((f, i) => ({ id: `fest-${input.slug}-${i}`, ...f })),
    localCustoms: input.localCustoms,
    safety: input.safety,
    faqs: input.faqs,
    nearbyDestinations: input.nearbyDestinations,
    hiddenPlaces: input.hiddenPlaces,
    suggestedItineraryDays: [1, 2, 3],
    source: [
      { label: `${input.state} Tourism Department` },
      { label: "Ministry of Tourism, Government of India", url: "https://tourism.gov.in" }
    ],
    isSampleData: true
  };
}
