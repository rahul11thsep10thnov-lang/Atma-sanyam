import { z } from 'zod';
import type { Db } from '../database/client.js';
import { appSettings } from '../database/schema.js';
import type { Env } from '../config/env.js';

// Pipeline controls an admin can change at runtime without a redeploy.
// Env vars provide the defaults; saved values override them.
export const pipelineSettingsSchema = z.object({
  batchSize: z.number().int().min(1).max(50),
  maxRetries: z.number().int().min(0).max(5),
  generationTimeoutMs: z.number().int().min(10_000).max(1_800_000),
  reviewTimeoutMs: z.number().int().min(10_000).max(1_800_000),
  maxQuestionsPerJob: z.number().int().min(1).max(10_000),
  // Hard stop for AI spend per calendar month (UTC). null = no cap.
  monthlyBudgetUsd: z.number().positive().nullable(),
  // When false, AI-reviewed questions never become APPROVED automatically:
  // everything waits for a human in NEEDS_REVIEW.
  autoApprove: z.boolean(),
  // Minimum reviewer confidence for automatic approval.
  minReviewConfidence: z.number().min(0).max(1),
  reviewBatchSize: z.number().int().min(1).max(25),
});

export type PipelineSettings = z.infer<typeof pipelineSettingsSchema>;

export function defaultSettings(env: Env): PipelineSettings {
  return {
    batchSize: env.AI_BATCH_SIZE,
    maxRetries: env.AI_MAX_RETRIES,
    generationTimeoutMs: env.AI_GENERATION_TIMEOUT_MS,
    reviewTimeoutMs: env.AI_REVIEW_TIMEOUT_MS,
    maxQuestionsPerJob: env.AI_MAX_QUESTIONS_PER_JOB,
    monthlyBudgetUsd: env.AI_MONTHLY_BUDGET_USD ?? null,
    autoApprove: true,
    minReviewConfidence: 0.8,
    reviewBatchSize: 10,
  };
}

const KEY = 'pipeline';

export async function getSettings(db: Db, env: Env): Promise<PipelineSettings> {
  const rows = await db.select().from(appSettings);
  const saved = rows.find((r) => r.key === KEY)?.value as Partial<PipelineSettings> | undefined;
  const merged = { ...defaultSettings(env), ...(saved ?? {}) };
  const parsed = pipelineSettingsSchema.safeParse(merged);
  return parsed.success ? parsed.data : defaultSettings(env);
}

export async function updateSettings(db: Db, env: Env, patch: Partial<PipelineSettings>, adminId: string) {
  const next = pipelineSettingsSchema.parse({ ...(await getSettings(db, env)), ...patch });
  await db
    .insert(appSettings)
    .values({ key: KEY, value: next, updatedBy: adminId })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: next, updatedBy: adminId, updatedAt: new Date() } });
  return next;
}
