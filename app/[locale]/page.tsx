import type { Metadata } from "next";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { homepageSections } from "@/lib/data/destinations";
import { Hero } from "@/components/home/Hero";
import { DestinationRail } from "@/components/home/DestinationRail";
import { FestivalRail } from "@/components/home/FestivalRail";
import { notFound } from "next/navigation";

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  const locale: Locale = isLocale(params.locale) ? params.locale : "en";
  const dict = getDictionary(locale);
  return {
    title: dict.home.heroHeadline,
    description: dict.home.heroSubheading,
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(["en", "hi", "mr", "kn", "ta", "te"].map((l) => [l, `/${l}`]))
    },
    openGraph: {
      title: `TripToe — ${dict.home.heroHeadline}`,
      description: dict.home.heroSubheading,
      type: "website"
    }
  };
}

export default function HomePage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const dict = getDictionary(locale);
  const { home } = dict;

  const railProps = {
    locale,
    bestTimeLabel: home.card.bestTime,
    exploreLabel: home.card.explore
  };

  return (
    <>
      <Hero
        locale={locale}
        headline={home.heroHeadline}
        subheading={home.heroSubheading}
        placeholder={home.searchPlaceholder}
        searchExamples={home.searchExamples}
        popularSearchesLabel={home.popularSearches}
      />

      <div className="divide-y divide-forest-100/60">
        <DestinationRail
          title={home.sections.popularDestinations}
          subtitle={home.sections.popularDestinationsSubtitle}
          destinations={homepageSections.popularDestinations}
          {...railProps}
        />
        <DestinationRail
          title={home.sections.weekendGetaways}
          subtitle={home.sections.weekendGetawaysSubtitle}
          destinations={homepageSections.weekendGetaways}
          {...railProps}
        />
        <DestinationRail
          title={home.sections.historicalIndia}
          subtitle={home.sections.historicalIndiaSubtitle}
          destinations={homepageSections.historicalIndia}
          {...railProps}
        />
        <DestinationRail
          title={home.sections.spiritualIndia}
          subtitle={home.sections.spiritualIndiaSubtitle}
          destinations={homepageSections.spiritualIndia}
          {...railProps}
        />
        <DestinationRail
          title={home.sections.beaches}
          subtitle={home.sections.beachesSubtitle}
          destinations={homepageSections.beaches}
          {...railProps}
        />
        <DestinationRail
          title={home.sections.mountains}
          subtitle={home.sections.mountainsSubtitle}
          destinations={homepageSections.mountains}
          {...railProps}
        />
        <DestinationRail
          title={home.sections.wildlife}
          subtitle={home.sections.wildlifeSubtitle}
          destinations={homepageSections.wildlife}
          {...railProps}
        />
        <DestinationRail
          title={home.sections.heritageCities}
          subtitle={home.sections.heritageCitiesSubtitle}
          destinations={homepageSections.heritageCities}
          {...railProps}
        />
        <DestinationRail
          title={home.sections.familyDestinations}
          subtitle={home.sections.familyDestinationsSubtitle}
          destinations={homepageSections.familyDestinations}
          {...railProps}
        />
        <DestinationRail
          title={home.sections.romanticDestinations}
          subtitle={home.sections.romanticDestinationsSubtitle}
          destinations={homepageSections.romanticDestinations}
          {...railProps}
        />
        <DestinationRail
          title={home.sections.adventureDestinations}
          subtitle={home.sections.adventureDestinationsSubtitle}
          destinations={homepageSections.adventureDestinations}
          {...railProps}
        />
        <DestinationRail
          title={home.sections.authenticMarkets}
          subtitle={home.sections.authenticMarketsSubtitle}
          destinations={homepageSections.authenticMarkets}
          {...railProps}
        />
        <DestinationRail
          title={home.sections.famousFood}
          subtitle={home.sections.famousFoodSubtitle}
          destinations={homepageSections.famousFood}
          {...railProps}
        />
        <FestivalRail
          locale={locale}
          title={home.sections.upcomingFestivals}
          subtitle={home.sections.upcomingFestivalsSubtitle}
        />
      </div>
    </>
  );
}
