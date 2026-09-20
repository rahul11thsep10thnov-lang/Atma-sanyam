import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, locales, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { destinations, getDestinationBySlug } from "@/lib/data/destinations";
import { SubPageHeader } from "@/components/destination/SubPageHeader";
import { HotelsSection } from "@/components/destination/HotelsSection";
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
    title: `Hotels in ${destination.name}`,
    description: `Where to stay in ${destination.name}, ${destination.state} — luxury, mid-range, budget and heritage hotels.`
  };
}

export default function DestinationHotelsPage({ params }: { params: PageParams }) {
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
          { label: dict.common.nav.hotels, href: `/${locale}/india/${destination.stateSlug}/${destination.slug}/hotels` }
        ]}
      />
      <SubPageHeader
        destination={destination}
        locale={locale}
        title={`${dict.destination.sections.hotels} — ${destination.name}`}
      />
      <HotelsSection destination={destination} dict={dict} id="hotels-full" />
    </>
  );
}
