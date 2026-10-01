import { STATABLE_CONFIDENCE } from "../policy";
import { estimateBudget } from "../engine/budget";
import type { MasterDatabase } from "../types";
import { emptyDatabase } from "../types";
import { daysText, formatINR, hoursText, joinList, labelize, monthName, monthRangeText, rangeINR, yearText } from "./format";
import type {
  Cell, ContentWriter, GeneratedPage, GeneratedSection, GenerationInput, VerificationStatus
} from "./types";

/**
 * The deterministic writer. It restates stored records in the page template's
 * order and never adds a fact of its own: prices, hours, dates and numbers all
 * come from `GenerationInput`. Anything missing is reported in `missing`
 * instead of being filled in. Traditions keep their "According to…" framing and
 * are never mixed into the documented history.
 */

interface Rec {
  confidence?: string;
  /** Provenance records use `last_verified_at`; facts use `verified_at`. */
  last_verified_at?: string | null;
  verified_at?: string | null;
  source_id?: string | null;
}
const verifiedOn = (r: Rec) => r.last_verified_at ?? r.verified_at ?? null;

/** Records without an explicit confidence (e.g. attractions) count as verified only once they carry a verification date. */
const confidenceOf = (r: Rec) => r.confidence ?? (verifiedOn(r) ? "PROVISIONALLY_VERIFIED" : "UNVERIFIED");

const STATUS_LABEL: Record<string, string> = {
  HISTORICALLY_DOCUMENTED: "Historically documented",
  TRADITIONAL_ACCOUNT: "Traditional account",
  RELIGIOUS_TRADITION: "Religious tradition",
  LEGEND: "Legend",
  LOCAL_FOLKLORE: "Local folklore",
  DISPUTED: "Disputed",
  UNCERTAIN: "Uncertain"
};

const SUITABILITY_LABEL: Record<string, string> = {
  YES: "Suitable", POSSIBLE: "Possible with some planning", LIMITED: "Limited", NO: "Not recommended", UNKNOWN: "Not yet assessed"
};

const DATE_TYPE_TEXT: Record<string, string> = {
  FIXED: "Same date every year",
  ANNUAL_LUNAR: "Follows the lunar calendar — the date changes every year",
  VARIABLE: "Dates vary each year",
  TENTATIVE: "Dates tentative"
};

const UNVERIFIED_NOTICE = "Reported information that has not yet been verified against an official source — please confirm before you travel.";

function verificationOf(recs: Rec[]): GeneratedSection["verification"] & { last: string | null } {
  const total = recs.length;
  const verified = recs.filter((r) => STATABLE_CONFIDENCE.has(confidenceOf(r))).length;
  const status: VerificationStatus = total === 0 ? "NO_DATA" : verified === total ? "VERIFIED" : verified === 0 ? "UNVERIFIED" : "PARTIAL";
  const dates = recs.map(verifiedOn).filter((d): d is string => Boolean(d)).sort();
  return { status, verified, total, last: dates[0] ?? null };
}

function section(id: string, title: string, recs: Rec[], build: (s: GeneratedSection) => void): GeneratedSection {
  const v = verificationOf(recs);
  const s: GeneratedSection = {
    id, title, paragraphs: [], bullets: [], table: null, missing: [], notices: [],
    verification: { status: v.status, verified: v.verified, total: v.total }, last_verified: v.last,
    source_ids: [...new Set(recs.map((r) => r.source_id).filter((x): x is string => Boolean(x)))]
  };
  build(s);
  return s;
}

export class TemplateWriter implements ContentWriter {
  readonly name = "budgettourism-template-writer";
  readonly version = "1.0.0";

  write(input: GenerationInput): GeneratedPage {
    const d = input.destination;
    const path = (attractionSlug?: string, destSlug: string = d.slug) =>
      `/india/${d.state.slug}/${destSlug}${attractionSlug ? `/${attractionSlug}` : ""}`;
    const childSlugById = new Map(input.child_destinations.map((c) => [c.id, c.slug]));
    const hrefFor = (a: { slug: string; destination_id: string }) => path(a.slug, childSlugById.get(a.destination_id) ?? d.slug);
    const bestText = d.best_months.text ?? monthRangeText(d.best_months.start, d.best_months.end);
    const sections: GeneratedSection[] = [];

    // ---- WHY VISIT
    sections.push(
      section("why-visit", `Why visit ${d.name}`, [...input.attractions, ...input.experiences], (s) => {
        s.paragraphs.push({ kind: "fact", text: d.short_description });
        if (d.best_known_for.length) s.paragraphs.push({ kind: "fact", text: `${d.name} is best known for ${joinList(d.best_known_for)}.` });
        if (input.categories.length) s.paragraphs.push({ kind: "note", text: `Travel themes: ${joinList(input.categories.map((c) => labelize(c).toLowerCase()))}.` });
        input.experiences.slice(0, 5).forEach((e) => s.bullets.push(`${e.name}${e.duration_minutes ? ` (about ${hoursText(e.duration_minutes)})` : ""}`));
        if (input.experiences.length === 0) s.missing.push("Experiences have not been collected yet.");
      })
    );

    // ---- ANCIENT / HISTORICAL STORY
    sections.push(
      section("story", "Ancient and historical story", [...input.history, ...input.traditions], (s) => {
        if (input.ancient_story?.short) {
          s.paragraphs.push({ kind: "tradition", label: STATUS_LABEL[input.ancient_story.status ?? "UNCERTAIN"], text: input.ancient_story.short });
        } else s.missing.push("No ancient story has been collected for this destination yet.");
        input.traditions.forEach((t) =>
          s.paragraphs.push({ kind: "tradition", label: `${STATUS_LABEL[t.historical_status]}${t.entity_id !== d.id ? ` · ${t.entity_name}` : ""}`, text: t.short_story })
        );
        if (input.history.length) {
          s.paragraphs.push({ kind: "note", text: "Traditions above are labelled as traditions. The record below is limited to events that are historically documented." });
          input.history.forEach((e) => s.bullets.push(`${e.approximate_date} — ${e.title}. ${e.description}`));
        } else if (input.descriptions.HISTORICAL_OVERVIEW) {
          s.paragraphs.push({ kind: "history", label: "Draft overview", text: input.descriptions.HISTORICAL_OVERVIEW });
          s.missing.push("Dated historical events have not been collected yet; the overview above is an unverified draft.");
        } else s.missing.push("No historical record has been collected for this destination yet.");
        if (input.history.length || input.traditions.length) s.notices.push(UNVERIFIED_NOTICE);
      })
    );

    // ---- HISTORICAL PERIODS
    if (input.history.length) {
      sections.push(
        section("periods", "Historical periods", input.history, (s) => {
          const rows: Cell[][] = [];
          input.periods.forEach((p) => {
            const events = input.history.filter((e) => e.period_id === p.id);
            if (events.length) rows.push([p.name, `${yearText(p.start_year)} – ${yearText(p.end_year)}`, events.map((e) => `${e.approximate_date}: ${e.title}`).join("; ")]);
          });
          s.table = { headers: ["Period", "Years", "What happened here"], rows };
          s.notices.push(UNVERIFIED_NOTICE);
        })
      );
    }

    // ---- DESTINATION TODAY
    sections.push(
      section("today", `${d.name} today`, [], (s) => {
        const parts: Array<[string, string, string | undefined]> = [
          ["", "CURRENT_OVERVIEW", input.descriptions.CURRENT_OVERVIEW],
          ["Geography", "GEOGRAPHY_OVERVIEW", input.descriptions.GEOGRAPHY_OVERVIEW],
          ["Culture", "CULTURAL_OVERVIEW", input.descriptions.CULTURAL_OVERVIEW],
          ["Religion", "RELIGION_OVERVIEW", input.descriptions.RELIGION_OVERVIEW]
        ];
        parts.forEach(([label, , text]) => text && s.paragraphs.push({ kind: "fact", label: label || undefined, text }));
        if (s.paragraphs.length === 0) s.missing.push("No overview has been written yet.");
        else s.notices.push("Descriptive overviews are unverified drafts pending editorial review.");
        s.verification = { status: s.paragraphs.length ? "UNVERIFIED" : "NO_DATA", verified: 0, total: s.paragraphs.length };
      })
    );

    // ---- TOP PLACES
    sections.push(
      section("top-places", "Top places to visit", input.attractions, (s) => {
        const rows: Cell[][] = input.attractions.map((a) => [
          { text: a.name, href: hrefFor(a) },
          labelize(a.attraction_type),
          a.average_visit_minutes ? hoursText(a.average_visit_minutes) : "—",
          a.opening_hours_text ?? "Not on file",
          a.entry_fee_notes ?? "Not on file"
        ]);
        if (rows.length) s.table = { headers: ["Place", "Type", "Time needed", "Reported timings", "Reported entry"], rows };
        if (input.attractions.length === 0) s.missing.push("No attractions have been collected yet.");
        else if (input.attractions.some((a) => a.last_verified_at === null)) s.notices.push(UNVERIFIED_NOTICE);
        if (input.child_destinations.length)
          s.bullets.push(...input.child_destinations.map((c) => ({ text: `${c.name} — a nearby place that combines well with ${d.name}`, href: path(undefined, c.slug) })));
        if (input.hidden_places.length) s.bullets.push(...input.hidden_places.map((h) => `Less-visited: ${h.name} — ${h.short_description}`));
      })
    );

    // ---- HOW TO REACH
    const hubRecs = input.transport.hubs;
    sections.push(
      section("how-to-reach", "How to reach", [...hubRecs, ...input.transport.notes, ...input.nearby_destinations.map((n) => n.connection)], (s) => {
        if (hubRecs.length) {
          s.table = {
            headers: ["Type", "Name", "Code", "Distance"],
            rows: hubRecs.map((h) => [labelize(h.hub_type), h.name, h.code ?? "—", h.distance_from_destination ? `${h.distance_from_destination} km` : "Not on file"])
          };
        } else if (input.destination.parent) s.paragraphs.push({ kind: "note", text: `${d.name} is reached via ${input.destination.parent.name}.` });
        else s.missing.push("Transport hubs have not been collected yet.");
        input.transport.notes
          .filter((n) => ["transport.road_connectivity", "transport.from_delhi"].includes(n.fact_type))
          .forEach((n) => s.bullets.push(n.fact_text));
        input.nearby_destinations.slice(0, 6).forEach(({ destination, connection: c }) => {
          const bits: string[] = [`${Math.round(c.distance_km)} km`];
          if (c.road_time_minutes) bits.push(`about ${hoursText(c.road_time_minutes)} by road (estimated)`);
          else if (c.air_time_minutes) bits.push(`about ${hoursText(c.air_time_minutes)} by air`);
          if (c.direct_train_available) bits.push("direct trains reported");
          else if (c.direct_flight_available) bits.push("direct flights reported");
          s.bullets.push({ text: `From ${destination.name}: ${bits.join(", ")}`, href: `/india/${destination.state_slug}/${destination.slug}` });
        });
        if (hubRecs.length || input.transport.notes.length) s.notices.push("Transport details are reported, not live — check current schedules with the operator (IRCTC, airlines, state transport).");
      })
    );

    // ---- LOCAL TRANSPORT
    sections.push(
      section("local-transport", "Getting around", input.transport.notes, (s) => {
        const local = input.transport.notes.filter((n) => ["transport.local", "transport.auto_rickshaw", "transport.taxi", "transport.metro", "transport.rental"].includes(n.fact_type));
        local.forEach((n) => s.bullets.push(n.fact_text));
        if (local.length === 0) s.missing.push("Local transport information has not been collected yet.");
        else s.notices.push("Fares are not listed: agree on the fare or insist on the meter before you start.");
      })
    );

    // ---- HOW MANY DAYS
    sections.push(
      section("how-many-days", "How many days do you need?", [], (s) => {
        const r = d.recommended_days;
        s.paragraphs.push({
          kind: "fact",
          text: r.min === r.max
            ? `${d.name} is usually covered in ${r.min} ${r.min === 1 ? "day" : "days"}.`
            : `${d.name} works as a ${r.min}–${r.max} day stop; ${daysText(r.recommended)} suits a relaxed pace.`
        });
        input.itineraries.forEach((i) => s.bullets.push({ text: `${i.days}-${i.days === 1 ? "day" : "days"} ${d.name} itinerary`, href: `/itinerary/${d.slug}/${i.days}-${i.days === 1 ? "day" : "days"}` }));
        s.notices.push("Recommended durations are editorial estimates and have not been verified.");
        s.verification = { status: "UNVERIFIED", verified: 0, total: 1 };
      })
    );

    // ---- WHERE TO STAY
    sections.push(
      section("where-to-stay", "Where to stay", input.accommodation_areas, (s) => {
        if (input.accommodation_areas.length) {
          s.table = {
            headers: ["Area", "Best for", "Budget", "Distance to centre"],
            rows: input.accommodation_areas.map((a) => {
              const good = [a.quiet ? "quiet" : null, a.family_suitable ? "families" : null, a.elderly_suitable ? "older travellers" : null, a.food ? "food" : null, a.shopping ? "shopping" : null].filter((x): x is string => Boolean(x));
              return [a.area_name, good.length ? joinList(good) : a.area_type, a.budget_range === "MIXED" ? "Mixed" : labelize(a.budget_range), a.distance_to_center ?? "Not on file"];
            })
          };
          input.accommodation_areas.forEach((a) => s.paragraphs.push({ kind: "fact", label: a.area_name, text: a.description }));
          s.notices.push("Areas are listed first; individual hotels and prices are not yet in the database and are not shown.");
        } else s.missing.push(`Accommodation areas have not been collected for ${d.name} yet.`);
      })
    );

    // ---- LOCAL FOOD
    sections.push(
      section("local-food", "Local food", input.food, (s) => {
        input.food.forEach((f) =>
          s.bullets.push(`${f.name} (${labelize(f.food_type).toLowerCase()}) — ${f.description}${f.where_to_find.length ? ` Try it at ${joinList(f.where_to_find)}.` : ""}`)
        );
        if (input.food.length === 0) s.missing.push("Local foods have not been collected yet.");
        else s.notices.push("Where-to-find suggestions are unverified; prices and opening hours are not listed.");
      })
    );

    // ---- SHOPPING
    sections.push(
      section("shopping", "Shopping", input.shopping, (s) => {
        if (input.shopping.length) {
          s.table = {
            headers: ["What to buy", "Market", "Where", "Typical price range", "Bargaining"],
            rows: input.shopping.map((x) => [x.item, x.famous_market ?? "—", x.market_location ?? "—", x.typical_price_range ?? "Not on file", x.bargaining_expected === null ? "Not on file" : x.bargaining_expected ? "Expected" : "Not usual"])
          };
          s.notices.push("Price ranges are reported and unverified. Compare a few shops before buying, especially silk and jewellery.");
        } else s.missing.push("Shopping records have not been collected yet.");
      })
    );

    // ---- BEST TIME
    sections.push(
      section("best-time", "Best time to visit", [], (s) => {
        if (bestText) s.paragraphs.push({ kind: "fact", text: `The usual best time to visit ${d.name} is ${bestText}.` });
        else s.missing.push("Best months have not been collected yet.");
        const festivalMonths = input.festivals.map((f) => `${f.name} (${f.month})`);
        if (festivalMonths.length) s.paragraphs.push({ kind: "note", text: `Festival timing to plan around: ${joinList(festivalMonths)}.` });
        s.notices.push("Season information is a reported summary; check the weather forecast for your dates.");
        s.verification = { status: bestText ? "UNVERIFIED" : "NO_DATA", verified: 0, total: bestText ? 1 : 0 };
      })
    );

    // ---- WEATHER (climatology; live weather is fetched on the page)
    sections.push(
      section("weather", "Weather by month", input.weather, (s) => {
        if (input.weather.length) {
          s.table = {
            headers: ["Month", "Low", "High", "Rainfall", "Conditions"],
            rows: input.weather.map((w) => [monthName(w.month), `${w.avg_min_temperature}°C`, `${w.avg_max_temperature}°C`, `${w.rainfall} mm`, w.weather_description])
          };
          input.weather.filter((w) => w.travel_notes).forEach((w) => s.bullets.push(`${monthName(w.month)}: ${w.travel_notes}`));
          s.notices.push("These are typical monthly averages, not a forecast. The live forecast for your dates is shown separately.");
        } else s.missing.push("Monthly climate data has not been collected yet — use the live forecast.");
      })
    );

    // ---- BUDGET (estimates from the cost tables)
    sections.push(
      section("budget", "Budget", input.costs, (s) => {
        const miniDb: MasterDatabase = { ...emptyDatabase(), travel_costs: input.costs };
        const days = d.recommended_days.recommended;
        const tiers = ["BUDGET", "MID_RANGE", "PREMIUM"] as const;
        const rows: Cell[][] = [];
        tiers.forEach((tier) => {
          const est = estimateBudget(miniDb, { destination_ids: [d.id], days, travellers: 2, tier });
          if (est.lines.length > 1)
            rows.push([labelize(tier), formatINR(est.total.typical), rangeINR(est.total.min, est.total.max), formatINR(est.per_person.typical / days)]);
        });
        if (rows.length) {
          s.table = { headers: ["Style", "Estimated total for 2", "Range", "Per person per day"], rows };
          s.paragraphs.push({ kind: "estimate", text: `Estimated cost for two travellers over ${daysText(days)}, excluding travel to ${d.name}. Estimated cost — actual prices may vary.` });
          s.notices.push("These are planning estimates from default cost ranges, not quotes, and are not yet verified.");
        } else s.missing.push("No cost data has been collected yet.");
      })
    );

    // ---- FAMILY / ELDERLY
    const suit = input.suitability;
    const areaRecs = input.accommodation_areas;
    sections.push(
      section("family", "Family travel", suit ? [suit] : [], (s) => {
        if (suit) {
          s.bullets.push(`Families: ${SUITABILITY_LABEL[suit.values.family]}`, `Children: ${SUITABILITY_LABEL[suit.values.children]}`);
          const fam = areaRecs.filter((a) => a.family_suitable).map((a) => a.area_name);
          if (fam.length) s.bullets.push(`Areas noted as suitable for families: ${joinList(fam)}`);
        }
        if (!suit || (suit.values.family === "UNKNOWN" && suit.values.children === "UNKNOWN")) s.missing.push("Family suitability has not been assessed yet.");
        else s.notices.push("Suitability is a planning aid, not a rating, and is not yet verified.");
      })
    );
    sections.push(
      section("elderly", "Older and less-mobile travellers", suit ? [suit] : [], (s) => {
        if (suit) {
          s.bullets.push(`Older travellers: ${SUITABILITY_LABEL[suit.values.elderly]}`, `Wheelchair access: ${SUITABILITY_LABEL[suit.values.wheelchair]}`);
          const el = areaRecs.filter((a) => a.elderly_suitable).map((a) => a.area_name);
          if (el.length) s.bullets.push(`Areas noted as suitable for older travellers: ${joinList(el)}`);
        }
        if (!suit || (suit.values.elderly === "UNKNOWN" && suit.values.wheelchair === "UNKNOWN")) s.missing.push("Accessibility has not been assessed yet.");
        else s.notices.push("Access varies by site — confirm step-free access with the venue.");
      })
    );

    // ---- SAFETY / LOCAL RULES
    const pick = (types: string[]) => input.practical_information.filter((p) => types.includes(p.information_type));
    const safety = pick(["SAFETY", "SCAM_WARNING", "ROAD_WARNING", "WEATHER_WARNING", "HEALTH_FACILITY", "PERMIT"]);
    const rules = pick(["RELIGIOUS_ETIQUETTE", "DRESS_CODE", "LOCAL_RULE", "LOCAL_CUSTOM", "PHOTOGRAPHY_RULE", "DRONE_RULE"]);
    sections.push(section("safety", "Safety", safety, (s) => {
      safety.forEach((p) => s.bullets.push(p.content));
      if (safety.length === 0) s.missing.push("No safety information has been collected yet.");
    }));
    sections.push(section("local-rules", "Local rules and customs", rules, (s) => {
      rules.forEach((p) => s.bullets.push(p.content));
      if (rules.length === 0) s.missing.push("No local rules have been collected yet.");
    }));

    // ---- EMERGENCY
    sections.push(
      section("emergency", "Emergency information", [...input.emergency.national, ...input.emergency.local], (s) => {
        s.table = {
          headers: ["Service", "Number", "Scope"],
          rows: [
            ...input.emergency.national.map((e): Cell[] => [e.name, e.phone ?? "—", "National"]),
            ...input.emergency.local.map((e): Cell[] => [e.name, e.phone ?? "Number to be confirmed", `Local (${d.name})`])
          ]
        };
        if (input.emergency.local.length === 0) s.missing.push(`Local emergency services for ${d.name} have not been collected yet.`);
        s.notices.push("Verify before relying on this information in an emergency.");
      })
    );

    // ---- FESTIVALS
    sections.push(
      section("festivals", "Festivals", input.festivals, (s) => {
        if (input.festivals.length) {
          s.table = {
            headers: ["Festival", "When", "How the date works", "About"],
            rows: input.festivals.map((f) => [f.name, f.month, DATE_TYPE_TEXT[f.date_type], f.description])
          };
          s.notices.push("Festival dates change every year — check the current calendar before booking.");
        } else s.missing.push("No festivals have been collected yet.");
      })
    );

    // ---- NEARBY
    sections.push(
      section("nearby", "Nearby destinations", input.nearby_destinations.map((n) => n.connection), (s) => {
        input.nearby_destinations.slice(0, 8).forEach(({ destination, connection: c }) => {
          const time = c.road_time_minutes ? `, about ${hoursText(c.road_time_minutes)} by road (estimated)` : c.air_time_minutes ? `, about ${hoursText(c.air_time_minutes)} by air` : "";
          s.bullets.push({ text: `${destination.name} — ${Math.round(c.distance_km)} km${time}`, href: `/india/${destination.state_slug}/${destination.slug}` });
        });
        if (input.nearby_destinations.length === 0) s.missing.push("No connected destinations have been collected yet.");
        else s.notices.push("Distances are approximate; times are estimated from distance.");
      })
    );

    // ---- CIRCUITS
    sections.push(
      section("circuits", "Combine with a circuit", [], (s) => {
        input.circuits.forEach(({ circuit, stops }) =>
          s.bullets.push({
            text: `${circuit.name} — ${stops.map((x) => x.name).join(" → ")} (${daysText(circuit.recommended_days)} suggested)`,
            href: `/trips/${circuit.slug}`
          })
        );
        if (input.circuits.length === 0) s.missing.push("This destination is not yet part of a circuit.");
        s.verification = { status: input.circuits.length ? "UNVERIFIED" : "NO_DATA", verified: 0, total: input.circuits.length };
      })
    );

    // ---- FAQ (only questions the data can actually answer)
    const faq: GeneratedPage["faq"] = [];
    const r = d.recommended_days;
    faq.push({
      question: `How many days do I need in ${d.name}?`,
      answer: r.min === r.max ? `Most visitors spend ${r.min} ${r.min === 1 ? "day" : "days"} in ${d.name}.` : `Most visitors spend ${r.min} to ${r.max} days in ${d.name}; ${daysText(r.recommended)} suits a relaxed pace.`
    });
    if (bestText) faq.push({ question: `When is the best time to visit ${d.name}?`, answer: `The usual best time is ${bestText}.` });
    if (d.best_known_for.length) faq.push({ question: `What is ${d.name} known for?`, answer: `${d.name} is best known for ${joinList(d.best_known_for)}.` });
    if (input.transport.hubs.length) {
      const air = input.transport.hubs.filter((h) => h.hub_type === "AIRPORT").map((h) => h.name);
      const rail = input.transport.hubs.filter((h) => h.hub_type === "RAILWAY").map((h) => h.name);
      const bits = [air.length ? `by air via ${joinList(air)}` : null, rail.length ? `by rail via ${joinList(rail)}` : null].filter((x): x is string => Boolean(x));
      if (bits.length) faq.push({ question: `How do I reach ${d.name}?`, answer: `You can reach ${d.name} ${bits.join(" or ")}.` });
    }
    if (input.accommodation_areas.length)
      faq.push({ question: `Where should I stay in ${d.name}?`, answer: `Popular areas are ${joinList(input.accommodation_areas.map((a) => a.area_name))}. See the accommodation section for what each suits.` });
    if (input.festivals.length)
      faq.push({ question: `Which festivals should I plan around in ${d.name}?`, answer: `${joinList(input.festivals.map((f) => `${f.name} (${f.month})`))}. Dates change every year, so check the current calendar.` });
    if (input.nearby_destinations.length)
      faq.push({ question: `Which places can I combine with ${d.name}?`, answer: `Nearby destinations include ${joinList(input.nearby_destinations.slice(0, 4).map((n) => n.destination.name))}.` });
    if (suit && suit.values.elderly !== "UNKNOWN")
      faq.push({ question: `Is ${d.name} suitable for older travellers?`, answer: `${SUITABILITY_LABEL[suit.values.elderly]}. This is a planning note that has not yet been verified.` });

    return {
      entity_id: d.id,
      page_type: "DESTINATION_PAGE",
      title: `${d.name} travel guide`,
      subtitle: d.one_line_description,
      sections,
      faq,
      data_version: input.data_version,
      writer: { name: this.name, version: this.version }
    };
  }
}
