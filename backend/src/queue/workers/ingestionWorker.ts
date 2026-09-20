import { Worker } from "bullmq";
import { connection, QUEUE_NAMES, ingestionQueue, enqueueClassifyArticle } from "../queues";
import { PipelineOrchestrator } from "../../pipeline/PipelineOrchestrator";
import { prisma } from "../../lib/prisma";
import { logger } from "../../lib/logger";

const orchestrator = new PipelineOrchestrator(prisma);
const INGESTION_INTERVAL_MS = 15 * 60 * 1000; // every 15 minutes

export function startIngestionWorker() {
  return new Worker(
    QUEUE_NAMES.ingestion,
    async () => {
      const result = await orchestrator.ingest();

      // primaryCategory is only ever set by classifyArticle, so "null" means
      // "not yet classified" regardless of what dedup/quality stages later
      // do to dedupStatus — this keeps the ingestion tick from re-enqueuing
      // articles that already passed classification but are still working
      // through later pipeline stages.
      const unprocessed = await prisma.rawArticle.findMany({
        where: { primaryCategory: null },
        select: { id: true },
      });
      for (const article of unprocessed) {
        await enqueueClassifyArticle({ rawArticleId: article.id });
      }

      logger.info({ ...result, enqueuedForClassification: unprocessed.length }, "Ingestion tick complete");
    },
    { connection }
  ).on("failed", (job, err) => logger.error({ jobId: job?.id, err }, "ingestion job failed"));
}

/** Registers the recurring ingestion job. Call once at worker-process startup. */
export async function scheduleIngestion() {
  await ingestionQueue.add(
    "run-ingestion",
    {},
    { repeat: { every: INGESTION_INTERVAL_MS }, jobId: "recurring-ingestion", removeOnComplete: 50, removeOnFail: 50 }
  );
}
