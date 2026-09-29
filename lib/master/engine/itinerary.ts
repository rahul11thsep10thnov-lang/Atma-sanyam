import type { BudgetTier, DestinationCategory, TravellerType } from "../enums";
import { slugify } from "../ids";
import { minutesToTime, monthInRange, timeToMinutes } from "../seed/parsers";
import type {
  AttractionRecord, DestinationRecord, ItineraryActivity, ItineraryDay, ItineraryRecord, LocalFood, MasterDatabase
} from "../types";
import { estimateBudget, type BudgetEstimate } from "./budget";
import { DestinationGraph, type Leg } from "./graph";

/**
 * Itinerary engine (spec sections 20–22). Builds day-by-day plans from stored
 * attractions, their hours and visit durations, the destination graph and the
 * cost tables. It only ever selects records that exist in the database — it
 * never writes opening hours, prices or availability of its own.
 */

export interface PlanRequest {
  stops: Array<{ destination_id: string; days: number }>;
  travellers: number;
  traveller_type?: TravellerType;
  tier: BudgetTier;
  interests?: DestinationCategory[];
  month?: number;
}

export interface Plan {
  itinerary: ItineraryRecord;
  days: ItineraryDay[];
  activities: ItineraryActivity[];
  budget: BudgetEstimate;
  legs: Leg[];
  /** Data the plan depends on that is not yet verified, or missing altogether. */
  caveats: string[];
  generated_at: string;
}

const SLOTS = {
  morning: { from: 8 * 60 + 30, to: 12 * 60 + 30 },
  afternoon: { from: 13 * 60 + 30, to: 17 * 60 },
  evening: { from: 17 * 60, to: 20 * 60 + 30 }
} as const;
type Slot = keyof typeof SLOTS;

const DEFAULT_VISIT: Partial<Record<string, number>> = {
  TEMPLE: 60, MOSQUE: 45, CHURCH: 45, GURDWARA: 60, MUSEUM: 90, FORT: 120, PALACE: 90, MONUMENT: 60,
  VIEWPOINT: 45, BEACH: 90, LAKE: 60, MARKET: 75, ATTRACTION: 60
};

/** The slot named first in the attraction's best-time text ("Sunset for the aarti, sunrise for…" → evening). */
function preferredSlot(a: AttractionRecord): Slot | null {
  const t = (a.best_time_of_day ?? "").toLowerCase();
  const hits: Array<[number, Slot]> = [];
  const find = (re: RegExp, slot: Slot) => {
    const m = t.match(re);
    if (m && m.index !== undefined) hits.push([m.index, slot]);
  };
  find(/sunrise|dawn|early morning|late morning|morning/, "morning");
  find(/afternoon/, "afternoon");
  find(/sunset|evening|night/, "evening");
  return hits.length ? hits.sort((x, y) => x[0] - y[0])[0][1] : null;
}

const visitMinutes = (a: AttractionRecord) => a.average_visit_minutes ?? DEFAULT_VISIT[a.attraction_type] ?? 60;

function opensDuring(a: AttractionRecord, start: number, end: number): boolean {
  if (!a.opening_time || !a.closing_time) return true; // hours unknown: allowed, flagged in caveats
  return start >= timeToMinutes(a.opening_time) && end <= timeToMinutes(a.closing_time);
}

/** Splits `total` days across stops proportionally to recommended days, at least 1 each. */
export function allocateDays(stops: PlanRequest["stops"], total: number): Array<{ destination_id: string; days: number }> {
  if (stops.length === 1) return [{ destination_id: stops[0].destination_id, days: total }];
  const weight = stops.reduce((s, x) => s + x.days, 0);
  const alloc = stops.map((s) => ({ destination_id: s.destination_id, days: Math.max(1, Math.floor((s.days / weight) * total)) }));
  let used = alloc.reduce((s, x) => s + x.days, 0);
  for (let i = 0; used < total; i = (i + 1) % alloc.length, used++) alloc[i].days += 1;
  for (let i = alloc.length - 1; used > total && i >= 0; i--) {
    if (alloc[i].days > 1) {
      alloc[i].days -= 1;
      used -= 1;
      i = alloc.length;
    }
  }
  return alloc;
}

function foodFor(foods: LocalFood[], day: number, types: LocalFood["food_type"][]): string | null {
  const pool = foods.filter((f) => types.includes(f.food_type));
  if (pool.length === 0) return null;
  const f = pool[day % pool.length];
  return f.where_to_find.length > 0 ? `${f.name} — try it at ${f.where_to_find[0]}` : `${f.name} (${f.description.split(".")[0]})`;
}

export function planItinerary(db: MasterDatabase, req: PlanRequest, graph: DestinationGraph = new DestinationGraph(db)): Plan {
  const totalDays = req.stops.reduce((s, x) => s + x.days, 0);
  const interests = new Set(req.interests ?? []);
  const dests = req.stops.map((s) => graph.nodes.get(s.destination_id)).filter((d): d is DestinationRecord => Boolean(d));
  if (dests.length === 0) throw new Error("planItinerary: no valid destinations");

  const caveats: string[] = [];
  const days: ItineraryDay[] = [];
  const activities: ItineraryActivity[] = [];
  const legs: Leg[] = [];
  const first = dests[0];
  const last = dests[dests.length - 1];
  const slug =
    dests.length === 1
      ? `${first.slug}-${totalDays}-${totalDays === 1 ? "day" : "days"}`
      : `${dests.map((d) => d.slug).join("-")}-${totalDays}-days`;
  const itineraryId = `ITIN-${slug}`;

  let dayNumber = 0;
  let entryFees = 0;
  let unknownFees = 0;
  const missingHours = new Set<string>();
  const reportedText = new Map<string, string | null>();
  const closedDays = new Set<string>();

  req.stops.forEach((stop, stopIdx) => {
    const dest = graph.nodes.get(stop.destination_id)!;
    const children = db.destinations.filter((d) => d.parent_destination_id === dest.id).map((d) => d.id);
    const pool = db.attractions.filter((a) => (a.destination_id === dest.id || children.includes(a.destination_id)) && !a.is_hidden_gem);
    const score = (a: AttractionRecord) =>
      1 + a.categories.filter((c) => interests.has(c)).length * 2 + (a.destination_id === dest.id ? 0.5 : 0) + (a.short_description ? 0.1 : 0);
    const remaining = [...pool].sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name));
    const foods = db.local_foods.filter((f) => f.destination_id === dest.id);
    const areas = db.accommodation_areas.filter((a) => a.destination_id === dest.id);
    const area =
      areas.find((a) => (req.traveller_type === "ELDERLY" ? a.elderly_suitable : req.traveller_type === "FAMILY" ? a.family_suitable : true)) ?? areas[0];

    let travelNote: string | null = null;
    let travelMinutes = 0;
    if (stopIdx > 0) {
      const prev = graph.nodes.get(req.stops[stopIdx - 1].destination_id)!;
      const leg = graph.leg(prev.id, dest.id, req.tier === "PREMIUM" ? "FASTEST" : "BUDGET");
      if (leg) {
        legs.push(leg);
        travelMinutes = leg.minutes;
        travelNote = `Travel from ${prev.name} to ${dest.name}: about ${(leg.minutes / 60).toFixed(1)} h by ${leg.mode.toLowerCase()} (${leg.estimated ? "estimated" : "reported"}).`;
      } else {
        caveats.push(`No connection data between ${prev.name} and ${dest.name}; transfer time is unknown.`);
      }
    }

    for (let d = 0; d < stop.days; d++) {
      dayNumber += 1;
      const dayId = `${itineraryId}/day/${dayNumber}`;
      const dayActs: ItineraryActivity[] = [];
      const arrivalDay = d === 0 && stopIdx > 0;
      const slotOrder: Slot[] = arrivalDay && travelMinutes > 240 ? ["evening"] : ["morning", "afternoon", "evening"];
      let seq = 0;
      // Secondary destinations (e.g. Sarnath, Ramnagar) are visited on one excursion day so their sights stay together.
      const excursionDay = stop.days === 1 || d === Math.min(1, stop.days - 1);
      const childScore = (id: string) => remaining.filter((a) => a.destination_id === id).reduce((t, a) => t + score(a), 0);
      const richestChild = excursionDay
        ? children.filter((id) => remaining.some((a) => a.destination_id === id)).sort((x, y) => childScore(y) - childScore(x))[0] ?? null
        : null;
      let lastDest: string | null = richestChild;

      for (const slot of slotOrder) {
        let cursor: number = SLOTS[slot].from;
        let placedInSlot = 0;
        while (placedInSlot < 2 && remaining.length > 0) {
          const fits = (a: AttractionRecord): boolean => {
            if (a.destination_id !== dest.id && !excursionDay) return false;
            const pref = preferredSlot(a);
            if (pref && pref !== slot) return false;
            const start = a.opening_time && !a.opening_time.startsWith("00:") ? Math.max(cursor, timeToMinutes(a.opening_time)) : cursor;
            return start + visitMinutes(a) <= SLOTS[slot].to && opensDuring(a, start, start + visitMinutes(a));
          };
          // Prefer staying in the same secondary destination (e.g. both Sarnath sights on one day).
          let idx: number = lastDest && lastDest !== dest.id ? remaining.findIndex((a) => a.destination_id === lastDest && fits(a)) : -1;
          if (idx === -1) idx = remaining.findIndex(fits);
          if (idx === -1) break;
          const a: AttractionRecord = remaining.splice(idx, 1)[0];
          const start = a.opening_time && !a.opening_time.startsWith("00:") ? Math.max(cursor, timeToMinutes(a.opening_time)) : cursor;
          const end = start + visitMinutes(a);
          seq += 1;
          const act: ItineraryActivity = {
            id: `${dayId}/act/${seq}`, itinerary_day_id: dayId, attraction_id: a.id, label: a.name,
            start_time: minutesToTime(start), end_time: minutesToTime(end), duration_minutes: end - start, sequence_number: seq,
            activity_type: a.attraction_type, transport_to_next: "Auto-rickshaw / e-rickshaw / walk (estimated)",
            estimated_cost: a.entry_fee, mandatory: false, optional: placedInSlot > 0
          };
          dayActs.push(act);
          lastDest = a.destination_id;
          cursor = end + (a.destination_id === dest.id ? 20 : 35);
          placedInSlot += 1;

          if (a.entry_fee !== null) entryFees += a.entry_fee;
          else if (a.entry_required !== false) unknownFees += 1;
          if (!a.opening_time) {
            missingHours.add(a.name);
            reportedText.set(a.name, a.opening_hours_text);
          }
          if (a.weekly_closed_day) closedDays.add(`${a.name} is reported closed on ${a.weekly_closed_day.charAt(0)}${a.weekly_closed_day.slice(1).toLowerCase()}s`);
        }
      }
      activities.push(...dayActs);

      const inSlot = (s: Slot) => dayActs.filter((a) => timeToMinutes(a.start_time) >= SLOTS[s].from && timeToMinutes(a.start_time) < SLOTS[s].to);
      const describe = (s: Slot) => {
        const list = inSlot(s);
        return list.length ? list.map((a) => `${a.label} (${a.start_time}–${a.end_time})`).join("; ") : null;
      };
      const walking = Math.round(dayActs.reduce((sum, a) => sum + Math.min(a.duration_minutes, 60) * 0.3, 0));
      const notes = [arrivalDay ? travelNote : null, closedDays.size && d === 0 ? [...closedDays].join("; ") : null].filter(Boolean).join(" ") || null;

      days.push({
        id: dayId, itinerary_id: itineraryId, day_number: dayNumber, date_optional: null, destination_id: dest.id,
        title: arrivalDay ? `Travel to ${dest.name}` : `${dest.name}${stop.days > 1 ? ` — day ${d + 1}` : ""}`,
        summary: dayActs.length ? `${dayActs.length} stop(s) in ${dest.name}: ${dayActs.map((a) => a.label).join(", ")}.` : `A free day in ${dest.name}: no further catalogued attractions to schedule.`,
        morning_activity: describe("morning"), afternoon_activity: describe("afternoon"), evening_activity: describe("evening"),
        breakfast_place: foodFor(foods, dayNumber, ["BREAKFAST"]),
        lunch_place: foodFor(foods, dayNumber, ["STREET_FOOD", "LUNCH", "SNACK", "SPECIALTY"]),
        dinner_place: foodFor(foods, dayNumber + 1, ["SPECIALTY", "DINNER", "SWEET"]),
        overnight_location: stopIdx === dests.length - 1 && d === stop.days - 1 ? null : area ? `${dest.name} — ${area.area_name} area` : dest.name,
        estimated_travel_minutes: arrivalDay ? travelMinutes : Math.round(dayActs.length * 20),
        estimated_walking_minutes: walking, notes
      });
    }
  });

  if (missingHours.size) {
    const list = [...missingHours].map((n) => (reportedText.get(n) ? `${n} (reported: “${reportedText.get(n)}”)` : `${n} (none on file)`));
    caveats.push(`Exact opening times could not be scheduled for: ${list.join("; ")}. Check locally before going.`);
  }
  if (unknownFees > 0) caveats.push(`Entry fees are not on file for ${unknownFees} scheduled attraction(s).`);
  const hasUnverified = activities.some((act) => {
    const a = db.attractions.find((x) => x.id === act.attraction_id);
    return a !== undefined && a.last_verified_at === null;
  });
  if (hasUnverified) caveats.push("Timings and fees come from records that have not yet been verified against official sources — confirm before you travel.");
  if (req.month) {
    dests.forEach((d) => {
      if (!monthInRange(req.month!, d.best_month_start, d.best_month_end)) caveats.push(`${d.name}: this month is outside the usual best season (${d.best_time_text ?? "see destination page"}).`);
    });
  }
  [...closedDays].forEach((c) => caveats.push(c));

  const budget = estimateBudget(db, {
    destination_ids: dests.map((d) => d.id), days: totalDays, travellers: req.travellers, tier: req.tier,
    traveller_type: req.traveller_type, legs, known_entry_fees_per_person: entryFees, unknown_entry_fee_count: unknownFees, month: req.month
  });

  const now = new Date().toISOString();
  const itinerary: ItineraryRecord = {
    id: itineraryId, slug,
    title: dests.length === 1 ? `${totalDays}-day ${first.name} itinerary` : `${totalDays}-day ${dests.map((d) => d.name).join(" – ")} trip`,
    origin_destination_id: null, start_destination_id: first.id, end_destination_id: last.id,
    duration_days: totalDays, duration_nights: Math.max(0, totalDays - 1), traveller_type: req.traveller_type ?? "ANY",
    budget_min: budget.total.min, budget_max: budget.total.max,
    theme: [...interests].join(", ").toLowerCase() || "general sightseeing",
    description: `A ${totalDays}-day plan built from catalogued attractions, reported opening hours and the destination graph.`,
    generated_by: "budgettourism-itinerary-engine@1", version: 1, status: "DRAFT", created_at: now, updated_at: now
  };

  return { itinerary, days, activities, budget, legs, caveats: [...new Set(caveats)], generated_at: now };
}

/** Canonical URL slug for single-destination itineraries: /itinerary/{destination}/{n}-days */
export const itinerarySlug = (destinationSlug: string, days: number) => `/itinerary/${slugify(destinationSlug)}/${days}-${days === 1 ? "day" : "days"}`;
