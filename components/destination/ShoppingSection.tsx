import type { Destination } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { WatermarkSection } from "@/components/watermark/WatermarkSection";

export function ShoppingSection({
  destination,
  dict,
  id = "shopping"
}: {
  destination: Destination;
  dict: Dictionary;
  id?: string;
}) {
  const { sections } = dict.destination;
  const { ui } = dict.common;

  return (
    <WatermarkSection images={destination.watermarkImages} id={id} className="py-10">
      <div className="container-page">
        <h2 className="section-heading">{sections.shopping}</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {destination.markets.map((market) => (
            <article key={market.id} className="card-surface p-4">
              <h3 className="font-display text-lg font-semibold text-charcoal">{market.name}</h3>
              <p className="text-xs text-charcoal-light">{market.location}</p>
              <p className="mt-2 text-sm text-charcoal-light">
                <span className="font-semibold text-charcoal">What to buy: </span>
                {market.whatToBuy.join(", ")}
              </p>
              <p className="mt-1 text-sm text-charcoal-light">
                <span className="font-semibold text-charcoal">Famous for: </span>
                {market.famousProducts.join(", ")}
              </p>
              <p className="mt-1 text-xs text-charcoal-light">
                {ui.openingHours}: {market.openingHours}
              </p>
              <p className="mt-1 text-xs text-charcoal-light">{market.bargainingInfo}</p>
              <p className="mt-1 text-xs font-medium text-forest-600">{market.typicalPriceRange}</p>
            </article>
          ))}
        </div>
      </div>
    </WatermarkSection>
  );
}
