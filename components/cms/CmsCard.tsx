import Link from "next/link";
import type { CmsCard as CardData } from "@/lib/cms/queries";
import { CmsImg } from "./CmsImg";

/** Destination card for CMS-driven pages. Large photo, name, state, one line of text. */
export function CmsCard({ card, locale, bestTimeLabel, fluid = false, large = false }: { card: CardData; locale: string; bestTimeLabel: string; fluid?: boolean; large?: boolean }) {
  return (
    <Link
      href={`/${locale}${card.href}`}
      className={`group relative flex flex-col overflow-hidden rounded-2xl bg-peach shadow-sm ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-lg ${fluid ? "w-full" : large ? "w-72 shrink-0 sm:w-80" : "w-60 shrink-0 sm:w-68"}`}
    >
      <div className={`relative w-full overflow-hidden bg-forest-100 ${large ? "aspect-[4/3]" : "aspect-[3/2]"}`}>
        <CmsImg image={card.image} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" sizes="(min-width: 640px) 320px, 80vw" fill />
        {card.state && <span className="absolute left-3 top-3 rounded-full bg-black/45 px-2.5 py-0.5 text-[11px] font-medium text-white backdrop-blur">{card.state}</span>}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-lg font-semibold leading-snug text-charcoal">{card.name}</h3>
        {card.headline && <p className="mt-0.5 line-clamp-1 text-xs text-saffron-700">{card.headline}</p>}
        {card.short_description && <p className="mt-2 line-clamp-2 flex-1 text-sm text-charcoal-light">{card.short_description}</p>}
        {card.best_time_text && (
          <p className="mt-3 text-xs text-charcoal-light">
            {bestTimeLabel}: <strong className="text-charcoal">{card.best_time_text}</strong>
          </p>
        )}
      </div>
    </Link>
  );
}
