import { env } from "../config/env";
import { logger } from "../lib/logger";
import { startIngestionWorker, scheduleIngestion } from "./workers/ingestionWorker";
import { startClassifyArticleWorker } from "./workers/classifyArticleWorker";
import { startExtractDedupScoreWorker } from "./workers/extractDedupScoreWorker";
import { startGenerateScriptWorker } from "./workers/generateScriptWorker";
import { startPublishLanguageWorker } from "./workers/publishLanguageWorker";
import { startStudioWorkers } from "../studio/jobs/studioWorkers";

async function main() {
  // News pipeline workers run on "all" (single box) or "pipeline" hosts, not on dedicated render/GPU hosts.
  const roles = env.studio.workerRoles.split(",").map((r) => r.trim());
  const runPipeline = roles.includes("all") || roles.includes("pipeline");
  const workers = [
    ...(runPipeline ? [startIngestionWorker(), startClassifyArticleWorker(), startExtractDedupScoreWorker(), startGenerateScriptWorker(), startPublishLanguageWorker()] : []),
    ...startStudioWorkers(),
  ];
  if (runPipeline) await scheduleIngestion();

  logger.info(runPipeline ? "News pipeline and studio workers started" : `Studio workers started (roles: ${env.studio.workerRoles})`);

  const shutdown = async () => {
    logger.info("Shutting down workers...");
    await Promise.all(workers.map((w) => w.close()));
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  logger.error({ err }, "Failed to start workers");
  process.exit(1);
});
