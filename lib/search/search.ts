import { destinationSummaries } from "@/lib/data/destinations";
import type { DestinationSummary } from "@/lib/types";

export type SearchCategory = "hotels" | "restaurants" | "shopping" | "thingsToDo" | "weather" | "itinerary" | "general";

export interface SearchResult {
  destination: DestinationSummary;
  category: SearchCategory;
  score: number;
}

const CATEGORY_KEYWORDS: Record<SearchCategory, string[]> = {
  hotels: ["hotel", "hotels", "stay", "stays"],
  restaurants: ["restaurant", "restaurants", "food to eat", "eat", "dining"],
  shopping: ["market", "markets", "shopping", "buy"],
  thingsToDo: ["things to do", "places to visit", "attractions", "see"],
  weather: ["weather", "climate", "temperature"],
  itinerary: ["itinerary", "trip", "plan", "day trip", "days"],
  general: []
};

/** Cheap Levenshtein distance for typo tolerance on short strings (city/state names). */
function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

function detectCategory(query: string): SearchCategory {
  const lower = query.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as Array<[SearchCategory, string[]]>) {
    if (keywords.some((k) => lower.includes(k))) return category;
  }
  return "general";
}

/** Supports free-text queries like "hotels in Goa", "places near Jaipur", "3 day trip to Kerala". */
export function search(query: string, limit = 10): SearchResult[] {
  const category = detectCategory(query);
  const cleaned = query
    .toLowerCase()
    .replace(/\b(hotels?|restaurants?|markets?|shopping|weather|itinerary|trip|plan|days?|things to do|places to visit|attractions|near|in|for|to)\b/g, "")
    .trim();

  const results: SearchResult[] = destinationSummaries.map((destination) => {
    const nameLower = destination.name.toLowerCase();
    const stateLower = destination.state.toLowerCase();

    let score = 0;
    if (cleaned && (nameLower.includes(cleaned) || cleaned.includes(nameLower))) score += 10;
    if (cleaned && (stateLower.includes(cleaned) || cleaned.includes(stateLower))) score += 6;
    if (destination.tags.some((tag) => cleaned.includes(tag))) score += 3;

    if (cleaned && score === 0) {
      const distance = Math.min(levenshtein(cleaned, nameLower), levenshtein(cleaned, stateLower));
      const threshold = Math.max(2, Math.floor(Math.max(cleaned.length, nameLower.length) * 0.34));
      if (distance <= threshold) score += 5 - distance;
    }

    score += destination.popularity / 100;

    return { destination, category, score };
  });

  return results
    .filter((r) => r.score > 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
