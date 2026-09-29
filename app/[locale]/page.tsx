import type { Metadata } from "next";
import { isLocale, locales, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import Link from "next/link";
import { homepageSections, popularSearchSlugs, suggestionIndex, upcomingFestivalCards } from "@/lib/master/view";
import { getDb } from "@/lib/master/repo";
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
      languages: Object.fromEntries(locales.map((l) => [l, `/${l}`]))
    },
    openGraph: {
      title: `budgettourism — ${dict.home.heroHeadline}`,
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

  const homepageRails = homepageSections();
  const suggestions = suggestionIndex();
  const popular = popularSearchSlugs
    .map((slug) => suggestions.find((x) => x.href.endsWith(`/${slug}`)))
    .filter((x): x is NonNullable<typeof x> => Boolean(x));
  const circuits = getDb().circuits.slice(0, 6);

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
        suggestions={suggestions}
        popular={popular}
      />

      <div className="divide-y divide-forest-100/60">
        <DestinationRail
          title={home.sections.popularDestinations}
          subtitle={home.sections.popularDestinationsSubtitle}
          destinations={homepageRails.popularDestinations}
          {...railProps}
        />
        <DestinationRail
          title={home.sections.weekendGetaways}
          subtitle={home.sections.weekendGetawaysSubtitle}
          destinations={homepageRails.weekendGetaways}
          {...railProps}
        />
        <DestinationRail
          title={home.sections.historicalIndia}
          subtitle={home.sections.historicalIndiaSubtitle}
          destinations={homepageRails.historicalIndia}
          {...railProps}
        />
        <DestinationRail
          title={home.sections.spiritualIndia}
          subtitle={home.sections.spiritualIndiaSubtitle}
          destinations={homepageRails.spiritualIndia}
          {...railProps}
        />
        <DestinationRail
          title={home.sections.beaches}
          subtitle={home.sections.beachesSubtitle}
          destinations={homepageRails.beaches}
          {...railProps}
        />
        <DestinationRail
          title={home.sections.mountains}
          subtitle={home.sections.mountainsSubtitle}
          destinations={homepageRails.mountains}
          {...railProps}
        />
        <DestinationRail
          title={home.sections.wildlife}
          subtitle={home.sections.wildlifeSubtitle}
          destinations={homepageRails.wildlife}
          {...railProps}
        />
        <DestinationRail
          title={home.sections.heritageCities}
          subtitle={home.sections.heritageCitiesSubtitle}
          destinations={homepageRails.heritageCities}
          {...railProps}
        />
        <DestinationRail
          title={home.sections.familyDestinations}
          subtitle={home.sections.familyDestinationsSubtitle}
          destinations={homepageRails.familyDestinations}
          {...railProps}
        />
        <DestinationRail
          title={home.sections.romanticDestinations}
          subtitle={home.sections.romanticDestinationsSubtitle}
          destinations={homepageRails.romanticDestinations}
          {...railProps}
        />
        <DestinationRail
          title={home.sections.adventureDestinations}
          subtitle={home.sections.adventureDestinationsSubtitle}
          destinations={homepageRails.adventureDestinations}
          {...railProps}
        />
        <DestinationRail
          title={home.sections.authenticMarkets}
          subtitle={home.sections.authenticMarketsSubtitle}
          destinations={homepageRails.authenticMarkets}
          {...railProps}
        />
        <DestinationRail
          title={home.sections.famousFood}
          subtitle={home.sections.famousFoodSubtitle}
          destinations={homepageRails.famousFood}
          {...railProps}
        />
        {circuits.length > 0 && (
          <section className="container-page py-8">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h2 className="section-heading">{home.routes.title}</h2>
                <p className="mt-1 text-sm text-charcoal-light">{home.routes.subtitle}</p>
              </div>
              <Link href={`/${locale}/trips`} className="text-sm font-semibold text-forest-600 hover:underline">
                {home.routes.seeAll}
              </Link>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {circuits.map((c) => (
                <li key={c.id}>
                  <Link href={`/${locale}/trips/${c.slug}`} className="block h-full rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-lg">
                    <h3 className="font-display text-base font-semibold text-charcoal">{c.name}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-charcoal-light">{c.description}</p>
                    <p className="mt-2 text-xs font-medium text-forest-600">
                      {c.minimum_days}–{c.maximum_days} {home.routes.daysLabel}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        <FestivalRail
          locale={locale}
          festivals={upcomingFestivalCards(8)}
          draftLabel={dict.common.ui.draftBadge}
          title={home.sections.upcomingFestivals}
          subtitle={home.sections.upcomingFestivalsSubtitle}
        />
      </div>
    </>
  );
}
