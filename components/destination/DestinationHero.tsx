import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { labelize } from "@/lib/master/generation/format";
import type { DestinationView } from "@/lib/master/view";
import type { Coverage, Translator } from "@/lib/master/translation/memory";
import { SmartImage } from "@/components/ui/SmartImage";
import { WatermarkSection } from "@/components/watermark/WatermarkSection";

export function DestinationHero({ view, locale, dict, tr, coverage }: { view: DestinationView; locale: string; dict: Dictionary; tr: Translator | null; coverage: Coverage | null }) {
  const t = (s: string | null) => (s && tr ? tr.t(s) : s);
  const d = view.record;
  const { quickInfo, buttons } = dict.destination;
  const base = `/${locale}${view.path}`;
  const tagline = t(d.one_line_description) ?? d.one_line_description;

  const facts: Array<[string, string | null]> = [
    [quickInfo.bestTimeToVisit, t(d.best_time_text)],
    [quickInfo.idealDuration, t(d.ideal_duration_text)],
    [quickInfo.approximateBudget, d.budget_category ? t(labelize(d.budget_category)) : null],
    [quickInfo.nearestAirport, t(d.nearest_airport)],
    [quickInfo.nearestRailway, t(d.nearest_railway_station)],
    [quickInfo.languages, t([d.primary_language, ...d.secondary_languages].filter(Boolean).join(", ") || null)],
    [quickInfo.timeZone, view.state.timezone]
  ];

  const actions: Array<[string, string]> = [
    [buttons.planTrip, `/${locale}/itinerary/${d.slug}/${d.recommended_days}-${d.recommended_days === 1 ? "day" : "days"}`],
    [dict.destination.sectionTitles["where-to-stay"], `${base}#where-to-stay`],
    [buttons.thingsToDo, `${base}#top-places`],
    [buttons.markets, `${base}#shopping`],
    [buttons.weather, `${base}#weather`],
    [buttons.emergency, `${base}#emergency`]
  ];

  return (
    <header>
      <div className="relative h-60 w-full overflow-hidden sm:h-80 md:h-96">
        <SmartImage image={view.heroImage} className="h-full w-full object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/85 via-charcoal/25 to-transparent" />
        {d.is_sample_data && (
          <span className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-terracotta-700">
            {dict.common.ui.sampleData}
          </span>
        )}
        <div className="container-page absolute bottom-4 left-0 right-0 text-white">
          <h1 className="font-display text-3xl font-bold uppercase tracking-wide sm:text-5xl">{tr?.localName ?? d.name}</h1>
          <p className="mt-1 text-sm text-white/90 sm:text-base">
            <Link href={`/${locale}/india/${view.state.slug}`} className="underline decoration-white/40 underline-offset-2 hover:decoration-white">
              {tr ? tr.stateName(view.state.slug, view.state.name) : view.state.name}
            </Link>
            , {dict.common.ui.india} · {tagline}
          </p>
        </div>
      </div>

      <WatermarkSection images={view.watermarkImages} className="border-b border-forest-100 bg-offwhite py-6">
        <div className="container-page">
          <p className="max-w-3xl text-sm text-charcoal-light sm:text-base">{t(d.short_description)}</p>

          <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-saffron-600">{label}</dt>
                <dd className="mt-0.5 text-sm text-charcoal">{value ?? <span className="text-charcoal-light/70">{dict.common.ui.notYetCollected}</span>}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 flex flex-wrap gap-2">
            {actions.map(([label, href]) => (
              <Link key={label} href={href} className="rounded-full bg-forest-600 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-700">
                {label}
              </Link>
            ))}
          </div>
          {locale !== "en" && (
            <p className="mt-4 text-xs text-charcoal-light">
              {coverage === null ? dict.common.ui.contentInEnglish : coverage.ratio >= 0.98 ? dict.common.ui.machineTranslated : dict.common.ui.partlyTranslated}
            </p>
          )}
        </div>
      </WatermarkSection>
    </header>
  );
}
