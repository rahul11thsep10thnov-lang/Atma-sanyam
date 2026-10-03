import { z } from "zod";
import { prisma } from "@/lib/db/prisma";

/** Admin-configurable board settings, stored in app_settings. */
export const felicitationSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  pausedAll: z.boolean().default(false),
  maxEntriesPerCycle: z.number().int().min(1).max(100).default(20),
  broadcastSeconds: z.number().int().min(3).max(60).default(7),
  listingHours: z.number().int().min(1).max(24 * 30).default(24),
  animationsEnabled: z.boolean().default(true),
  celebrationIntensity: z.enum(["subtle", "normal", "festive"]).default("normal"),
  autoRotate: z.boolean().default(true),
  featuredEntryId: z.string().nullable().default(null),
  priceRupees: z.number().int().min(1).max(100_000).default(100),
  referencePriceRupees: z.number().int().min(0).max(100_000).default(299),
});
export type FelicitationSettings = z.infer<typeof felicitationSettingsSchema>;
export const FELICITATION_SETTINGS_KEY = "felicitation.settings";

export async function getFelicitationSettings(): Promise<FelicitationSettings> {
  const row = await prisma.appSetting.findUnique({ where: { key: FELICITATION_SETTINGS_KEY } });
  const parsed = felicitationSettingsSchema.safeParse(row?.value ?? {});
  return parsed.success ? parsed.data : felicitationSettingsSchema.parse({});
}

export async function saveFelicitationSettings(next: FelicitationSettings, adminId: string) {
  const value = felicitationSettingsSchema.parse(next);
  await prisma.appSetting.upsert({ where: { key: FELICITATION_SETTINGS_KEY }, update: { value, updatedBy: adminId }, create: { key: FELICITATION_SETTINGS_KEY, value, updatedBy: adminId } });
  return value;
}
