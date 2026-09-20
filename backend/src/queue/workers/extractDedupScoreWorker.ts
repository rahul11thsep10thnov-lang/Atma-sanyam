import { Worker, Job } from "bullmq";
import { connection, QUEUE_NAMES, ExtractDedupScoreJobData, enqueueGenerateScript } from "../queues";
import { PipelineOrchestrator } from "../../pipeline/PipelineOrchestrator";
import { prisma } from "../../lib/prisma";
import { logger } from "../../lib/logger";

const orchestrator = new PipelineOrchestrator(prisma);

export function startExtractDedupScoreWorker() {
  return new Worker<ExtractDedupScoreJobData>(
    QUEUE_NAMES.extractDedupScore,
    async (job: Job<ExtractDedupScoreJobData>) => {
      const { masterStoryId, needsScriptGeneration } = await orchestrator.extractDedupAndScore(job.data.rawArticleId);
      if (needsScriptGeneration) {
        await enqueueGenerateScript({ masterStoryId });
      }
    },
    { connection }
  ).on("failed", (job, err) => logger.error({ jobId: job?.id, err }, "extract-dedup-score job failed"));
}
