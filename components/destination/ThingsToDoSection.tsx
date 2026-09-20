import type { Destination } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { WatermarkSection } from "@/components/watermark/WatermarkSection";
import { SmartImage } from "@/components/ui/SmartImage";

export function ThingsToDoSection({ destination, dict }: { destination: Destination; dict: Dictionary }) {
  const { sections, thingsToDoCategories } = dict.destination;
  const { ui } = dict.common;

  return (
    <WatermarkSection images={destination.watermarkImages} id="things-to-do" className="bg-forest-50/60 py-10">
      <div className="container-page">
        <h2 className="section-heading">{sections.thingsToDo}</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {destination.attractions.map((attraction) => (
            <article key={attraction.id} className="card-surface flex flex-col overflow-hidden">
              <div className="relative h-40 w-full bg-forest-100">
                <SmartImage image={attraction.images[0]} className="h-full w-full object-cover" />
              </div>
              <div className="flex flex-1 flex-col p-4">
                <div className="flex flex-wrap gap-1">
                  {attraction.categories.map((cat) => (
                    <span
                      key={cat}
                      className="rounded-full bg-saffron-50 px-2 py-0.5 text-[11px] font-medium text-saffron-700"
                    >
                      {thingsToDoCategories[cat]}
                    </span>
                  ))}
                </div>
                <h3 className="mt-2 font-display text-lg font-semibold text-charcoal">{attraction.name}</h3>
                <p className="mt-1 flex-1 text-sm text-charcoal-light">{attraction.description}</p>
                <dl className="mt-3 space-y-1 text-xs text-charcoal-light">
                  <div>
                    <dt className="inline font-semibold text-charcoal">{ui.openingHours}: </dt>
                    <dd className="inline">{attraction.openingHours}</dd>
                  </div>
                  <div>
                    <dt className="inline font-semibold text-charcoal">{ui.timeRequired}: </dt>
                    <dd className="inline">{attraction.timeRequired}</dd>
                  </div>
                  <div>
                    <dt className="inline font-semibold text-charcoal">{ui.entryFee}: </dt>
                    <dd className="inline">{attraction.entryFee}</dd>
                  </div>
                </dl>
                <div className="mt-3 flex flex-wrap gap-3 text-sm font-medium">
                  {attraction.mapUrl && (
                    <a href={attraction.mapUrl} target="_blank" rel="noopener noreferrer" className="text-forest-600 hover:underline">
                      {ui.viewOnMap}
                    </a>
                  )}
                  {attraction.officialWebsite && (
                    <a href={attraction.officialWebsite} target="_blank" rel="noopener noreferrer" className="text-forest-600 hover:underline">
                      {ui.website}
                    </a>
                  )}
                </div>
                <p className="mt-2 text-[11px] text-charcoal-light/70">
                  {ui.source}: {attraction.source.label}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </WatermarkSection>
  );
}
