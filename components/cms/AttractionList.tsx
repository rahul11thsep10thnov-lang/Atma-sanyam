import type { CmsAttraction } from "@/lib/cms/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { assetOf, creditOf, isPlaceholder } from "@/lib/cms/images";
import { ImageGallery } from "./ImageGallery";

/**
 * Numbered attractions. Order comes from the record (automatic ranking by
 * rating where an authorised source supplied one, or the admin's manual
 * order). Missing ratings and missing photographs say so — nothing is filled in.
 */
export function AttractionList({ attractions, dict }: { attractions: CmsAttraction[]; dict: Dictionary }) {
  const t = dict.destination.cms;
  const list = attractions.filter((a) => a.status === "ACTIVE").sort((a, b) => a.sort_order - b.sort_order);
  if (!list.length) return <p className="text-sm text-charcoal-light">{t.notCollected}</p>;
  return (
    <ol className="space-y-8">
      {list.map((a, i) => {
        const approved = a.images.filter((img) => img.approval_status === "APPROVED" && !isPlaceholder(img)).sort((x, y) => x.sort_order - y.sort_order);
        const gallery = approved.map((img) => ({ asset: assetOf(img, a.name, 1200, 750), caption: img.caption, credit: creditOf(img) }));
        const sources = a.sources.filter((s) => s.status !== "SEED" || true);
        return (
          <li key={a.id} id={`attraction-${a.slug}`} className="scroll-mt-32 grid gap-5 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 md:grid-cols-[1fr_1.15fr] md:p-6">
            <div className="order-2 md:order-1">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-600 font-display text-base font-bold text-white">{i + 1}</span>
                <div>
                  <h3 className="font-display text-xl font-semibold text-charcoal">{a.name}</h3>
                  <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-charcoal-light">
                    {a.category && <span>{a.category}</span>}
                    {a.location_text && <span>{a.location_text}</span>}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-charcoal sm:text-base">{a.short_description || t.notCollected}</p>
              <p className="mt-3 text-sm">
                {a.rating !== null ? (
                  <span className="font-semibold text-saffron-700">
                    ★ {a.rating.toFixed(1)}
                    {a.review_count !== null && <span className="font-normal text-charcoal-light"> · {t.reviews.replace("{n}", a.review_count.toLocaleString("en-IN"))}</span>}
                    {a.rating_source && <span className="block text-[11px] font-normal text-charcoal-light">{a.rating_source}{a.rating_retrieved_at ? ` · ${a.rating_retrieved_at.slice(0, 10)}` : ""}</span>}
                  </span>
                ) : (
                  <span className="rounded-full bg-charcoal/5 px-2.5 py-0.5 text-xs font-medium text-charcoal-light">{t.ratingUnavailable}</span>
                )}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-sm">
                {a.map_url && <a href={a.map_url} target="_blank" rel="noopener noreferrer" className="rounded-full border border-forest-200 px-3 py-1 font-medium text-forest-700 hover:bg-forest-50">{t.openInMaps} ↗</a>}
                {a.official_website && <a href={a.official_website} target="_blank" rel="noopener noreferrer" className="rounded-full border border-forest-200 px-3 py-1 font-medium text-forest-700 hover:bg-forest-50">{t.officialWebsite} ↗</a>}
                {a.latitude !== null && a.longitude !== null && <span className="rounded-full bg-forest-50 px-3 py-1 text-xs text-charcoal-light">{a.latitude.toFixed(4)}, {a.longitude.toFixed(4)}</span>}
              </div>
              {sources.length > 0 && (
                <p className="mt-4 text-[11px] text-charcoal-light">
                  {t.sources}: {sources.map((s, k) => (
                    <span key={k}>
                      {k > 0 && ", "}
                      {s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted hover:text-forest-700">{s.label}</a> : s.label}
                      {s.status === "SOURCE_UNAVAILABLE" && ` (${t.sourceUnavailable})`}
                    </span>
                  ))}
                </p>
              )}
            </div>
            <div className="order-1 md:order-2">
              {gallery.length ? (
                <ImageGallery images={gallery} creditLabel={t.photoCredit} />
              ) : (
                <div className="flex aspect-[16/10] items-center justify-center rounded-2xl border border-dashed border-forest-200 bg-forest-50/60 text-sm text-charcoal-light">{t.noImage}</div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
