import { Worker, Job } from "bullmq";
import { connection, QUEUE_NAMES, PublishLanguageJobData } from "../queues";
import { PipelineOrchestrator } from "../../pipeline/PipelineOrchestrator";
import { prisma } from "../../lib/prisma";
import { logger } from "../../lib/logger";

const orchestrator = new PipelineOrchestrator(prisma);

export function startPublishLanguageWorker() {
  return new Worker<PublishLanguageJobData>(
    QUEUE_NAMES.publishLanguage,
    async (job: Job<PublishLanguageJobData>) => {
      await orchestrator.publishLanguage(job.data.masterStoryId, job.data.languageCode);
    },
    { connection }
  ).on("failed", (job, err) => logger.error({ jobId: job?.id, err }, "publish-language job failed"));
}
