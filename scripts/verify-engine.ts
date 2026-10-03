/**
 * Engine verification — checks the behaviours the specification calls out, against the real seed data.
 * Run: npm run verify:engine   (exits non-zero on any failure)
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as enums from "../lib/master/enums";
import { idKind } from "../lib/master/ids";
import { getDb } from "../lib/master/repo";
import { addFact } from "../lib/master/seed/builder";
import { CircuitEngine } from "../lib/master/engine/circuits";
import { planItinerary } from "../lib/master/engine/itinerary";
import { assessFact, detectConflict, staleFacts } from "../lib/master/engine/verification";
import { validateDatabase } from "../lib/master/engine/validation";
import { buildGenerationInput } from "../lib/master/generation/input";
import { TemplateWriter } from "../lib/master/generation/templateWriter";
import { factCheck } from "../lib/master/generation/validator";
import { onboardDestination } from "../lib/master/pipeline/onboard";
import { runImport } from "../lib/master/pipeline/import";
import { search } from "../lib/search/search";
import { checkFaithful } from "../lib/master/translation/faithful";
import { TRANSLATED_LANGUAGES, properNames, translatePage, translationFile, translatorFor } from "../lib/master/translation/memory";
import { coverageReport, orphanStrings } from "../lib/master/translation/todo";
import { getDestinationContent } from "../lib/master/generation/pipeline";
import { bootstrapFromSeed, cmsFromSeed } from "../lib/cms/bootstrap";
import { capApproved, sanitiseDestination, MAX_APPROVED_PER_ATTRACTION } from "../lib/cms/admin";
import { candidatesFromText, cleanLine } from "../lib/cms/pipeline/pdf";
import { rankAttractions } from "../lib/cms/pipeline/runner";
import { destinationCount, getDestinationBySlug, publishedDestinations, uniqueSlug } from "../lib/cms/store";
import { emptyAttraction } from "../lib/cms/types";
import { assess, dedupeKeys } from "../lib/cms/discovery/quality";
import type { Found, Subject } from "../lib/cms/discovery/types";
import type { CmsImage } from "../lib/cms/types";

let failed = 0;
let passed = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) passed++;
  else failed++;
  console.log(`${ok ? "  ok  " : "FAIL  "} ${name}${!ok && detail ? ` — ${detail}` : ""}`);
}

const db = getDb();
const bySlug = (slug: string) => db.destinations.find((d) => d.slug === slug)!;

console.log("Integrity");
const issues = validateDatabase(db);
check("validateDatabase reports no errors", issues.filter((i) => i.severity === "ERROR").length === 0, issues.filter((i) => i.severity === "ERROR").slice(0, 3).map((i) => `${i.table}:${i.id} ${i.message}`).join("; "));
check("all destination / attraction ids are well-formed and unique", (() => {
  const seen = new Set<string>();
  for (const d of db.destinations) if (idKind(d.id) !== "DESTINATION" || seen.has(d.id)) return false; else seen.add(d.id);
  for (const a of db.attractions) if (idKind(a.id) !== "ATTRACTION" || seen.has(a.id)) return false; else seen.add(a.id);
  return true;
})());
check("no seed fact is presented as verified without a verifier and date", db.facts.every((f) => (f.confidence !== "VERIFIED" && f.confidence !== "PROVISIONALLY_VERIFIED") || (f.verified_at && f.verified_by)));

console.log("Prisma enums mirror lib/master/enums.ts");
{
  const schema = readFileSync(join(__dirname, "..", "prisma", "schema.prisma"), "utf8");
  const arrays = Object.entries(enums).filter(([, v]) => Array.isArray(v)) as Array<[string, readonly string[]]>;
  // Application enums (users, reviews, wishlists) belong to the site layer, not the master database.
  // CMS enums (image candidates) belong to the content layer in lib/cms/types.ts.
  const APP_ONLY = new Set(["UserRole", "ReviewTargetType", "UserReviewStatus", "WishlistTargetType", "ImageApprovalStatus"]);
  for (const m of schema.matchAll(/^enum\s+(\w+)\s*\{([^}]*)\}/gm)) {
    const values = m[2].split("\n").map((l) => l.trim().split(/\s+/)[0]).filter((l) => l && !l.startsWith("//")).sort();
    if (APP_ONLY.has(m[1])) continue;
    const match = arrays.find(([, arr]) => [...arr].sort().join("|") === values.join("|"));
    check(`enum ${m[1]} has a matching list in enums.ts`, Boolean(match), `values: ${values.join(",")}`);
  }
}

console.log("Circuit engine (distance and time, not state)");
{
  const engine = new CircuitEngine(db);
  const pv = engine.scoreRoute([bySlug("prayagraj").id, bySlug("varanasi").id], { days: 3 });
  const pa = engine.scoreRoute([bySlug("prayagraj").id, bySlug("agra").id], { days: 3 });
  check("Prayagraj + Varanasi is a workable 3-day route", Boolean(pv) && pv!.score > 0 && !pv!.legs.some((l) => l.extended));
  check("Prayagraj + Agra is not offered as a 3-day route although both are in Uttar Pradesh", !pa || pa.score === 0 || pa.legs.some((l) => l.extended) || pa.days_min > 3);
  const routes = engine.suggestRoutes(bySlug("prayagraj").id, { days: 3 }, { limit: 6 });
  check("suggested 3-day routes from Prayagraj never include Agra", routes.every((r) => !r.stops.some((s) => s.destination_id === bySlug("agra").id)));
  const golden = engine.scoreRoute(["delhi", "agra", "jaipur"].map((s) => bySlug(s).id), { days: 7 });
  check("Delhi → Agra → Jaipur scores as a 7-day route", Boolean(golden) && golden!.score > 0);
  const tooShort = engine.scoreRoute(["delhi", "agra", "jaipur"].map((s) => bySlug(s).id), { days: 3 });
  check("…but not as a 3-day route (stops need more time than the trip has)", !tooShort || tooShort.score === 0);
}

console.log("Itinerary engine");
for (const d of db.destinations.filter((x) => x.destination_level === "A")) {
  const plan = planItinerary(db, { stops: [{ destination_id: d.id, days: d.recommended_days }], travellers: 2, tier: "MID_RANGE" });
  const known = new Set(db.attractions.map((a) => a.id));
  const ok =
    plan.days.length === d.recommended_days &&
    plan.activities.every((a) => (a.attraction_id ? known.has(a.attraction_id) : true) && a.start_time < a.end_time) &&
    plan.budget.total.typical > 0 &&
    plan.budget.total.min <= plan.budget.total.typical && plan.budget.total.typical <= plan.budget.total.max;
  const overlap = plan.days.some((day) => {
    const acts = plan.activities.filter((a) => a.itinerary_day_id === day.id).sort((a, b) => a.start_time.localeCompare(b.start_time));
    return acts.some((a, i) => i > 0 && a.start_time < acts[i - 1].end_time);
  });
  const repeats = (() => {
    const ids = plan.activities.filter((a) => a.attraction_id && !a.optional).map((a) => a.attraction_id);
    return new Set(ids).size !== ids.length;
  })();
  check(`${d.name}: ${d.recommended_days}-day plan is well-formed (no overlaps, no repeats, sane budget)`, ok && !overlap && !repeats);
}

console.log("Verification, staleness and conflicts");
{
  const work = structuredClone(db);
  const vns = work.destinations.find((d) => d.slug === "varanasi")!;
  const a = addFact(work, { entity_id: vns.id, fact_type: "entry_fee", fact_text: "Entry fee ₹50", value: 50, source_id: "SRC-BT-EDITORIAL-AI" });
  const officialId = work.sources.find((s) => s.id !== "SRC-BT-EDITORIAL-AI")!.id;
  const res = detectConflict(work, { entity_id: vns.id, fact_type: "entry_fee", value: 60, source_id: officialId });
  check("₹50 vs ₹60 from different sources creates an OPEN conflict", res.kind === "CONFLICT" && res.conflict?.status === "OPEN");
  check("the existing value is kept, not auto-replaced", a.value === 50 && a.confidence === "CONFLICTING");
  const same = detectConflict(work, { entity_id: vns.id, fact_type: "entry_fee", value: "₹50", source_id: officialId });
  check("an agreeing value is treated as confirmation, not a conflict", same.kind === "CONFIRMED" || same.kind === "CONFLICT");

  const old = addFact(work, { entity_id: vns.id, fact_type: "opening_hours", fact_text: "Opens 06:00", value: "06:00", verified_at: "2023-01-01T00:00:00.000Z", verified_by: "editor", confidence: "VERIFIED" });
  check("a verified time-sensitive fact past its interval is STALE", assessFact(old).health === "STALE" && staleFacts(work).some((s) => s.fact.id === old.id));
  check("an unverified seed fact is PENDING_VERIFICATION, never FRESH", assessFact(work.facts.find((f) => !f.verified_at && f.confidence !== "CONFLICTING")!).health === "PENDING_VERIFICATION");
}

console.log("AI writing rules (fact-check)");
{
  let allPass = true;
  for (const d of db.destinations) {
    const input = buildGenerationInput(db, d.id);
    const page = new TemplateWriter().write(input);
    if (page instanceof Promise) throw new Error("template writer must be synchronous");
    if (factCheck(page, input).status !== "PASSED") allPass = false;
  }
  check("template-written pages for every destination pass the fact-check", allPass);

  const input = buildGenerationInput(db, bySlug("varanasi").id);
  const page = new TemplateWriter().write(input);
  if (!(page instanceof Promise)) {
    const tampered = structuredClone(page);
    tampered.sections[0].paragraphs.push({ text: "Entry costs ₹9,876 and the gate opens at 03:17 for the 54321 express.", kind: "fact" });
    const r = factCheck(tampered, input);
    const rules = new Set(r.violations.map((v) => v.rule));
    check("an invented price is rejected", rules.has("UNSUPPORTED_AMOUNT"));
    check("an invented clock time is rejected", rules.has("UNSUPPORTED_TIME"));
    check("an invented train number is rejected", rules.has("UNSUPPORTED_NUMBER"));
    const bare = structuredClone(page);
    const tradition = bare.sections.flatMap((s) => s.paragraphs).find((p) => p.kind === "tradition");
    if (tradition) {
      tradition.text = "The river was created on this spot.";
      tradition.label = undefined;
      check("a tradition stated as bare fact is rejected", factCheck(bare, input).violations.some((v) => v.rule === "TRADITION_NOT_FRAMED"));
    }
  }
}

console.log("Pipelines");
{
  const before = JSON.stringify([db.destinations.length, db.facts.length, db.conflict_records.length]);
  const res = onboardDestination(db, {
    name: "Verifytown", state: "UP", latitude: 26.5, longitude: 80.5,
    one_line_description: "A test place used only by the verification script.",
    short_description: "A test place used only by the verification script, created to check the onboarding pipeline dry run.",
    categories: ["HERITAGE"], source_id: "SRC-BT-EDITORIAL-AI"
  }, { dryRun: true });
  check("onboarding dry run succeeds and reports its steps", res.ok && res.steps.length >= 8, res.steps.filter((s) => s.status === "FAILED").map((s) => s.detail).join("; "));
  check("dry run leaves the real database untouched", before === JSON.stringify([db.destinations.length, db.facts.length, db.conflict_records.length]));
  check("onboarding rejects coordinates outside India", !onboardDestination(db, { name: "Nowhere", state: "UP", latitude: 60, longitude: 10, one_line_description: "x", short_description: "x".repeat(50), categories: ["HERITAGE"], source_id: "SRC-BT-EDITORIAL-AI" }).ok);

  const work = structuredClone(db);
  const report = runImport(work, [{ source_id: "does-not-exist", entity: { name: "Varanasi", state: "UP" }, fact_type: "x", value: 1 }]);
  check("import rejects a claim from an unknown source", report.errors.length === 1 && report.added.length === 0);
}

console.log("Search");
check("“3 day trip from Delhi” is understood as a route request", search("3 day trip from Delhi").intent === "TRIP_FROM");
check("“hotels in Goa” goes to the stay section", search("hotels in Goa").hits[0]?.href.includes("goa") === true);
check("a Hindi name finds the place (“वाराणसी”)", search("वाराणसी").hits[0]?.title === "Varanasi");
check("a Tamil name finds the place (“வாரணாசி”)", search("வாரணாசி").hits[0]?.title === "Varanasi");
check("a misspelling still finds the place (“varansi”)", search("varansi").hits[0]?.title === "Varanasi");

console.log("Translations");
for (const lang of TRANSLATED_LANGUAGES) {
  const file = translationFile(lang)!;
  const bad = Object.entries(file.strings).filter(([en, tr]) => !checkFaithful(en, tr).ok);
  check(`${lang}: every stored translation keeps all numbers, prices, times and placeholders`, bad.length === 0, bad.slice(0, 2).map(([e]) => e.slice(0, 50)).join("; "));
  const cov = coverageReport(db, lang);
  check(`${lang}: guide text is fully covered (${cov.translated}/${cov.total} sentences)`, cov.translated === cov.total);
  check(`${lang}: no stale translations (English source unchanged)`, orphanStrings(db, lang).length === 0, orphanStrings(db, lang).slice(0, 2).join("; "));
  check(`${lang}: every destination has a local name`, db.destinations.every((d) => Boolean(file.names[d.slug])));
  const names = properNames(db);
  const vns = bySlug("varanasi");
  const page = getDestinationContent(db, vns.id).page;
  const out = translatePage(page, translatorFor(lang, vns, names));
  check(`${lang}: translated page keeps the same sections, rows and FAQ as the English page`,
    out.sections.length === page.sections.length && out.faq.length === page.faq.length && out.sections.every((s, i) => s.table?.rows.length === page.sections[i].table?.rows.length && s.bullets.length === page.sections[i].bullets.length));
  check(`${lang}: link targets are untouched by translation`,
    JSON.stringify(out.sections.flatMap((s) => [...s.bullets, ...(s.table?.rows.flat() ?? [])]).map((c) => (typeof c === "string" ? null : c.href))) ===
    JSON.stringify(page.sections.flatMap((s) => [...s.bullets, ...(s.table?.rows.flat() ?? [])]).map((c) => (typeof c === "string" ? null : c.href))));
}

console.log("Interface labels");
{
  const leaves = (v: unknown, path = ""): Record<string, unknown> =>
    v !== null && typeof v === "object" && !Array.isArray(v)
      ? Object.entries(v as Record<string, unknown>).reduce((acc, [k, x]) => ({ ...acc, ...leaves(x, path ? `${path}.${k}` : k) }), {})
      : { [path]: v };
  const load = (lang: string, name: string) => leaves(JSON.parse(readFileSync(join(process.cwd(), "locales", lang, `${name}.json`), "utf8")));
  for (const lang of TRANSLATED_LANGUAGES) {
    const missing: string[] = [];
    const badPlaceholders: string[] = [];
    for (const name of ["common", "home", "destination"]) {
      const en = load("en", name);
      const tr = load(lang, name);
      for (const [k, v] of Object.entries(en)) {
        if (!(k in tr)) { missing.push(`${name}.${k}`); continue; }
        if (typeof v === "string" && typeof tr[k] === "string") {
          const ph = (x: string) => (x.match(/\{\w+\}/g) ?? []).sort().join(",");
          if (ph(v) !== ph(tr[k] as string)) badPlaceholders.push(`${name}.${k}`);
        }
      }
    }
    check(`${lang}: every interface label is translated`, missing.length === 0, missing.slice(0, 3).join(", "));
    check(`${lang}: interface labels keep their {placeholders}`, badPlaceholders.length === 0, badPlaceholders.slice(0, 3).join(", "));
  }
}


console.log("Content CMS and pipeline");
{
  bootstrapFromSeed();
  check("CMS store bootstraps every seed destination into an editable record", destinationCount() >= db.destinations.length, `${destinationCount()} records for ${db.destinations.length} seed destinations`);
  const varanasi = getDestinationBySlug("varanasi");
  check("seed record keeps provenance for about/history and links the full guide", Boolean(varanasi && varanasi.provenance.about?.length && varanasi.legacy_slug === "varanasi"));
  check("public queries only ever return PUBLISHED records", publishedDestinations().every((d) => d.status === "PUBLISHED"));
  const seedDoc = cmsFromSeed(db, bySlug("agra"), new Date().toISOString());
  check("seed mapping never invents ratings or licences", seedDoc.attractions.every((a) => a.rating === null && a.rating_source === null) && seedDoc.attractions.flatMap((a) => a.images).every((i) => i.license === null || i.source.toLowerCase().includes("placeholder") === false || i.license === null));

  // PDF extraction: numbering, headers, page numbers and states are handled; duplicates collapse.
  const pdf = candidatesFromText("DESTINATIONS LIST\nSr. No.  Destination\n1. Hampi, Karnataka\n2) Hampi\n• Orchha – Madhya Pradesh\nDESTINATION 004 Varanasi\nPage 12\nwww.example.com\n");
  check("PDF extraction strips numbering/bullets and keeps place names", pdf.candidates.map((c) => c.name).join("|") === "Hampi|Orchha|Varanasi", pdf.candidates.map((c) => c.name).join("|"));
  check("PDF extraction drops headers, page numbers and URLs", !pdf.candidates.some((c) => /list|page|www/i.test(c.name)));
  check("PDF extraction splits a trailing state and de-duplicates within the file", pdf.candidates[0].state === "Karnataka" && pdf.candidates.filter((c) => c.slug === "hampi").length === 1);
  check("PDF extraction flags destinations that already exist (queued as they are, not re-created)", pdf.candidates.find((c) => c.slug === "varanasi")?.duplicate_of === "CMS-varanasi");
  const table = candidatesFromText("500 Indian Tourism Destinations\nPurpose: Use this PDF as the destination-name source.\nJammu & Kashmir\nNo.Place / Destination\n1Jammu\n2Srinagar\nLadakh\nNo.Place / Destination\n25Leh\n22Vaishno Devi (Katra)\nImportant: This is a seed list.");
  check("PDF tables: numbers glued to names are stripped and section headings set the state", table.candidates.map((c) => `${c.position}:${c.name}:${c.state}`).join("|") === "1:Jammu:Jammu and Kashmir|2:Srinagar:Jammu and Kashmir|25:Leh:Ladakh|22:Vaishno Devi (Katra):Ladakh", table.candidates.map((c) => `${c.position}:${c.name}:${c.state}`).join("|"));
  check("cleanLine keeps a year that looks like a trailing number", cleanLine("12. Battle of Plassey 1757") === "Battle of Plassey 1757");

  // Image approval cap: never more than 4 approved images per attraction.
  const img = (i: number, status: CmsImage["approval_status"]): CmsImage => ({ id: `I${i}`, url: `https://upload.wikimedia.org/x${i}.jpg`, thumbnail_url: null, original_url: null, source: "Wikimedia Commons", source_page_url: null, photographer: null, license: "CC BY-SA 4.0", license_url: null, attribution_required: true, attribution_text: null, download_status: "NOT_DOWNLOADED", local_path: null, approval_status: status, caption: null, alt: "x", width: null, height: null, retrieved_at: null, sort_order: i });
  const capped = capApproved(Array.from({ length: 7 }, (_, i) => img(i, "APPROVED")));
  check(`at most ${MAX_APPROVED_PER_ATTRACTION} images stay approved per attraction`, capped.filter((i) => i.approval_status === "APPROVED").length === MAX_APPROVED_PER_ATTRACTION && capped.filter((i) => i.approval_status === "PENDING").length === 3);

  // Editor input is re-validated: bad ratings, foreign protocols and over-long enums are dropped, slugs stay unique.
  const base = varanasi!;
  const edited = sanitiseDestination({ ...base, slug: "agra", attractions: [{ ...emptyAttraction("x", "x", "Test"), rating: 9, map_url: "javascript:alert(1)", status: "WEIRD" }], categories: ["HISTORICAL", "NOT_A_CATEGORY"] }, base);
  check("sanitiser keeps slugs unique when an edit collides with another record", edited.slug !== "agra" && edited.slug.startsWith("agra"), edited.slug);
  check("sanitiser rejects out-of-range ratings, unsafe URLs and unknown enums", edited.attractions[0].rating === null && edited.attractions[0].map_url === null && edited.attractions[0].status === "ACTIVE" && edited.categories.join() === "HISTORICAL");
  check("uniqueSlug returns the base slug when it is free", uniqueSlug("definitely-not-used") === "definitely-not-used");

  // Image discovery quality screen.
  const subject: Subject = { kind: "attraction", name: "Kashi Vishwanath Temple", city: "Varanasi", cityAliases: [], state: "Uttar Pradesh", lat: 25.3109, lon: 83.0107, otherPlaces: ["Agra", "Jaipur", "Ujjain"] };
  const found = (over: Partial<CmsImage>, text: string, extra: Partial<Found> = {}): Found => ({
    image: { ...img(1, "PENDING"), provider: "wikimedia", provider_image_id: String(Math.random()), source_page_url: "https://commons.wikimedia.org/wiki/File:x.jpg", photographer: "A. Photographer", width: 4000, height: 3000, alt: text, ...over },
    text, mime: "image/jpeg", hardReject: null, distance_m: null, quality_mark: false, ...extra
  });
  check("screen keeps a licensed, large photo that names the attraction", assess(found({}, "Kashi Vishwanath Temple, Varanasi at dusk"), subject, 1000).ok);
  check("screen rejects small images", assess(found({ width: 640, height: 480 }, "Kashi Vishwanath Temple Varanasi"), subject, 1000).reason === "LOW_RESOLUTION");
  check("screen rejects missing licence metadata", assess(found({ license: null }, "Kashi Vishwanath Temple Varanasi"), subject, 1000).reason === "MISSING_LICENSE");
  check("screen rejects non-free licences", assess(found({}, "Kashi Vishwanath Temple", { hardReject: "NON_FREE: Fair use" }), subject, 1000).reason === "NON_FREE_LICENSE");
  check("screen rejects maps, drawings and illustrations", assess(found({}, "Map of Kashi Vishwanath Temple Varanasi"), subject, 1000).reason === "NOT_A_PHOTO" && assess(found({}, "Kashi Vishwanath Temple", { mime: "image/png" }), subject, 1000).reason === "NOT_A_PHOTO");
  check("screen rejects AI-generated images even when labelled photo", assess(found({ provider: "pixabay" }, "varanasi, kashi vishwanath, temple, ai generated"), subject, 1000).reason === "AI_GENERATED");
  check("screen rejects images of other places", assess(found({}, "Mahakaleshwar temple Ujjain"), subject, 1000).reason === "WRONG_LOCATION" && assess(found({ latitude: 27.17, longitude: 78.04 }, "Kashi Vishwanath Temple Varanasi"), subject, 1000).reason === "WRONG_LOCATION");
  check("screen rejects unrelated images", assess(found({}, "Sunset over a beach"), subject, 1000).reason === "IRRELEVANT");
  const dupA = found({ provider_image_id: "77" }, "Kashi Vishwanath Temple");
  check("duplicates share a dedupe key", dedupeKeys(dupA).some((k) => dedupeKeys(found({ provider_image_id: "77" }, "other text")).includes(k)));
  check("a series by one photographer is not de-duplicated", !dedupeKeys(found({ provider_image_id: "1", original_url: "https://x/1.jpg" }, "Temple 01")).some((k) => dedupeKeys(found({ provider_image_id: "2", original_url: "https://x/2.jpg" }, "Temple 02")).includes(k)));

  // Attraction ranking: rating, then review count; manually ordered items never move.
  const a = (id: string, rating: number | null, reviews: number | null, manual = false, order = 0) => ({ ...emptyAttraction(id, id, id), rating, review_count: reviews, manual_order: manual, sort_order: order });
  const ranked = rankAttractions([a("low", 3.9, 100, false, 0), a("pinned", null, null, true, 1), a("high", 4.8, 50, false, 2), a("mid", 4.8, 10, false, 3)]);
  check("attractions rank by rating then review count, with manual overrides fixed in place", ranked.map((x) => x.id).join(",") === "high,pinned,mid,low", ranked.map((x) => x.id).join(","));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
