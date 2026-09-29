import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { search } from "@/lib/search/search";

export const metadata: Metadata = { title: "Search", robots: { index: false, follow: true } };

export default function SearchPage({ params, searchParams }: { params: { locale: string }; searchParams: { q?: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const dict = getDictionary(locale);
  const query = (searchParams.q ?? "").slice(0, 200);
  const res = query.trim() ? search(query, 20) : null;
  const t = dict.common.search;

  return (
    <div className="container-page py-10">
      <h1 className="font-display text-3xl font-bold text-charcoal">{dict.common.nav.search}</h1>
      <form method="get" className="mt-4 max-w-xl">
        <label htmlFor="search-q" className="sr-only">{dict.home.searchPlaceholder}</label>
        <div className="flex gap-2">
          <input id="search-q" name="q" type="search" defaultValue={query} placeholder={dict.home.searchPlaceholder} className="flex-1 rounded-full border border-forest-200 px-4 py-2.5 text-sm" />
          <button type="submit" className="rounded-full bg-forest-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-forest-700">{dict.common.ui.search}</button>
        </div>
      </form>

      {!res && <p className="mt-4 text-sm text-charcoal-light">{t.examples}</p>}
      {res && (
        <>
          {res.interpretation && <p className="mt-4 text-sm font-medium text-forest-700">{res.interpretation}</p>}
          <p className="mt-1 text-sm text-charcoal-light">{t.count.replace("{n}", String(res.hits.length)).replace("{q}", query)}</p>
          {res.hits.length === 0 && <p className="mt-4 text-sm text-charcoal-light">{t.none}</p>}
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {res.hits.map((h) => (
              <li key={h.href}>
                <Link href={`/${locale}${h.href}`} className="block h-full rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5 transition hover:shadow-md">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-saffron-600">{t.kinds[h.kind]}</span>
                  <span className="mt-0.5 block font-display text-base font-semibold text-charcoal">{h.title}</span>
                  <span className="mt-1 line-clamp-2 block text-xs text-charcoal-light">{h.subtitle}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
