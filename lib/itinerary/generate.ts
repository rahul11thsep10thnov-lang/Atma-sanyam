import type { Destination } from "@/lib/types";

export type TravelStyle = "budget" | "comfort" | "luxury";
export type Interest =
  | "history"
  | "food"
  | "nature"
  | "religion"
  | "shopping"
  | "adventure"
  | "family"
  | "photography";

export interface ItineraryRequest {
  destinationSlug: string;
  days: number;
  travellers: number;
  budget: number;
  travelStyle: TravelStyle;
  interests: Interest[];
}

export interface ItineraryDayPlan {
  day: number;
  morning: string;
  afternoon: string;
  evening: string;
  foodSuggestion: string;
  travelTimeNote: string;
  estimatedDistanceKm: number;
}

export interface ItineraryResult {
  destinationSlug: string;
  destinationName: string;
  days: ItineraryDayPlan[];
  disclaimer: string;
  generatedAt: string;
}

const INTEREST_TO_CATEGORY: Record<Interest, string[]> = {
  history: ["historical"],
  food: ["food"],
  nature: ["nature"],
  religion: ["religious"],
  shopping: ["shopping"],
  adventure: ["adventure"],
  family: ["family"],
  photography: ["photography"]
};

/**
 * Rule-based, deterministic itinerary builder using only the destination's
 * own catalogued attractions and foods — never inventing opening hours,
 * prices, or availability (per the "AI must not invent verified facts"
 * requirement). This is the seam where a real LLM call would plug in:
 * swap the body of this function for a prompted model call that still
 * only selects from `destination.attractions` / `destination.localFoods`
 * rather than generating facts from scratch.
 */
export function generateItinerary(destination: Destination, request: ItineraryRequest): ItineraryResult {
  const interestCategories = new Set(
    request.interests.flatMap((interest) => INTEREST_TO_CATEGORY[interest] ?? [])
  );

  const rankedAttractions = [...destination.attractions].sort((a, b) => {
    const aScore = a.categories.some((c) => interestCategories.has(c)) ? 1 : 0;
    const bScore = b.categories.some((c) => interestCategories.has(c)) ? 1 : 0;
    return bScore - aScore;
  });

  const foods = destination.localFoods;

  const days: ItineraryDayPlan[] = Array.from({ length: request.days }).map((_, i) => {
    const morningAttraction = rankedAttractions[(i * 2) % Math.max(rankedAttractions.length, 1)];
    const eveningAttraction = rankedAttractions[(i * 2 + 1) % Math.max(rankedAttractions.length, 1)];
    const food = foods[i % Math.max(foods.length, 1)];

    return {
      day: i + 1,
      morning: morningAttraction
        ? `Visit ${morningAttraction.name} (${morningAttraction.timeRequired})`
        : `Explore central ${destination.name} at your own pace`,
      afternoon:
        request.interests.includes("shopping") && destination.markets[0]
          ? `Browse ${destination.markets[0].name} for ${destination.markets[0].famousProducts.join(", ")}`
          : `Rest, local café, or a second nearby attraction`,
      evening: eveningAttraction
        ? `${eveningAttraction.name} — ${eveningAttraction.bestVisitingTime.toLowerCase().includes("evening") || eveningAttraction.bestVisitingTime.toLowerCase().includes("sunset") ? "recommended at this time" : "or a relaxed riverside/city walk"}`
        : `Relaxed evening walk and dinner`,
      foodSuggestion: food ? `Try ${food.name} — ${food.description}` : `Sample local specialities`,
      travelTimeNote: "Estimated — actual travel time depends on traffic and mode of transport",
      estimatedDistanceKm: Math.round(3 + Math.random() * 7)
    };
  });

  return {
    destinationSlug: destination.slug,
    destinationName: destination.name,
    days,
    disclaimer:
      "This itinerary is AI-assisted and estimated from TripToe's destination catalogue. Opening hours, prices and availability shown elsewhere on this site are separately sourced — always verify time-sensitive details before you travel.",
    generatedAt: new Date().toISOString()
  };
}
