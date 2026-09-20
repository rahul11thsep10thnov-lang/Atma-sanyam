import type { Destination } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { WatermarkSection } from "@/components/watermark/WatermarkSection";

export function FoodSection({
  destination,
  dict,
  id = "food"
}: {
  destination: Destination;
  dict: Dictionary;
  id?: string;
}) {
  const { sections } = dict.destination;

  return (
    <WatermarkSection images={destination.watermarkImages} id={id} className="bg-forest-50/60 py-10">
      <div className="container-page">
        <h2 className="section-heading">{sections.food}</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {destination.localFoods.map((food) => (
            <div key={food.id} className="card-surface p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-saffron-600">{food.type.replace("-", " ")}</span>
              <h3 className="mt-1 font-display text-base font-semibold text-charcoal">{food.name}</h3>
              <p className="mt-1 text-sm text-charcoal-light">{food.description}</p>
              {food.whereToTry && food.whereToTry.length > 0 && (
                <p className="mt-2 text-xs text-charcoal-light">
                  <span className="font-semibold text-charcoal">Where to try: </span>
                  {food.whereToTry.join(", ")}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </WatermarkSection>
  );
}
