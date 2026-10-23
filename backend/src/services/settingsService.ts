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
      // Learning academy sections. (Defaults so an older console that sends
      // the original flag set keeps working.)
      studyPlayfully: z.boolean().default(true),
      music: z.boolean().default(true),
      sports: z.boolean().default(true),
      // Global rankings, the coin reward shop and ads (each also needs the
      // guardian's per-child permission / the household's entitlement).
      rankings: z.boolean().default(true),
      rewardShop: z.boolean().default(true),
      ads: z.boolean().default(true),
      // Lets households without a subscription play with ads instead of
      // being locked out. Off by default: the monthly subscription stays the
      // product; turn this on only after a deliberate business decision.
      adSupportedAccess: z.boolean().default(false),
    }),
    defaults: { games: true, artAndCraft: true, didYouKnow: true, liveMirroring: true, pushNotifications: true, showInDevelopmentGames: false, studyPlayfully: true, music: true, sports: true, rankings: true, rewardShop: true, ads: true, adSupportedAccess: false },
  },
  rewards: {
    label: 'Coins & rewards',
    description: 'Coins the server awards for each activity, the daily earning cap per child (guardians can lower it) and whether the reward shop is open. Coins buy cosmetic rewards only.',
    schema: z.object({
      tutorialCompleted: z.number().int().min(0).max(100),
      gameCompleted: z.number().int().min(0).max(100),
      gameWon: z.number().int().min(0).max(100),
      puzzleSolvedMin: z.number().int().min(0).max(100),
      puzzleSolvedMax: z.number().int().min(0).max(100),
      dailyChallenge: z.number().int().min(0).max(100),
      craftCompleted: z.number().int().min(0).max(100),
      lessonCompleted: z.number().int().min(0).max(100),
      quizCompleted: z.number().int().min(0).max(100),
      factDiscovered: z.number().int().min(0).max(100),
      dailyCap: z.number().int().min(0).max(10_000),
      shopEnabled: z.boolean(),
    }),
    defaults: { tutorialCompleted: 5, gameCompleted: 5, gameWon: 10, puzzleSolvedMin: 5, puzzleSolvedMax: 15, dailyChallenge: 10, craftCompleted: 10, lessonCompleted: 10, quizCompleted: 5, factDiscovered: 1, dailyCap: 150, shopEnabled: true },
  },
  rankings: {
    label: 'Rankings',
    description: 'Leaderboard behaviour. Children appear under their chosen display name and avatar only; a guardian can take a child out of rankings per child.',
    schema: z.object({
      // Minimum counted games before a child appears on a board (keeps one lucky game from topping it).
      minPlayedForBoard: z.number().int().min(1).max(50),
      showBracketFilter: z.boolean(),
      showImprovement: z.boolean(),
      boardSize: z.number().int().min(10).max(200),
    }),
    defaults: { minPlayedForBoard: 1, showBracketFilter: true, showImprovement: true, boardSize: 50 },
  },
  ads: {
    label: 'Ads (Google AdMob)',
    description:
      'Interstitial ads for households without a subscription (subscribers never see ads). Always requested with child-directed treatment and a G content rating. Targets are the moments the app may show an ad, never a promise that one is shown: the app waits for the SDK, never interrupts a game and never counts a failed load as an impression.',
    schema: z.object({
      enabled: z.boolean(),
      // Seconds after the console opens before the first ad may be shown.
      firstAdTargetSeconds: z.number().int().min(5).max(120),
      // Seconds of play between two ads (shown only between games).
      betweenGamesTargetSeconds: z.number().int().min(10).max(600),
      minGapSeconds: z.number().int().min(30).max(3600),
      maxPerHour: z.number().int().min(0).max(30),
      maxPerDay: z.number().int().min(0).max(100),
      // How long the app waits for an ad to load before giving up and continuing.
      loadTimeoutMs: z.number().int().min(1000).max(15_000),
      // Google's sample ad units instead of the real ones (never charged, never paid).
      testMode: z.boolean(),
    }),
    defaults: { enabled: true, firstAdTargetSeconds: 15, betweenGamesTargetSeconds: 25, minGapSeconds: 180, maxPerHour: 6, maxPerDay: 20, loadTimeoutMs: 6000, testMode: true },
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

export type SettingValues = { [K in SettingKey]: z.infer<(typeof SETTING_DEFINITIONS)[K]['schema']> };

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
  // AdMob ad units from the environment (docs/ADS.md). Empty = not configured.
  ads?: { interstitialAndroid: string; interstitialIos: string };
}

/** The ad configuration the app receives: unit ids, caps and the fixed child-directed treatment. */
export function publicAds(values: SettingValues, server: ServerCapabilities) {
  const flags = values.feature_flags;
  const ads = values.ads;
  const units = server.ads ?? { interstitialAndroid: '', interstitialIos: '' };
  const configured = !!(units.interstitialAndroid || units.interstitialIos);
  return {
    // Shown only to non-subscribers (the app also checks entitlement.adFree) and only when units exist or test mode is on.
    enabled: flags.ads && ads.enabled && (configured || ads.testMode),
    testMode: ads.testMode || !configured,
    provider: 'admob' as const,
    // Fixed policy, not a setting: every request is tagged for children and capped at a G rating.
    childDirected: true,
    maxAdContentRating: 'G' as const,
    units: ads.testMode || !configured ? { interstitialAndroid: 'ca-app-pub-3940256099942544/1033173712', interstitialIos: 'ca-app-pub-3940256099942544/4411468910' } : units,
    firstAdTargetSeconds: ads.firstAdTargetSeconds,
    betweenGamesTargetSeconds: ads.betweenGamesTargetSeconds,
    minGapSeconds: ads.minGapSeconds,
    maxPerHour: ads.maxPerHour,
    maxPerDay: ads.maxPerDay,
    loadTimeoutMs: ads.loadTimeoutMs,
    adSupportedAccess: flags.adSupportedAccess,
  };
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
    rewards: values.rewards,
    rankings: values.rankings,
    ads: publicAds(values, server),
    subscription: server.subscription,
    termsVersion: server.termsVersion,
    serverTime: new Date().toISOString(),
  };
}
