import type { Destination } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { destinationSummaries, getPopularDestinations } from "@/lib/data/destinations";
import { DestinationRail } from "@/components/home/DestinationRail";

export function ContinueJourney({ destination, locale, dict }: { destination: Destination; locale: string; dict: Dictionary }) {
  const { sections } = dict.destination;
  const { ui } = dict.common;

  const nearby = destination.nearbyDestinations
    .map((ref) => destinationSummaries.find((d) => d.slug === ref.slug))
    .filter((d): d is NonNullable<typeof d> => Boolean(d));

  const similar = destinationSummaries
    .filter((d) => d.slug !== destination.slug && d.tags.some((tag) => destination.tags.includes(tag)))
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 6);

  const fallback = getPopularDestinations(6).filter((d) => d.slug !== destination.slug);

  return (
    <section className="bg-forest-800 py-10 text-white">
      <div className="container-page">
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">{ui.continueJourney}</h2>
      </div>
      {nearby.length > 0 && (
        <div className="[&_.section-heading]:text-white [&_p]:text-forest-100">
          <DestinationRail
            title={sections.nearby}
            destinations={nearby}
            locale={locale}
            bestTimeLabel={ui.bestTime}
            exploreLabel={ui.explore}
          />
        </div>
      )}
      <div className="[&_.section-heading]:text-white [&_p]:text-forest-100">
        <DestinationRail
          title={ui.similarDestinations}
          destinations={similar.length > 0 ? similar : fallback}
          locale={locale}
          bestTimeLabel={ui.bestTime}
          exploreLabel={ui.explore}
        />
      </div>
    </section>
  );
}
