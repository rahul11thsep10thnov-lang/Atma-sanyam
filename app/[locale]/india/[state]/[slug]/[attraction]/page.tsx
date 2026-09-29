import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, locales, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { attractionsOf, getDb, sourceById, stateById } from "@/lib/master/repo";
import { attractionPath, imageFromMedia, viewBySlug } from "@/lib/master/view";
import { formatDate, formatINR, labelize } from "@/lib/master/generation/format";
import type { AttractionRecord } from "@/lib/master/types";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { AttractionJsonLd, BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { SmartImage } from "@/components/ui/SmartImage";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import { WatermarkSection } from "@/components/watermark/WatermarkSection";
import { placeholderImage } from "@/lib/data/placeholder";

interface PageParams {
  locale: string;
  state: string;
  slug: string;
  attraction: string;
}

const RESERVED = new Set(["where-to-stay", "food", "shopping", "weather", "history"]);

function find(params: PageParams) {
  const view = viewBySlug(params.slug);
  if (!view || view.state.slug !== params.state) return null;
  const attraction = attractionsOf(view.record.id).find((a) => a.slug === params.attraction);
  return attraction ? { view, attraction } : null;
}

export function generateStaticParams() {
  const db = getDb();
  return locales.flatMap((locale) =>
    db.attractions
      .filter((a) => !RESERVED.has(a.slug))
      .map((a) => {
        const d = db.destinations.find((x) => x.id === a.destination_id)!;
        return { locale, state: stateById(d.state_id)!.slug, slug: d.slug, attraction: a.slug };
      })
  );
}

export function generateMetadata({ params }: { params: PageParams }): Metadata {
  const found = find(params);
  if (!found) return {};
  const locale: Locale = isLocale(params.locale) ? params.locale : "en";
  const { view, attraction: a } = found;
  const path = attractionPath(a);
  const description = `${a.short_description} Visitor information for ${a.name}, ${view.record.name}, ${view.state.name}.`.slice(0, 160);
  return {
    title: `${a.name}, ${view.record.name} — visitor guide`.slice(0, 60),
    description,
    alternates: { canonical: `/${locale}${path}`, languages: Object.fromEntries(locales.map((l) => [l, `/${l}${path}`])) },
    openGraph: { title: `${a.name} — budgettourism`, description, type: "article" }
  };
}

const yesNo = (v: boolean | null, t: { yes: string; no: string; unknown: string }) => (v === null ? t.unknown : v ? t.yes : t.no);

function entryText(a: AttractionRecord, t: Record<string, string>): string | null {
  if (a.entry_required === false) return t.free;
  if (a.entry_fee === null && a.foreign_entry_fee === null) return null;
  const parts = [a.entry_fee !== null ? formatINR(a.entry_fee) : null, a.foreign_entry_fee !== null ? `${t.foreignFee}: ${formatINR(a.foreign_entry_fee)}` : null].filter(Boolean);
  return parts.join(" · ");
}

export default function AttractionPage({ params }: { params: PageParams }) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const found = find(params);
  if (!found) notFound();
  const { view, attraction: a } = found;
  const dict = getDictionary(locale);
  const { ui } = dict.common;
  const t = dict.destination.attraction as Record<string, string>;
  const db = getDb();
  const path = attractionPath(a);

  const media = db.media.filter((m) => m.entity_id === a.id);
  const hero = media[0] ? imageFromMedia(media[0]) : placeholderImage(a.name, 1600, 700);
  const verified = a.last_verified_at !== null;
  const events = db.historical_events.filter((e) => e.entity_id === a.id);
  const traditions = db.traditions.filter((x) => x.entity_id === a.id);
  const siblings = attractionsOf(view.record.id).filter((x) => x.id !== a.id && !x.is_hidden_gem).slice(0, 8);
  const source = a.source_id ? sourceById(a.source_id) : undefined;
  const na = <span className="text-charcoal-light/70">{ui.notYetCollected}</span>;

  const facts: Array<[string, React.ReactNode]> = [
    [t.type, labelize(a.attraction_type)],
    [t.openingHours, a.opening_hours_text ?? na],
    [t.weeklyClosed, a.weekly_closed_day ?? na],
    [t.entry, entryText(a, t) ?? na],
    [t.childFee, a.child_entry_fee !== null ? formatINR(a.child_entry_fee) : na],
    [t.seniorFee, a.senior_entry_fee !== null ? formatINR(a.senior_entry_fee) : na],
    [t.visitTime, a.average_visit_minutes !== null ? `${a.average_visit_minutes} ${t.minutes}` : na],
    [t.bestTimeOfDay, a.best_time_of_day ?? na],
    [t.booking, a.advance_booking_required === null ? na : a.advance_booking_required ? t.required : t.notRequired],
    [t.nearbyTransport, a.nearby_transport ?? na]
  ];
  const rules: Array<[string, React.ReactNode]> = [
    [t.dressCode, a.dress_code ?? na],
    [t.footwear, a.footwear_rules ?? na],
    [t.photography, a.photography_allowed === null ? na : yesNo(a.photography_allowed, t as never)],
    [t.video, a.video_allowed === null ? na : yesNo(a.video_allowed, t as never)],
    [t.drone, a.drone_allowed === null ? na : yesNo(a.drone_allowed, t as never)]
  ];
  const access: Array<[string, React.ReactNode]> = [
    [t.wheelchair, a.wheelchair_accessibility === "UNKNOWN" ? na : labelize(a.wheelchair_accessibility)],
    [t.stroller, a.stroller_accessibility === "UNKNOWN" ? na : labelize(a.stroller_accessibility)],
    [t.parking, a.parking_available === null ? na : yesNo(a.parking_available, t as never)],
    [t.cloakroom, a.cloakroom_available === null ? na : yesNo(a.cloakroom_available, t as never)],
    [t.toilets, a.toilet_available === null ? na : yesNo(a.toilet_available, t as never)],
    [t.water, a.drinking_water_available === null ? na : yesNo(a.drinking_water_available, t as never)]
  ];

  const crumbs = [
    { label: dict.common.nav.home, href: `/${locale}` },
    { label: view.state.name, href: `/${locale}/india/${view.state.slug}` },
    { label: view.record.name, href: `/${locale}${view.path}` },
    { label: a.name, href: `/${locale}${path}` }
  ];

  const Table = ({ rows }: { rows: Array<[string, React.ReactNode]> }) => (
    <dl className="mt-3 grid gap-x-8 gap-y-3 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs font-semibold uppercase tracking-wide text-saffron-600">{label}</dt>
          <dd className="mt-0.5 text-sm text-charcoal">{value}</dd>
        </div>
      ))}
    </dl>
  );

  return (
    <>
      <BreadcrumbJsonLd items={crumbs} />
      <AttractionJsonLd attraction={a} destinationName={view.record.name} stateName={view.state.name} url={`/${locale}${path}`} />
      <Breadcrumbs items={crumbs} />

      <div className="relative h-52 w-full overflow-hidden sm:h-72">
        <SmartImage image={hero} className="h-full w-full object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/85 via-charcoal/20 to-transparent" />
        <div className="container-page absolute bottom-4 left-0 right-0 text-white">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">{a.name}</h1>
          <p className="mt-1 text-sm text-white/90">
            <Link href={`/${locale}${view.path}`} className="underline underline-offset-2">{view.record.name}</Link>, {view.state.name}
            {a.is_hidden_gem && ` · ${t.hiddenGem}`}
          </p>
        </div>
      </div>

      <WatermarkSection images={view.watermarkImages} className="py-9">
        <div className="container-page max-w-4xl">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="section-heading">{t.overview.replace("{name}", a.name)}</h2>
            <VerificationBadge status={verified ? "VERIFIED" : "UNVERIFIED"} ui={ui} />
          </div>
          <p className="mt-3 text-sm leading-relaxed text-charcoal sm:text-base">{a.current_description}</p>

          <h2 className="section-heading mt-10">{t.quickFacts}</h2>
          <Table rows={facts} />
          <p className="mt-3 text-xs text-terracotta-700">⚠ {t.verifyBeforeVisit}</p>

          {(a.historical_importance || a.cultural_importance || a.religious_importance) && (
            <div className="mt-8 space-y-4">
              {a.historical_importance && (<div><h3 className="font-semibold text-charcoal">{t.history}</h3><p className="mt-1 text-sm text-charcoal-light sm:text-base">{a.historical_importance}</p></div>)}
              {a.cultural_importance && (<div><h3 className="font-semibold text-charcoal">{t.culture}</h3><p className="mt-1 text-sm text-charcoal-light sm:text-base">{a.cultural_importance}</p></div>)}
              {a.religious_importance && (<div><h3 className="font-semibold text-charcoal">{t.religion}</h3><p className="mt-1 text-sm text-charcoal-light sm:text-base">{a.religious_importance}</p></div>)}
            </div>
          )}

          {events.length > 0 && (
            <div className="mt-8">
              <h3 className="font-semibold text-charcoal">{t.events}</h3>
              <ul className="mt-2 space-y-2 text-sm text-charcoal-light">
                {events.map((e) => (
                  <li key={e.id}><strong className="text-charcoal">{e.approximate_date}:</strong> {e.title} — {e.description}</li>
                ))}
              </ul>
            </div>
          )}

          {traditions.length > 0 && (
            <div className="mt-8">
              <h3 className="font-semibold text-charcoal">{t.traditions}</h3>
              {traditions.map((x) => (
                <p key={x.id} className="mt-2 border-l-4 border-saffron-400 bg-saffron-50/70 py-2 pl-4 pr-3 text-sm italic text-charcoal">
                  <span className="mr-2 rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-semibold not-italic text-saffron-700">{t.tradition}</span>
                  {x.title}: {x.short_story}
                </p>
              ))}
            </div>
          )}

          <h2 className="section-heading mt-10">{t.rules}</h2>
          <Table rows={rules} />
          <h2 className="section-heading mt-10">{t.accessibility}</h2>
          <Table rows={access} />

          <p className="mt-8 text-xs text-charcoal-light">
            {verified ? `${ui.lastVerified}: ${formatDate(a.last_verified_at)}` : ui.neverVerified}
            {source && ` · ${ui.source}: ${source.source_name}`}
            {a.official_website && (
              <>
                {" · "}
                <a href={a.official_website} target="_blank" rel="noopener noreferrer" className="text-forest-600 hover:underline">{t.officialSite}</a>
              </>
            )}
          </p>
        </div>
      </WatermarkSection>

      {siblings.length > 0 && (
        <section className="border-t border-forest-100 py-9">
          <div className="container-page">
            <h2 className="section-heading">{t.nearbyPlaces.replace("{destination}", view.record.name)}</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {siblings.map((s) => (
                <li key={s.id}>
                  <Link href={`/${locale}${attractionPath(s)}`} className="block h-full rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5 hover:shadow-md">
                    <span className="font-medium text-charcoal">{s.name}</span>
                    <span className="mt-1 line-clamp-2 block text-xs text-charcoal-light">{s.short_description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}

