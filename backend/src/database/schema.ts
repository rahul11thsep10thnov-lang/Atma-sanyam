import { sql } from 'drizzle-orm';
import {
  bigserial,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow();

// ---------------------------------------------------------------------------
// Admin console users + role-based access control
// ---------------------------------------------------------------------------

export const roles = pgTable('roles', {
  key: text('key').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
});

export const permissions = pgTable('permissions', {
  key: text('key').primaryKey(),
  description: text('description').notNull().default(''),
});

export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleKey: text('role_key')
      .notNull()
      .references(() => roles.key, { onDelete: 'cascade' }),
    permissionKey: text('permission_key')
      .notNull()
      .references(() => permissions.key, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.roleKey, t.permissionKey] })]
);

export const admins = pgTable(
  'admins',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull().unique(),
    name: text('name').notNull(),
    passwordHash: text('password_hash').notNull(),
    roleKey: text('role_key')
      .notNull()
      .references(() => roles.key),
    status: text('status', { enum: ['active', 'deactivated'] }).notNull().default('active'),
    failedLoginCount: integer('failed_login_count').notNull().default(0),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [check('admins_status_check', sql`${t.status} in ('active', 'deactivated')`)]
);

export const adminSessions = pgTable(
  'admin_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    adminId: uuid('admin_id')
      .notNull()
      .references(() => admins.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    createdAt: createdAt(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('admin_sessions_admin_id_idx').on(t.adminId)]
);

// ---------------------------------------------------------------------------
// Content library (puzzle images) — served to the mobile app's library browser
// ---------------------------------------------------------------------------

export const categories = pgTable(
  'categories',
  {
    // Human-readable slug, e.g. "nature-mountains-himalayas". Stable because the
    // mobile app caches and filters by it.
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    parentId: text('parent_id'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    foreignKey({ columns: [t.parentId], foreignColumns: [t.id], name: 'categories_parent_fk' }).onDelete('restrict'),
    index('categories_parent_idx').on(t.parentId),
  ]
);

export const content = pgTable(
  'content',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
    subcategoryId: text('subcategory_id').references(() => categories.id, { onDelete: 'set null' }),
    tags: text('tags').array().notNull().default(sql`'{}'::text[]`),
    thumbnailUrl: text('thumbnail_url').notNull(),
    mediumUrl: text('medium_url').notNull(),
    fullUrl: text('full_url').notNull(),
    // Licensing metadata is mandatory: never assume an image is free to redistribute.
    source: text('source').notNull(),
    creator: text('creator').notNull(),
    license: text('license').notNull(),
    attributionRequired: boolean('attribution_required').notNull().default(false),
    attributionText: text('attribution_text'),
    status: text('status', { enum: ['draft', 'published'] }).notNull().default('draft'),
    popularity: integer('popularity').notNull().default(0),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdBy: uuid('created_by').references(() => admins.id, { onDelete: 'set null' }),
    updatedBy: uuid('updated_by').references(() => admins.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check('content_status_check', sql`${t.status} in ('draft', 'published')`),
    index('content_status_published_idx').on(t.status, t.publishedAt),
    index('content_category_idx').on(t.categoryId),
    index('content_subcategory_idx').on(t.subcategoryId),
    index('content_popularity_idx').on(t.popularity),
    index('content_tags_idx').using('gin', t.tags),
  ]
);

// ---------------------------------------------------------------------------
// Remote app configuration (feature flags, texts, maintenance, versions)
// ---------------------------------------------------------------------------

export const appSettings = pgTable('app_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: updatedAt(),
  updatedBy: uuid('updated_by').references(() => admins.id, { onDelete: 'set null' }),
});

// ---------------------------------------------------------------------------
// Devices / push tokens, notifications
// ---------------------------------------------------------------------------

export const devices = pgTable(
  'devices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Random per-install identifier generated by the app (not a hardware ID).
    installId: text('install_id').notNull().unique(),
    // The guardian signed in on this device, if any, and the child whose
    // player console last used it. Both are set null when the account goes.
    guardianId: uuid('guardian_id').references(() => guardians.id, { onDelete: 'set null' }),
    childId: uuid('child_id').references(() => children.id, { onDelete: 'set null' }),
    // Human label ("Rahul's phone") and the guardian's approval for a child
    // device (parental control "new-device approval").
    label: text('label'),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    platform: text('platform', { enum: ['ios', 'android', 'web'] }).notNull(),
    appVersion: text('app_version'),
    pushToken: text('push_token'),
    pushEnabled: boolean('push_enabled').notNull().default(false),
    createdAt: createdAt(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('devices_guardian_idx').on(t.guardianId), index('devices_child_idx').on(t.childId), index('devices_push_idx').on(t.pushEnabled)]
);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    data: jsonb('data').$type<Record<string, unknown>>(),
    // { type: 'all' } | { type: 'platform', platform } | { type: 'users', userIds } | { type: 'signed_in' }
    target: jsonb('target').$type<NotificationTarget>().notNull(),
    status: text('status', { enum: ['draft', 'sending', 'sent', 'failed'] }).notNull().default('draft'),
    recipientCount: integer('recipient_count').notNull().default(0),
    successCount: integer('success_count').notNull().default(0),
    failureCount: integer('failure_count').notNull().default(0),
    error: text('error'),
    createdBy: uuid('created_by').references(() => admins.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
  },
  (t) => [index('notifications_created_at_idx').on(t.createdAt)]
);

export type NotificationTarget =
  | { type: 'all' }
  | { type: 'signed_in' }
  | { type: 'platform'; platform: 'ios' | 'android' }
  | { type: 'users'; userIds: string[] }; // userIds are guardian ids

// ---------------------------------------------------------------------------
// Analytics events + admin audit trail
// ---------------------------------------------------------------------------

export const events = pgTable(
  'events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    name: text('name').notNull(),
    installId: text('install_id').notNull(),
    guardianId: uuid('guardian_id').references(() => guardians.id, { onDelete: 'set null' }),
    platform: text('platform'),
    appVersion: text('app_version'),
    screen: text('screen'),
    contentId: text('content_id'),
    properties: jsonb('properties').$type<Record<string, unknown>>(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('events_occurred_at_idx').on(t.occurredAt),
    index('events_name_occurred_idx').on(t.name, t.occurredAt),
    index('events_guardian_idx').on(t.guardianId),
    index('events_install_id_idx').on(t.installId),
  ]
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    adminId: uuid('admin_id').references(() => admins.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id'),
    details: jsonb('details').$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [index('audit_logs_created_at_idx').on(t.createdAt)]
);

// ===========================================================================
// LoJi — guardians, children, access
// ===========================================================================

export const AGE_BRACKET_KEYS = ['A', 'B', 'C', 'D'] as const;
export type AgeBracketKey = (typeof AGE_BRACKET_KEYS)[number];

// A guardian is the paying adult. Accounts are phone-first (India): the
// number is verified by a one-time code at registration, a password is set,
// and every sign-in is password + a fresh code to that number. Only hashes
// are stored. `status` deleted_pending means a deletion request is running.
export const guardians = pgTable(
  'guardians',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    phone: text('phone').notNull().unique(), // E.164
    phoneVerifiedAt: timestamp('phone_verified_at', { withTimezone: true }).notNull(),
    passwordHash: text('password_hash').notNull(),
    name: text('name').notNull(),
    email: text('email'), // optional, for receipts/support only
    termsVersion: text('terms_version').notNull(),
    termsAcceptedAt: timestamp('terms_accepted_at', { withTimezone: true }).notNull(),
    privacyAcceptedAt: timestamp('privacy_accepted_at', { withTimezone: true }).notNull(),
    status: text('status', { enum: ['active', 'deactivated', 'deleted_pending'] }).notNull().default('active'),
    failedLoginCount: integer('failed_login_count').notNull().default(0),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check('guardians_status_check', sql`${t.status} in ('active', 'deactivated', 'deleted_pending')`),
    index('guardians_created_at_idx').on(t.createdAt),
  ]
);

export const guardianSessions = pgTable(
  'guardian_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    guardianId: uuid('guardian_id')
      .notNull()
      .references(() => guardians.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    deviceId: uuid('device_id').references(() => devices.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    // When the guardian last passed a one-time code in this session. Sensitive
    // actions (password change, child removal, deletion) need a recent one.
    stepUpAt: timestamp('step_up_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (t) => [index('guardian_sessions_guardian_idx').on(t.guardianId)]
);

// Every one-time code the server sends, whatever it is for. Only a hash is
// stored; a code lasts 10 minutes and is locked after 5 wrong attempts. The
// row id is the "challenge id" the client quotes back, so a code can only be
// used for the purpose and person it was issued for.
export const OTP_PURPOSES = ['register', 'login', 'step_up', 'player_login', 'recovery'] as const;
export type OtpPurpose = (typeof OTP_PURPOSES)[number];

export const otpChallenges = pgTable(
  'otp_challenges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    purpose: text('purpose', { enum: OTP_PURPOSES }).notNull(),
    phone: text('phone').notNull(),
    guardianId: uuid('guardian_id').references(() => guardians.id, { onDelete: 'cascade' }),
    childId: uuid('child_id').references(() => children.id, { onDelete: 'cascade' }),
    codeHash: text('code_hash').notNull(),
    attempts: integer('attempts').notNull().default(0),
    // Extra data the verify step needs (e.g. the registration draft hash).
    context: jsonb('context').$type<Record<string, unknown>>(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    check('otp_challenges_purpose_check', sql`${t.purpose} in ('register', 'login', 'step_up', 'player_login', 'recovery')`),
    index('otp_challenges_phone_idx').on(t.phone, t.createdAt),
    index('otp_challenges_guardian_idx').on(t.guardianId),
  ]
);

// A child profile. Personal data is minimised: a nickname, an avatar from the
// bundled set and the month of birth (enough to place and move the age
// bracket, not a full date). The player id is what the child types to sign
// in, together with a PIN only the hash of which is stored.
export const children = pgTable(
  'children',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    guardianId: uuid('guardian_id')
      .notNull()
      .references(() => guardians.id, { onDelete: 'cascade' }),
    displayName: text('display_name').notNull(),
    avatarId: text('avatar_id').notNull(),
    birthMonth: text('birth_month').notNull(), // YYYY-MM
    // Bracket computed from birth_month, unless the guardian overrides it.
    ageBracket: text('age_bracket', { enum: AGE_BRACKET_KEYS }).notNull(),
    bracketOverride: text('bracket_override', { enum: AGE_BRACKET_KEYS }),
    playerId: text('player_id').notNull().unique(), // e.g. LOJI-7K3M2 (never guessable from the name)
    pinHash: text('pin_hash').notNull(),
    pinFailedCount: integer('pin_failed_count').notNull().default(0),
    pinLockedUntil: timestamp('pin_locked_until', { withTimezone: true }),
    // Whether signing in as this player also needs a code sent to the guardian.
    playerOtpRequired: boolean('player_otp_required').notNull().default(true),
    status: text('status', { enum: ['active', 'paused', 'removed'] }).notNull().default('active'),
    lastActiveAt: timestamp('last_active_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check('children_status_check', sql`${t.status} in ('active', 'paused', 'removed')`),
    check('children_bracket_check', sql`${t.ageBracket} in ('A', 'B', 'C', 'D')`),
    index('children_guardian_idx').on(t.guardianId, t.status),
  ]
);

export const playerSessions = pgTable(
  'player_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    childId: uuid('child_id')
      .notNull()
      .references(() => children.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    deviceId: uuid('device_id').references(() => devices.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (t) => [index('player_sessions_child_idx').on(t.childId)]
);

// ===========================================================================
// LoJi — subscriptions and entitlements
// ===========================================================================

export const SUBSCRIPTION_PROVIDERS = ['google_play', 'razorpay', 'sandbox'] as const;
export const SUBSCRIPTION_STATUSES = ['pending', 'active', 'grace', 'billing_retry', 'cancelled', 'expired', 'revoked', 'paused'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

// One row per subscription the store/provider knows about. The state is what
// the provider told the server (verified purchase or lifecycle notification),
// never what the app claimed. `cancelled` still entitles until period end.
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    guardianId: uuid('guardian_id')
      .notNull()
      .references(() => guardians.id, { onDelete: 'cascade' }),
    provider: text('provider', { enum: SUBSCRIPTION_PROVIDERS }).notNull(),
    // Google: purchase token; Razorpay: subscription id; sandbox: random.
    providerRef: text('provider_ref').notNull(),
    productId: text('product_id').notNull(),
    status: text('status', { enum: SUBSCRIPTION_STATUSES }).notNull(),
    autoRenewing: boolean('auto_renewing').notNull().default(true),
    currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    priceAmount: integer('price_amount'), // minor units (paise)
    priceCurrency: text('price_currency'),
    // Provider's own state object, kept for support and audits.
    providerState: jsonb('provider_state').$type<Record<string, unknown>>(),
    lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check('subscriptions_provider_check', sql`${t.provider} in ('google_play', 'razorpay', 'sandbox')`),
    check(
      'subscriptions_status_check',
      sql`${t.status} in ('pending', 'active', 'grace', 'billing_retry', 'cancelled', 'expired', 'revoked', 'paused')`
    ),
    uniqueIndex('subscriptions_provider_ref_idx').on(t.provider, t.providerRef),
    index('subscriptions_guardian_idx').on(t.guardianId, t.status),
    index('subscriptions_period_end_idx').on(t.currentPeriodEnd),
  ]
);

// Every verification and lifecycle notification, deduplicated by the
// provider's own id so a replayed webhook changes nothing.
export const billingEvents = pgTable(
  'billing_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    subscriptionId: uuid('subscription_id').references(() => subscriptions.id, { onDelete: 'set null' }),
    guardianId: uuid('guardian_id').references(() => guardians.id, { onDelete: 'set null' }),
    provider: text('provider').notNull(),
    type: text('type').notNull(), // purchase_verified, rtdn:SUBSCRIPTION_RENEWED, webhook:subscription.charged, …
    dedupeKey: text('dedupe_key').notNull().unique(),
    payload: jsonb('payload').$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [index('billing_events_subscription_idx').on(t.subscriptionId, t.createdAt)]
);

// What a guardian's household is entitled to right now, derived from the
// subscriptions above whenever one changes. Protected routes read this one
// row; the app caches it with its expiry (docs/SUBSCRIPTIONS.md).
export const entitlements = pgTable(
  'entitlements',
  {
    guardianId: uuid('guardian_id')
      .primaryKey()
      .references(() => guardians.id, { onDelete: 'cascade' }),
    active: boolean('active').notNull().default(false),
    subscriptionId: uuid('subscription_id').references(() => subscriptions.id, { onDelete: 'set null' }),
    status: text('status').notNull().default('never_subscribed'),
    validUntil: timestamp('valid_until', { withTimezone: true }),
    updatedAt: updatedAt(),
  },
  (t) => [index('entitlements_valid_until_idx').on(t.validUntil)]
);

// ===========================================================================
// LoJi — catalogue: age brackets, games, crafts, facts
// ===========================================================================

export const ageBrackets = pgTable('age_brackets', {
  key: text('key').primaryKey(), // A, B, C, D
  name: text('name').notNull(), // Little Explorers, …
  minAge: integer('min_age').notNull(),
  maxAge: integer('max_age').notNull(),
  description: text('description').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const gameCategories = pgTable('game_categories', {
  id: text('id').primaryKey(), // slug: puzzles, board, sports, creative, learning, simulation
  name: text('name').notNull(),
  icon: text('icon').notNull().default('puzzle'),
  color: text('color').notNull().default('#FF7A59'),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const GAME_STATUSES = ['draft', 'in_development', 'published', 'archived'] as const;

// The catalogue entry for a game. The rules and screens live in the app
// (src/games/<id>); the server decides who may see it (brackets, status,
// parental blocks) and holds the text an admin can change without a release.
export const games = pgTable(
  'games',
  {
    id: text('id').primaryKey(), // slug matching the app's game module
    name: text('name').notNull(),
    tagline: text('tagline').notNull().default(''),
    description: text('description').notNull().default(''),
    instructions: text('instructions').notNull().default(''),
    categoryId: text('category_id').references(() => gameCategories.id, { onDelete: 'set null' }),
    brackets: text('brackets').array().notNull().default(sql`'{}'::text[]`), // subset of A–D
    difficulties: jsonb('difficulties').$type<{ key: string; label: string; brackets?: string[] }[]>().notNull().default([]),
    skills: text('skills').array().notNull().default(sql`'{}'::text[]`),
    contentRating: text('content_rating').notNull().default('everyone'),
    estimatedMinutes: integer('estimated_minutes').notNull().default(5),
    offlineCapable: boolean('offline_capable').notNull().default(true),
    accessibility: jsonb('accessibility').$type<Record<string, unknown>>().notNull().default({}),
    // Rights for any art/sound the game uses beyond the app's own vectors.
    assetLicense: text('asset_license').notNull().default('original'),
    status: text('status', { enum: GAME_STATUSES }).notNull().default('draft'),
    sortOrder: integer('sort_order').notNull().default(0),
    translations: jsonb('translations').$type<Record<string, { name?: string; tagline?: string; instructions?: string }>>().notNull().default({}),
    updatedBy: uuid('updated_by').references(() => admins.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check('games_status_check', sql`${t.status} in ('draft', 'in_development', 'published', 'archived')`),
    index('games_status_idx').on(t.status, t.sortOrder),
    index('games_brackets_idx').using('gin', t.brackets),
  ]
);

export const GAME_OUTCOMES = ['running', 'completed', 'abandoned', 'ended_by_guardian', 'timed_out', 'failed'] as const;

// A play session as the server saw it: it stamps start and end so screen time
// cannot be typed in by the app. `snapshot` is the latest mirrored game state
// (ephemeral: cleared when the session ends, never a video).
export const gameSessions = pgTable(
  'game_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    childId: uuid('child_id')
      .notNull()
      .references(() => children.id, { onDelete: 'cascade' }),
    gameId: text('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    clientSessionId: text('client_session_id').notNull(),
    deviceId: uuid('device_id').references(() => devices.id, { onDelete: 'set null' }),
    difficulty: text('difficulty').notNull().default('normal'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    lastHeartbeatAt: timestamp('last_heartbeat_at', { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    outcome: text('outcome', { enum: GAME_OUTCOMES }).notNull().default('running'),
    score: integer('score'),
    durationSeconds: integer('duration_seconds').notNull().default(0),
    snapshot: jsonb('snapshot').$type<Record<string, unknown>>(),
    snapshotSeq: integer('snapshot_seq').notNull().default(0),
    snapshotAt: timestamp('snapshot_at', { withTimezone: true }),
    pausedByGuardianAt: timestamp('paused_by_guardian_at', { withTimezone: true }),
  },
  (t) => [
    check('game_sessions_outcome_check', sql`${t.outcome} in ('running', 'completed', 'abandoned', 'ended_by_guardian', 'timed_out', 'failed')`),
    uniqueIndex('game_sessions_client_idx').on(t.childId, t.clientSessionId),
    index('game_sessions_child_started_idx').on(t.childId, t.startedAt),
    index('game_sessions_running_idx').on(t.outcome, t.lastHeartbeatAt),
  ]
);

// Per child per game: totals and bests, plus a small per-game bag of saved
// progress (levels unlocked, a paused board) the app syncs with a version
// number so an older device cannot overwrite newer progress.
export const gameProgress = pgTable(
  'game_progress',
  {
    childId: uuid('child_id')
      .notNull()
      .references(() => children.id, { onDelete: 'cascade' }),
    gameId: text('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    plays: integer('plays').notNull().default(0),
    completions: integer('completions').notNull().default(0),
    bestScore: integer('best_score'),
    bestTimeSeconds: integer('best_time_seconds'),
    highestDifficulty: text('highest_difficulty'),
    stars: integer('stars').notNull().default(0),
    data: jsonb('data').$type<Record<string, unknown>>().notNull().default({}),
    version: integer('version').notNull().default(0),
    lastPlayedAt: timestamp('last_played_at', { withTimezone: true }),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.childId, t.gameId] }), index('game_progress_child_idx').on(t.childId, t.lastPlayedAt)]
);

export const achievements = pgTable('achievements', {
  key: text('key').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  icon: text('icon').notNull().default('star'),
  // { type: 'completions', gameId?, count } | { type: 'games_played', count } | { type: 'facts_read', count } | { type: 'crafts_done', count }
  rule: jsonb('rule').$type<Record<string, unknown>>().notNull(),
  brackets: text('brackets').array().notNull().default(sql`'{A,B,C,D}'::text[]`),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const childAchievements = pgTable(
  'child_achievements',
  {
    childId: uuid('child_id')
      .notNull()
      .references(() => children.id, { onDelete: 'cascade' }),
    achievementKey: text('achievement_key')
      .notNull()
      .references(() => achievements.key, { onDelete: 'cascade' }),
    earnedAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.childId, t.achievementKey] })]
);

export const favouriteGames = pgTable(
  'favourite_games',
  {
    childId: uuid('child_id')
      .notNull()
      .references(() => children.id, { onDelete: 'cascade' }),
    gameId: text('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.childId, t.gameId] })]
);

// ---- Art & Craft ----------------------------------------------------------

export const CRAFT_KINDS = ['origami', 'paper_craft', 'drawing', 'digital'] as const;

export interface CraftStep {
  title: string;
  text: string;
  // How the app draws the step: see src/crafts/FoldDiagram.tsx. Each step
  // names the paper shape before/after and the fold line(s) with arrows.
  diagram?: Record<string, unknown>;
  tip?: string;
  caution?: string;
}

export const craftTutorials = pgTable(
  'craft_tutorials',
  {
    id: text('id').primaryKey(), // slug
    title: text('title').notNull(),
    kind: text('kind', { enum: CRAFT_KINDS }).notNull(),
    description: text('description').notNull().default(''),
    brackets: text('brackets').array().notNull().default(sql`'{}'::text[]`),
    difficulty: integer('difficulty').notNull().default(1), // 1–5
    estimatedMinutes: integer('estimated_minutes').notNull().default(10),
    materials: jsonb('materials').$type<string[]>().notNull().default([]),
    // Potentially hazardous materials: scissors, glue, wire, craft knife…
    hazards: text('hazards').array().notNull().default(sql`'{}'::text[]`),
    adultSupervision: boolean('adult_supervision').notNull().default(false),
    // true: a real-world craft with paper; false: done on the screen.
    physical: boolean('physical').notNull().default(true),
    steps: jsonb('steps').$type<CraftStep[]>().notNull().default([]),
    finalPreview: jsonb('final_preview').$type<Record<string, unknown>>(),
    checklist: jsonb('checklist').$type<string[]>().notNull().default([]),
    status: text('status', { enum: GAME_STATUSES }).notNull().default('draft'),
    sortOrder: integer('sort_order').notNull().default(0),
    translations: jsonb('translations').$type<Record<string, Record<string, unknown>>>().notNull().default({}),
    updatedBy: uuid('updated_by').references(() => admins.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check('craft_tutorials_kind_check', sql`${t.kind} in ('origami', 'paper_craft', 'drawing', 'digital')`),
    check('craft_tutorials_status_check', sql`${t.status} in ('draft', 'in_development', 'published', 'archived')`),
    index('craft_tutorials_status_idx').on(t.status, t.sortOrder),
  ]
);

export const craftProgress = pgTable(
  'craft_progress',
  {
    childId: uuid('child_id')
      .notNull()
      .references(() => children.id, { onDelete: 'cascade' }),
    tutorialId: text('tutorial_id')
      .notNull()
      .references(() => craftTutorials.id, { onDelete: 'cascade' }),
    stepsDone: integer('steps_done').notNull().default(0),
    checklistDone: jsonb('checklist_done').$type<boolean[]>().notNull().default([]),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.childId, t.tutorialId] })]
);

// ---- Did You Know? --------------------------------------------------------

export const SOURCE_VERIFICATION_STATUSES = ['pending_review', 'approved', 'restricted', 'unavailable', 'verification_failed'] as const;
export type SourceVerificationStatus = (typeof SOURCE_VERIFICATION_STATUSES)[number];
export const SOURCE_ORIGINS = ['admin', 'registry', 'editorial', 'discovered'] as const;

// A source of facts. The first six columns are the fields of the console's
// "Add a source" form. The rest record where the source came from and, above
// all, what has actually been verified about its licence. A source whose
// verification_status is not 'approved' (with licence_verified = true) can
// never supply ingested facts; see services/sourceRegistryService.ts.
export const factSources = pgTable(
  'fact_sources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    publisher: text('publisher').notNull(),
    url: text('url').notNull(),
    accessedOn: text('accessed_on'), // YYYY-MM-DD: the day the source was last actually fetched
    notes: text('notes'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    // ---- identity -------------------------------------------------------
    sourceKey: text('source_key'), // stable id for registry sources
    canonicalUrl: text('canonical_url'), // normalised url: the duplicate guard
    origin: text('origin', { enum: SOURCE_ORIGINS }).notNull().default('admin'),
    connector: text('connector'), // content connector used to fetch facts, if any
    attributionTemplate: text('attribution_template'),
    // ---- licence (claims stay unverified until licence_verified = true) --
    licenceName: text('licence_name'),
    licenceUrl: text('licence_url'),
    licenceVerified: boolean('licence_verified').notNull().default(false),
    commercialUseAllowed: boolean('commercial_use_allowed'),
    redistributionAllowed: boolean('redistribution_allowed'),
    attributionRequired: boolean('attribution_required'),
    shareAlikeRequired: boolean('share_alike_required'),
    apiKeyRequired: boolean('api_key_required'),
    rateLimitNotes: text('rate_limit_notes'),
    contentTypesAllowed: text('content_types_allowed').array().notNull().default(sql`'{}'::text[]`),
    // ---- verification state ----------------------------------------------
    verificationStatus: text('verification_status', { enum: SOURCE_VERIFICATION_STATUSES }).notNull().default('pending_review'),
    verificationEvidenceUrl: text('verification_evidence_url'),
    lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true }), // last time evidence was found to support the status
    lastCheckedAt: timestamp('last_checked_at', { withTimezone: true }), // last attempt, successful or not
    lastCheckError: text('last_check_error'),
    consecutiveFailures: integer('consecutive_failures').notNull().default(0),
    evidenceHash: text('evidence_hash'),
    evidenceChangedAt: timestamp('evidence_changed_at', { withTimezone: true }),
    ingestionSuspended: boolean('ingestion_suspended').notNull().default(false),
    suspensionReason: text('suspension_reason'),
    // ---- administrator protection ----------------------------------------
    adminEdited: boolean('admin_edited').notNull().default(false), // the automation never rewrites wording an admin edited
    statusLocked: boolean('status_locked').notNull().default(false), // an admin set the status; the automation only records checks
  },
  (t) => [
    uniqueIndex('fact_sources_source_key_idx').on(t.sourceKey),
    uniqueIndex('fact_sources_canonical_url_idx').on(t.canonicalUrl),
    index('fact_sources_status_idx').on(t.verificationStatus),
    check('fact_sources_status_check', sql`${t.verificationStatus} in ('pending_review', 'approved', 'restricted', 'unavailable', 'verification_failed')`),
    check('fact_sources_origin_check', sql`${t.origin} in ('admin', 'registry', 'editorial', 'discovered')`),
  ]
);

// Append-only history of everything the registry did to a source.
export const sourceVerificationEvents = pgTable(
  'source_verification_events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => factSources.id, { onDelete: 'cascade' }),
    at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
    trigger: text('trigger').notNull(), // seed | startup | scheduled | manual | discovery | ingest
    outcome: text('outcome').notNull(), // seeded | verified | unchanged | failed | suspended | resumed | skipped | ingested
    fromStatus: text('from_status'),
    toStatus: text('to_status'),
    detail: text('detail'),
  },
  (t) => [index('source_events_source_idx').on(t.sourceId, t.at)]
);

export const FACT_STATUSES = ['draft', 'verified', 'published', 'archived'] as const;

// A fact goes draft → verified (an editor checked it against its source) →
// published. Only published facts reach children; a fact without a source
// cannot be published.
export const facts = pgTable(
  'facts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    category: text('category').notNull(), // key from FACT_CATEGORIES (services/factCategories.ts)
    headline: text('headline').notNull(),
    body: text('body').notNull(),
    whyText: text('why_text').notNull().default(''),
    followUpQuestion: text('follow_up_question').notNull().default(''),
    brackets: text('brackets').array().notNull().default(sql`'{}'::text[]`),
    readingLevel: integer('reading_level').notNull().default(2), // 1 simplest … 4
    // An illustration from the app's vector set, or a licensed image.
    illustration: text('illustration').notNull().default('sparkles'),
    imageContentId: uuid('image_content_id').references(() => content.id, { onDelete: 'set null' }),
    audioUrl: text('audio_url'),
    sourceId: uuid('source_id').references(() => factSources.id, { onDelete: 'set null' }),
    status: text('status', { enum: FACT_STATUSES }).notNull().default('draft'),
    verifiedBy: uuid('verified_by').references(() => admins.id, { onDelete: 'set null' }),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    translations: jsonb('translations').$type<Record<string, Record<string, string>>>().notNull().default({}),
    updatedBy: uuid('updated_by').references(() => admins.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    // ---- provenance (editorial facts leave these empty) -----------------
    ingestionKind: text('ingestion_kind').notNull().default('editorial'), // editorial | ingested
    language: text('language').notNull().default('en'), // language of headline/body; other languages live in translations
    minimumAge: integer('minimum_age'),
    maximumAge: integer('maximum_age'),
    sourceUrl: text('source_url'), // the exact page the fact was taken from
    supportingReference: text('supporting_reference'), // the source passage the fact was derived from
    licenceName: text('licence_name'), // licence of the source content at the time of ingestion
    attributionText: text('attribution_text'),
    claimCheck: text('claim_check'), // source_supported (automated) | editor_verified
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    contentHash: text('content_hash'), // hash of the normalised text: exact-duplicate guard
  },
  (t) => [
    uniqueIndex('facts_content_hash_idx').on(t.contentHash),
    index('facts_ingestion_idx').on(t.ingestionKind, t.sourceId),
    check('facts_status_check', sql`${t.status} in ('draft', 'verified', 'published', 'archived')`),
    index('facts_status_idx').on(t.status, t.publishedAt),
    index('facts_category_idx').on(t.category),
    index('facts_brackets_idx').using('gin', t.brackets),
  ]
);

export const quizQuestions = pgTable(
  'quiz_questions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    factId: uuid('fact_id')
      .notNull()
      .references(() => facts.id, { onDelete: 'cascade' }),
    question: text('question').notNull(),
    options: jsonb('options').$type<string[]>().notNull(),
    correctIndex: integer('correct_index').notNull(),
    explanation: text('explanation').notNull().default(''),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [index('quiz_questions_fact_idx').on(t.factId)]
);

export const quizAttempts = pgTable(
  'quiz_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    childId: uuid('child_id')
      .notNull()
      .references(() => children.id, { onDelete: 'cascade' }),
    factId: uuid('fact_id')
      .notNull()
      .references(() => facts.id, { onDelete: 'cascade' }),
    questionId: uuid('question_id')
      .notNull()
      .references(() => quizQuestions.id, { onDelete: 'cascade' }),
    chosenIndex: integer('chosen_index').notNull(),
    correct: boolean('correct').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('quiz_attempts_child_idx').on(t.childId, t.createdAt)]
);

// Which facts a child has opened, and the ones they starred (if the guardian
// allows favourites).
export const factViews = pgTable(
  'fact_views',
  {
    childId: uuid('child_id')
      .notNull()
      .references(() => children.id, { onDelete: 'cascade' }),
    factId: uuid('fact_id')
      .notNull()
      .references(() => facts.id, { onDelete: 'cascade' }),
    favourite: boolean('favourite').notNull().default(false),
    viewedAt: timestamp('viewed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.childId, t.factId] }), index('fact_views_child_idx').on(t.childId, t.viewedAt)]
);

// ===========================================================================
// LoJi — parental controls, screen time, mirroring, moderation, deletion
// ===========================================================================

export interface PlayWindow {
  days: number[]; // 0 = Sunday … 6 = Saturday
  start: string; // HH:MM, guardian's local time
  end: string;
}

// One row per child, created with defaults when the child is. The server
// enforces these on every protected request; the app only mirrors them.
export const parentalControls = pgTable('parental_controls', {
  childId: uuid('child_id')
    .primaryKey()
    .references(() => children.id, { onDelete: 'cascade' }),
  dailyLimitMinutes: integer('daily_limit_minutes').notNull().default(60),
  sessionLimitMinutes: integer('session_limit_minutes').notNull().default(20),
  playWindows: jsonb('play_windows').$type<PlayWindow[]>().notNull().default([]),
  bedtimeStart: text('bedtime_start'), // HH:MM or null
  bedtimeEnd: text('bedtime_end'),
  timezone: text('timezone').notNull().default('Asia/Kolkata'),
  blockedCategories: text('blocked_categories').array().notNull().default(sql`'{}'::text[]`),
  blockedGames: text('blocked_games').array().notNull().default(sql`'{}'::text[]`),
  // Brackets the child may see beyond their own (e.g. a 5-year-old allowed B).
  allowedBrackets: text('allowed_brackets').array().notNull().default(sql`'{}'::text[]`),
  soundEnabled: boolean('sound_enabled').notNull().default(true),
  narrationEnabled: boolean('narration_enabled').notNull().default(true),
  favouritesEnabled: boolean('favourites_enabled').notNull().default(true),
  mirroringEnabled: boolean('mirroring_enabled').notNull().default(true),
  newDeviceApproval: boolean('new_device_approval').notNull().default(false),
  updatedAt: updatedAt(),
});

// Minutes of play per child per calendar day (the guardian's timezone),
// credited from server-stamped session heartbeats.
export const screenTimeRecords = pgTable(
  'screen_time_records',
  {
    childId: uuid('child_id')
      .notNull()
      .references(() => children.id, { onDelete: 'cascade' }),
    day: text('day').notNull(), // YYYY-MM-DD
    minutes: integer('minutes').notNull().default(0),
    sessions: integer('sessions').notNull().default(0),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.childId, t.day] })]
);

// A guardian watching a child's game, start to end. Nothing of the game is
// stored here; it is the record that shows the privacy indicator and the
// audit of who watched when.
export const mirrorSessions = pgTable(
  'mirror_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    childId: uuid('child_id')
      .notNull()
      .references(() => children.id, { onDelete: 'cascade' }),
    guardianId: uuid('guardian_id')
      .notNull()
      .references(() => guardians.id, { onDelete: 'cascade' }),
    gameSessionId: uuid('game_session_id').references(() => gameSessions.id, { onDelete: 'set null' }),
    startedAt: createdAt(),
    lastFrameAt: timestamp('last_frame_at', { withTimezone: true }),
    endedAt: timestamp('ended_at', { withTimezone: true }),
  },
  (t) => [index('mirror_sessions_child_idx').on(t.childId, t.startedAt)]
);

// Editorial approval for anything children see.
export const contentApprovals = pgTable(
  'content_approvals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entityType: text('entity_type', { enum: ['game', 'craft', 'fact'] }).notNull(),
    entityId: text('entity_id').notNull(),
    status: text('status', { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
    reviewerId: uuid('reviewer_id').references(() => admins.id, { onDelete: 'set null' }),
    note: text('note'),
    createdAt: createdAt(),
  },
  (t) => [index('content_approvals_entity_idx').on(t.entityType, t.entityId, t.createdAt)]
);

// A guardian's request to delete a child profile or the whole account. The
// cleanup job completes it after the cooling-off period; completion removes
// the rows (cascades) and unlinks analytics.
export const accountDeletionRequests = pgTable(
  'account_deletion_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    guardianId: uuid('guardian_id')
      .notNull()
      .references(() => guardians.id, { onDelete: 'cascade' }),
    childId: uuid('child_id').references(() => children.id, { onDelete: 'cascade' }),
    scope: text('scope', { enum: ['child', 'account'] }).notNull(),
    reason: text('reason'),
    requestedAt: createdAt(),
    scheduledFor: timestamp('scheduled_for', { withTimezone: true }).notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  },
  (t) => [index('account_deletion_requests_due_idx').on(t.scheduledFor, t.completedAt)]
);
