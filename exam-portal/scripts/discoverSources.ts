/**
 * Controlled source discovery from approved root sources:
 *
 *   npm run sources:discover -- --id <sourceId>       one source
 *   npm run sources:discover -- --verified            every verified, approved root source
 *   add --dry-run to only print what would be proposed
 *
 * Proposals are saved as PENDING + disabled (see src/lib/pipeline/discovery.ts).
 */
import { prisma } from "../src/lib/db/prisma";
import { discoverFromSource } from "../src/lib/pipeline/discovery";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const ids = arg("id")
    ? [arg("id")!]
    : process.argv.includes("--verified")
      ? (await prisma.source.findMany({ where: { approvalStatus: "APPROVED", verificationStatus: "VERIFIED", discoveredFromId: null }, select: { id: true } })).map((s) => s.id)
      : [];
  if (!ids.length) {
    console.log("Choose: --id <sourceId> or --verified (optionally --dry-run)");
    return;
  }
  let total = 0;
  for (const id of ids) {
    const r = await discoverFromSource(id, { dryRun });
    const name = (await prisma.source.findUnique({ where: { id }, select: { name: true } }))?.name ?? id;
    if (r.error) {
      console.log(`✗ ${name}: ${r.error}`);
      continue;
    }
    console.log(`✓ ${name}: ${r.proposals.length} proposal(s), ${r.created.length} saved, ${r.skipped.length} skipped`);
    for (const p of dryRun ? r.proposals.map((x) => ({ name: x.name, url: x.url, approvalStatus: "(dry run)" })) : r.created) console.log(`    + [${p.approvalStatus}] ${p.name} — ${p.url}`);
    total += r.created.length;
  }
  console.log(`\n${total} new source(s) saved. Review them under Admin → Automation → Sources → Awaiting approval.`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
