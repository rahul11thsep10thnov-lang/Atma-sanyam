import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { DestinationView } from "@/lib/master/view";
import { getDb } from "@/lib/master/repo";
import { getMapProvider } from "@/lib/providers/maps";

export function MapSection({ view, dict }: { view: DestinationView; dict: Dictionary }) {
  const d = view.record;
  const db = getDb();
  const map = getMapProvider().getEmbed({ lat: d.latitude, lng: d.longitude, zoom: 13 });
  const attractions = db.attractions.filter((a) => a.destination_id === d.id && !a.is_hidden_gem).length;
  const hubs = db.transport_hubs.filter((h) => h.destination_id === d.id).length;
  const areas = db.accommodation_areas.filter((a) => a.destination_id === d.id).length;
  const groups = [`${attractions} attractions`, `${hubs} transport hubs`, `${areas} stay areas`];

  return (
    <section id="map" className="py-9">
      <div className="container-page">
        <div className="flex items-end justify-between gap-4">
          <h2 className="section-heading">{dict.destination.sectionTitles.map}</h2>
          <a href={map.externalUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-forest-600 hover:underline">
            {dict.common.ui.viewOnMap} ({map.providerLabel})
          </a>
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl border border-forest-100">
          <iframe title={`${d.name} map`} src={map.embedUrl} className="h-80 w-full sm:h-[420px]" loading="lazy" />
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-charcoal-light">
          {groups.map((g) => (
            <span key={g} className="rounded-full bg-forest-50 px-3 py-1">{g}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
