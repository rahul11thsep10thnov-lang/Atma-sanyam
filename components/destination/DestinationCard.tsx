import Link from "next/link";
import type { DestinationSummary } from "@/lib/types";
import { SmartImage } from "@/components/ui/SmartImage";

export function DestinationCard({
  destination,
  locale,
  bestTimeLabel,
  exploreLabel
}: {
  destination: DestinationSummary;
  locale: string;
  bestTimeLabel: string;
  exploreLabel: string;
}) {
  return (
    <Link
      href={`/${locale}/india/${destination.stateSlug}/${destination.slug}`}
      className="group flex w-64 shrink-0 flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-lg sm:w-72"
    >
      <div className="relative h-40 w-full overflow-hidden bg-forest-100">
        <SmartImage
          image={destination.heroImage}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
        <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-forest-700">
          {destination.popularity}% loved
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-lg font-semibold text-charcoal">{destination.name}</h3>
        <p className="text-xs font-medium uppercase tracking-wide text-saffron-600">{destination.state}</p>
        <p className="mt-2 line-clamp-2 flex-1 text-sm text-charcoal-light">{destination.shortDescription}</p>
        <div className="mt-3 flex items-center justify-between text-xs text-charcoal-light">
          <span>
            {bestTimeLabel}: <strong className="text-charcoal">{destination.bestTimeToVisit}</strong>
          </span>
        </div>
        <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-forest-600 group-hover:text-saffron-600">
          {exploreLabel} →
        </span>
      </div>
    </Link>
  );
}
