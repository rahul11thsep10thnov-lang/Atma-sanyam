import { localStateName } from "@/lib/master/translation/memory";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, locales, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { destinationsOfState, getDb, stateBySlug } from "@/lib/master/repo";
import { labelize } from "@/lib/master/generation/format";
import { summaryOf } from "@/lib/master/view";
import { DestinationCard } from "@/components/destination/DestinationCard";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import Link from "next/link";
import { publishedCards } from "@/lib/cms/queries";
import { draftCircuits, seedStubsOfState } from "@/lib/cms/seedView";
import { CmsCard } from "@/components/cms/CmsCard";
import { DraftCircuits } from "@/components/cms/DraftCircuits";

interface PageParams {
  locale: string;
  state: string;
}

export function generateStaticParams() {
  return locales.flatMap((locale) => getDb().states.map((s) => ({ locale, state: s.slug })));
}

export function generateMetadata({ params }: { params: PageParams }): Metadata {
  const state = stateBySlug(params.state);
  if (!state) return {};
  const locale: Locale = isLocale(params.locale) ? params.locale : "en";
  const dests = destinationsOfState(state.id);
  const title = `${state.name} travel guide`.slice(0, 60);
  const description = (state.short_description ?? `Destinations, routes and planning information for ${state.name}, India.`).slice(0, 160);
  return {
    title,
    description,
    robots: dests.length === 0 && !publishedCards().some((c) => c.state === state.name) ? { index: false, follow: true } : undefined,
    alternates: { canonical: `/${locale}/india/${state.slug}`, languages: Object.fromEntries(locales.map((l) => [l, `/${l}/india/${state.slug}`])) }
  };
}

export default function StatePage({ params }: { params: PageParams }) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const state = stateBySlug(params.state);
  if (!state) notFound();
  const dict = getDictionary(locale);
  const t = dict.destination.pages;
  const ui = dict.common.ui;
  const dests = destinationsOfState(state.id).sort((a, b) => b.popularity - a.popularity);
  const tc = dict.destination.cms;
  const seedSlugs = new Set(dests.map((d) => d.slug));
  const guides = publishedCards().filter((c) => c.state === state.name && !seedSlugs.has(c.slug));
  const stubs = seedStubsOfState(state.name);
  const circuits = draftCircuits(state.name);
  const crumbs = [
    { label: dict.common.nav.home, href: `/${locale}` },
    { label: "India", href: `/${locale}/explore` },
    { label: localStateName(locale, state.slug, state.name), href: `/${locale}/india/${state.slug}` }
  ];
  const facts: Array<[string, string | null]> = [
    [t.stateCapital, state.capital],
    [t.stateRegion, labelize(state.region)],
    [t.stateLanguages, state.languages.length ? state.languages.join(", ") : null],
    [t.stateThemes, state.major_tourism_themes.length ? state.major_tourism_themes.map(labelize).join(", ") : null],
    [t.stateMajorCities, state.major_cities.length ? state.major_cities.join(", ") : null]
  ];

  return (
    <>
      <BreadcrumbJsonLd items={crumbs} />
      <Breadcrumbs items={crumbs} />
      <header className="border-b border-forest-100 bg-forest-50/60 py-8">
        <div className="container-page">
          <h1 className="font-display text-3xl font-bold text-charcoal sm:text-4xl">{t.stateGuide.replace("{name}", localStateName(locale, state.slug, state.name))}</h1>
          <p className="mt-2 max-w-3xl text-sm text-charcoal-light sm:text-base">{state.description ?? state.short_description ?? t.stateDescriptionMissing}</p>
          <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-saffron-600">{label}</dt>
                <dd className="mt-0.5 text-sm text-charcoal">{value ?? <span className="text-charcoal-light/70">{ui.notYetCollected}</span>}</dd>
              </div>
            ))}
          </dl>
          {state.official_tourism_url && (
            <p className="mt-4 text-sm">
              <a href={state.official_tourism_url} target="_blank" rel="noopener noreferrer" className="font-medium text-forest-600 hover:underline">
                {t.stateOfficialSite}
              </a>
            </p>
          )}
        </div>
      </header>

      <section className="container-page py-8">
        <h2 className="section-heading">{t.destinationsIn.replace("{name}", localStateName(locale, state.slug, state.name))}</h2>
        {dests.length === 0 && guides.length === 0 ? (
          <p className="mt-4 text-sm text-charcoal-light">{t.stateNoDestinations}</p>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {dests.map((d) => (
              <DestinationCard key={d.id} destination={summaryOf(d)} locale={locale} bestTimeLabel={dict.home.card.bestTime} exploreLabel={dict.home.card.explore} fluid />
            ))}
            {guides.map((c) => (
              <CmsCard key={c.id} card={c} locale={locale} bestTimeLabel={dict.home.card.bestTime} fluid />
            ))}
          </div>
        )}
      </section>

      {circuits.length > 0 && (
        <section className="container-page pb-8">
          <h2 className="section-heading">{tc.draftCircuitsTitle}</h2>
          <DraftCircuits circuits={circuits} locale={locale} note={tc.draftCircuitsNote} typicalDays={tc.typicalDays} />
        </section>
      )}

      {stubs.length > 0 && (
        <section className="container-page pb-10">
          <h2 className="section-heading">{tc.beingResearchedTitle}</h2>
          <p className="mt-1 max-w-2xl text-sm text-charcoal-light">{tc.beingResearchedIntro}</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {stubs.map((x) => (
              <li key={x.id}>
                <Link href={`/${locale}${x.href}`} className="inline-block rounded-full bg-peach px-3 py-1 text-sm text-forest-700 ring-1 ring-black/5 hover:bg-white">{x.name}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
