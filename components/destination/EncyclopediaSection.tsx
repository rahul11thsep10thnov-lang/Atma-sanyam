import type { Destination } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { WatermarkSection } from "@/components/watermark/WatermarkSection";

export function EncyclopediaSection({ destination, dict }: { destination: Destination; dict: Dictionary }) {
  const { sections } = dict.destination;

  const blocks: Array<[string, string]> = [
    [sections.history, destination.history],
    [sections.geography, destination.geography],
    [sections.culture, destination.culture],
    [sections.religion, destination.religion]
  ];

  return (
    <WatermarkSection images={destination.watermarkImages} id="overview" className="py-10">
      <div className="container-page">
        <h2 className="section-heading">{sections.overview}</h2>
        <p className="mt-3 max-w-3xl text-charcoal-light">{destination.introduction}</p>

        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          {blocks.map(([title, body]) => (
            <div key={title}>
              <h3 className="font-display text-xl font-semibold text-forest-700">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-charcoal-light">{body}</p>
            </div>
          ))}
        </div>

        {destination.hiddenPlaces.length > 0 && (
          <div className="mt-8">
            <h3 className="font-display text-xl font-semibold text-forest-700">{sections.hiddenPlaces}</h3>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-charcoal-light">
              {destination.hiddenPlaces.map((place) => (
                <li key={place}>{place}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          <div>
            <h3 className="font-display text-xl font-semibold text-forest-700">{sections.localCustoms}</h3>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-charcoal-light">
              {destination.localCustoms.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-display text-xl font-semibold text-forest-700">{sections.safety}</h3>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-charcoal-light">
              {destination.safety.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        {destination.festivals.length > 0 && (
          <div className="mt-8">
            <h3 className="font-display text-xl font-semibold text-forest-700">{sections.festivals}</h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {destination.festivals.map((f) => (
                <div key={f.id} className="card-surface p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-saffron-600">{f.month}</p>
                  <p className="mt-1 font-display text-base font-semibold text-charcoal">{f.name}</p>
                  <p className="mt-1 text-sm text-charcoal-light">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </WatermarkSection>
  );
}
