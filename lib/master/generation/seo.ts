import type { SeoMetadata } from "../types";
import { joinList } from "./format";
import type { GeneratedPage, GenerationInput } from "./types";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://budgettourism.com";

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:\s]+$/, "")}…`;
}

/**
 * Metadata for a destination page. Useful first: the title and description
 * are built from the destination's own records, not stuffed with search terms.
 */
export function buildSeo(input: GenerationInput, page: GeneratedPage): SeoMetadata {
  const d = input.destination;
  const title = truncate(`${d.name} Travel Guide — ${d.state.name} | budgettourism`, 60);

  const parts: string[] = [d.one_line_description.replace(/\.$/, "") + "."];
  // Too-short summaries are extended from the destination's own description — never with filler.
  if (parts.join(" ").length < 70) parts.push(d.short_description.split(/(?<=[.!?])\s/)[0]);
  if (input.attractions.length) parts.push(`Top places: ${joinList(input.attractions.slice(0, 3).map((a) => a.name))}.`);
  if (d.best_months.text) parts.push(`Best time: ${d.best_months.text}.`);
  const description = truncate(parts.join(" "), 160);

  const keywordPool = [
    `${d.name} travel guide`, `things to do in ${d.name}`, `${d.name} itinerary`, `best time to visit ${d.name}`,
    ...input.categories.slice(0, 2).map((c) => `${d.name} ${c.toLowerCase().replace(/_/g, " ")}`)
  ];

  return {
    entity_id: d.id,
    meta_title: title,
    meta_description: description,
    canonical_url: `${SITE_URL}/en/india/${d.state.slug}/${d.slug}`,
    slug: d.slug,
    h1: page.title,
    keywords: [...new Set(keywordPool)].slice(0, 6),
    og_title: `${d.name} — ${d.one_line_description}`,
    og_description: description,
    og_image: null, // set once licensed imagery exists
    schema_type: d.level === "B" ? "TouristAttraction" : "TouristDestination",
    robots: "index,follow",
    last_updated: new Date("2026-09-28T00:00:00.000Z").toISOString()
  };
}
