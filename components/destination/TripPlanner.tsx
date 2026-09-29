"use client";

import { useState } from "react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Plan } from "@/lib/master/engine/itinerary";
import { PlanCards } from "@/components/plan/PlanCards";

type Tier = "BUDGET" | "MID_RANGE" | "PREMIUM";
type TravellerType = "ANY" | "SOLO" | "COUPLE" | "FAMILY" | "ELDERLY" | "GROUP";

export interface PlannerResult {
  plan: Plan;
  hrefs: Record<string, string>;
}

/**
 * Customise-your-plan form. It only sends the choices to /api/itinerary; the plan is produced
 * server-side from the master database, so no destination data is bundled into the browser.
 */
export function TripPlanner({
  stops, minDays, maxDays, defaultDays, locale, dict, initial, id = "planner"
}: {
  /** One entry per stop; a single destination page passes one, a circuit page passes its stops in order. */
  stops: Array<{ slug: string; days: number }>;
  minDays: number;
  maxDays: number;
  defaultDays: number;
  locale: string;
  dict: Dictionary;
  initial?: PlannerResult;
  id?: string;
}) {
  const { ui } = dict.common;
  const single = stops.length === 1;
  const [days, setDays] = useState(defaultDays);
  const [travellers, setTravellers] = useState(2);
  const [tier, setTier] = useState<Tier>("MID_RANGE");
  const [travellerType, setTravellerType] = useState<TravellerType>("ANY");
  const [month, setMonth] = useState(0);
  const [result, setResult] = useState<PlannerResult | null>(initial ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stops: single ? [{ slug: stops[0].slug, days }] : stops,
          travellers,
          tier,
          traveller_type: travellerType,
          month: month || undefined
        })
      });
      if (!res.ok) throw new Error(String(res.status));
      setResult(await res.json());
    } catch {
      setError(ui.plannerError);
    } finally {
      setLoading(false);
    }
  }

  const field = "mt-1 w-full rounded-lg border border-forest-200 bg-white px-3 py-2 text-sm text-charcoal";
  const tierLabels: Record<Tier, string> = { BUDGET: ui.budget, MID_RANGE: ui.comfort, PREMIUM: ui.luxury };

  return (
    <section id={id} className="py-10">
      <div className="container-page">
        <h2 className="section-heading">{ui.customise}</h2>
        <p className="mt-1 text-sm text-charcoal-light">{ui.estimateNotice}</p>

        <form onSubmit={onSubmit} className="card-surface mt-5 grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
          {single && (
            <label className="block text-sm font-medium text-charcoal">
              {ui.days}
              <input type="number" min={1} max={Math.max(maxDays, 1)} value={days} onChange={(e) => setDays(Math.min(10, Math.max(1, Number(e.target.value) || minDays)))} className={field} />
            </label>
          )}
          <label className="block text-sm font-medium text-charcoal">
            {ui.travellers}
            <input type="number" min={1} max={20} value={travellers} onChange={(e) => setTravellers(Math.min(20, Math.max(1, Number(e.target.value) || 1)))} className={field} />
          </label>
          <label className="block text-sm font-medium text-charcoal">
            {ui.tier}
            <select value={tier} onChange={(e) => setTier(e.target.value as Tier)} className={field}>
              {(Object.keys(tierLabels) as Tier[]).map((t) => (
                <option key={t} value={t}>{tierLabels[t]}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-charcoal">
            {ui.travellerType}
            <select value={travellerType} onChange={(e) => setTravellerType(e.target.value as TravellerType)} className={field}>
              {(Object.keys(ui.travellerTypes) as TravellerType[]).map((t) => (
                <option key={t} value={t}>{ui.travellerTypes[t]}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-charcoal">
            {ui.month}
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className={field}>
              <option value={0}>{ui.anyMonth}</option>
              {ui.months.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-2 lg:col-span-5">
            <button type="submit" disabled={loading} className="rounded-full bg-forest-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-forest-700 disabled:opacity-60">
              {loading ? ui.generating : result ? ui.regenerate : ui.generate}
            </button>
            {error && <p role="alert" className="mt-2 text-sm text-terracotta-700">{error}</p>}
          </div>
        </form>

        {result && (
          <div className="mt-6" aria-live="polite">
            <PlanCards plan={result.plan} hrefs={result.hrefs} locale={locale} dict={dict} />
          </div>
        )}
      </div>
    </section>
  );
}
