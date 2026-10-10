import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { publishedCards } from "@/lib/cms/queries";
import { CmsCard } from "@/components/cms/CmsCard";
import { CMS_CATEGORIES } from "@/lib/cms/types";
import { seedStubs } from "@/lib/cms/seedView";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Destinations", description: "Every published destination guide." };

const PAGE = 24;

export default function DestinationsIndex({ params, searchParams }: { params: { locale: string }; searchParams: { state?: string; category?: string; page?: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const dict = getDictionary(locale);
  const t = dict.destination.cms;
  let list = publishedCards();
  // Master-list places not yet researched: listed by name only (no category, since the list's typing is unverified).
  const allStubs = seedStubs();
  const stubs = searchParams.category ? [] : allStubs.filter((s) => !searchParams.state || s.state === searchParams.state);
  const stubStates = [...new Set(stubs.map((s) => s.state ?? "India"))].sort();
  const states = [...new Set([...list.map((c) => c.state), ...allStubs.map((s) => s.state)].filter((s): s is string => Boolean(s)))].sort();
  if (searchParams.state) list = list.filter((c) => c.state === searchParams.state);
  if (searchParams.category) list = list.filter((c) => c.categories.includes(searchParams.category as (typeof CMS_CATEGORIES)[number]));
  const page = Math.max(1, Number(searchParams.page) || 1);
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const slice = list.slice((page - 1) * PAGE, page * PAGE);
  const pill = (active: boolean) => `rounded-full border px-3 py-1 text-xs font-medium ${active ? "border-forest-600 bg-forest-600 text-white" : "border-forest-200 bg-white text-charcoal hover:bg-forest-50"}`;
  const href = (q: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ state: searchParams.state, category: searchParams.category, ...q })) if (v) p.set(k, v);
    const s = p.toString();
    return `/${locale}/destinations${s ? `?${s}` : ""}`;
  };

  return (
    <div className="container-page py-10">
      <h1 className="font-display text-3xl font-bold text-charcoal sm:text-4xl">{t.destinationsTitle}</h1>
      <p className="mt-2 max-w-2xl text-sm text-charcoal-light">{t.destinationsIntro}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href={href({ state: undefined, category: undefined })} className={pill(!searchParams.state && !searchParams.category)}>{dict.common.explore.all}</Link>
        {states.map((s) => (
          <Link key={s} href={href({ state: s, page: undefined })} className={pill(searchParams.state === s)}>{s}</Link>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {CMS_CATEGORIES.map((c) => (
          <Link key={c} href={href({ category: searchParams.category === c ? undefined : c, page: undefined })} className={pill(searchParams.category === c)}>{c.toLowerCase().replace("_", " ")}</Link>
        ))}
      </div>
      <p className="mt-4 text-sm text-charcoal-light">{dict.common.explore.count.replace("{n}", String(list.length))}</p>
      {slice.length === 0 ? (
        <p className="mt-8 text-sm text-charcoal-light">{dict.common.explore.noDestinations}</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {slice.map((c) => (
            <CmsCard key={c.id} card={c} locale={locale} bestTimeLabel={dict.home.card.bestTime} fluid />
          ))}
        </div>
      )}
      {pages > 1 && (
        <nav className="mt-8 flex flex-wrap gap-2" aria-label="Pagination">
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <Link key={n} href={href({ page: String(n) })} className={pill(n === page)} aria-current={n === page ? "page" : undefined}>{n}</Link>
          ))}
        </nav>
      )}
      {stubs.length > 0 && (
        <section className="mt-12" aria-labelledby="being-researched">
          <h2 id="being-researched" className="section-heading">{t.beingResearchedTitle}</h2>
          <p className="mt-1 max-w-2xl text-sm text-charcoal-light">{t.beingResearchedIntro} · {t.beingResearchedCount.replace("{n}", String(stubs.length))}</p>
          <div className="mt-5 columns-1 gap-6 sm:columns-2 lg:columns-3">
            {stubStates.map((st) => (
              <div key={st} className="mb-5 break-inside-avoid rounded-2xl bg-peach p-4 ring-1 ring-black/5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-saffron-700">{st}</h3>
                <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
                  {stubs.filter((x) => (x.state ?? "India") === st).map((x) => (
                    <li key={x.id}><Link href={`/${locale}${x.href}`} className="text-forest-700 hover:underline">{x.name}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
