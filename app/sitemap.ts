import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n/config";
import { destinations } from "@/lib/data/destinations";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://triptoe.com";
const SUBPATHS = ["", "/hotels", "/restaurants", "/shopping", "/food", "/weather", "/itinerary"];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    entries.push({ url: `${SITE_URL}/${locale}`, changeFrequency: "daily", priority: 1 });
    entries.push({ url: `${SITE_URL}/${locale}/explore`, changeFrequency: "daily", priority: 0.8 });

    for (const destination of destinations) {
      const base = `${SITE_URL}/${locale}/india/${destination.stateSlug}/${destination.slug}`;
      for (const subpath of SUBPATHS) {
        entries.push({
          url: `${base}${subpath}`,
          changeFrequency: subpath === "" ? "weekly" : "monthly",
          priority: subpath === "" ? 0.9 : 0.6
        });
      }
      for (const attraction of destination.attractions) {
        entries.push({
          url: `${base}/attractions/${attraction.slug}`,
          changeFrequency: "monthly",
          priority: 0.5
        });
      }
    }
  }

  return entries;
}
