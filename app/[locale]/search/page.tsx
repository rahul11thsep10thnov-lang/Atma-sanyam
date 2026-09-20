import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { search } from "@/lib/search/search";
import { DestinationCard } from "@/components/destination/DestinationCard";

export const metadata: Metadata = { title: "Search" };

export default function SearchPage({
  params,
  searchParams
}: {
  params: { locale: string };
  searchParams: { q?: string };
}) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const dict = getDictionary(locale);
  const query = searchParams.q ?? "";
  const results = query.trim() ? search(query, 20) : [];

  return (
    <div className="container-page py-10">
      <form method="get" className="max-w-xl">
        <label htmlFor="search-q" className="sr-only">
          {dict.home.searchPlaceholder}
        </label>
        <div className="flex gap-2">
          <input
            id="search-q"
            name="q"
            type="search"
            defaultValue={query}
            placeholder={dict.home.searchPlaceholder}
            className="flex-1 rounded-full border border-forest-200 px-4 py-2.5 text-sm"
          />
          <button type="submit" className="rounded-full bg-forest-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-forest-700">
            {dict.common.ui.search}
          </button>
        </div>
      </form>

      <p className="mt-4 text-sm text-charcoal-light">
        {query ? `${results.length} result${results.length !== 1 ? "s" : ""} for "${query}"` : "Try “hotels in Goa”, “places near Jaipur” or “3 day trip to Kerala”."}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {results.map((r) => (
          <DestinationCard
            key={r.destination.slug}
            destination={r.destination}
            locale={locale}
            bestTimeLabel={dict.home.card.bestTime}
            exploreLabel={dict.home.card.explore}
          />
        ))}
      </div>
    </div>
  );
}
