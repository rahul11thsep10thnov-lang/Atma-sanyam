import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { destinationSummaries } from "@/lib/data/destinations";
import { DestinationCard } from "@/components/destination/DestinationCard";

export const metadata: Metadata = { title: "Explore Destinations" };

export default function ExplorePage({
  params,
  searchParams
}: {
  params: { locale: string };
  searchParams: { state?: string; tag?: string };
}) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const dict = getDictionary(locale);

  let list = destinationSummaries;
  if (searchParams.state) list = list.filter((d) => d.stateSlug === searchParams.state);
  if (searchParams.tag) list = list.filter((d) => d.tags.includes(searchParams.tag!));
  list = [...list].sort((a, b) => b.popularity - a.popularity);

  const states = Array.from(new Set(destinationSummaries.map((d) => d.stateSlug))).sort();

  return (
    <div className="container-page py-10">
      <h1 className="font-display text-3xl font-bold text-charcoal">{dict.common.nav.explore}</h1>
      <p className="mt-1 text-sm text-charcoal-light">
        {list.length} destination{list.length !== 1 ? "s" : ""} across India
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={`/${locale}/explore`}
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            !searchParams.state && !searchParams.tag ? "border-forest-600 bg-forest-600 text-white" : "border-forest-200 text-charcoal"
          }`}
        >
          All
        </a>
        {states.map((stateSlug) => {
          const label = destinationSummaries.find((d) => d.stateSlug === stateSlug)?.state ?? stateSlug;
          return (
            <a
              key={stateSlug}
              href={`/${locale}/explore?state=${stateSlug}`}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                searchParams.state === stateSlug ? "border-forest-600 bg-forest-600 text-white" : "border-forest-200 text-charcoal"
              }`}
            >
              {label}
            </a>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {list.map((d) => (
          <DestinationCard
            key={d.slug}
            destination={d}
            locale={locale}
            bestTimeLabel={dict.home.card.bestTime}
            exploreLabel={dict.home.card.explore}
          />
        ))}
      </div>
    </div>
  );
}
