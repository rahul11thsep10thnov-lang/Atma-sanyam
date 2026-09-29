import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Plan } from "@/lib/master/engine/itinerary";

/**
 * Pure presentation of an itinerary plan (safe in server and client components:
 * it receives plain JSON and never touches the database). `hrefs` maps an
 * attraction id to its locale-less page path.
 */
export function PlanCards({
  plan, hrefs, locale, dict
}: {
  plan: Plan;
  hrefs: Record<string, string>;
  locale: string;
  dict: Dictionary;
}) {
  const { ui } = dict.common;
  const rupee = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {plan.days.map((day) => {
            const acts = plan.activities.filter((a) => a.itinerary_day_id === day.id);
            return (
              <article key={day.id} className="card-surface p-5">
                <h3 className="font-display text-lg font-semibold text-forest-700">
                  {ui.day} {day.day_number} — {day.title}
                </h3>
                {day.notes && <p className="mt-1 text-xs text-terracotta-700">{day.notes}</p>}
                {acts.length > 0 ? (
                  <ol className="mt-3 space-y-2">
                    {acts.map((a) => (
                      <li key={a.id} className="flex gap-3 text-sm">
                        <span className="w-28 shrink-0 font-mono text-xs text-saffron-700">
                          {a.start_time}–{a.end_time}
                        </span>
                        <span className="text-charcoal">
                          {a.attraction_id && hrefs[a.attraction_id] ? (
                            <Link href={`/${locale}${hrefs[a.attraction_id]}`} className="font-medium text-forest-600 hover:underline">
                              {a.label}
                            </Link>
                          ) : (
                            a.label
                          )}
                          {a.optional && <span className="ml-2 text-xs text-charcoal-light">(optional)</span>}
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-3 text-sm text-charcoal-light">{day.summary}</p>
                )}
                <dl className="mt-4 grid gap-x-6 gap-y-1 border-t border-forest-100 pt-3 text-xs text-charcoal-light sm:grid-cols-2">
                  {day.breakfast_place && (<div><dt className="inline font-semibold text-charcoal">Breakfast: </dt><dd className="inline">{day.breakfast_place}</dd></div>)}
                  {day.lunch_place && (<div><dt className="inline font-semibold text-charcoal">Lunch: </dt><dd className="inline">{day.lunch_place}</dd></div>)}
                  {day.dinner_place && (<div><dt className="inline font-semibold text-charcoal">Dinner: </dt><dd className="inline">{day.dinner_place}</dd></div>)}
                  {day.overnight_location && (<div><dt className="inline font-semibold text-charcoal">Stay: </dt><dd className="inline">{day.overnight_location}</dd></div>)}
                  <div>
                    <dt className="inline font-semibold text-charcoal">Local travel: </dt>
                    <dd className="inline">~{day.estimated_travel_minutes} min (estimated)</dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </div>

        <aside className="space-y-4">
          <div className="card-surface p-5">
            <h3 className="font-display text-lg font-semibold text-forest-700">{ui.budgetEstimate}</h3>
            <ul className="mt-3 space-y-1.5 text-sm">
              {plan.budget.lines.map((l) => (
                <li key={l.label} className="flex justify-between gap-3">
                  <span className="text-charcoal-light">{l.label}</span>
                  <span className="font-medium text-charcoal">{rupee(l.typical)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-baseline justify-between border-t border-forest-100 pt-3">
              <span className="text-sm font-semibold text-charcoal">{ui.estimatedTotal}</span>
              <span className="font-display text-xl font-bold text-forest-700">{rupee(plan.budget.total.typical)}</span>
            </div>
            <p className="mt-1 text-xs text-charcoal-light">
              Range {rupee(plan.budget.total.min)}–{rupee(plan.budget.total.max)} · about {rupee(plan.budget.per_person.typical)} per person
            </p>
            {plan.budget.notes.map((n) => (
              <p key={n} className="mt-2 text-xs text-charcoal-light">{n}</p>
            ))}
          </div>
        </aside>
      </div>

      {plan.caveats.length > 0 && (
        <div className="rounded-xl border border-terracotta-200 bg-terracotta-50/60 p-4">
          <h3 className="text-sm font-semibold text-terracotta-700">{ui.caveats}</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-charcoal">
            {plan.caveats.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
