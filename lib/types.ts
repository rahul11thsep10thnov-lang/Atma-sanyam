/**
 * Core domain types shared across the demo data layer, API routes and
 * Prisma schema. Keeping these in one place means the demo JSON data,
 * the REST API responses and the eventual database rows all agree on
 * shape — swapping the demo data layer for Prisma queries later should
 * not require touching component code.
 */

export type Locale = "en" | "hi" | "mr" | "kn" | "ta" | "te";

export interface SourceRef {
  /** e.g. "Ministry of Tourism", "State Tourism Department", "ASI" */
  label: string;
  url?: string;
}

export interface ImageAsset {
  url: string;
  alt: string;
  source: string;
  copyright: string;
  width?: number;
  height?: number;
}

export type ThingsToDoCategory =
  | "historical"
  | "religious"
  | "adventure"
  | "nature"
  | "family"
  | "photography"
  | "nightlife"
  | "culture"
  | "shopping"
  | "food"
  | "museums"
  | "entertainment";

export type HotelCategory =
  | "luxury"
  | "premium"
  | "midRange"
  | "budget"
  | "hostels"
  | "homestays"
  | "heritage"
  | "resorts";

export type RestaurantCategory =
  | "localFood"
  | "streetFood"
  | "vegetarian"
  | "nonVegetarian"
  | "fineDining"
  | "budget"
  | "family"
  | "cafes"
  | "sweets"
  | "breakfast"
  | "traditional";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Attraction {
  id: string;
  slug: string;
  name: string;
  categories: ThingsToDoCategory[];
  description: string;
  location: string;
  geo?: GeoPoint;
  openingHours: string;
  timeRequired: string;
  entryFee: string;
  bestVisitingTime: string;
  mapUrl?: string;
  officialWebsite?: string;
  images: ImageAsset[];
  source: SourceRef;
}

export interface Hotel {
  id: string;
  name: string;
  category: HotelCategory;
  image: ImageAsset;
  area: string;
  priceRange?: string;
  facilities: string[];
  roomTypes: string[];
  guestRating?: number;
  reviewCount?: number;
  distanceFromLandmark?: string;
  bookingUrl?: string;
  dataVerified: boolean;
}

export interface Restaurant {
  id: string;
  name: string;
  categories: RestaurantCategory[];
  cuisine: string[];
  priceRange?: string;
  location: string;
  openingHours: string;
  signatureDishes: string[];
  vegNonVeg: "veg" | "non-veg" | "both";
  contact?: string;
  mapUrl?: string;
  website?: string;
  reservationUrl?: string;
  dataVerified: boolean;
}

export interface Market {
  id: string;
  name: string;
  location: string;
  whatToBuy: string[];
  typicalPriceRange: string;
  bargainingInfo: string;
  openingHours: string;
  famousProducts: string[];
  mapUrl?: string;
}

export interface LocalFood {
  id: string;
  name: string;
  type: "dish" | "street-food" | "sweet" | "breakfast" | "drink";
  description: string;
  whereToTry?: string[];
}

export interface EmergencyContact {
  label: string;
  number: string;
  scope: "national" | "local";
}

export interface Transportation {
  nearestAirport: string;
  nearestRailwayStation: string;
  majorBusStations: string[];
  roadConnectivity: string;
  taxiInfo: string;
  metroInfo?: string;
  localTransport: string[];
  autoRickshaw: string;
  rentalVehicles: string;
  fromDelhi?: string;
}

export interface Festival {
  id: string;
  name: string;
  month: string;
  description: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface NearbyDestinationRef {
  slug: string;
  name: string;
  state: string;
  distanceKm?: number;
}

export interface DestinationSummary {
  id: string;
  slug: string;
  name: string;
  state: string;
  stateSlug: string;
  district?: string;
  tagline: string;
  shortDescription: string;
  heroImage: ImageAsset;
  bestTimeToVisit: string;
  popularity: number; // 0-100 indicator, demo/derived metric
  tags: string[];
}

export interface Destination extends DestinationSummary {
  latitude: number;
  longitude: number;
  introduction: string;
  history: string;
  geography: string;
  culture: string;
  religion: string;
  idealDuration: string;
  approximateBudget: string;
  nearestAirport: string;
  nearestRailwayStation: string;
  bestKnownFor: string[];
  languages: string[];
  currency: string;
  timeZone: string;
  watermarkImages: ImageAsset[];
  attractions: Attraction[];
  hotels: Hotel[];
  restaurants: Restaurant[];
  markets: Market[];
  localFoods: LocalFood[];
  emergencyContacts: EmergencyContact[];
  transportation: Transportation;
  festivals: Festival[];
  localCustoms: string[];
  safety: string[];
  faqs: FaqItem[];
  nearbyDestinations: NearbyDestinationRef[];
  hiddenPlaces: string[];
  suggestedItineraryDays: number[];
  source: SourceRef[];
  isSampleData: boolean;
}
