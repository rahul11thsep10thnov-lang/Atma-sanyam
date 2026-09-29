/**
 * SOURCE IMPORT PIPELINE (spec section 47) — dry-run report for a JSON file of claims.
 *   npm run import:facts -- path/to/claims.json
 * File format: { "claims": [{ "source_id", "entity": { "name", "state" } | { "id" }, "fact_type", "value", "text?" }] }
 * Nothing is written: the report shows what would be added, confirmed, skipped, or held as a conflict.
 */
import { getDb } from "../lib/master/repo";
import { JsonFileAdapter, runImport } from "../lib/master/pipeline/import";

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("usage: npm run import:facts -- <claims.json>");
    process.exit(2);
  }
  const claims = await new JsonFileAdapter(file).discover();
  const report = runImport(structuredClone(getDb()), claims);
  console.log(JSON.stringify({
    received: report.received, added: report.added.length, confirmed: report.confirmed, duplicates: report.duplicates,
    conflicts: report.conflicts, unresolved_entities: report.unresolved, errors: report.errors.map((e) => `${e.claim.fact_type}: ${e.reason}`)
  }, null, 2));
  if (report.conflicts.length) console.log("\nConflicts are never auto-resolved — an admin decides in Admin → Conflicts.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
