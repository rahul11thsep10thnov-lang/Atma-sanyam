import type { Destination, DestinationSummary } from "@/lib/types";
import { varanasi } from "./varanasi";
import { seedDestinations } from "./seedCities";

export const destinations: Destination[] = [varanasi, ...seedDestinations];

export const destinationSummaries: DestinationSummary[] = destinations.map((d) => ({
  id: d.id,
  slug: d.slug,
  name: d.name,
  state: d.state,
  stateSlug: d.stateSlug,
  district: d.district,
  tagline: d.tagline,
  shortDescription: d.shortDescription,
  heroImage: d.heroImage,
  bestTimeToVisit: d.bestTimeToVisit,
  popularity: d.popularity,
  tags: d.tags
}));

export function getDestinationBySlug(slug: string): Destination | undefined {
  return destinations.find((d) => d.slug === slug);
}

export function getDestinationsByTag(tag: string, limit?: number): DestinationSummary[] {
  const filtered = destinationSummaries.filter((d) => d.tags.includes(tag));
  const sorted = [...filtered].sort((a, b) => b.popularity - a.popularity);
  return typeof limit === "number" ? sorted.slice(0, limit) : sorted;
}

export function getPopularDestinations(limit = 8): DestinationSummary[] {
  return [...destinationSummaries].sort((a, b) => b.popularity - a.popularity).slice(0, limit);
}

export const popularSearchSlugs = [
  "delhi",
  "agra",
  "goa",
  "jaipur",
  "varanasi",
  "kochi", // stands in for the broader "Kerala" popular search
  "srinagar", // stands in for the broader "Kashmir" popular search
  "udaipur" // stands in for the broader "Rajasthan" popular search
];

function bySlugs(slugs: string[]): DestinationSummary[] {
  return slugs
    .map((slug) => destinationSummaries.find((d) => d.slug === slug))
    .filter((d): d is DestinationSummary => Boolean(d));
}

/**
 * Curated slug lists for each homepage rail (spec section 4). These are
 * hand-picked from the 25-city seed set rather than driven purely by the
 * `tags` field, since a handful of themes (e.g. wildlife) have no strong
 * match yet in the seed cities — see the empty `wildlife` list below,
 * which is intentional until a national-park destination is added.
 */
export const homepageSections = {
  popularDestinations: getPopularDestinations(8),
  weekendGetaways: bySlugs(["agra", "rishikesh", "ooty", "khajuraho"]),
  historicalIndia: bySlugs(["delhi", "agra", "khajuraho", "jodhpur"]),
  spiritualIndia: bySlugs(["varanasi", "rishikesh", "amritsar", "ayodhya"]),
  beaches: bySlugs(["goa"]),
  mountains: bySlugs(["manali", "srinagar", "ooty", "darjeeling"]),
  wildlife: bySlugs([]),
  heritageCities: bySlugs(["jaipur", "udaipur", "jodhpur", "varanasi"]),
  familyDestinations: bySlugs(["goa", "ooty", "mysuru", "delhi"]),
  romanticDestinations: bySlugs(["udaipur", "goa", "manali", "darjeeling"]),
  adventureDestinations: bySlugs(["manali", "rishikesh", "goa"]),
  authenticMarkets: bySlugs(["jaipur", "varanasi", "srinagar", "delhi"]),
  famousFood: bySlugs(["lucknow", "amritsar", "hyderabad", "chennai"])
};
