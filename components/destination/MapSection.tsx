import type { Destination } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { getMapProvider } from "@/lib/providers/maps";

export function MapSection({ destination, dict }: { destination: Destination; dict: Dictionary }) {
  const { sections } = dict.destination;
  const { ui } = dict.common;
  const provider = getMapProvider();
  const map = provider.getEmbed({ lat: destination.latitude, lng: destination.longitude, zoom: 13 });

  const markerGroups = [
    { label: "Attractions", count: destination.attractions.length },
    { label: "Hotels", count: destination.hotels.length },
    { label: "Restaurants", count: destination.restaurants.length },
    { label: "Markets", count: destination.markets.length }
  ];

  return (
    <section id="map" className="py-10">
      <div className="container-page">
        <div className="flex items-end justify-between gap-4">
          <h2 className="section-heading">{sections.map}</h2>
          <a href={map.externalUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-forest-600 hover:underline">
            {ui.viewOnMap} ({map.providerLabel})
          </a>
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl border border-forest-100">
          <iframe
            title={`${destination.name} map`}
            src={map.embedUrl}
            className="h-80 w-full sm:h-[420px]"
            loading="lazy"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-charcoal-light">
          {markerGroups.map((g) => (
            <span key={g.label} className="rounded-full bg-forest-50 px-3 py-1">
              {g.count} {g.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
