import { prisma } from "@/lib/db/prisma";

/** Runtime switches stored in `app_settings` (no redeploy needed). */
export const SETTING_KEYS = {
  pipelinePaused: "pipeline.paused",
} as const;

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  return row ? (row.value as T) : fallback;
}

export async function setSetting(key: string, value: unknown, updatedBy?: string | null) {
  const json = value as object;
  await prisma.appSetting.upsert({
    where: { key },
    update: { value: json, updatedBy: updatedBy ?? null },
    create: { key, value: json, updatedBy: updatedBy ?? null },
  });
}

export function isPipelinePaused(): Promise<boolean> {
  return getSetting<boolean>(SETTING_KEYS.pipelinePaused, false);
}

export function setPipelinePaused(paused: boolean, updatedBy?: string | null) {
  return setSetting(SETTING_KEYS.pipelinePaused, paused, updatedBy);
}
