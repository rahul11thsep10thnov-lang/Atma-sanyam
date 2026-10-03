import Link from "next/link";
import type { CmsCard as CardData } from "@/lib/cms/queries";
import { CmsCard } from "@/components/cms/CmsCard";

/** A horizontally scrolling row of destination cards; renders nothing when empty. */
export function CmsRail({ title, subtitle, cards, locale, bestTimeLabel, seeAllHref, seeAllLabel, large = false, tone = "plain" }: { title: string; subtitle?: string; cards: CardData[]; locale: string; bestTimeLabel: string; seeAllHref?: string; seeAllLabel?: string; large?: boolean; tone?: "plain" | "tinted" }) {
  if (!cards.length) return null;
  return (
    <section className={`py-10 ${tone === "tinted" ? "bg-forest-50/50" : ""}`}>
      <div className="container-page">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="section-heading">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-charcoal-light">{subtitle}</p>}
          </div>
          {seeAllHref && seeAllLabel && (
            <Link href={seeAllHref} className="shrink-0 text-sm font-semibold text-forest-600 hover:underline">{seeAllLabel} →</Link>
          )}
        </div>
        <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          {cards.map((c) => (
            <div key={c.id} className="snap-start">
              <CmsCard card={c} locale={locale} bestTimeLabel={bestTimeLabel} large={large} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
