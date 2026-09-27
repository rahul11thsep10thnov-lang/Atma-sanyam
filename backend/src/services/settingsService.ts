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
    defaults: { enabled: false, message: "We're making FOCUS even better. Please check back in a little while." },
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
      updateMessage: 'A new version of FOCUS is available.',
      iosStoreUrl: '',
      androidStoreUrl: '',
    },
  },
  feature_flags: {
    label: 'Feature flags',
    description: 'Turn app features on or off remotely without shipping an update.',
    schema: z.object({
      contentLibrary: z.boolean(),
      quoteTiles: z.boolean(),
      customPhotos: z.boolean(),
      accounts: z.boolean(),
      pushNotifications: z.boolean(),
    }),
    defaults: { contentLibrary: true, quoteTiles: true, customPhotos: true, accounts: true, pushNotifications: true },
  },
  texts: {
    label: 'App texts',
    description: 'Copy shown in the app that can be changed without an update.',
    schema: z.object({
      announcement: z.string().trim().max(280),
      sessionCompleteTitle: z.string().trim().min(1).max(60),
      sessionCompleteMessage: z.string().trim().min(1).max(200),
      sessionFailedTitle: z.string().trim().min(1).max(60),
      sessionLeftAppMessage: z.string().trim().min(1).max(200),
      sessionGaveUpMessage: z.string().trim().min(1).max(200),
    }),
    defaults: {
      announcement: '',
      sessionCompleteTitle: 'Puzzle complete!',
      sessionCompleteMessage: 'Great focus — your picture is fully assembled.',
      sessionFailedTitle: 'Session failed',
      sessionLeftAppMessage: "You left the app too long, so this puzzle didn't get finished.",
      sessionGaveUpMessage: 'Session ended early — the puzzle stays incomplete.',
    },
  },
  session: {
    label: 'Focus session rules',
    description: 'How long someone can leave the app mid-session before it fails.',
    schema: z.object({ gracePeriodSeconds: z.number().int().min(3).max(60) }),
    defaults: { gracePeriodSeconds: 5 },
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

export async function publicConfig(db: Db, server: { passwordReset: boolean }) {
  const { values } = await loadSettings(db);
  return {
    maintenance: values.maintenance,
    appVersion: values.app_version,
    // passwordReset reflects server capability (email configured), not an admin flag.
    features: { ...values.feature_flags, passwordReset: server.passwordReset },
    texts: values.texts,
    session: values.session,
    serverTime: new Date().toISOString(),
  };
}
