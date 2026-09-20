import { Worker, Job } from "bullmq";
import { connection, QUEUE_NAMES, ClassifyArticleJobData, enqueueExtractDedupScore } from "../queues";
import { PipelineOrchestrator } from "../../pipeline/PipelineOrchestrator";
import { prisma } from "../../lib/prisma";
import { logger } from "../../lib/logger";

const orchestrator = new PipelineOrchestrator(prisma);

export function startClassifyArticleWorker() {
  return new Worker<ClassifyArticleJobData>(
    QUEUE_NAMES.classifyArticle,
    async (job: Job<ClassifyArticleJobData>) => {
      const { passed } = await orchestrator.classifyArticle(job.data.rawArticleId);
      if (passed) {
        await enqueueExtractDedupScore({ rawArticleId: job.data.rawArticleId });
      }
    },
    { connection }
  ).on("failed", (job, err) => logger.error({ jobId: job?.id, err }, "classify-article job failed"));
}
