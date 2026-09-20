import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "../config/env";

export const connection = new IORedis(env.redisUrl, { maxRetriesPerRequest: null });

export const QUEUE_NAMES = {
  ingestion: "ingestion",
  classifyArticle: "classify-article",
  extractDedupScore: "extract-dedup-score",
  generateScript: "generate-script",
  publishLanguage: "publish-language",
} as const;

export const ingestionQueue = new Queue(QUEUE_NAMES.ingestion, { connection });
export const classifyArticleQueue = new Queue(QUEUE_NAMES.classifyArticle, { connection });
export const extractDedupScoreQueue = new Queue(QUEUE_NAMES.extractDedupScore, { connection });
export const generateScriptQueue = new Queue(QUEUE_NAMES.generateScript, { connection });
export const publishLanguageQueue = new Queue(QUEUE_NAMES.publishLanguage, { connection });

export interface ClassifyArticleJobData {
  rawArticleId: string;
}
export interface ExtractDedupScoreJobData {
  rawArticleId: string;
}
export interface GenerateScriptJobData {
  masterStoryId: string;
}
export interface PublishLanguageJobData {
  masterStoryId: string;
  languageCode: string;
}

const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 5000 },
  removeOnComplete: 500,
  removeOnFail: 1000,
};

export async function enqueueClassifyArticle(data: ClassifyArticleJobData) {
  return classifyArticleQueue.add("classify", data, DEFAULT_JOB_OPTIONS);
}
export async function enqueueExtractDedupScore(data: ExtractDedupScoreJobData) {
  return extractDedupScoreQueue.add("extract-dedup-score", data, DEFAULT_JOB_OPTIONS);
}
export async function enqueueGenerateScript(data: GenerateScriptJobData) {
  return generateScriptQueue.add("generate-script", data, DEFAULT_JOB_OPTIONS);
}
export async function enqueuePublishLanguage(data: PublishLanguageJobData) {
  return publishLanguageQueue.add("publish-language", data, DEFAULT_JOB_OPTIONS);
}
