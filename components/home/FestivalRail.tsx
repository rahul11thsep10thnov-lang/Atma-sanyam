import Link from "next/link";
import { upcomingFestivals } from "@/lib/data/festivals";
import { getDestinationBySlug } from "@/lib/data/destinations";
import { SmartImage } from "@/components/ui/SmartImage";

export function FestivalRail({
  locale,
  title,
  subtitle
}: {
  locale: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <section className="container-page py-8">
      <div className="mb-4">
        <h2 className="section-heading">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-charcoal-light">{subtitle}</p>}
      </div>
      <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {upcomingFestivals.map((festival) => {
          const destination = getDestinationBySlug(festival.destinationSlug);
          const href = destination
            ? `/${locale}/india/${destination.stateSlug}/${destination.slug}`
            : `/${locale}`;
          return (
          <Link
            key={festival.id}
            href={href}
            className="group flex w-64 shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-lg sm:w-72"
          >
            <div className="relative h-32 w-full overflow-hidden bg-terracotta-100">
              <SmartImage image={festival.image} className="h-full w-full object-cover" />
            </div>
            <div className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-saffron-600">{festival.month}</p>
              <h3 className="mt-1 font-display text-base font-semibold text-charcoal">{festival.name}</h3>
              <p className="mt-1 text-sm text-charcoal-light">{festival.description}</p>
              <p className="mt-2 text-xs font-medium text-forest-600">{festival.destinationName}</p>
            </div>
          </Link>
          );
        })}
      </div>
    </section>
  );
}
