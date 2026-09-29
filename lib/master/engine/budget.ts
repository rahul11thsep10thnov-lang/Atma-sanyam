import type { BudgetTier, Confidence, CostType, TravellerType } from "../enums";
import { STATABLE_CONFIDENCE } from "../policy";
import type { MasterDatabase, TravelCost } from "../types";
import type { Leg } from "./graph";

export interface BudgetRequest {
  /** Destination ids in visiting order (used for destination-specific cost rows). */
  destination_ids: string[];
  days: number;
  travellers: number;
  tier: BudgetTier;
  /** Per-category overrides of `tier` (e.g. budget hotel, comfortable food). */
  tiers?: Partial<Record<"hotel" | "food" | "local_transport" | "transport" | "activity", BudgetTier>>;
  /** Paid activities per person for the whole trip; defaults to one per day. */
  activities_per_person?: number;
  traveller_type?: TravellerType;
  legs?: Leg[];
  /** Extra per-person entry fees already known for the scheduled attractions (₹). */
  known_entry_fees_per_person?: number;
  unknown_entry_fee_count?: number;
  month?: number;
}

export interface BudgetLine {
  cost_type: CostType | "MISCELLANEOUS";
  label: string;
  basis: string;
  min: number;
  typical: number;
  max: number;
  confidence: Confidence;
  note: string | null;
}

export interface BudgetEstimate {
  lines: BudgetLine[];
  total: { min: number; typical: number; max: number };
  per_person: { min: number; typical: number; max: number };
  /** Always true: budgets are planning estimates until costs are verified. */
  is_estimate: true;
  unverified_lines: number;
  notes: string[];
}

/** Destination-specific rows win over national defaults; a matching traveller type wins over ANY. */
export function lookupCost(
  db: MasterDatabase, cost_type: CostType, tier: BudgetTier, destinationId: string | undefined, traveller: TravellerType = "ANY"
): TravelCost | null {
  const candidates = db.travel_costs.filter(
    (c) => c.cost_type === cost_type && (c.budget_tier === tier || c.budget_tier === null) && (c.destination_id === null || c.destination_id === destinationId)
  );
  if (candidates.length === 0) return null;
  const rank = (c: TravelCost) => (c.destination_id ? 2 : 0) + (c.traveller_type === traveller ? 1 : 0) + (c.budget_tier === tier ? 0.5 : 0);
  return candidates.sort((a, b) => rank(b) - rank(a))[0];
}

const round = (n: number) => Math.round(n / 10) * 10;

export function estimateBudget(db: MasterDatabase, req: BudgetRequest): BudgetEstimate {
  const { days, travellers, tier } = req;
  const nights = Math.max(0, days - 1);
  const rooms = Math.max(1, Math.ceil(travellers / 2));
  const lines: BudgetLine[] = [];
  const notes: string[] = [];
  const primary = req.destination_ids[0];
  const scale = (c: TravelCost, qty: number) => ({ min: c.min_cost * qty, typical: c.typical_cost * qty, max: c.max_cost * qty });

  const add = (cost_type: CostType, label: string, c: TravelCost | null, qty: number, basis: string) => {
    if (!c || qty <= 0) return;
    const s = scale(c, qty);
    lines.push({ cost_type, label, basis, ...s, confidence: c.confidence, note: c.item });
  };

  const t = req.tiers ?? {};
  add("HOTEL", "Accommodation", lookupCost(db, "HOTEL", t.hotel ?? tier, primary, req.traveller_type), rooms * nights, `${rooms} room(s) × ${nights} night(s)`);
  add("FOOD", "Food", lookupCost(db, "FOOD", t.food ?? tier, primary, req.traveller_type), travellers * days, `${travellers} traveller(s) × ${days} day(s)`);
  add("LOCAL_TRANSPORT", "Local transport", lookupCost(db, "LOCAL_TRANSPORT", t.local_transport ?? tier, primary, req.traveller_type), travellers * days, `${travellers} traveller(s) × ${days} day(s)`);

  const transport = lookupCost(db, "TRANSPORT", t.transport ?? tier, primary, req.traveller_type);
  const groundKm = (req.legs ?? []).filter((l) => l.mode !== "AIR").reduce((s, l) => s + l.distance_km, 0);
  const airLegs = (req.legs ?? []).filter((l) => l.mode === "AIR");
  if (transport && groundKm > 0) {
    const perVehicle = /per vehicle/.test(transport.unit);
    const qty = (groundKm / 100) * (perVehicle ? Math.ceil(travellers / 4) : travellers);
    add("TRANSPORT", "Travel between destinations", transport, qty, `${Math.round(groundKm)} km ${perVehicle ? "by private vehicle" : "per traveller"}`);
  }
  if (airLegs.length > 0) notes.push(`${airLegs.length} leg(s) are by air — flight fares are not estimated here; check current fares.`);

  const activityUnits = req.activities_per_person ?? days;
  add("ACTIVITY", "Activities and paid sights", lookupCost(db, "ACTIVITY", t.activity ?? tier, primary, req.traveller_type), travellers * activityUnits, `${travellers} traveller(s) × ${activityUnits} paid activit${activityUnits === 1 ? "y" : "ies"}`);

  if ((req.known_entry_fees_per_person ?? 0) > 0) {
    const fee = req.known_entry_fees_per_person! * travellers;
    lines.push({ cost_type: "ENTRY_FEE", label: "Entry fees on file", basis: `${travellers} traveller(s)`, min: fee, typical: fee, max: fee, confidence: "UNVERIFIED", note: "From attraction records; confirm current fees." });
  }
  if ((req.unknown_entry_fee_count ?? 0) > 0) notes.push(`Entry fees are not on file for ${req.unknown_entry_fee_count} scheduled attraction(s) and are not included above.`);

  const sub = lines.reduce((t, l) => ({ min: t.min + l.min, typical: t.typical + l.typical, max: t.max + l.max }), { min: 0, typical: 0, max: 0 });
  const misc = { min: sub.min * 0.05, typical: sub.typical * 0.08, max: sub.max * 0.12 };
  lines.push({ cost_type: "MISCELLANEOUS", label: "Miscellaneous", basis: "5–12% of the above", ...misc, confidence: "UNVERIFIED", note: null });

  const total = { min: round(sub.min + misc.min), typical: round(sub.typical + misc.typical), max: round(sub.max + misc.max) };
  const rounded = lines.map((l) => ({ ...l, min: round(l.min), typical: round(l.typical), max: round(l.max) }));
  const unverified = rounded.filter((l) => !STATABLE_CONFIDENCE.has(l.confidence)).length;
  notes.unshift("Estimated cost — actual prices may vary.");

  return {
    lines: rounded,
    total,
    per_person: { min: round(total.min / travellers), typical: round(total.typical / travellers), max: round(total.max / travellers) },
    is_estimate: true,
    unverified_lines: unverified,
    notes
  };
}
