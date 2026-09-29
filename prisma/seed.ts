/**
 * Loads the master database (built by lib/master/seed) into PostgreSQL.
 * Run after `npm run prisma:migrate`:  npm run prisma:seed
 *
 * Tables are inserted in dependency order; re-running is safe (skipDuplicates).
 * Deliberately not part of the Next.js type-check (see tsconfig `exclude`);
 * `npm run verify:seed-types` type-checks it against the generated client.
 */
import { Prisma, PrismaClient } from "@prisma/client";
import { getDb } from "../lib/master/repo";
import { generateAllContent } from "../lib/master/generation/pipeline";

const prisma = new PrismaClient();

const DATE_KEYS = new Set([
  "created_at", "updated_at", "last_verified_at", "verified_at", "expires_at", "valid_from", "valid_until",
  "detected_at", "resolved_at", "start_date", "end_date", "publication_date", "accessed_at",
  "generation_timestamp", "last_updated", "date_optional"
]);
const JSON_KEYS = new Set(["value", "existing_value", "incoming_value"]);

/** ISO strings → Date, JSON nulls → Prisma.JsonNull (createMany rejects bare null for Json columns). */
function prepare<T extends object>(row: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (DATE_KEYS.has(k) && typeof v === "string") out[k] = new Date(v);
    else if (JSON_KEYS.has(k) && v === null) out[k] = Prisma.JsonNull;
    else out[k] = v;
  }
  return out;
}

type Delegate = { createMany: (args: { data: any[]; skipDuplicates?: boolean }) => Promise<{ count: number }> };

async function insert(name: string, delegate: Delegate, rows: object[]) {
  const data = rows.map(prepare);
  let count = 0;
  for (let i = 0; i < data.length; i += 500) {
    const res = await delegate.createMany({ data: data.slice(i, i + 500), skipDuplicates: true });
    count += res.count;
  }
  console.log(`  ${name.padEnd(26)} ${String(count).padStart(5)} / ${data.length}`);
}

async function main() {
  const db = getDb();
  const content = generateAllContent(db);
  console.log("Seeding master database…");

  await insert("sources", prisma.source, db.sources);
  await insert("states", prisma.state, db.states);
  await insert("districts", prisma.district, db.districts);

  // parents first so the self-referencing foreign key is satisfied
  const destinations = [...db.destinations].sort((a, b) => Number(Boolean(a.parent_destination_id)) - Number(Boolean(b.parent_destination_id)));
  await insert("destinations", prisma.destination, destinations);
  await insert("destination_categories", prisma.destinationCategoryLink, db.destination_categories);
  await insert("attractions", prisma.attraction, db.attractions);
  await insert("historical_periods", prisma.historicalPeriod, db.historical_periods);
  await insert("historical_events", prisma.historicalEvent, db.historical_events);
  await insert("traditions", prisma.tradition, db.traditions);
  await insert("destination_descriptions", prisma.destinationDescription, db.destination_descriptions);
  await insert("transport_hubs", prisma.transportHub, db.transport_hubs);
  await insert("destination_connections", prisma.destinationConnection, db.destination_connections);
  await insert("circuits", prisma.circuit, db.circuits);
  await insert("circuit_destinations", prisma.circuitDestination, db.circuit_destinations);
  await insert("travel_costs", prisma.travelCost, db.travel_costs);
  await insert("accommodation_areas", prisma.accommodationArea, db.accommodation_areas);
  await insert("local_foods", prisma.localFood, db.local_foods);
  await insert("shopping", prisma.shoppingItem, db.shopping);
  await insert("festivals", prisma.festival, db.festivals);
  await insert("destination_weather", prisma.destinationWeather, db.destination_weather);
  await insert("practical_information", prisma.practicalInformation, db.practical_information);
  await insert("emergency_services", prisma.emergencyService, db.emergency_services);
  await insert("experiences", prisma.experience, db.experiences);
  await insert(
    "destination_suitability",
    prisma.destinationSuitability,
    db.destination_suitability.map(({ values, ...rest }) => ({ ...rest, ...values }))
  );
  await insert("facts", prisma.fact, db.facts);
  await insert("conflict_records", prisma.conflictRecord, db.conflict_records);
  await insert("entity_relationships", prisma.entityRelationship, db.entity_relationships);
  await insert("translations", prisma.translation, db.translations);
  await insert("media", prisma.media, db.media);
  await insert("ai_visual_prompts", prisma.aiVisualPrompt, db.ai_visual_prompts);
  await insert("generated_content", prisma.generatedContent, content.generated_content);
  await insert("seo_metadata", prisma.seoMetadata, content.seo_metadata);
  console.log("Done.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
