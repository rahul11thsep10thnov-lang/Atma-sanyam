import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, locales, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { circuitBySlug, getDb, stateById } from "@/lib/master/repo";
import { attractionHrefs, summaryOf } from "@/lib/master/view";
import { CircuitEngine } from "@/lib/master/engine/circuits";
import { planItinerary } from "@/lib/master/engine/itinerary";
import { labelize, monthRangeText } from "@/lib/master/generation/format";
import { routeCards } from "@/lib/master/routeView";
import { RouteCard } from "@/components/plan/RouteCard";
import { TripPlanner } from "@/components/destination/TripPlanner";
import { DestinationCard } from "@/components/destination/DestinationCard";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { BreadcrumbJsonLd, TripJsonLd } from "@/components/seo/JsonLd";

interface PageParams {
  locale: string;
  slug: string;
}

export function generateStaticParams() {
  return locales.flatMap((locale) => getDb().circuits.map((c) => ({ locale, slug: c.slug })));
}

export function generateMetadata({ params }: { params: PageParams }): Metadata {
  const c = circuitBySlug(params.slug);
  if (!c) return {};
  const locale: Locale = isLocale(params.locale) ? params.locale : "en";
  return {
    title: `${c.name} — ${c.recommended_days}-day route`.slice(0, 60),
    description: c.description.slice(0, 160),
    alternates: { canonical: `/${locale}/trips/${c.slug}`, languages: Object.fromEntries(locales.map((l) => [l, `/${l}/trips/${c.slug}`])) }
  };
}

export default function CircuitPage({ params }: { params: PageParams }) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const circuit = circuitBySlug(params.slug);
  if (!circuit) notFound();
  const dict = getDictionary(locale);
  const t = dict.destination.pages;
  const db = getDb();

  const stops = db.circuit_destinations.filter((cd) => cd.circuit_id === circuit.id).sort((a, b) => a.sequence_number - b.sequence_number);
  const dests = stops.map((s) => db.destinations.find((d) => d.id === s.destination_id)!);
  const mandatory = stops.filter((s) => !s.optional);
  const planStops = mandatory.map((s) => ({ destination_id: s.destination_id, days: s.recommended_days }));
  const plan = planItinerary(db, { stops: planStops, travellers: 2, tier: "MID_RANGE" });
  const hrefs = attractionHrefs(plan.activities.map((a) => a.attraction_id).filter((x): x is string => Boolean(x)));
  const assessment = new CircuitEngine(db).scoreRoute(mandatory.map((s) => s.destination_id), { days: circuit.recommended_days });
  const [card] = assessment ? routeCards([{ ...assessment, circuit_id: circuit.id }]) : [];
  const season = monthRangeText(circuit.season_start, circuit.season_end);
  const path = `/${locale}/trips/${circuit.slug}`;
  const crumbs = [
    { label: dict.common.nav.home, href: `/${locale}` },
    { label: dict.common.nav.trips, href: `/${locale}/trips` },
    { label: circuit.name, href: path }
  ];
  const stateNames = circuit.states_involved.map((id) => stateById(id)?.name).filter(Boolean).join(", ");
  const inPlan = new Set(planStops.map((s) => s.destination_id));
  const optionalStops = dests.filter((d) => !inPlan.has(d.id));

  return (
    <>
      <BreadcrumbJsonLd items={crumbs} />
      <TripJsonLd name={circuit.name} description={circuit.description} url={path} stops={dests.map((d) => ({ name: d.name, url: `/${locale}/india/${stateById(d.state_id)!.slug}/${d.slug}` }))} />
      <Breadcrumbs items={crumbs} />
      <header className="border-b border-forest-100 bg-forest-50/60 py-8">
        <div className="container-page">
          <h1 className="font-display text-3xl font-bold text-charcoal sm:text-4xl">{circuit.name}</h1>
          <p className="mt-2 max-w-3xl text-sm text-charcoal-light sm:text-base">{circuit.description}</p>
          <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {([
              [t.suggestedDays, `${circuit.minimum_days}–${circuit.maximum_days} ${dict.home.routes.daysLabel} (${circuit.recommended_days} ${dict.common.ui.recommended})`],
              [t.circuitTheme, labelize(circuit.theme)],
              [t.circuitSeason, season ?? dict.common.ui.notYetCollected],
              [t.stateRegion, stateNames || dict.common.ui.notYetCollected]
            ] as Array<[string, string]>).map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-saffron-600">{label}</dt>
                <dd className="mt-0.5 text-sm text-charcoal">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-charcoal-light">{circuit.is_round_trip ? t.roundTrip : t.oneWay}</p>
        </div>
      </header>

      {card && (
        <section className="container-page py-8">
          <h2 className="section-heading">{t.circuitStops}</h2>
          <div className="mt-4 max-w-3xl">
            <RouteCard route={card} locale={locale} dict={dict} />
          </div>
        </section>
      )}

      <section className="container-page pb-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {dests.map((d) => (
            <DestinationCard key={d.id} destination={summaryOf(d)} locale={locale} bestTimeLabel={dict.home.card.bestTime} exploreLabel={dict.home.card.explore} fluid />
          ))}
        </div>
        {optionalStops.length > 0 && (
          <p className="mt-3 text-xs text-charcoal-light">
            {t.nearbyStops}: {optionalStops.map((d) => d.name).join(", ")}
          </p>
        )}
      </section>

      <TripPlanner
        stops={planStops.map((s) => ({ slug: db.destinations.find((d) => d.id === s.destination_id)!.slug, days: s.days }))}
        minDays={circuit.minimum_days}
        maxDays={circuit.maximum_days}
        defaultDays={circuit.recommended_days}
        locale={locale}
        dict={dict}
        initial={{ plan, hrefs }}
      />
      <p className="container-page pb-10 text-xs text-charcoal-light">
        <Link href={`/${locale}/trips`} className="font-medium text-forest-600 hover:underline">{dict.home.routes.seeAll}</Link>
      </p>
    </>
  );
}
