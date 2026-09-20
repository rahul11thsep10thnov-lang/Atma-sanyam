import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, locales, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { destinations, getDestinationBySlug } from "@/lib/data/destinations";
import { SubPageHeader } from "@/components/destination/SubPageHeader";
import { ItineraryForm } from "@/components/destination/ItineraryForm";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

interface PageParams {
  locale: string;
  state: string;
  slug: string;
}

export function generateStaticParams() {
  return locales.flatMap((locale) => destinations.map((d) => ({ locale, state: d.stateSlug, slug: d.slug })));
}

export function generateMetadata({ params }: { params: PageParams }): Metadata {
  const destination = getDestinationBySlug(params.slug);
  if (!destination) return {};
  return {
    title: `${destination.name} Itinerary Planner`,
    description: `Build a personalised day-by-day trip plan for ${destination.name}, ${destination.state}.`
  };
}

export default function DestinationItineraryPage({ params }: { params: PageParams }) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const destination = getDestinationBySlug(params.slug);
  if (!destination || destination.stateSlug !== params.state) notFound();
  const dict = getDictionary(locale);

  return (
    <>
      <Breadcrumbs
        items={[
          { label: dict.common.nav.home, href: `/${locale}` },
          { label: destination.name, href: `/${locale}/india/${destination.stateSlug}/${destination.slug}` },
          {
            label: dict.destination.itinerary.title,
            href: `/${locale}/india/${destination.stateSlug}/${destination.slug}/itinerary`
          }
        ]}
      />
      <SubPageHeader
        destination={destination}
        locale={locale}
        title={`${dict.destination.itinerary.title} — ${destination.name}`}
        subtitle={dict.destination.itinerary.estimatedDisclaimer}
      />
      <ItineraryForm destination={destination} dict={dict} />
    </>
  );
}
