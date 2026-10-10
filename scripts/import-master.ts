/**
 * Imports the India Tourism Master Database workbook into the CMS.
 *   npm run import:master -- [path/to/workbook.xlsx] [--dry-run] [--batch 50] [--restart] [--no-queue]
 * Default path: data/source/India_Tourism_Master_Database_v1.xlsx
 *
 * --dry-run  prints the plan (what would be created, linked, held for review) and writes nothing.
 * --restart  clears the checkpoint first (rows already linked are still skipped — the run stays idempotent).
 * --no-queue does not add the new records to the research pipeline queue.
 * The full report is written to data/cms/imports/master-v1-report.json.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runMasterImport } from "../lib/cms/masterImport";
import { enqueue } from "../lib/cms/pipeline/runner";

async function main() {
  const args = process.argv.slice(2);
  const flag = (f: string) => args.includes(f);
  const value = (f: string) => {
    const i = args.indexOf(f);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const file = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--batch") ?? join("data", "source", "India_Tourism_Master_Database_v1.xlsx");
  const { plan, report } = await runMasterImport(readFileSync(file), file.split(/[\\/]/).pop()!, {
    dryRun: flag("--dry-run"),
    restart: flag("--restart"),
    queue: !flag("--no-queue"),
    batchSize: Number(value("--batch") ?? 50),
    onBatch: (done, total) => console.log(`  batch saved: ${done}/${total}`),
    enqueue: (ids) => enqueue("master-v1", ids)
  });
  console.log(`Workbook: ${plan.rows} destination rows, ${plan.clusters} trip clusters, sheets: ${plan.sheets.join(", ")}`);
  if (plan.missing_columns.length) console.log(`Columns not present in the workbook: ${plan.missing_columns.join(", ")}`);
  console.log("Plan:", plan.tally);
  for (const a of plan.attention) console.log(` ${a.kind.padEnd(14)} ${a.source_id} ${a.name} — ${a.reason}${a.conflicts.length ? ` [${a.conflicts.join("; ")}]` : ""}`);
  if (!report) {
    console.log("\nDry run: nothing was written.");
    return;
  }
  console.log(JSON.stringify({ totals: report.totals, this_run: report.counts, matches: report.matches, clusters: { ...report.clusters, unresolved: report.clusters.unresolved.length }, queued_for_enrichment: report.queued_for_enrichment }, null, 2));
  if (report.failures.length) {
    console.log("Failures:", report.failures);
    process.exitCode = 1;
  }
  console.log("Report: data/cms/imports/master-v1-report.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
