import { Worker, Job } from "bullmq";
import { connection, QUEUE_NAMES, GenerateScriptJobData, enqueuePublishLanguage } from "../queues";
import { PipelineOrchestrator } from "../../pipeline/PipelineOrchestrator";
import { prisma } from "../../lib/prisma";
import { logger } from "../../lib/logger";
import { MVP_FULLY_WIRED_LANGUAGES } from "../../data/languages";

const orchestrator = new PipelineOrchestrator(prisma);

export function startGenerateScriptWorker() {
  return new Worker<GenerateScriptJobData>(
    QUEUE_NAMES.generateScript,
    async (job: Job<GenerateScriptJobData>) => {
      const { requiresHumanReview } = await orchestrator.generateScript(job.data.masterStoryId);

      // Auto-publish path (low-risk categories, auto-publish enabled, no
      // safety flags) skips PENDING_REVIEW per spec §25. Everything else
      // waits for an admin to call the approve endpoint, which enqueues
      // publish-language jobs itself.
      if (!requiresHumanReview) {
        for (const languageCode of MVP_FULLY_WIRED_LANGUAGES) {
          await enqueuePublishLanguage({ masterStoryId: job.data.masterStoryId, languageCode });
        }
      }
    },
    { connection }
  ).on("failed", (job, err) => logger.error({ jobId: job?.id, err }, "generate-script job failed"));
}
