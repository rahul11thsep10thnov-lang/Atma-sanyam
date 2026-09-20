import type { DestinationSummary } from "@/lib/types";
import { DestinationCard } from "@/components/destination/DestinationCard";

export function DestinationRail({
  title,
  subtitle,
  destinations,
  locale,
  bestTimeLabel,
  exploreLabel
}: {
  title: string;
  subtitle?: string;
  destinations: DestinationSummary[];
  locale: string;
  bestTimeLabel: string;
  exploreLabel: string;
}) {
  if (destinations.length === 0) return null;

  return (
    <section className="container-page py-8">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="section-heading">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-charcoal-light">{subtitle}</p>}
        </div>
      </div>
      <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {destinations.map((d) => (
          <div key={d.id} className="snap-start">
            <DestinationCard
              destination={d}
              locale={locale}
              bestTimeLabel={bestTimeLabel}
              exploreLabel={exploreLabel}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
