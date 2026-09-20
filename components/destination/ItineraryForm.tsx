"use client";

import { useState } from "react";
import type { Destination } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { ItineraryResult, Interest, TravelStyle } from "@/lib/itinerary/generate";

const INTEREST_OPTIONS: Interest[] = [
  "history",
  "food",
  "nature",
  "religion",
  "shopping",
  "adventure",
  "family",
  "photography"
];

export function ItineraryForm({ destination, dict }: { destination: Destination; dict: Dictionary }) {
  const { itinerary } = dict.destination;
  const { ui } = dict.common;

  const [days, setDays] = useState(3);
  const [travellers, setTravellers] = useState(2);
  const [budget, setBudget] = useState(15000);
  const [travelStyle, setTravelStyle] = useState<TravelStyle>("comfort");
  const [interests, setInterests] = useState<Interest[]>(["history", "food"]);
  const [result, setResult] = useState<ItineraryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleInterest(interest: Interest) {
    setInterests((prev) => (prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destinationSlug: destination.slug,
          days,
          travellers,
          budget,
          travelStyle,
          interests
        })
      });
      if (!res.ok) throw new Error("Request failed");
      const data: ItineraryResult = await res.json();
      setResult(data);
    } catch {
      setError("Could not generate an itinerary right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-page py-10">
      <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
        <form onSubmit={onSubmit} className="card-surface space-y-4 p-5">
          <label className="block text-sm font-medium text-charcoal">
            {itinerary.numberOfDays}
            <input
              type="number"
              min={1}
              max={14}
              value={days}
              onChange={(e) => setDays(Math.max(1, Number(e.target.value)))}
              className="mt-1 w-full rounded-lg border border-forest-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm font-medium text-charcoal">
            {itinerary.numberOfTravellers}
            <input
              type="number"
              min={1}
              max={20}
              value={travellers}
              onChange={(e) => setTravellers(Math.max(1, Number(e.target.value)))}
              className="mt-1 w-full rounded-lg border border-forest-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm font-medium text-charcoal">
            {itinerary.budget} (₹)
            <input
              type="number"
              min={0}
              step={500}
              value={budget}
              onChange={(e) => setBudget(Math.max(0, Number(e.target.value)))}
              className="mt-1 w-full rounded-lg border border-forest-200 px-3 py-2 text-sm"
            />
          </label>

          <fieldset>
            <legend className="text-sm font-medium text-charcoal">{itinerary.travelStyle}</legend>
            <div className="mt-1 flex gap-2">
              {(["budget", "comfort", "luxury"] as TravelStyle[]).map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => setTravelStyle(style)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize ${
                    travelStyle === style ? "border-forest-600 bg-forest-600 text-white" : "border-forest-200 text-charcoal"
                  }`}
                >
                  {style === "budget" ? ui.budget : style === "comfort" ? ui.comfort : ui.luxury}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-medium text-charcoal">{itinerary.interests}</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map((interest) => (
                <button
                  key={interest}
                  type="button"
                  onClick={() => toggleInterest(interest)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize ${
                    interests.includes(interest)
                      ? "border-saffron-500 bg-saffron-500 text-white"
                      : "border-forest-200 text-charcoal"
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
          </fieldset>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-forest-600 px-5 py-3 text-sm font-semibold text-white hover:bg-forest-700 disabled:opacity-60"
          >
            {loading ? ui.loading : itinerary.generateItinerary}
          </button>
          {error && <p className="text-sm text-terracotta-600">{error}</p>}
        </form>

        <div>
          {!result && (
            <div className="card-surface flex h-full min-h-[240px] items-center justify-center p-8 text-center text-sm text-charcoal-light">
              Fill in your preferences and generate a day-by-day plan for {destination.name}.
            </div>
          )}
          {result && (
            <div className="space-y-4">
              <div className="rounded-xl bg-saffron-50 p-4 text-sm text-charcoal">{result.disclaimer}</div>
              {result.days.map((day) => (
                <div key={day.day} className="card-surface p-5">
                  <h3 className="font-display text-lg font-semibold text-forest-700">Day {day.day}</h3>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div>
                      <dt className="font-semibold text-charcoal">{itinerary.morning}</dt>
                      <dd className="text-charcoal-light">{day.morning}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-charcoal">{itinerary.afternoon}</dt>
                      <dd className="text-charcoal-light">{day.afternoon}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-charcoal">{itinerary.evening}</dt>
                      <dd className="text-charcoal-light">{day.evening}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-charcoal">{itinerary.foodSuggestion}</dt>
                      <dd className="text-charcoal-light">{day.foodSuggestion}</dd>
                    </div>
                    <div className="flex gap-6 text-xs text-charcoal-light">
                      <span>
                        {itinerary.travelTime}: {day.travelTimeNote}
                      </span>
                      <span>
                        {itinerary.distance}: ~{day.estimatedDistanceKm} km
                      </span>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
