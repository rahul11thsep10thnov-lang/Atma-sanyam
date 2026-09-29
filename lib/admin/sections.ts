import { getDestinationContent } from "@/lib/master/generation/pipeline";
import { assessAll, auditLinks, pendingVerification, staleFacts } from "@/lib/master/engine/verification";
import { validateDatabase } from "@/lib/master/engine/validation";
import type { MasterDatabase } from "@/lib/master/types";

/**
 * The admin dashboard's sections (spec section 55). Each one is a read-only view over the master
 * database: the database is the source of truth, so edits go through the import / onboarding
 * pipelines (or Prisma once a database is attached) rather than free-typing over verified records.
 */
export type Cell = string | number | null;

export interface AdminTable {
  title: string;
  columns: string[];
  rows: Cell[][];
  /** Total rows before the display cap. */
  total: number;
  note?: string;
}

export interface AdminSection {
  slug: string;
  title: string;
  description: string;
  build: (db: MasterDatabase) => AdminTable[];
}

const CAP = 200;
const yn = (v: boolean | null) => (v === null ? "—" : v ? "yes" : "no");
const cut = (s: string | null | undefined, n = 90) => (s ? (s.length > n ? `${s.slice(0, n - 1)}…` : s) : "—");

function table<T>(title: string, rows: T[], columns: string[], map: (r: T) => Cell[], note?: string): AdminTable {
  return { title, columns, rows: rows.slice(0, CAP).map(map), total: rows.length, note };
}

const nameOf = (db: MasterDatabase) => {
  const m = new Map<string, string>();
  db.destinations.forEach((d) => m.set(d.id, d.name));
  db.attractions.forEach((a) => m.set(a.id, a.name));
  db.states.forEach((s) => m.set(s.id, s.name));
  return (id: string | null) => (id ? m.get(id) ?? id : "—");
};

export const ADMIN_SECTIONS: AdminSection[] = [
  {
    slug: "states",
    title: "States & Union Territories",
    description: "All 36 states and union territories with their official tourism links.",
    build: (db) => [table("States and UTs", db.states, ["ID", "Name", "Type", "Region", "Capital", "Destinations", "Status"], (s) => [s.id, s.name, s.type, s.region, s.capital, db.destinations.filter((d) => d.state_id === s.id).length, s.status])]
  },
  {
    slug: "districts",
    title: "Districts",
    description: "Districts and their tourism importance. Only districts that a destination needs are collected so far.",
    build: (db) => [table("Districts", db.districts, ["ID", "Name", "State", "Headquarters", "Verified", "Status"], (d) => [d.id, d.name, nameOf(db)(d.state_id), d.headquarters ?? "—", d.verified_at ?? "never", d.status])]
  },
  {
    slug: "destinations",
    title: "Destinations",
    description: "Every destination with its level (A = can justify a trip, B = excursion), parent and content status.",
    build: (db) => [table("Destinations", db.destinations, ["ID", "Name", "State", "Level", "Type", "Days (min–max)", "Attractions", "Verified", "Status"], (d) => [d.id, d.name, nameOf(db)(d.state_id), d.destination_level, d.destination_type, `${d.recommended_min_days}–${d.recommended_max_days}`, db.attractions.filter((a) => a.destination_id === d.id).length, d.last_verified_at ?? "never", d.status])]
  },
  {
    slug: "attractions",
    title: "Attractions",
    description: "Attractions with opening hours, fees and verification date as stored.",
    build: (db) => [table("Attractions", db.attractions, ["ID", "Name", "Destination", "Type", "Hours", "Entry ₹", "Hidden gem", "Verified", "Status"], (a) => [a.id, a.name, nameOf(db)(a.destination_id), a.attraction_type, cut(a.opening_hours_text, 40), a.entry_fee ?? "—", yn(a.is_hidden_gem), a.last_verified_at ?? "never", a.status])]
  },
  {
    slug: "history",
    title: "Historical facts",
    description: "Periods and dated events. Every event carries its own confidence.",
    build: (db) => [
      table("Historical periods", db.historical_periods, ["ID", "Name", "From", "To"], (p) => [p.id, p.name, p.start_year, p.end_year]),
      table("Historical events", db.historical_events, ["ID", "Entity", "Title", "When", "Precision", "Confidence"], (e) => [e.id, nameOf(db)(e.entity_id), e.title, e.approximate_date, e.date_precision, e.confidence])
    ]
  },
  {
    slug: "traditions",
    title: "Stories & traditions",
    description: "Traditions are kept apart from documented history and always shown as tradition.",
    build: (db) => [table("Traditions", db.traditions, ["ID", "Entity", "Title", "Type", "Status", "Verified"], (t) => [t.id, nameOf(db)(t.entity_id), t.title, t.tradition_type, t.historical_status, t.last_verified_at ?? "never"])]
  },
  {
    slug: "transport",
    title: "Transport",
    description: "Hubs (airports, stations, bus stands) and the connection graph between destinations.",
    build: (db) => [
      table("Transport hubs", db.transport_hubs, ["ID", "Destination", "Type", "Name", "Code", "Distance km"], (h) => [h.id, nameOf(db)(h.destination_id), h.hub_type, h.name, h.code ?? "—", h.distance_from_destination ?? "—"]),
      table("Destination connections", db.destination_connections, ["ID", "From", "To", "Km", "Road min", "Rail min", "Verified"], (c) => [c.id, nameOf(db)(c.origin_destination_id), nameOf(db)(c.destination_destination_id), c.distance_km, c.road_time_minutes ?? "—", c.rail_time_minutes ?? "—", c.last_verified_at ?? "never"])
    ]
  },
  {
    slug: "stay",
    title: "Hotels & areas",
    description: "Accommodation areas per destination. Individual hotels are intentionally not stored until a licensed data source is attached.",
    build: (db) => [table("Accommodation areas", db.accommodation_areas, ["ID", "Destination", "Area", "Type", "Budget", "Confidence"], (a) => [a.id, nameOf(db)(a.destination_id), a.area_name, a.area_type, a.budget_range, a.confidence])]
  },
  {
    slug: "food",
    title: "Food",
    description: "Local dishes and where to find them.",
    build: (db) => [table("Local foods", db.local_foods, ["ID", "Destination", "Dish", "Type", "Veg", "Price ₹", "Confidence"], (f) => [f.id, nameOf(db)(f.destination_id), f.name, f.food_type, yn(f.vegetarian), f.typical_price_min !== null ? `${f.typical_price_min}–${f.typical_price_max ?? "?"}` : "—", f.confidence])]
  },
  {
    slug: "shopping",
    title: "Shopping",
    description: "What to buy, where, and authenticity tips.",
    build: (db) => [table("Shopping", db.shopping, ["ID", "Destination", "Item", "Category", "Market", "Confidence"], (s) => [s.id, nameOf(db)(s.destination_id), s.item, s.category, s.famous_market ?? "—", s.confidence])]
  },
  {
    slug: "festivals",
    title: "Festivals",
    description: "Festival month text as stored. Exact dates are never guessed.",
    build: (db) => [table("Festivals", db.festivals, ["ID", "Name", "Destination", "Month", "Date type", "Crowd", "Confidence"], (f) => [f.id, f.name, nameOf(db)(f.destination_id), f.month, f.date_type, f.crowd_level, f.confidence])]
  },
  {
    slug: "activities",
    title: "Activities",
    description: "Experiences (boat rides, treks, shows) with cost and difficulty where collected.",
    build: (db) => [table("Experiences", db.experiences, ["ID", "Destination", "Name", "Type", "Minutes", "Cost ₹", "Difficulty"], (e) => [e.id, nameOf(db)(e.destination_id), e.name, e.experience_type, e.duration_minutes ?? "—", e.cost_min !== null ? `${e.cost_min}–${e.cost_max ?? "?"}` : "—", e.difficulty])]
  },
  {
    slug: "circuits",
    title: "Circuits",
    description: "Curated circuits. The engine also suggests routes on demand from distance, time, theme and season.",
    build: (db) => [
      table("Circuits", db.circuits, ["ID", "Name", "Type", "Days (min/rec/max)", "Theme", "Generated by", "Status"], (c) => [c.id, c.name, c.circuit_type, `${c.minimum_days}/${c.recommended_days}/${c.maximum_days}`, c.theme, c.generated_by, c.status]),
      table("Circuit stops", db.circuit_destinations, ["Circuit", "#", "Destination", "Days", "Optional"], (s) => [s.circuit_id, s.sequence_number, nameOf(db)(s.destination_id), s.recommended_days, yn(s.optional)])
    ]
  },
  {
    slug: "itineraries",
    title: "Itineraries",
    description: "Itineraries are generated on demand from stored attractions; saved copies appear here once persistence is attached.",
    build: (db) => [table("Stored itineraries", db.itineraries, ["ID", "Title", "Days", "Type", "Status"], (i) => [i.id, i.title, i.duration_days, i.traveller_type, i.status], "Plans shown on the site are generated live; none are stored in this environment.")]
  },
  {
    slug: "sources",
    title: "Sources",
    description: "Every fact points to a source. Draft editorial sources are labelled and must be verified against an official source.",
    build: (db) => [table("Sources", db.sources, ["ID", "Name", "Type", "Reliability", "Organisation", "URL"], (s) => [s.id, s.source_name, s.source_type, s.reliability_class, s.organization ?? "—", s.url ?? "—"])]
  },
  {
    slug: "ai-content",
    title: "AI content",
    description: "Generated pages with their fact-check and SEO validation results. Nothing is served until the checks pass.",
    build: (db) => {
      const rows = db.destinations.map((d) => ({ d, c: getDestinationContent(db, d.id) }));
      return [
        table("Generated destination pages", rows, ["Destination", "Writer", "Fact-check", "Violations", "SEO errors", "SEO warnings", "Published status", "Data version"], ({ d, c }) => [
          d.name, c.page.writer.name, c.fact_check.status, c.fact_check.violations.length, c.seo_issues.filter((i) => i.severity === "ERROR").length, c.seo_issues.filter((i) => i.severity !== "ERROR").length, c.record.published_status, c.input.data_version
        ])
      ];
    }
  },
  {
    slug: "translations",
    title: "Translations",
    description: "Stored translations of record fields. UI labels are translated in /locales; guide text falls back to English until a translation is stored here.",
    build: (db) => [table("Translations", db.translations, ["ID", "Entity", "Language", "Field", "Status"], (t) => [t.id, nameOf(db)(t.entity_id), t.language_code, t.field_name, t.translation_status], db.translations.length === 0 ? "No translations stored yet — every page falls back to English text with translated interface labels." : undefined)]
  },
  {
    slug: "media",
    title: "Media",
    description: "Images and licensing. Placeholders are shown until licensed media is uploaded — nothing is scraped.",
    build: (db) => [
      table("Media", db.media, ["ID", "Entity", "Role", "Rights", "Licence", "Usage allowed"], (m) => [m.id, nameOf(db)(m.entity_id), m.role, m.copyright_status, m.license ?? "—", yn(m.usage_allowed)]),
      table("AI visual prompts", db.ai_visual_prompts, ["Entity", "Style", "Generated image"], (p) => [nameOf(db)(p.entity_id), p.visual_style, p.generated_image_id ?? "not generated"])
    ]
  },
  {
    slug: "pending-verification",
    title: "Pending verification",
    description: "Facts nobody has verified yet, grouped by the official source an editor should check them against.",
    build: (db) => [
      table("Verification queue", pendingVerification(db), ["Check against", "Facts", "Entities", "Examples"], (q) => [q.source_to_check, q.fact_count, q.entities, q.sample.map((s) => cut(s, 50)).join(" | ")]),
      table("Stale facts", staleFacts(db), ["Fact", "Entity", "Type", "Verified", "Expired days ago"], (a) => [a.fact.id, nameOf(db)(a.fact.entity_id), a.fact.fact_type, a.fact.verified_at, a.days_until_expiry === null ? "—" : Math.abs(a.days_until_expiry)])
    ]
  },
  {
    slug: "conflicts",
    title: "Conflicts",
    description: "Sources that disagree. Conflicts are never auto-resolved — an admin decides which value stands.",
    build: (db) => [table("Conflict records", db.conflict_records, ["ID", "Entity", "Fact", "Existing", "Incoming", "Status"], (c) => [c.id, nameOf(db)(c.entity_id), c.fact_type, String(c.existing_value), String(c.incoming_value), c.status], db.conflict_records.length === 0 ? "No conflicts — none of the stored facts currently disagree." : undefined)]
  },
  {
    slug: "broken-links",
    title: "Broken links & integrity",
    description: "Static link audit and referential-integrity checks. Live HTTP reachability belongs to the scheduled link-checker job.",
    build: (db) => [
      table("Link audit", auditLinks(db), ["Kind", "Table", "ID", "Detail"], (i) => [i.kind, i.table, i.id, cut(i.detail, 100)]),
      table("Integrity issues", validateDatabase(db), ["Severity", "Table", "ID", "Message"], (i) => [i.severity, i.table, i.id, cut(i.message, 120)])
    ]
  },
  {
    slug: "analytics",
    title: "Analytics",
    description: "Visitor and search analytics need an events store. Nothing is shown here rather than invented numbers.",
    build: (db) => [
      { title: "Content coverage", columns: ["Measure", "Value"], total: 5, rows: [
        ["Destinations", db.destinations.length], ["Attractions", db.attractions.length], ["Facts", db.facts.length],
        ["Facts verified", db.facts.filter((f) => f.verified_at).length], ["Assessments recorded", assessAll(db).length]
      ] }
    ]
  }
];

export const sectionBySlug = (slug: string) => ADMIN_SECTIONS.find((s) => s.slug === slug);

export interface DashboardStats {
  counts: Array<[string, number]>;
  quality: Array<[string, number]>;
}

export function dashboardStats(db: MasterDatabase): DashboardStats {
  const assessments = assessAll(db);
  const issues = validateDatabase(db);
  const pages = db.destinations.map((d) => getDestinationContent(db, d.id));
  return {
    counts: [
      ["States & UTs", db.states.length], ["Destinations", db.destinations.length], ["Attractions", db.attractions.length],
      ["Connections", db.destination_connections.length], ["Circuits", db.circuits.length], ["Facts", db.facts.length],
      ["Sources", db.sources.length], ["Translations", db.translations.length]
    ],
    quality: [
      ["Facts pending verification", assessments.filter((a) => a.health === "PENDING_VERIFICATION").length],
      ["Stale facts", assessments.filter((a) => a.health === "STALE").length],
      ["Open conflicts", db.conflict_records.filter((c) => c.status === "OPEN").length],
      ["Integrity errors", issues.filter((i) => i.severity === "ERROR").length],
      ["Generated pages passing fact-check", pages.filter((p) => p.fact_check.status === "PASSED").length],
      ["Generated pages failing fact-check", pages.filter((p) => p.fact_check.status !== "PASSED").length]
    ]
  };
}
