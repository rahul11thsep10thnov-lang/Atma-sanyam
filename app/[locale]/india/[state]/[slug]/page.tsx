import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, locales, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { destinations, getDestinationBySlug } from "@/lib/data/destinations";
import { DestinationHeader } from "@/components/destination/DestinationHeader";
import { EncyclopediaSection } from "@/components/destination/EncyclopediaSection";
import { ThingsToDoSection } from "@/components/destination/ThingsToDoSection";
import { HotelsSection } from "@/components/destination/HotelsSection";
import { RestaurantsSection } from "@/components/destination/RestaurantsSection";
import { ShoppingSection } from "@/components/destination/ShoppingSection";
import { FoodSection } from "@/components/destination/FoodSection";
import { WeatherSection } from "@/components/destination/WeatherSection";
import { TransportationSection } from "@/components/destination/TransportationSection";
import { MapSection } from "@/components/destination/MapSection";
import { TripCalculator } from "@/components/destination/TripCalculator";
import { ItineraryTeaser } from "@/components/destination/ItineraryTeaser";
import { EmergencySection } from "@/components/destination/EmergencySection";
import { FaqSection } from "@/components/destination/FaqSection";
import { ContinueJourney } from "@/components/destination/ContinueJourney";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { BreadcrumbJsonLd, DestinationJsonLd, FaqJsonLd } from "@/components/seo/JsonLd";

interface PageParams {
  locale: string;
  state: string;
  slug: string;
}

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    destinations.map((d) => ({ locale, state: d.stateSlug, slug: d.slug }))
  );
}

export function generateMetadata({ params }: { params: PageParams }): Metadata {
  const destination = getDestinationBySlug(params.slug);
  if (!destination) return {};
  const locale: Locale = isLocale(params.locale) ? params.locale : "en";
  const path = `/${locale}/india/${destination.stateSlug}/${destination.slug}`;
  return {
    title: `${destination.name} Travel Guide — ${destination.state}`,
    description: destination.shortDescription,
    alternates: {
      canonical: path,
      languages: Object.fromEntries(locales.map((l) => [l, `/${l}/india/${destination.stateSlug}/${destination.slug}`]))
    },
    openGraph: {
      title: `${destination.name} — TripToe`,
      description: destination.shortDescription,
      type: "article"
    }
  };
}

export default function DestinationPage({ params }: { params: PageParams }) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const destination = getDestinationBySlug(params.slug);
  if (!destination || destination.stateSlug !== params.state) notFound();

  const dict = getDictionary(locale);

  const breadcrumbItems = [
    { label: dict.common.nav.home, href: `/${locale}` },
    { label: "India", href: `/${locale}/explore` },
    { label: destination.state, href: `/${locale}/explore?state=${destination.stateSlug}` },
    { label: destination.name, href: `/${locale}/india/${destination.stateSlug}/${destination.slug}` }
  ];

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbItems} />
      <DestinationJsonLd destination={destination} locale={locale} />
      <FaqJsonLd faqs={destination.faqs} />

      <Breadcrumbs items={breadcrumbItems} />
      <DestinationHeader destination={destination} locale={locale} dict={dict} />
      <EncyclopediaSection destination={destination} dict={dict} />
      <ThingsToDoSection destination={destination} dict={dict} />
      <HotelsSection destination={destination} dict={dict} limit={3} />
      <RestaurantsSection destination={destination} dict={dict} limit={3} />
      <ShoppingSection destination={destination} dict={dict} />
      <FoodSection destination={destination} dict={dict} />
      <WeatherSection destination={destination} dict={dict} />
      <TransportationSection destination={destination} dict={dict} />
      <MapSection destination={destination} dict={dict} />
      <TripCalculator destination={destination} dict={dict} />
      <ItineraryTeaser destination={destination} locale={locale} dict={dict} />
      <EmergencySection destination={destination} dict={dict} />
      <FaqSection destination={destination} dict={dict} />
      <ContinueJourney destination={destination} locale={locale} dict={dict} />
    </>
  );
}
