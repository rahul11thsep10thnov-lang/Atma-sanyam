import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, locales, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getDb, stateById, childrenOf } from "@/lib/master/repo";
import { attractionHrefs, viewBySlug, watermarkImagesOf } from "@/lib/master/view";
import { getDestinationContent, isServable } from "@/lib/master/generation/pipeline";
import { planItinerary } from "@/lib/master/engine/itinerary";
import { DestinationHero } from "@/components/destination/DestinationHero";
import { SectionNav } from "@/components/destination/SectionNav";
import { GeneratedSectionView } from "@/components/destination/GeneratedSectionView";
import { WeatherSection } from "@/components/destination/WeatherSection";
import { MapSection } from "@/components/destination/MapSection";
import { TripPlanner } from "@/components/destination/TripPlanner";
import { FaqSection } from "@/components/destination/FaqSection";
import { SourcesSection } from "@/components/destination/SourcesSection";
import { ContinueJourney } from "@/components/destination/ContinueJourney";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { BreadcrumbJsonLd, DestinationJsonLd, FaqJsonLd } from "@/components/seo/JsonLd";
import { WatermarkSection } from "@/components/watermark/WatermarkSection";

interface PageParams {
  locale: string;
  state: string;
  slug: string;
}

export function generateStaticParams() {
  const db = getDb();
  return locales.flatMap((locale) =>
    db.destinations.map((d) => ({ locale, state: stateById(d.state_id)!.slug, slug: d.slug }))
  );
}

export function generateMetadata({ params }: { params: PageParams }): Metadata {
  const view = viewBySlug(params.slug);
  if (!view || view.state.slug !== params.state) return {};
  const locale: Locale = isLocale(params.locale) ? params.locale : "en";
  const { seo } = getDestinationContent(getDb(), view.record.id);
  return {
    title: seo.meta_title,
    description: seo.meta_description,
    keywords: seo.keywords,
    alternates: {
      canonical: `/${locale}${view.path}`,
      languages: Object.fromEntries(locales.map((l) => [l, `/${l}${view.path}`]))
    },
    robots: seo.robots,
    openGraph: { title: seo.og_title, description: seo.og_description, type: "article" }
  };
}

export default function DestinationPage({ params }: { params: PageParams }) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const view = viewBySlug(params.slug);
  if (!view || view.state.slug !== params.state) notFound();

  const dict = getDictionary(locale);
  const db = getDb();
  const d = view.record;
  const content = getDestinationContent(db, d.id);
  // Content that failed its fact-check or SEO validation (or awaits editor approval when required) is never served.
  if (!isServable(content.record.published_status)) notFound();
  const { page } = content;

  const breadcrumbItems = [
    { label: dict.common.nav.home, href: `/${locale}` },
    { label: "India", href: `/${locale}/explore` },
    { label: view.state.name, href: `/${locale}/india/${view.state.slug}` },
    { label: d.name, href: `/${locale}${view.path}` }
  ];

  // The starter plan shown on the page: the destination's recommended length, built from stored data.
  const plan = planItinerary(db, { stops: [{ destination_id: d.id, days: d.recommended_days }], travellers: 2, tier: "MID_RANGE" });
  const hrefs = attractionHrefs(plan.activities.map((a) => a.attraction_id).filter((x): x is string => Boolean(x)));

  const images = view.watermarkImages;
  const sectionImages = (i: number) => (images.length > 1 ? [...images.slice(i % images.length), ...images.slice(0, i % images.length)] : images);
  const parent = d.parent_destination_id ? db.destinations.find((x) => x.id === d.parent_destination_id) : undefined;
  const children = childrenOf(d.id);
  const itineraryDays = Array.from({ length: d.recommended_max_days - d.recommended_min_days + 1 }, (_, i) => d.recommended_min_days + i);
  const dayPath = (n: number) => `/${locale}/itinerary/${d.slug}/${n}-${n === 1 ? "day" : "days"}`;

  // Extra blocks that live inside the generated section flow (live data and interactive tools).
  const after: Record<string, React.ReactNode> = {
    weather: <WeatherSection view={view} dict={dict} />,
    nearby: <MapSection view={view} dict={dict} />
  };

  const extraNav: Array<[string, string]> = [
    ["live-weather", dict.destination.sectionTitles.liveWeather],
    ["map", dict.destination.sectionTitles.map],
    ["planner", dict.destination.sectionTitles.dayByDay],
    ...(page.faq.length ? ([["faq", dict.destination.sectionTitles.faq]] as Array<[string, string]>) : [])
  ];

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbItems} />
      <DestinationJsonLd view={view} locale={locale} description={content.seo.meta_description} />
      <FaqJsonLd faqs={page.faq} />

      <Breadcrumbs items={breadcrumbItems} />
      <DestinationHero view={view} locale={locale} dict={dict} />
      {parent && (
        <p className="container-page pt-3 text-xs text-charcoal-light">
          {dict.common.ui.partOf}{" "}
          <Link href={`/${locale}/india/${view.state.slug}/${parent.slug}`} className="font-medium text-forest-600 hover:underline">
            {parent.name}
          </Link>
        </p>
      )}
      <nav aria-label={dict.common.ui.moreOn.replace("{name}", d.name)} className="container-page flex flex-wrap items-center gap-2 pt-4 text-xs">
        <span className="font-semibold text-charcoal">{dict.common.ui.moreOn.replace("{name}", d.name)}:</span>
        {(
          [
            ["history", dict.destination.sections.history],
            ["where-to-stay", dict.destination.sectionTitles["where-to-stay"]],
            ["food", dict.destination.sections.food],
            ["shopping", dict.destination.sections.shopping],
            ["weather", dict.destination.sections.weather]
          ] as Array<[string, string]>
        ).map(([path, label]) => (
          <Link key={path} href={`/${locale}${view.path}/${path}`} className="rounded-full border border-forest-200 bg-white px-3 py-1 font-medium text-forest-700 hover:bg-forest-50">
            {label}
          </Link>
        ))}
      </nav>
      <SectionNav sections={page.sections} name={d.name} dict={dict} extra={extraNav} />

      {page.sections.map((section, i) => (
        <div key={section.id}>
          <GeneratedSectionView section={section} name={d.name} locale={locale} dict={dict} images={sectionImages(i)} tone={i % 2 ? "tinted" : "plain"}>
            {section.id === "top-places" && children.length > 0 && (
              <p className="mt-4 text-sm text-charcoal-light">
                {dict.common.ui.alsoNear}:{" "}
                {children.map((c, k) => (
                  <span key={c.id}>
                    {k > 0 && ", "}
                    <Link href={`/${locale}/india/${view.state.slug}/${c.slug}`} className="font-medium text-forest-600 hover:underline">
                      {c.name}
                    </Link>
                  </span>
                ))}
              </p>
            )}
          </GeneratedSectionView>
          {after[section.id]}
        </div>
      ))}

      <WatermarkSection images={watermarkImagesOf(d.id, d.name)} id="itineraries" className="border-b border-forest-100/70">
        <div className="container-page pt-9">
          <h2 className="section-heading">{dict.destination.sections.itineraries}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {itineraryDays.map((n) => (
              <li key={n}>
                <Link href={dayPath(n)} className="rounded-full border border-forest-200 bg-white px-4 py-1.5 text-sm font-medium text-forest-700 hover:bg-forest-50">
                  {n} {n === 1 ? dict.common.ui.dayWord : dict.common.ui.daysWord}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <TripPlanner
          stops={[{ slug: d.slug, days: d.recommended_days }]}
          minDays={d.recommended_min_days}
          maxDays={d.recommended_max_days}
          defaultDays={d.recommended_days}
          locale={locale}
          dict={dict}
          initial={{ plan, hrefs }}
        />
      </WatermarkSection>

      <FaqSection faq={page.faq} dict={dict} />
      <SourcesSection sources={content.input.sources} dict={dict} />
      <ContinueJourney view={view} locale={locale} dict={dict} />
    </>
  );
}
