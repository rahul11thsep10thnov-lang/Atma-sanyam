import type { BudgetTier, CostType } from "../enums";
import type { EmergencyService, MasterDatabase, TravelCost } from "../types";
import { SRC } from "./sources";

/**
 * National-level emergency numbers (destination_id = null). These are the
 * standard all-India numbers; local/state-specific services are stored per
 * destination and kept visibly separate. Disaster-management numbers are
 * intentionally absent until an admin adds them from an authoritative source.
 */
const NATIONAL: Array<Pick<EmergencyService, "service_type" | "name" | "phone" | "website">> = [
  { service_type: "UNIFIED_EMERGENCY", name: "All-in-one emergency number (police, fire, ambulance)", phone: "112", website: null },
  { service_type: "POLICE", name: "Police", phone: "100", website: null },
  { service_type: "FIRE", name: "Fire", phone: "101", website: null },
  { service_type: "AMBULANCE", name: "Ambulance", phone: "102 / 108", website: null },
  { service_type: "WOMEN_HELPLINE", name: "Women helpline", phone: "1091", website: null },
  { service_type: "TOURIST_HELPLINE", name: "Tourist helpline (Incredible India)", phone: "1800-11-1363", website: "https://www.incredibleindia.gov.in" },
  { service_type: "RAILWAY_HELPLINE", name: "Railway enquiry", phone: "139", website: "https://www.indianrailways.gov.in" }
];

export function seedNationalEmergency(db: MasterDatabase): void {
  NATIONAL.forEach((n, i) =>
    db.emergency_services.push({
      id: `IN/emergency/${i + 1}`, destination_id: null, scope: "NATIONAL", service_type: n.service_type, name: n.name,
      address: null, phone: n.phone, website: n.website, latitude: null, longitude: null, open_24_hours: true,
      confidence: "UNVERIFIED", source_id: SRC.EDITORIAL_AI, last_verified_at: null
    })
  );
}

type Row = [item: string, unit: string, min: number, typical: number, max: number];

/**
 * Default per-tier cost ranges applied to every destination (destination_id = null)
 * until destination-specific, sourced rows exist. These are planning ESTIMATES
 * (INR), stored as UNVERIFIED and always displayed as estimates.
 */
const DEFAULTS: Record<CostType, Partial<Record<BudgetTier, Row>>> = {
  HOTEL: {
    BUDGET: ["Budget room (dorm / basic guesthouse)", "per room per night", 600, 1200, 2000],
    MID_RANGE: ["Mid-range hotel room", "per room per night", 2000, 3200, 5000],
    PREMIUM: ["Premium / heritage hotel room", "per room per night", 5000, 8000, 15000]
  },
  FOOD: {
    BUDGET: ["Local meals and street food", "per person per day", 300, 450, 700],
    MID_RANGE: ["Restaurant meals", "per person per day", 600, 900, 1400],
    PREMIUM: ["Fine dining and hotel restaurants", "per person per day", 1500, 2200, 4000]
  },
  LOCAL_TRANSPORT: {
    BUDGET: ["Shared autos, e-rickshaws, buses", "per person per day", 100, 250, 400],
    MID_RANGE: ["App cabs and autos", "per person per day", 300, 600, 1000],
    PREMIUM: ["Private car with driver (share of vehicle)", "per person per day", 1200, 2000, 3500]
  },
  TRANSPORT: {
    BUDGET: ["Intercity bus / sleeper-class train", "per person per 100 km", 60, 100, 160],
    MID_RANGE: ["AC train / premium bus", "per person per 100 km", 200, 300, 450],
    PREMIUM: ["Private car with driver", "per vehicle per 100 km", 1200, 1600, 2200]
  },
  ACTIVITY: {
    BUDGET: ["Paid sights and activities", "per person per day", 0, 100, 300],
    MID_RANGE: ["Paid sights and guided activities", "per person per day", 100, 300, 800],
    PREMIUM: ["Guided and private experiences", "per person per day", 300, 1000, 3000]
  },
  ENTRY_FEE: {}, PARKING: {}, PERMIT: {}, GUIDE: {}, SHOPPING: {}, MISCELLANEOUS: {}
};

export function seedDefaultCosts(db: MasterDatabase): void {
  let n = 0;
  (Object.entries(DEFAULTS) as Array<[CostType, Partial<Record<BudgetTier, Row>>]>).forEach(([cost_type, tiers]) => {
    (Object.entries(tiers) as Array<[BudgetTier, Row]>).forEach(([tier, [item, unit, min, typical, max]]) => {
      n += 1;
      const cost: TravelCost = {
        id: `COST-${String(n).padStart(3, "0")}`, destination_id: null, cost_type, item, unit,
        min_cost: min, typical_cost: typical, max_cost: max, currency: "INR", season: null, traveller_type: "ANY",
        budget_tier: tier, valid_from: null, valid_until: null, confidence: "UNVERIFIED",
        source_id: SRC.DERIVED, last_verified_at: null
      };
      db.travel_costs.push(cost);
    });
  });
}
