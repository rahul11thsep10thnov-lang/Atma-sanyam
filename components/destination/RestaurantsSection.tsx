import type { Destination } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { WatermarkSection } from "@/components/watermark/WatermarkSection";

export function RestaurantsSection({
  destination,
  dict,
  limit,
  id = "restaurants"
}: {
  destination: Destination;
  dict: Dictionary;
  limit?: number;
  id?: string;
}) {
  const { sections, restaurantCategories } = dict.destination;
  const { ui } = dict.common;
  const restaurants = typeof limit === "number" ? destination.restaurants.slice(0, limit) : destination.restaurants;

  return (
    <WatermarkSection images={destination.watermarkImages} id={id} className="bg-terracotta-50/40 py-10">
      <div className="container-page">
        <h2 className="section-heading">{sections.restaurants}</h2>
        <p className="mt-1 text-sm text-charcoal-light">{ui.sampleData}</p>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {restaurants.map((restaurant) => (
            <article key={restaurant.id} className="card-surface p-4">
              <div className="flex flex-wrap gap-1">
                {restaurant.categories.map((cat) => (
                  <span
                    key={cat}
                    className="rounded-full bg-terracotta-100 px-2 py-0.5 text-[11px] font-medium text-terracotta-700"
                  >
                    {restaurantCategories[cat]}
                  </span>
                ))}
              </div>
              <h3 className="mt-2 font-display text-lg font-semibold text-charcoal">{restaurant.name}</h3>
              <p className="text-xs text-charcoal-light">{restaurant.location}</p>
              <p className="mt-2 text-sm text-charcoal-light">{restaurant.cuisine.join(", ")}</p>
              {restaurant.signatureDishes.length > 0 && (
                <p className="mt-2 text-xs text-charcoal-light">
                  <span className="font-semibold text-charcoal">Signature: </span>
                  {restaurant.signatureDishes.join(", ")}
                </p>
              )}
              <p className="mt-2 text-xs text-charcoal-light">
                {ui.openingHours}: {restaurant.openingHours}
              </p>
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                {restaurant.mapUrl && (
                  <a href={restaurant.mapUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-forest-600 hover:underline">
                    {ui.viewOnMap}
                  </a>
                )}
                <button
                  type="button"
                  disabled
                  title="Table reservations connect once a reservation API partner is configured"
                  className="cursor-not-allowed font-medium text-charcoal-light/60"
                >
                  {ui.reserve}
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </WatermarkSection>
  );
}
