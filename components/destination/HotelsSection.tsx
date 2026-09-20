import type { Destination } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { WatermarkSection } from "@/components/watermark/WatermarkSection";
import { SmartImage } from "@/components/ui/SmartImage";

export function HotelsSection({
  destination,
  dict,
  limit,
  id = "hotels"
}: {
  destination: Destination;
  dict: Dictionary;
  limit?: number;
  id?: string;
}) {
  const { sections, hotelCategories } = dict.destination;
  const { ui } = dict.common;
  const hotels = typeof limit === "number" ? destination.hotels.slice(0, limit) : destination.hotels;

  return (
    <WatermarkSection images={destination.watermarkImages} id={id} className="py-10">
      <div className="container-page">
        <h2 className="section-heading">{sections.hotels}</h2>
        <p className="mt-1 text-sm text-charcoal-light">{ui.sampleData}</p>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {hotels.map((hotel) => (
            <article key={hotel.id} className="card-surface flex flex-col overflow-hidden">
              <div className="relative h-40 w-full bg-forest-100">
                <SmartImage image={hotel.image} className="h-full w-full object-cover" />
                <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-forest-700">
                  {hotelCategories[hotel.category]}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h3 className="font-display text-lg font-semibold text-charcoal">{hotel.name}</h3>
                <p className="text-xs text-charcoal-light">{hotel.area}</p>
                <ul className="mt-2 flex flex-wrap gap-1">
                  {hotel.facilities.map((f) => (
                    <li key={f} className="rounded-full bg-forest-50 px-2 py-0.5 text-[11px] text-forest-700">
                      {f}
                    </li>
                  ))}
                </ul>
                {hotel.distanceFromLandmark && (
                  <p className="mt-2 text-xs text-charcoal-light">
                    {ui.distanceFrom}: {hotel.distanceFromLandmark}
                  </p>
                )}
                <div className="mt-3 flex-1" />
                <button
                  type="button"
                  disabled
                  title="Live pricing and booking connect once a hotel-booking API partner is configured"
                  className="mt-2 cursor-not-allowed rounded-full bg-charcoal-light/20 px-4 py-2 text-sm font-semibold text-charcoal-light"
                >
                  {ui.bookNow}
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </WatermarkSection>
  );
}
