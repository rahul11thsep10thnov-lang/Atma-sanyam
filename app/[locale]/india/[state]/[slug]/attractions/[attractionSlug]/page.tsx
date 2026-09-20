import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, locales, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { destinations, getDestinationBySlug } from "@/lib/data/destinations";
import { SmartImage } from "@/components/ui/SmartImage";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

interface PageParams {
  locale: string;
  state: string;
  slug: string;
  attractionSlug: string;
}

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    destinations.flatMap((d) =>
      d.attractions.map((a) => ({ locale, state: d.stateSlug, slug: d.slug, attractionSlug: a.slug }))
    )
  );
}

export function generateMetadata({ params }: { params: PageParams }): Metadata {
  const destination = getDestinationBySlug(params.slug);
  const attraction = destination?.attractions.find((a) => a.slug === params.attractionSlug);
  if (!destination || !attraction) return {};
  return {
    title: `${attraction.name} — ${destination.name}`,
    description: attraction.description
  };
}

export default function AttractionPage({ params }: { params: PageParams }) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const destination = getDestinationBySlug(params.slug);
  const attraction = destination?.attractions.find((a) => a.slug === params.attractionSlug);
  if (!destination || destination.stateSlug !== params.state || !attraction) notFound();
  const dict = getDictionary(locale);
  const { ui } = dict.common;
  const { thingsToDoCategories } = dict.destination;

  return (
    <>
      <Breadcrumbs
        items={[
          { label: dict.common.nav.home, href: `/${locale}` },
          { label: destination.name, href: `/${locale}/india/${destination.stateSlug}/${destination.slug}` },
          {
            label: dict.destination.sections.thingsToDo,
            href: `/${locale}/india/${destination.stateSlug}/${destination.slug}#things-to-do`
          },
          { label: attraction.name, href: "#" }
        ]}
      />
      <div className="relative h-64 w-full overflow-hidden sm:h-96">
        <SmartImage image={attraction.images[0]} className="h-full w-full object-cover" priority />
      </div>
      <div className="container-page py-8">
        <div className="flex flex-wrap gap-1">
          {attraction.categories.map((cat) => (
            <span key={cat} className="rounded-full bg-saffron-50 px-2 py-0.5 text-[11px] font-medium text-saffron-700">
              {thingsToDoCategories[cat]}
            </span>
          ))}
        </div>
        <h1 className="mt-2 font-display text-3xl font-bold text-charcoal sm:text-4xl">{attraction.name}</h1>
        <p className="mt-3 max-w-2xl text-charcoal-light">{attraction.description}</p>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Location", attraction.location],
            [ui.openingHours, attraction.openingHours],
            [ui.timeRequired, attraction.timeRequired],
            [ui.entryFee, attraction.entryFee],
            [ui.bestTime, attraction.bestVisitingTime]
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-forest-50 p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-saffron-600">{label}</dt>
              <dd className="mt-1 text-sm text-charcoal">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 flex flex-wrap gap-4 text-sm font-medium">
          {attraction.mapUrl && (
            <a href={attraction.mapUrl} target="_blank" rel="noopener noreferrer" className="text-forest-600 hover:underline">
              {ui.viewOnMap}
            </a>
          )}
          {attraction.officialWebsite && (
            <a href={attraction.officialWebsite} target="_blank" rel="noopener noreferrer" className="text-forest-600 hover:underline">
              {ui.website}
            </a>
          )}
        </div>
        <p className="mt-4 text-xs text-charcoal-light">
          {ui.source}: {attraction.source.label}
        </p>
      </div>
    </>
  );
}
