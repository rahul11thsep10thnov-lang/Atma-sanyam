import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n/config";
import { getDb, stateById } from "@/lib/master/repo";
import { attractionPath } from "@/lib/master/view";
import { publishedCards } from "@/lib/cms/queries";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://budgettourism.com";
const SUBPATHS = ["/where-to-stay", "/food", "/shopping", "/weather", "/history"];

/** Every public page in every language. Hidden-gem attractions are listed too; state pages with no destinations are not. */
export default function sitemap(): MetadataRoute.Sitemap {
  const db = getDb();
  const entries: MetadataRoute.Sitemap = [];
  const add = (path: string, changeFrequency: "daily" | "weekly" | "monthly", priority: number) => {
    for (const locale of locales) entries.push({ url: `${SITE_URL}/${locale}${path}`, changeFrequency, priority });
  };

  add("", "daily", 1);
  add("/explore", "daily", 0.8);
  add("/trips", "weekly", 0.8);

  for (const state of db.states) if (db.destinations.some((d) => d.state_id === state.id)) add(`/india/${state.slug}`, "weekly", 0.7);

  for (const d of db.destinations) {
    const base = `/india/${stateById(d.state_id)!.slug}/${d.slug}`;
    add(base, "weekly", d.destination_level === "A" ? 0.9 : 0.7);
    for (const sub of SUBPATHS) add(`${base}${sub}`, "monthly", 0.6);
    if (d.destination_level === "A")
      for (let n = d.recommended_min_days; n <= d.recommended_max_days; n++) add(`/itinerary/${d.slug}/${n}-${n === 1 ? "day" : "days"}`, "monthly", 0.6);
  }
  for (const a of db.attractions) add(attractionPath(a), "monthly", 0.5);
  for (const c of db.circuits) add(`/trips/${c.slug}`, "monthly", 0.7);

  // Database-driven destination pages: only PUBLISHED records, one URL per slug per locale.
  add("/destinations", "daily", 0.8);
  const seenSlugs = new Set<string>();
  for (const c of publishedCards()) {
    if (seenSlugs.has(c.slug)) continue;
    seenSlugs.add(c.slug);
    add(`/destinations/${c.slug}`, "weekly", 0.8);
  }

  return entries;
}
