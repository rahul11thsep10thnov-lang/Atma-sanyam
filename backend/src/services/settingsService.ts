import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import type { Db } from '../database/client.js';
import { appSettings } from '../database/schema.js';

const semver = z.string().regex(/^\d+\.\d+\.\d+$/, 'Use a version like 1.2.3');
const optionalUrl = z.union([z.literal(''), z.string().url().max(500)]);

// Every remotely-configurable value lives here with its schema and default.
// The API validates admin edits against these schemas, and the public
// /v1/config endpoint always returns a complete object (defaults filled in),
// so an app never breaks on a missing key.
export const SETTING_DEFINITIONS = {
  maintenance: {
    label: 'Maintenance mode',
    description: 'When enabled, the app shows this message instead of its normal screens.',
    schema: z.object({
      enabled: z.boolean(),
      message: z.string().trim().min(1).max(500),
    }),
    defaults: { enabled: false, message: "LoJi is getting a little upgrade. Please check back in a little while." },
  },
  app_version: {
    label: 'App version & update notices',
    description:
      'Versions below the minimum are asked to update before continuing; versions below the latest see a dismissible notice.',
    schema: z.object({
      minimumVersion: semver,
      latestVersion: semver,
      updateMessage: z.string().trim().max(300),
      iosStoreUrl: optionalUrl,
      androidStoreUrl: optionalUrl,
    }),
    defaults: {
      minimumVersion: '1.0.0',
      latestVersion: '1.0.0',
      updateMessage: 'A new version of LoJi is available.',
      iosStoreUrl: '',
      androidStoreUrl: '',
    },
  },
  feature_flags: {
    label: 'Feature flags',
    description: 'Turn app features on or off remotely without shipping an update.',
    schema: z.object({
      games: z.boolean(),
      artAndCraft: z.boolean(),
      didYouKnow: z.boolean(),
      liveMirroring: z.boolean(),
      pushNotifications: z.boolean(),
      // Shows games whose status is in_development to development builds only.
      showInDevelopmentGames: z.boolean(),
    }),
    defaults: { games: true, artAndCraft: true, didYouKnow: true, liveMirroring: true, pushNotifications: true, showInDevelopmentGames: false },
  },
  texts: {
    label: 'App texts',
    description: 'Copy shown in the app that can be changed without an update.',
    schema: z.object({
      announcement: z.string().trim().max(280),
      guardianWelcome: z.string().trim().min(1).max(200),
      playerWelcome: z.string().trim().min(1).max(120),
      subscriptionPitch: z.string().trim().min(1).max(300),
      timeUpMessage: z.string().trim().min(1).max(200),
    }),
    defaults: {
      announcement: '',
      guardianWelcome: 'Welcome to LoJi. Add a child profile, set their playtime, and watch them learn.',
      playerWelcome: 'Hi {name}! Ready to play?',
      subscriptionPitch: 'One monthly plan unlocks every game, craft and discovery for every child in your home.',
      timeUpMessage: 'Time for a break! Your playtime is finished for now.',
    },
  },
  limits: {
    label: 'Default limits',
    description: 'Defaults for new child profiles; guardians change them per child.',
    schema: z.object({ dailyLimitMinutes: z.number().int().min(5).max(360), sessionLimitMinutes: z.number().int().min(5).max(120), maxChildrenPerGuardian: z.number().int().min(1).max(12) }),
    defaults: { dailyLimitMinutes: 60, sessionLimitMinutes: 20, maxChildrenPerGuardian: 8 },
  },
} as const;

export type SettingKey = keyof typeof SETTING_DEFINITIONS;
export const SETTING_KEYS = Object.keys(SETTING_DEFINITIONS) as SettingKey[];

export function isSettingKey(key: string): key is SettingKey {
  return key in SETTING_DEFINITIONS;
}

type SettingValues = { [K in SettingKey]: z.infer<(typeof SETTING_DEFINITIONS)[K]['schema']> };

export async function loadSettings(db: Db): Promise<{ values: SettingValues; updatedAt: Record<string, Date> }> {
  const rows = await db.select().from(appSettings);
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const values = {} as Record<string, unknown>;
  const updatedAt: Record<string, Date> = {};
  for (const key of SETTING_KEYS) {
    const def = SETTING_DEFINITIONS[key];
    const row = byKey.get(key);
    // Merge over defaults so newly added fields get sensible values, and fall
    // back to defaults entirely if a stored value no longer validates.
    const merged = { ...def.defaults, ...((row?.value as object | undefined) ?? {}) };
    const parsed = def.schema.safeParse(merged);
    values[key] = parsed.success ? parsed.data : def.defaults;
    if (row) updatedAt[key] = row.updatedAt;
  }
  return { values: values as SettingValues, updatedAt };
}

export async function updateSetting(db: Db, key: SettingKey, value: unknown, adminId: string) {
  const parsed = SETTING_DEFINITIONS[key].schema.parse(value);
  await db
    .insert(appSettings)
    .values({ key, value: parsed, updatedBy: adminId })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: parsed, updatedBy: adminId, updatedAt: sql`now()` },
    });
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, key));
  return row;
}

export interface ServerCapabilities {
  phoneSignIn: boolean;
  googlePlayBilling: boolean;
  razorpayBilling: boolean;
  sandboxBilling: boolean;
  termsVersion: string;
  subscription: { productId: string; priceInr: number };
}

export async function publicConfig(db: Db, server: ServerCapabilities) {
  const { values } = await loadSettings(db);
  return {
    maintenance: values.maintenance,
    appVersion: values.app_version,
    // The *Billing / phoneSignIn flags reflect server capability (providers configured), not an admin switch.
    features: { ...values.feature_flags, phoneSignIn: server.phoneSignIn, googlePlayBilling: server.googlePlayBilling, razorpayBilling: server.razorpayBilling, sandboxBilling: server.sandboxBilling },
    texts: values.texts,
    limits: values.limits,
    subscription: server.subscription,
    termsVersion: server.termsVersion,
    serverTime: new Date().toISOString(),
  };
}
