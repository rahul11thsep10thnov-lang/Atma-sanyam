import Link from "next/link";
import type { Destination } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function ItineraryTeaser({ destination, locale, dict }: { destination: Destination; locale: string; dict: Dictionary }) {
  const { itinerary } = dict.destination;

  return (
    <section className="py-10">
      <div className="container-page">
        <div className="card-surface flex flex-col items-start gap-4 bg-saffron-50 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold text-forest-700">{itinerary.title}</h2>
            <p className="mt-1 max-w-xl text-sm text-charcoal-light">{itinerary.estimatedDisclaimer}</p>
          </div>
          <Link
            href={`/${locale}/india/${destination.stateSlug}/${destination.slug}/itinerary`}
            className="shrink-0 rounded-full bg-saffron-500 px-6 py-3 text-sm font-semibold text-white hover:bg-saffron-600"
          >
            {itinerary.generateItinerary}
          </Link>
        </div>
      </div>
    </section>
  );
}
