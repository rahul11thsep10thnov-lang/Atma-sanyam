// Seeds the source registry (prisma/sourceRegistry.ts): categories A–G,
// all priority states, every RRB, and the user-supplied aggregator.
//
//   npm run seed:sources
//
// Every NEW row is created disabled, approvalStatus PENDING and
// verificationStatus UNVERIFIED — nothing is checked until an admin has
// verified (npm run sources:verify) and approved it. Existing rows (same
// canonical URL) keep their URL, switches and approval; only empty
// classification fields (category/state/group) are filled in. Safe to
// re-run.
import { prisma } from "./scriptDb";
import { SOURCE_REGISTRY } from "./sourceRegistry";
import { canonicalizeUrl } from "../src/lib/pipeline/dedup";

const FREQ = { HIGH: 30, NORMAL: 240, LOW: 1440 } as const;
const key = (url: string) => (canonicalizeUrl(url) ?? url).replace(/\/$/, "");

async function main() {
  // Bring legacy rows onto the app's canonical form first.
  for (const s of await prisma.source.findMany({ select: { id: true, listingUrl: true, canonicalUrl: true } })) {
    const k = key(s.listingUrl);
    if (s.canonicalUrl !== k) {
      const clash = await prisma.source.findFirst({ where: { canonicalUrl: k, NOT: { id: s.id } }, select: { id: true } });
      if (!clash) await prisma.source.update({ where: { id: s.id }, data: { canonicalUrl: k } });
    }
  }

  let created = 0;
  let updated = 0;
  const seen = new Set<string>();
  for (const e of SOURCE_REGISTRY) {
    const canonicalUrl = key(e.url);
    if (seen.has(canonicalUrl)) throw new Error(`Registry lists ${e.url} twice`);
    seen.add(canonicalUrl);
    const host = new URL(e.url).hostname.replace(/^www\./, "");
    const existing = await prisma.source.findFirst({ where: { OR: [{ canonicalUrl }, { listingUrl: e.url }] } });
    if (existing) {
      await prisma.source.update({
        where: { id: existing.id },
        data: {
          category: existing.category === "CENTRAL" && e.category !== "CENTRAL" ? e.category : undefined,
          stateCode: existing.stateCode ?? e.state ?? null,
          groupName: existing.groupName ?? e.group,
          isAggregator: existing.isAggregator || !!e.aggregator,
        },
      });
      updated += 1;
      continue;
    }
    await prisma.source.create({
      data: {
        name: e.name,
        listingUrl: e.url,
        canonicalUrl,
        officialDomain: host,
        sourceType: "HTML",
        category: e.category,
        stateCode: e.state ?? null,
        groupName: e.group,
        isAggregator: !!e.aggregator,
        parserConfig: e.aggregator ? { sameSiteOnly: true } : undefined,
        priority: e.priority,
        checkFrequencyMinutes: e.aggregator ? 720 : FREQ[e.priority],
        minRequestIntervalMs: e.aggregator ? 5000 : 1500,
        active: false,
        approvalStatus: "PENDING",
        verificationStatus: "UNVERIFIED",
        verificationNote: `Seeded from the registry (domain confidence: ${e.confidence}). Not fetched yet: run "npm run sources:verify" where the site is reachable, then approve.${e.note ? ` ${e.note}` : ""}`.slice(0, 1000),
      },
    });
    created += 1;
  }
  const byCat = await prisma.source.groupBy({ by: ["category"], _count: true });
  console.log(`Registry: ${created} sources added (disabled, pending approval, unverified), ${updated} existing left as they were (classification filled in).`);
  console.log("By category:", byCat.map((c) => `${c.category} ${c._count}`).join(", "));
  console.log("Next: npm run sources:verify -- --pending   (on a machine that can reach the sites)");
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
