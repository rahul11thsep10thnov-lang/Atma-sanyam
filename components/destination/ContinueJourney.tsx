import type { Dictionary } from "@/lib/i18n/dictionaries";
import { getDb } from "@/lib/master/repo";
import { majorSummaries, popularSummaries, summaryOf, type DestinationView } from "@/lib/master/view";
import { DestinationRail } from "@/components/home/DestinationRail";

export function ContinueJourney({ view, locale, dict }: { view: DestinationView; locale: string; dict: Dictionary }) {
  const { ui } = dict.common;
  const db = getDb();
  const id = view.record.id;

  const nearby = db.destination_connections
    .filter((c) => c.origin_destination_id === id || c.destination_destination_id === id)
    .sort((a, b) => a.distance_km - b.distance_km)
    .map((c) => db.destinations.find((d) => d.id === (c.origin_destination_id === id ? c.destination_destination_id : c.origin_destination_id)))
    .filter((d): d is NonNullable<typeof d> => Boolean(d))
    .slice(0, 6)
    .map(summaryOf);

  const similar = majorSummaries()
    .filter((s) => s.slug !== view.record.slug && s.tags.some((t) => view.summary.tags.includes(t)))
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 6);
  const fallback = popularSummaries(6).filter((s) => s.slug !== view.record.slug);

  return (
    <section className="bg-forest-800 py-10 text-white">
      <div className="container-page">
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">{ui.continueJourney}</h2>
      </div>
      {nearby.length > 0 && (
        <div className="[&_.section-heading]:text-white [&_p]:text-forest-100">
          <DestinationRail title={dict.destination.sections.nearby} destinations={nearby} locale={locale} bestTimeLabel={ui.bestTime} exploreLabel={ui.explore} />
        </div>
      )}
      <div className="[&_.section-heading]:text-white [&_p]:text-forest-100">
        <DestinationRail title={ui.similarDestinations} destinations={similar.length ? similar : fallback} locale={locale} bestTimeLabel={ui.bestTime} exploreLabel={ui.explore} />
      </div>
    </section>
  );
}
