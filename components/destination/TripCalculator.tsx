"use client";

import { useMemo, useState } from "react";
import type { Destination } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";

const HOTEL_RATE: Record<string, number> = { budget: 1200, midRange: 3000, luxury: 8000 };
const TRANSPORT_RATE: Record<string, number> = { budget: 300, midRange: 800, luxury: 2000 };
const FOOD_RATE: Record<string, number> = { budget: 400, midRange: 900, luxury: 2000 };
const ACTIVITY_RATE = 500;

export function TripCalculator({ destination, dict }: { destination: Destination; dict: Dictionary }) {
  const { sections } = dict.destination;
  const { ui } = dict.common;

  const [people, setPeople] = useState(2);
  const [days, setDays] = useState(3);
  const [hotelTier, setHotelTier] = useState<"budget" | "midRange" | "luxury">("midRange");
  const [transportTier, setTransportTier] = useState<"budget" | "midRange" | "luxury">("midRange");
  const [foodTier, setFoodTier] = useState<"budget" | "midRange" | "luxury">("midRange");
  const [activities, setActivities] = useState(2);

  const estimate = useMemo(() => {
    const accommodation = HOTEL_RATE[hotelTier] * days;
    const transportation = TRANSPORT_RATE[transportTier] * days * people;
    const food = FOOD_RATE[foodTier] * days * people;
    const activityCost = ACTIVITY_RATE * activities * people;
    const misc = Math.round((accommodation + transportation + food + activityCost) * 0.08);
    const total = accommodation + transportation + food + activityCost + misc;
    return { accommodation, transportation, food, activityCost, misc, total };
  }, [days, people, hotelTier, transportTier, foodTier, activities]);

  const rows: Array<[string, number]> = [
    ["Accommodation", estimate.accommodation],
    ["Transportation", estimate.transportation],
    ["Food", estimate.food],
    ["Activities", estimate.activityCost],
    ["Miscellaneous", estimate.misc]
  ];

  return (
    <section id="trip-calculator" className="py-10">
      <div className="container-page">
        <h2 className="section-heading">{sections.tripCalculator}</h2>
        <p className="mt-1 text-sm text-charcoal-light">{ui.estimateNotice}</p>

        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <div className="card-surface space-y-4 p-5">
            <label className="block text-sm font-medium text-charcoal">
              {ui.travellers}
              <input
                type="number"
                min={1}
                max={20}
                value={people}
                onChange={(e) => setPeople(Math.max(1, Number(e.target.value)))}
                className="mt-1 w-full rounded-lg border border-forest-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm font-medium text-charcoal">
              {ui.days}
              <input
                type="number"
                min={1}
                max={30}
                value={days}
                onChange={(e) => setDays(Math.max(1, Number(e.target.value)))}
                className="mt-1 w-full rounded-lg border border-forest-200 px-3 py-2 text-sm"
              />
            </label>

            <fieldset>
              <legend className="text-sm font-medium text-charcoal">Hotel category</legend>
              <TierPicker value={hotelTier} onChange={setHotelTier} ui={ui} />
            </fieldset>
            <fieldset>
              <legend className="text-sm font-medium text-charcoal">Transport</legend>
              <TierPicker value={transportTier} onChange={setTransportTier} ui={ui} />
            </fieldset>
            <fieldset>
              <legend className="text-sm font-medium text-charcoal">Food preference</legend>
              <TierPicker value={foodTier} onChange={setFoodTier} ui={ui} />
            </fieldset>
            <label className="block text-sm font-medium text-charcoal">
              Paid activities/attractions
              <input
                type="number"
                min={0}
                max={20}
                value={activities}
                onChange={(e) => setActivities(Math.max(0, Number(e.target.value)))}
                className="mt-1 w-full rounded-lg border border-forest-200 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="card-surface p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-saffron-600">{destination.name}</p>
            <ul className="mt-3 space-y-2 text-sm">
              {rows.map(([label, value]) => (
                <li key={label} className="flex items-center justify-between border-b border-forest-100 pb-2">
                  <span className="text-charcoal-light">{label}</span>
                  <span className="font-medium text-charcoal">₹{value.toLocaleString("en-IN")}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between">
              <span className="font-display text-lg font-semibold text-charcoal">Estimated total</span>
              <span className="font-display text-2xl font-bold text-forest-700">
                ₹{estimate.total.toLocaleString("en-IN")}
              </span>
            </div>
            <p className="mt-2 text-xs text-charcoal-light">{ui.estimateNotice}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function TierPicker({
  value,
  onChange,
  ui
}: {
  value: "budget" | "midRange" | "luxury";
  onChange: (v: "budget" | "midRange" | "luxury") => void;
  ui: Dictionary["common"]["ui"];
}) {
  const options: Array<["budget" | "midRange" | "luxury", string]> = [
    ["budget", ui.budget],
    ["midRange", ui.comfort],
    ["luxury", ui.luxury]
  ];
  return (
    <div className="mt-1 flex gap-2">
      {options.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
            value === key ? "border-forest-600 bg-forest-600 text-white" : "border-forest-200 text-charcoal"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
