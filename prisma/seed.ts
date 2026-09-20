/**
 * Seeds the database from the same demo data that powers the frontend
 * (lib/data/destinations) so `npm run prisma:seed` gives you a working
 * database without hand-writing SQL. Run after `npm run prisma:migrate`.
 */
import { PrismaClient, ThingsToDoCategory, HotelCategory, RestaurantCategory } from "@prisma/client";
import { destinations } from "../lib/data/destinations";
import type {
  ThingsToDoCategory as TtdCat,
  HotelCategory as HotelCat,
  RestaurantCategory as RestCat
} from "../lib/types";

const prisma = new PrismaClient();

const TTD_MAP: Record<TtdCat, ThingsToDoCategory> = {
  historical: "HISTORICAL",
  religious: "RELIGIOUS",
  adventure: "ADVENTURE",
  nature: "NATURE",
  family: "FAMILY",
  photography: "PHOTOGRAPHY",
  nightlife: "NIGHTLIFE",
  culture: "CULTURE",
  shopping: "SHOPPING",
  food: "FOOD",
  museums: "MUSEUMS",
  entertainment: "ENTERTAINMENT"
};

const HOTEL_MAP: Record<HotelCat, HotelCategory> = {
  luxury: "LUXURY",
  premium: "PREMIUM",
  midRange: "MID_RANGE",
  budget: "BUDGET",
  hostels: "HOSTELS",
  homestays: "HOMESTAYS",
  heritage: "HERITAGE",
  resorts: "RESORTS"
};

const REST_MAP: Record<RestCat, RestaurantCategory> = {
  localFood: "LOCAL_FOOD",
  streetFood: "STREET_FOOD",
  vegetarian: "VEGETARIAN",
  nonVegetarian: "NON_VEGETARIAN",
  fineDining: "FINE_DINING",
  budget: "BUDGET",
  family: "FAMILY",
  cafes: "CAFES",
  sweets: "SWEETS",
  breakfast: "BREAKFAST",
  traditional: "TRADITIONAL"
};

async function main() {
  for (const destination of destinations) {
    const state = await prisma.state.upsert({
      where: { slug: destination.stateSlug },
      update: {},
      create: { slug: destination.stateSlug, name: destination.state }
    });

    const created = await prisma.destination.upsert({
      where: { slug: destination.slug },
      update: {},
      create: {
        slug: destination.slug,
        name: destination.name,
        tagline: destination.tagline,
        shortDescription: destination.shortDescription,
        introduction: destination.introduction,
        history: destination.history,
        geography: destination.geography,
        culture: destination.culture,
        religion: destination.religion,
        latitude: destination.latitude,
        longitude: destination.longitude,
        bestTimeToVisit: destination.bestTimeToVisit,
        idealDuration: destination.idealDuration,
        approximateBudget: destination.approximateBudget,
        nearestAirport: destination.nearestAirport,
        nearestRailway: destination.nearestRailwayStation,
        bestKnownFor: destination.bestKnownFor,
        languages: destination.languages,
        currency: destination.currency,
        timeZone: destination.timeZone,
        tags: destination.tags,
        popularity: destination.popularity,
        isSampleData: destination.isSampleData,
        stateId: state.id,
        attractions: {
          create: destination.attractions.map((a) => ({
            slug: a.slug,
            name: a.name,
            description: a.description,
            location: a.location,
            latitude: a.geo?.lat,
            longitude: a.geo?.lng,
            openingHours: a.openingHours,
            timeRequired: a.timeRequired,
            entryFee: a.entryFee,
            bestVisitingTime: a.bestVisitingTime,
            mapUrl: a.mapUrl,
            officialWebsite: a.officialWebsite,
            categories: a.categories.map((c) => TTD_MAP[c]),
            sourceLabel: a.source.label,
            sourceUrl: a.source.url
          }))
        },
        hotels: {
          create: destination.hotels.map((h) => ({
            name: h.name,
            category: HOTEL_MAP[h.category],
            area: h.area,
            priceRange: h.priceRange,
            facilities: h.facilities,
            roomTypes: h.roomTypes,
            guestRating: h.guestRating,
            reviewCount: h.reviewCount,
            distanceFromLandmark: h.distanceFromLandmark,
            bookingUrl: h.bookingUrl,
            dataVerified: h.dataVerified
          }))
        },
        restaurants: {
          create: destination.restaurants.map((r) => ({
            name: r.name,
            categories: r.categories.map((c) => REST_MAP[c]),
            cuisine: r.cuisine,
            priceRange: r.priceRange,
            location: r.location,
            openingHours: r.openingHours,
            signatureDishes: r.signatureDishes,
            vegNonVeg: r.vegNonVeg,
            contact: r.contact,
            mapUrl: r.mapUrl,
            website: r.website,
            reservationUrl: r.reservationUrl,
            dataVerified: r.dataVerified
          }))
        },
        markets: {
          create: destination.markets.map((m) => ({
            name: m.name,
            location: m.location,
            whatToBuy: m.whatToBuy,
            typicalPriceRange: m.typicalPriceRange,
            bargainingInfo: m.bargainingInfo,
            openingHours: m.openingHours,
            famousProducts: m.famousProducts,
            mapUrl: m.mapUrl
          }))
        },
        foods: {
          create: destination.localFoods.map((f) => ({
            name: f.name,
            type: f.type,
            description: f.description,
            whereToTry: f.whereToTry ?? []
          }))
        },
        festivals: {
          create: destination.festivals.map((f) => ({
            name: f.name,
            month: f.month,
            description: f.description
          }))
        },
        emergencyContacts: {
          create: destination.emergencyContacts.map((e) => ({
            label: e.label,
            number: e.number,
            scope: e.scope
          }))
        },
        transportation: {
          create: {
            nearestAirport: destination.transportation.nearestAirport,
            nearestRailwayStation: destination.transportation.nearestRailwayStation,
            majorBusStations: destination.transportation.majorBusStations,
            roadConnectivity: destination.transportation.roadConnectivity,
            taxiInfo: destination.transportation.taxiInfo,
            metroInfo: destination.transportation.metroInfo,
            localTransport: destination.transportation.localTransport,
            autoRickshaw: destination.transportation.autoRickshaw,
            rentalVehicles: destination.transportation.rentalVehicles,
            fromDelhi: destination.transportation.fromDelhi
          }
        }
      }
    });

    console.log(`Seeded ${created.name}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
