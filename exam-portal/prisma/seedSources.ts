// Optional starter list of OFFICIAL listing pages for the pipeline to
// watch. This is data, not logic: the pipeline supports any number of
// sources of any organization — these are just a handful of well-known
// national boards so a fresh install has something to check. Verify each
// URL with "Check now" in Admin → Automation → Sources and edit/replace
// freely. Safe to re-run (upserts on listingUrl).
//
//   npm run seed:sources
import { prisma } from "./scriptDb";

const STARTER_SOURCES: Array<{
  name: string;
  listingUrl: string;
  officialDomain: string;
  priority: "HIGH" | "NORMAL" | "LOW";
  checkFrequencyMinutes: number;
}> = [
  {
    name: "Staff Selection Commission — home / notices",
    listingUrl: "https://ssc.gov.in/",
    officialDomain: "ssc.gov.in",
    priority: "HIGH",
    checkFrequencyMinutes: 30,
  },
  {
    name: "Union Public Service Commission — home / what's new",
    listingUrl: "https://upsc.gov.in/",
    officialDomain: "upsc.gov.in",
    priority: "HIGH",
    checkFrequencyMinutes: 30,
  },
  {
    name: "IBPS — home / notices",
    listingUrl: "https://www.ibps.in/",
    officialDomain: "ibps.in",
    priority: "NORMAL",
    checkFrequencyMinutes: 360,
  },
  {
    name: "Railway Recruitment Boards — RRB Chandigarh",
    listingUrl: "https://www.rrbcdg.gov.in/",
    officialDomain: "rrbcdg.gov.in",
    priority: "NORMAL",
    checkFrequencyMinutes: 360,
  },
  {
    name: "UP Police Recruitment & Promotion Board",
    listingUrl: "https://uppbpb.gov.in/",
    officialDomain: "uppbpb.gov.in",
    priority: "NORMAL",
    checkFrequencyMinutes: 360,
  },
];

async function main() {
  for (const s of STARTER_SOURCES) {
    await prisma.source.upsert({
      where: { listingUrl: s.listingUrl },
      update: {},
      create: { ...s, sourceType: "HTML", active: true },
    });
  }
  console.log(`Sources: ${STARTER_SOURCES.length} ensured (existing rows left unchanged).`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
