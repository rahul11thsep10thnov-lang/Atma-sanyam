import { z } from 'zod';
import { eq } from 'drizzle-orm';
import type { Db } from '../database/client.js';
import { appSettings } from '../database/schema.js';

// Website-facing settings an admin edits from the console: the quotation
// under the site name, the enrolment plan and the free-test quotas.
export const siteSettingsSchema = z.object({
  // Shown under the website name (Devanagari display font).
  quote: z.string().trim().min(1).max(160),
  quoteAttribution: z.string().trim().max(80).default(''),
  plan: z.object({
    name: z.string().trim().min(1).max(60),
    priceInr: z.number().int().min(1).max(100_000),
    listPriceInr: z.number().int().min(1).max(100_000),
    durationDays: z.number().int().min(1).max(3650),
  }),
  // Tests a logged-in user may attempt before the plan is required.
  freeQuota: z.object({
    full: z.number().int().min(0).max(100),
    subject: z.number().int().min(0).max(100),
  }),
  popup: z.object({
    enabled: z.boolean(),
    title: z.string().trim().max(120),
    body: z.string().trim().max(600),
    cta: z.string().trim().min(1).max(40),
  }),
});

export type SiteSettings = z.infer<typeof siteSettingsSchema>;

/** Partial update body: every group and field optional. */
export const siteSettingsPatchSchema = z.object({
  quote: siteSettingsSchema.shape.quote.optional(),
  quoteAttribution: z.string().trim().max(80).optional(),
  plan: siteSettingsSchema.shape.plan.partial().optional(),
  freeQuota: siteSettingsSchema.shape.freeQuota.partial().optional(),
  popup: siteSettingsSchema.shape.popup.partial().optional(),
});
export type SiteSettingsPatch = z.infer<typeof siteSettingsPatchSchema>;

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  quote: 'उद्यमेन हि सिध्यन्ति कार्याणि न मनोरथैः',
  quoteAttribution: 'हितोपदेश',
  plan: { name: 'Mock Test Pass', priceInr: 49, listPriceInr: 299, durationDays: 365 },
  freeQuota: { full: 2, subject: 2 },
  popup: {
    enabled: true,
    title: 'कम समय में अपनी तैयारी परखिये',
    body:
      'बहुत कठिन प्रश्न देकर न हम शक्ति प्रदर्शन करेंगे, न बहुत आसान प्रश्न देकर आपकी तैयारी का गलत मूल्यांकन करेंगे। सटीक प्रश्नों से अपनी तैयारी का सही स्तर जानिए।',
    cta: 'हमसे जुड़िये',
  },
};

const KEY = 'site';

export async function getSiteSettings(db: Db): Promise<SiteSettings> {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, KEY)).limit(1);
  const saved = (row?.value ?? {}) as Partial<SiteSettings>;
  const merged = {
    ...DEFAULT_SITE_SETTINGS,
    ...saved,
    plan: { ...DEFAULT_SITE_SETTINGS.plan, ...(saved.plan ?? {}) },
    freeQuota: { ...DEFAULT_SITE_SETTINGS.freeQuota, ...(saved.freeQuota ?? {}) },
    popup: { ...DEFAULT_SITE_SETTINGS.popup, ...(saved.popup ?? {}) },
  };
  const parsed = siteSettingsSchema.safeParse(merged);
  return parsed.success ? parsed.data : DEFAULT_SITE_SETTINGS;
}

export async function updateSiteSettings(db: Db, patch: SiteSettingsPatch, adminId: string) {
  const current = await getSiteSettings(db);
  const next = siteSettingsSchema.parse({
    ...current,
    ...patch,
    plan: { ...current.plan, ...(patch.plan ?? {}) },
    freeQuota: { ...current.freeQuota, ...(patch.freeQuota ?? {}) },
    popup: { ...current.popup, ...(patch.popup ?? {}) },
  });
  await db
    .insert(appSettings)
    .values({ key: KEY, value: next, updatedBy: adminId })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: next, updatedBy: adminId, updatedAt: new Date() } });
  return next;
}
