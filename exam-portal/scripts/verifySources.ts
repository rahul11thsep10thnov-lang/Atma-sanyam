/**
 * Source verification report — run on a machine that can reach the sites
 * (the owner's PC or the server), never trusted from memory:
 *
 *   npm run sources:verify -- --pending          all sources awaiting approval
 *   npm run sources:verify -- --all              every source
 *   npm run sources:verify -- --state UP         one state/UT
 *   npm run sources:verify -- --category RAILWAY
 *   npm run sources:verify -- --id <sourceId>
 *   add --limit 20 to try a few first
 *
 * For each source: SSRF-safe fetch, robots.txt, final domain check, parse.
 * Writes source-verification-report.md and updates each source's
 * verification status. It never approves or enables anything.
 */
import { writeFileSync } from "node:fs";
import { prisma } from "../src/lib/db/prisma";
import { verifySource, type VerificationResult } from "../src/lib/pipeline/verify";
import { mapLimit } from "../src/lib/pipeline/runner";
import type { Prisma } from "../src/generated/prisma/client";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const where: Prisma.SourceWhereInput = {};
  if (process.argv.includes("--pending")) where.approvalStatus = "PENDING";
  if (arg("state")) where.stateCode = arg("state")!.toUpperCase();
  if (arg("category")) where.category = arg("category")!.toUpperCase() as Prisma.SourceWhereInput["category"];
  if (arg("id")) where.id = arg("id");
  if (!process.argv.includes("--all") && Object.keys(where).length === 0) {
    console.log("Choose what to verify: --pending, --all, --state XX, --category NAME or --id ID");
    return;
  }
  const limit = Number(arg("limit") ?? 1000);
  const sources = await prisma.source.findMany({ where, orderBy: [{ category: "asc" }, { stateCode: "asc" }, { name: "asc" }], take: limit, select: { id: true, name: true, category: true, stateCode: true } });
  console.log(`Verifying ${sources.length} source(s), 3 at a time (one connection per site)…`);

  let done = 0;
  const results = await mapLimit(sources, 3, async (s) => {
    let r: VerificationResult;
    try {
      r = await verifySource(s.id);
    } catch (err) {
      r = { sourceId: s.id, name: s.name, url: "", status: "FAILED", httpStatus: null, finalUrl: null, candidates: 0, robots: "", note: String(err), sample: [] };
    }
    done += 1;
    console.log(`[${done}/${sources.length}] ${r.status.padEnd(10)} ${s.name} — ${r.note.slice(0, 140)}`);
    return { ...r, category: s.category, stateCode: s.stateCode };
  });

  const count = (st: string) => results.filter((r) => r.status === st).length;
  const lines = [
    "# Source verification report",
    "",
    `Generated ${new Date().toISOString()} on this machine. Verified = reachable, on the configured official domain, allowed by robots.txt and at least one notice link parsed. Nothing was approved or enabled automatically.`,
    "",
    `**${count("VERIFIED")} verified · ${count("UNVERIFIED")} need a terms review (aggregators) · ${count("FAILED")} failed** (of ${results.length})`,
    "",
    "| Status | Source | Category | State | HTTP | Links parsed | Final URL | Note |",
    "|---|---|---|---|---|---|---|---|",
    ...results.map((r) => `| ${r.status} | ${r.name.replace(/\|/g, "/")} | ${r.category} | ${r.stateCode ?? ""} | ${r.httpStatus ?? "—"} | ${r.candidates} | ${r.finalUrl ?? r.url} | ${r.note.replace(/\|/g, "/").replace(/\n/g, " ").slice(0, 300)} |`),
    "",
  ];
  writeFileSync("source-verification-report.md", lines.join("\n"));
  console.log(`\nReport written to source-verification-report.md — ${count("VERIFIED")} verified, ${count("FAILED")} failed.`);
  console.log("Next: Admin → Automation → Sources → filter 'Awaiting approval', approve the verified ones, then enable them.");
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
