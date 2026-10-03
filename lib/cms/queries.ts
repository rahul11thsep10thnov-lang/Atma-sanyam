import "@/lib/cms/server-guard";
import { bootstrapFromSeed } from "./bootstrap";
import { allDestinations, getDestinationBySlug, getSettings, publishedDestinations } from "./store";
import { assetOf } from "./images";
import type { ImageAsset } from "@/lib/types";
import type { CmsCategory, CmsDestination, CompanionType, SiteSettings } from "./types";

/**
 * Read side of the CMS for public pages. Only PUBLISHED records are ever
 * returned here; drafts and archived destinations do not exist as far as the
 * site is concerned.
 */

function ready() {
  bootstrapFromSeed();
}

export interface CmsCard {
  id: string;
  slug: string;
  name: string;
  state: string | null;
  state_slug: string | null;
  headline: string | null;
  short_description: string | null;
  best_time_text: string | null;
  image: ImageAsset;
  categories: CmsCategory[];
  companions: CompanionType[];
  attractions: number;
  published_at: string | null;
  href: string; // locale-less
}

export function cardOf(d: CmsDestination): CmsCard {
  return {
    id: d.id,
    slug: d.slug,
    name: d.name,
    state: d.state,
    state_slug: d.state_slug,
    headline: d.headline,
    short_description: d.short_description,
    best_time_text: d.best_time_text,
    image: assetOf(d.hero_image, d.name, 1200, 800),
    categories: d.categories,
    companions: d.companions,
    attractions: d.attractions.filter((a) => a.status === "ACTIVE").length,
    published_at: d.published_at,
    href: `/destinations/${d.slug}`
  };
}

export function publishedCards(): CmsCard[] {
  ready();
  return publishedDestinations().map(cardOf);
}

export function publishedBySlug(slug: string): CmsDestination | null {
  ready();
  const d = getDestinationBySlug(slug);
  return d && d.status === "PUBLISHED" ? d : null;
}

export function anyBySlug(slug: string): CmsDestination | null {
  ready();
  return getDestinationBySlug(slug);
}

export function allForAdmin(): CmsDestination[] {
  ready();
  return allDestinations();
}

export function siteSettings(): SiteSettings {
  return getSettings();
}

/** The homepage's sections, each a short list; empty sections are skipped by the page. */
export function homepageCms(companion: CompanionType | null) {
  const cards = publishedCards();
  const byCat = (c: CmsCategory, n = 8) => cards.filter((d) => d.categories.includes(c)).slice(0, n);
  const byCompanion = (c: CompanionType, n = 8) => cards.filter((d) => d.companions.includes(c)).slice(0, n);
  const recent = [...cards].sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? "")).slice(0, 8);
  const states = new Map<string, CmsCard[]>();
  for (const c of cards) if (c.state) states.set(c.state, [...(states.get(c.state) ?? []), c]);
  return {
    total: cards.length,
    recommended: companion ? byCompanion(companion, 8) : [],
    popular: cards.slice(0, 8),
    byState: [...states.entries()].sort((a, b) => b[1].length - a[1].length).map(([state, list]) => ({ state, slug: list[0]?.state_slug ?? null, count: list.length, sample: list[0] })),
    attractions: cards.flatMap((c) => {
      const d = getDestinationBySlug(c.slug)!;
      return d.attractions.filter((a) => a.status === "ACTIVE").slice(0, 2).map((a) => ({ id: a.id, name: a.name, destination: c.name, href: `${c.href}#attraction-${a.slug}`, image: assetOf(a.images.find((i) => i.approval_status === "APPROVED") ?? null, a.name, 800, 600) }));
    }).slice(0, 8),
    historical: byCat("HISTORICAL"),
    nature: cards.filter((d) => d.categories.includes("NATURE") || d.categories.includes("WILDLIFE") || d.categories.includes("MOUNTAIN")).slice(0, 8),
    spiritual: byCat("SPIRITUAL"),
    family: byCompanion("FAMILY"),
    couple: byCompanion("COUPLE"),
    solo: byCompanion("SOLO"),
    budget: byCat("BUDGET"),
    recent
  };
}

/** Compact autocomplete entries for destinations and attractions (serialisable, safe to pass to the client). */
export function cmsSuggestions(): Array<{ label: string; sublabel: string; href: string }> {
  ready();
  const out: Array<{ label: string; sublabel: string; href: string }> = [];
  for (const d of publishedDestinations()) {
    out.push({ label: d.name, sublabel: d.state ?? "India", href: `/destinations/${d.slug}` });
    for (const a of d.attractions) if (a.status === "ACTIVE") out.push({ label: a.name, sublabel: `${d.name} · attraction`, href: `/destinations/${d.slug}#attraction-${a.slug}` });
  }
  return out;
}
