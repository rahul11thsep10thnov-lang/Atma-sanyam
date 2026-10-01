import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export interface RouteCardData {
  title: string;
  stops: Array<{ name: string; days: number }>;
  km: number;
  travelHours: number;
  daysMin: number;
  daysNeeded: number;
  reasons: string[];
  legs: Array<{ from: string; to: string; km: number; hours: number; mode: string; estimated: boolean; extended: boolean }>;
  /** Locale-less path to open this route. */
  href: string;
  curated: boolean;
}

/** One suggested route: the stops in order, why they fit, and every leg's distance and (estimated) time. */
export function RouteCard({ route, locale, dict }: { route: RouteCardData; locale: string; dict: Dictionary }) {
  const t = dict.destination.pages;
  return (
    <article className="card-surface p-5">
      <h3 className="font-display text-lg font-semibold text-forest-700">
        <Link href={`/${locale}${route.href}`} className="hover:underline">{route.title}</Link>
      </h3>
      <p className="mt-1 text-xs text-charcoal-light">
        {Math.round(route.km)} {dict.home.routes.kmLabel} · ~{route.travelHours.toFixed(1)} h · {route.daysMin === route.daysNeeded ? route.daysNeeded : `${route.daysMin}–${route.daysNeeded}`} {dict.home.routes.daysLabel}
        {route.curated && ` · ${dict.common.ui.curated}`}
      </p>
      <ol className="mt-3 flex flex-wrap items-center gap-1.5 text-sm">
        {route.stops.map((s, i) => (
          <li key={`${s.name}-${i}`} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden="true" className="text-saffron-500">→</span>}
            <span className="rounded-full bg-forest-50 px-2.5 py-0.5 font-medium text-forest-700">{s.name} · {s.days}d</span>
          </li>
        ))}
      </ol>
      {route.reasons.length > 0 && (
        <ul className="mt-3 list-disc space-y-0.5 pl-5 text-xs text-charcoal-light">
          {route.reasons.slice(0, 4).map((r) => (<li key={r}>{r}</li>))}
        </ul>
      )}
      <details className="mt-3 text-xs text-charcoal-light">
        <summary className="cursor-pointer font-medium text-forest-600">{t.circuitLegs}</summary>
        <ul className="mt-2 space-y-1">
          {route.legs.map((l) => (
            <li key={`${l.from}-${l.to}`}>
              {l.from} → {l.to}: {Math.round(l.km)} {dict.home.routes.kmLabel}, {t.legTime.replace("{h}", l.hours.toFixed(1)).replace("{mode}", dict.destination.modes[l.mode as keyof typeof dict.destination.modes] ?? l.mode.toLowerCase())}
              {l.extended && <span className="ml-1 text-terracotta-700">· {t.extendedLeg}</span>}
            </li>
          ))}
        </ul>
      </details>
    </article>
  );
}
