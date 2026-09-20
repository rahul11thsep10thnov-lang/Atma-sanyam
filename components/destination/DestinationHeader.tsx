import Link from "next/link";
import type { Destination } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { SmartImage } from "@/components/ui/SmartImage";
import { WatermarkSection } from "@/components/watermark/WatermarkSection";

export function DestinationHeader({
  destination,
  locale,
  dict
}: {
  destination: Destination;
  locale: string;
  dict: Dictionary;
}) {
  const base = `/${locale}/india/${destination.stateSlug}/${destination.slug}`;
  const { quickInfo, buttons } = dict.destination;

  const quickItems: Array<[string, string]> = [
    [quickInfo.bestTimeToVisit, destination.bestTimeToVisit],
    [quickInfo.idealDuration, destination.idealDuration],
    [quickInfo.approximateBudget, destination.approximateBudget],
    [quickInfo.nearestAirport, destination.nearestAirport],
    [quickInfo.nearestRailway, destination.nearestRailwayStation],
    [quickInfo.bestKnownFor, destination.bestKnownFor.join(", ")],
    [quickInfo.languages, destination.languages.join(", ")],
    [quickInfo.currency, destination.currency],
    [quickInfo.timeZone, destination.timeZone]
  ];

  const actionLinks: Array<[string, string]> = [
    [buttons.planTrip, `${base}/itinerary`],
    [buttons.hotels, `${base}/hotels`],
    [buttons.restaurants, `${base}/restaurants`],
    [buttons.thingsToDo, `${base}#things-to-do`],
    [buttons.markets, `${base}/shopping`],
    [buttons.weather, `${base}/weather`],
    [buttons.emergency, `${base}#emergency`]
  ];

  return (
    <header className="relative">
      <div className="relative h-64 w-full overflow-hidden sm:h-80 md:h-96">
        <SmartImage image={destination.heroImage} className="h-full w-full object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-charcoal/20 to-transparent" />
        {destination.isSampleData && (
          <span className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-terracotta-700">
            {dict.common.ui.sampleData}
          </span>
        )}
        <div className="container-page absolute bottom-4 left-0 right-0 text-white">
          <h1 className="font-display text-3xl font-bold uppercase tracking-wide sm:text-5xl">{destination.name}</h1>
          <p className="mt-1 text-sm text-white/90 sm:text-base">
            {destination.state}, India · {destination.tagline}
          </p>
        </div>
      </div>

      <WatermarkSection images={destination.watermarkImages} className="border-b border-forest-100 bg-offwhite py-6">
        <div className="container-page">
          <p className="max-w-3xl text-sm text-charcoal-light sm:text-base">{destination.introduction}</p>

          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {quickItems.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-saffron-600">{label}</dt>
                <dd className="mt-0.5 text-sm text-charcoal">{value}</dd>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {actionLinks.map(([label, href]) => (
              <Link
                key={label}
                href={href}
                className="rounded-full bg-forest-600 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-700"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </WatermarkSection>
    </header>
  );
}
