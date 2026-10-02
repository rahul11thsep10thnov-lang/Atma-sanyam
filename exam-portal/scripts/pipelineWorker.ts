/**
 * Long-running worker for hosts without a cron (a VPS, Docker, Railway…):
 *   npm run pipeline:worker          — loop forever, one pass every
 *                                      PIPELINE_INTERVAL_MINUTES (default 15)
 *   npm run pipeline:run             — one pass, then exit (for crontab)
 * Each pass is a normal PipelineRun, visible in Admin → Automation → Pipeline.
 */
import { runPipeline } from "../src/lib/pipeline/runner";
import { prisma } from "../src/lib/db/prisma";

const once = process.argv.includes("--once");
const intervalMinutes = Math.max(1, Number(process.env.PIPELINE_INTERVAL_MINUTES ?? 15));
let stopping = false;

async function pass() {
  const started = new Date();
  try {
    const s = await runPipeline({ trigger: "CRON" });
    const what = s.skipped ? `skipped (${s.skipped})` : `${s.status}: ${s.sourcesChecked} sources, ${s.newDocuments} new docs, ${s.newNotices} new / ${s.updatedNotices} updated notices, ${s.duplicates} dup, ${s.needsReview} review, ${s.autoPublished} auto, ${s.failures} failures, ${s.retried} retried`;
    console.log(`[pipeline ${started.toISOString()}] ${what} in ${s.durationMs} ms`);
  } catch (err) {
    console.error(`[pipeline ${started.toISOString()}] crashed:`, err);
  }
}

async function main() {
  await pass();
  if (once) {
    await prisma.$disconnect();
    return;
  }
  console.log(`[pipeline] worker running every ${intervalMinutes} min — Ctrl+C to stop`);
  while (!stopping) {
    await new Promise((r) => setTimeout(r, intervalMinutes * 60_000));
    if (!stopping) await pass();
  }
  await prisma.$disconnect();
}

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => {
    stopping = true;
    console.log(`[pipeline] ${sig} received, finishing current pass…`);
    setTimeout(() => process.exit(0), 500).unref();
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
