import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getDb } from "@/lib/master/repo";
import { allSummaries } from "@/lib/master/view";
import { DestinationCard } from "@/components/destination/DestinationCard";

export const metadata: Metadata = {
  title: "Explore destinations in India",
  description: "Browse every destination in the budgettourism database by state, with an honest verification status for each guide."
};

export default function ExplorePage({ params, searchParams }: { params: { locale: string }; searchParams: { state?: string; tag?: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const dict = getDictionary(locale);
  const t = dict.common.explore;

  let list = allSummaries();
  if (searchParams.state) list = list.filter((d) => d.stateSlug === searchParams.state);
  if (searchParams.tag) list = list.filter((d) => d.tags.includes(searchParams.tag!.toLowerCase()));
  list = [...list].sort((a, b) => b.popularity - a.popularity);

  const stateOptions = getDb().states.filter((s) => allSummaries().some((d) => d.stateSlug === s.slug));
  const pill = (active: boolean) => `rounded-full border px-3 py-1 text-xs font-medium ${active ? "border-forest-600 bg-forest-600 text-white" : "border-forest-200 text-charcoal hover:bg-forest-50"}`;

  return (
    <div className="container-page py-10">
      <h1 className="font-display text-3xl font-bold text-charcoal">{dict.common.nav.explore}</h1>
      <p className="mt-1 text-sm text-charcoal-light">{t.count.replace("{n}", String(list.length))}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={`/${locale}/explore`} className={pill(!searchParams.state && !searchParams.tag)}>{t.all}</Link>
        {stateOptions.map((s) => (
          <Link key={s.slug} href={`/${locale}/explore?state=${s.slug}`} className={pill(searchParams.state === s.slug)}>{s.name}</Link>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="mt-8 text-sm text-charcoal-light">{t.noDestinations}</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((d) => (
            <DestinationCard key={d.slug} destination={d} locale={locale} bestTimeLabel={dict.home.card.bestTime} exploreLabel={dict.home.card.explore} fluid />
          ))}
        </div>
      )}
    </div>
  );
}
