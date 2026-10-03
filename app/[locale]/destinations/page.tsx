import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { publishedCards } from "@/lib/cms/queries";
import { CmsCard } from "@/components/cms/CmsCard";
import { CMS_CATEGORIES } from "@/lib/cms/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Destinations", description: "Every published destination guide." };

const PAGE = 24;

export default function DestinationsIndex({ params, searchParams }: { params: { locale: string }; searchParams: { state?: string; category?: string; page?: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const dict = getDictionary(locale);
  const t = dict.destination.cms;
  let list = publishedCards();
  const states = [...new Set(list.map((c) => c.state).filter((s): s is string => Boolean(s)))].sort();
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
    </div>
  );
}
