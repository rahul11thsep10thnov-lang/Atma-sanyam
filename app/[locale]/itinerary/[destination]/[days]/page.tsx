import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isLocale, locales, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { destinationBySlug, getDb } from "@/lib/master/repo";
import { attractionHrefs, viewOf } from "@/lib/master/view";
import { planItinerary } from "@/lib/master/engine/itinerary";
import { formatINR } from "@/lib/master/generation/format";
import { TripPlanner } from "@/components/destination/TripPlanner";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";

interface PageParams {
  locale: string;
  destination: string;
  days: string;
}

const dayPart = (n: number) => `${n}-${n === 1 ? "day" : "days"}`;

function parseDays(segment: string): number | null {
  const m = segment.match(/^(\d{1,2})-days?$/);
  return m ? Number(m[1]) : null;
}

export function generateStaticParams() {
  const out: Array<{ locale: string; destination: string; days: string }> = [];
  for (const d of getDb().destinations.filter((x) => x.destination_level === "A"))
    for (let n = d.recommended_min_days; n <= d.recommended_max_days; n++)
      for (const locale of locales) out.push({ locale, destination: d.slug, days: dayPart(n) });
  return out;
}

export function generateMetadata({ params }: { params: PageParams }): Metadata {
  const dest = destinationBySlug(params.destination);
  const n = parseDays(params.days);
  if (!dest || !n || n < dest.recommended_min_days || n > dest.recommended_max_days) return {};
  const locale: Locale = isLocale(params.locale) ? params.locale : "en";
  const path = `/itinerary/${dest.slug}/${dayPart(n)}`;
  return {
    title: `${n}-day ${dest.name} itinerary`.slice(0, 60),
    description: `A day-by-day ${n}-day plan for ${dest.name}: what to see, when, how the days fit together, and an estimated budget.`,
    alternates: { canonical: `/${locale}${path}`, languages: Object.fromEntries(locales.map((l) => [l, `/${l}${path}`])) }
  };
}

export default function ItineraryPage({ params }: { params: PageParams }) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const dest = destinationBySlug(params.destination);
  const n = parseDays(params.days);
  if (!dest || !n) notFound();
  // Off-range lengths go to the closest supported plan instead of a thin or invented page.
  const clamped = Math.min(dest.recommended_max_days, Math.max(dest.recommended_min_days, n));
  if (clamped !== n || params.days !== dayPart(n)) redirect(`/${locale}/itinerary/${dest.slug}/${dayPart(clamped)}`);

  const dict = getDictionary(locale);
  const t = dict.destination.pages;
  const db = getDb();
  const view = viewOf(dest);
  const plan = planItinerary(db, { stops: [{ destination_id: dest.id, days: n }], travellers: 2, tier: "MID_RANGE" });
  const hrefs = attractionHrefs(plan.activities.map((a) => a.attraction_id).filter((x): x is string => Boolean(x)));
  const crumbs = [
    { label: dict.common.nav.home, href: `/${locale}` },
    { label: dest.name, href: `/${locale}${view.path}` },
    { label: t.itineraryTitle.replace("{days}", String(n)).replace("{name}", dest.name), href: `/${locale}/itinerary/${dest.slug}/${dayPart(n)}` }
  ];
  const others = Array.from({ length: dest.recommended_max_days - dest.recommended_min_days + 1 }, (_, i) => dest.recommended_min_days + i).filter((x) => x !== n);

  return (
    <>
      <BreadcrumbJsonLd items={crumbs} />
      <Breadcrumbs items={crumbs} />
      <header className="border-b border-forest-100 bg-forest-50/60 py-8">
        <div className="container-page">
          <Link href={`/${locale}${view.path}`} className="text-sm font-medium text-forest-600 hover:underline">← {t.fullGuide.replace("{name}", dest.name)}</Link>
          <h1 className="mt-2 font-display text-3xl font-bold text-charcoal sm:text-4xl">{t.itineraryTitle.replace("{days}", String(n)).replace("{name}", dest.name)}</h1>
          <p className="mt-1 max-w-3xl text-sm text-charcoal-light">{t.itineraryIntro}</p>
          <p className="mt-2 text-sm text-charcoal">
            {dict.common.ui.estimatedTotal}: <strong>{formatINR(plan.budget.total.typical)}</strong>{" "}
            <span className="text-xs text-charcoal-light">({t.budgetNote})</span>
          </p>
          {others.length > 0 && (
            <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-charcoal-light">
              {t.otherLengths}:
              {others.map((x) => (
                <Link key={x} href={`/${locale}/itinerary/${dest.slug}/${dayPart(x)}`} className="rounded-full border border-forest-200 bg-white px-3 py-1 font-medium text-forest-700 hover:bg-forest-50">
                  {x} {x === 1 ? dict.common.ui.dayWord : dict.common.ui.daysWord}
                </Link>
              ))}
            </p>
          )}
        </div>
      </header>
      <TripPlanner stops={[{ slug: dest.slug, days: n }]} minDays={dest.recommended_min_days} maxDays={dest.recommended_max_days} defaultDays={n} locale={locale} dict={dict} initial={{ plan, hrefs }} />
    </>
  );
}
