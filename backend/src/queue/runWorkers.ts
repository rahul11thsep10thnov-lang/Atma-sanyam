import { logger } from "../lib/logger";
import { startIngestionWorker, scheduleIngestion } from "./workers/ingestionWorker";
import { startClassifyArticleWorker } from "./workers/classifyArticleWorker";
import { startExtractDedupScoreWorker } from "./workers/extractDedupScoreWorker";
import { startGenerateScriptWorker } from "./workers/generateScriptWorker";
import { startPublishLanguageWorker } from "./workers/publishLanguageWorker";

async function main() {
  const workers = [
    startIngestionWorker(),
    startClassifyArticleWorker(),
    startExtractDedupScoreWorker(),
    startGenerateScriptWorker(),
    startPublishLanguageWorker(),
  ];
  await scheduleIngestion();

  logger.info("All pipeline workers started");

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
