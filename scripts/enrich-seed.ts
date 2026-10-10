/**
 * Location enrichment for master-list records (district + coordinates, each with its source; always unverified).
 *   npm run enrich:seed -- --from-file data/source/master-v1-websearch.json   apply collected hints
 *   npm run enrich:seed -- --wikipedia [--limit 100]                          look up Wikipedia/Wikidata
 * Only empty fields are filled; implausible coordinates (outside India or far from the state) are rejected.
 * Safe to re-run and to stop at any time: progress is saved after every record.
 */
import { readFileSync } from "node:fs";
import { applyLocationHints, recordsNeedingLocation, wikiLocationHint, type LocationHint } from "../lib/cms/enrich";

async function main() {
  const args = process.argv.slice(2);
  const at = (f: string) => (args.includes(f) ? args[args.indexOf(f) + 1] : undefined);
  const file = at("--from-file");
  if (file) {
    const data = JSON.parse(readFileSync(file, "utf8")) as { entries: LocationHint[] };
    const res = applyLocationHints(data.entries);
    console.log(JSON.stringify({ entries: data.entries.length, applied: res.applied.length, fields: res.applied.reduce<Record<string, number>>((m, a) => { a.fields.forEach((f) => (m[f] = (m[f] ?? 0) + 1)); return m; }, {}), unchanged: res.unchanged, not_found: res.not_found, rejected: res.rejected }, null, 2));
    return;
  }
  if (args.includes("--wikipedia")) {
    const limit = Number(at("--limit") ?? 1000);
    const todo = recordsNeedingLocation().slice(0, limit);
    let ok = 0, none = 0, failed = 0;
    for (const [i, d] of todo.entries()) {
      const { hint, error } = await wikiLocationHint(d);
      if (error) {
        failed++;
        console.log(`${i + 1}/${todo.length} ${d.name}: SOURCE_UNAVAILABLE (${error})`);
        if (failed >= 5 && ok === 0) { console.log("Wikipedia is not reachable from here — stopping."); break; }
        continue;
      }
      if (!hint) { none++; console.log(`${i + 1}/${todo.length} ${d.name}: no article that matches ${d.state}`); continue; }
      const res = applyLocationHints([hint]);
      ok += res.applied.length;
      console.log(`${i + 1}/${todo.length} ${d.name}: ${res.applied[0]?.fields.join(", ") || res.rejected[0]?.reason || "nothing new"}`);
      await new Promise((r) => setTimeout(r, 300)); // be polite to the APIs
    }
    console.log(`\nUpdated ${ok}, no matching article ${none}, unreachable ${failed}.`);
    return;
  }
  console.error("usage: npm run enrich:seed -- --from-file <hints.json> | --wikipedia [--limit N]");
  process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
