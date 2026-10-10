import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import type { ClusterView } from "@/lib/cms/seedView";

/** Draft circuits from the master list. Stops with a page link to it; researched stops are marked. */
export function DraftCircuits({ circuits, locale, note, typicalDays, highlight }: { circuits: ClusterView[]; locale: Locale; note: string; typicalDays: string; highlight?: string }) {
  if (!circuits.length) return null;
  return (
    <>
      <p className="mt-1 text-xs text-charcoal-light">{note}</p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {circuits.map((c) => (
          <li key={c.id} className="rounded-2xl bg-peach p-4 shadow-sm ring-1 ring-black/5">
            <h3 className="font-display text-base font-semibold text-charcoal">{c.name}</h3>
            <p className="mt-0.5 text-[11px] uppercase tracking-wide text-saffron-700">{c.state}</p>
            <ol className="mt-2 flex flex-wrap items-center gap-x-1 gap-y-1 text-sm">
              {c.stops.map((s, i) => (
                <li key={`${s.part}-${i}`} className="flex items-center gap-1">
                  {i > 0 && <span aria-hidden="true" className="text-charcoal-light">→</span>}
                  {s.href ? (
                    <Link href={`/${locale}${s.href}`} className={`hover:underline ${s.name === highlight ? "font-semibold text-charcoal" : s.researched ? "font-medium text-forest-700" : "text-forest-600"}`}>
                      {s.part}
                    </Link>
                  ) : (
                    <span className="text-charcoal-light">{s.part}</span>
                  )}
                </li>
              ))}
            </ol>
            {c.typical_days && <p className="mt-2 text-xs text-charcoal-light">{typicalDays.replace("{days}", c.typical_days)}</p>}
          </li>
        ))}
      </ul>
    </>
  );
}
