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
// App users (people using the mobile app)
// ---------------------------------------------------------------------------

// Accounts are phone-first: a person signs in with a one-time code sent by
// SMS, then sets a password, a username and an avatar. Older email accounts
// keep working (email + password), so both identifiers are optional but at
// least one is always set. A null password_hash means the person verified
// their number but has not set a password yet (onboarding).
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').unique(),
    phone: text('phone').unique(), // E.164, e.g. +919876543210
    phoneVerifiedAt: timestamp('phone_verified_at', { withTimezone: true }),
    passwordHash: text('password_hash'),
    username: text('username'), // as typed (case kept for display)
    usernameNormalized: text('username_normalized').unique(), // lower-case, what uniqueness and search use
    avatarId: text('avatar_id'),
    displayName: text('display_name'),
    allowPokes: boolean('allow_pokes').notNull().default(true),
    discoverableByPhone: boolean('discoverable_by_phone').notNull().default(true),
    status: text('status', { enum: ['active', 'deactivated'] }).notNull().default('active'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  },
  (t) => [
    check('users_status_check', sql`${t.status} in ('active', 'deactivated')`),
    check('users_identifier_check', sql`${t.email} is not null or ${t.phone} is not null`),
    index('users_created_at_idx').on(t.createdAt),
  ]
);

export const userSessions = pgTable(
  'user_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    createdAt: createdAt(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    // Set when the session was opened by a one-time code: for a short while
    // such a session may set a new password without knowing the old one.
    otpVerifiedAt: timestamp('otp_verified_at', { withTimezone: true }),
  },
  (t) => [index('user_sessions_user_id_idx').on(t.userId)]
);

// One-time codes sent by SMS to sign in. Only a hash is stored; a code lasts
// 10 minutes and is locked after 5 wrong attempts. Rows are kept briefly so
// sends per number can be counted (cleanup deletes old ones).
export const otpCodes = pgTable(
  'otp_codes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    phone: text('phone').notNull(),
    codeHash: text('code_hash').notNull(),
    attempts: integer('attempts').notNull().default(0),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index('otp_codes_phone_idx').on(t.phone, t.createdAt)]
);

// One-time codes for "forgot password". Only a hash is stored; codes expire
// after 15 minutes and are locked after 5 wrong attempts.
export const passwordResetCodes = pgTable(
  'password_reset_codes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    codeHash: text('code_hash').notNull(),
    attempts: integer('attempts').notNull().default(0),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index('password_reset_codes_user_idx').on(t.userId)]
);

// ---------------------------------------------------------------------------
// Friends, notifications, pokes, verified focus time
// ---------------------------------------------------------------------------

// One row per request, from requester to addressee. "accepted" is the
// friendship; "declined" lets the requester ask again later. Blocks live in
// their own table so they survive unfriending.
export const friendships = pgTable(
  'friendships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requesterId: uuid('requester_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    addresseeId: uuid('addressee_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: text('status', { enum: ['pending', 'accepted', 'declined'] }).notNull().default('pending'),
    createdAt: createdAt(),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
  },
  (t) => [
    check('friendships_status_check', sql`${t.status} in ('pending', 'accepted', 'declined')`),
    check('friendships_not_self_check', sql`${t.requesterId} <> ${t.addresseeId}`),
    uniqueIndex('friendships_pair_idx').on(t.requesterId, t.addresseeId),
    index('friendships_addressee_idx').on(t.addresseeId, t.status),
  ]
);

export const blocks = pgTable(
  'blocks',
  {
    blockerId: uuid('blocker_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    blockedId: uuid('blocked_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.blockerId, t.blockedId] }), index('blocks_blocked_idx').on(t.blockedId)]
);

// A person's own notification centre (the admin broadcasts above are a
// different thing). `data` carries what the app needs to open the right
// screen, e.g. { type: 'friend_request', requestId }.
export const userNotifications = pgTable(
  'user_notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    data: jsonb('data').$type<Record<string, unknown>>(),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index('user_notifications_user_idx').on(t.userId, t.createdAt), index('user_notifications_unread_idx').on(t.userId, t.readAt)]
);

// Pokes are idempotent: the app sends a key per tap, a repeat is a no-op.
export const pokes = pgTable(
  'pokes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fromUserId: uuid('from_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    toUserId: uuid('to_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    idempotencyKey: text('idempotency_key').notNull(),
    deliveredLive: boolean('delivered_live').notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('pokes_key_idx').on(t.fromUserId, t.idempotencyKey), index('pokes_to_idx').on(t.toUserId, t.createdAt)]
);

// Focus sessions as the server saw them: it stamps the start and the end, so
// the minutes it credits ("verified") cannot be typed in by the app. A
// session still running with a recent heartbeat is what "focusing now" means.
export const focusSessions = pgTable(
  'focus_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    clientSessionId: text('client_session_id').notNull(),
    kind: text('kind', { enum: ['solo', 'group'] }).notNull().default('solo'),
    groupSessionId: uuid('group_session_id'),
    plannedMinutes: integer('planned_minutes').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    lastHeartbeatAt: timestamp('last_heartbeat_at', { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    outcome: text('outcome', { enum: ['running', 'completed', 'failed'] }).notNull().default('running'),
    // Minutes credited by the server from its own clock; 0 unless completed.
    verifiedMinutes: integer('verified_minutes').notNull().default(0),
  },
  (t) => [
    check('focus_sessions_outcome_check', sql`${t.outcome} in ('running', 'completed', 'failed')`),
    uniqueIndex('focus_sessions_client_idx').on(t.userId, t.clientSessionId),
    index('focus_sessions_user_started_idx').on(t.userId, t.startedAt),
    index('focus_sessions_running_idx').on(t.outcome, t.lastHeartbeatAt),
  ]
);

// ---------------------------------------------------------------------------
// Group focus sessions
// ---------------------------------------------------------------------------

// A host proposes what to focus on (a plant or a picture) and for how long,
// invites friends, everyone approved presses Start, and the server starts
// the clock for all of them at once. The server's timestamps are the truth:
// started_at, ends_at and each participant's own start (late joiners).
export const groupSessions = pgTable(
  'group_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    hostId: uuid('host_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: text('status', { enum: ['lobby', 'running', 'ended', 'cancelled'] }).notNull().default('lobby'),
    // { kind: 'plant', speciesId, place? } | { kind: 'remote', imageId, uri, title, ... }
    proposal: jsonb('proposal').$type<Record<string, unknown>>().notNull(),
    plannedMinutes: integer('planned_minutes').notNull(),
    revision: integer('revision').notNull().default(1),
    createdAt: createdAt(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    membersAtStart: integer('members_at_start').notNull().default(0),
  },
  (t) => [
    check('group_sessions_status_check', sql`${t.status} in ('lobby', 'running', 'ended', 'cancelled')`),
    index('group_sessions_host_idx').on(t.hostId, t.status),
    index('group_sessions_status_idx').on(t.status, t.endsAt),
  ]
);

export const groupParticipants = pgTable(
  'group_participants',
  {
    sessionId: uuid('session_id')
      .notNull()
      .references(() => groupSessions.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: text('status', {
      enum: ['invited', 'rejected', 'approved', 'ready', 'join_requested', 'active', 'left_early', 'completed', 'disconnected'],
    })
      .notNull()
      .default('invited'),
    isHost: boolean('is_host').notNull().default(false),
    // what they said when rejecting the proposal, for the host to revise
    note: text('note'),
    joinedAt: createdAt(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    lastHeartbeatAt: timestamp('last_heartbeat_at', { withTimezone: true }),
    leftAt: timestamp('left_at', { withTimezone: true }),
    // credited minutes when completed (late joiners get the time they were actually in)
    rewardMinutes: integer('reward_minutes').notNull().default(0),
    // how many wilted trees / broken frames an early exit costs; applied once
    penaltyCount: integer('penalty_count').notNull().default(0),
    penaltyAppliedAt: timestamp('penalty_applied_at', { withTimezone: true }),
    focusSessionId: uuid('focus_session_id'),
  },
  (t) => [
    primaryKey({ columns: [t.sessionId, t.userId] }),
    check(
      'group_participants_status_check',
      sql`${t.status} in ('invited', 'rejected', 'approved', 'ready', 'join_requested', 'active', 'left_early', 'completed', 'disconnected')`
    ),
    index('group_participants_user_idx').on(t.userId, t.status),
  ]
);

// Chat in a group session is a fixed set of messages and smileys (no free text).
export const groupMessages = pgTable(
  'group_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => groupSessions.id, { onDelete: 'cascade' }),
    fromUserId: uuid('from_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    messageKey: text('message_key').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('group_messages_session_idx').on(t.sessionId, t.createdAt)]
);

// "Report this person": one row per report, reviewed in the admin console.
// The reporter is never shown to the reported person. Deleting the reporter's
// account keeps the report without their id; deleting the reported account
// removes reports about them.
export const REPORT_REASONS = ['harassment', 'inappropriate_profile', 'spam', 'impersonation', 'other'] as const;
export const REPORT_CONTEXTS = ['friends', 'search', 'request', 'group'] as const;

export const userReports = pgTable(
  'user_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reporterId: uuid('reporter_id').references(() => users.id, { onDelete: 'set null' }),
    reportedId: uuid('reported_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    reason: text('reason', { enum: REPORT_REASONS }).notNull(),
    note: text('note'),
    // where in the app the report was made
    context: text('context', { enum: REPORT_CONTEXTS }),
    groupSessionId: uuid('group_session_id').references(() => groupSessions.id, { onDelete: 'set null' }),
    status: text('status', { enum: ['open', 'resolved', 'dismissed'] }).notNull().default('open'),
    createdAt: createdAt(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolvedBy: uuid('resolved_by').references(() => admins.id, { onDelete: 'set null' }),
    resolutionNote: text('resolution_note'),
  },
  (t) => [
    check('user_reports_status_check', sql`${t.status} in ('open', 'resolved', 'dismissed')`),
    check('user_reports_reason_check', sql`${t.reason} in ('harassment', 'inappropriate_profile', 'spam', 'impersonation', 'other')`),
    check('user_reports_note_length_check', sql`char_length(${t.note}) <= 500`),
    index('user_reports_status_idx').on(t.status, t.createdAt),
    index('user_reports_reported_idx').on(t.reportedId, t.createdAt),
    index('user_reports_reporter_idx').on(t.reporterId, t.reportedId, t.createdAt),
  ]
);

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
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    platform: text('platform', { enum: ['ios', 'android', 'web'] }).notNull(),
    appVersion: text('app_version'),
    pushToken: text('push_token'),
    pushEnabled: boolean('push_enabled').notNull().default(false),
    createdAt: createdAt(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('devices_user_id_idx').on(t.userId), index('devices_push_idx').on(t.pushEnabled)]
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
  | { type: 'users'; userIds: string[] };

// ---------------------------------------------------------------------------
// Analytics events + admin audit trail
// ---------------------------------------------------------------------------

export const events = pgTable(
  'events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    name: text('name').notNull(),
    installId: text('install_id').notNull(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
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
    index('events_user_id_idx').on(t.userId),
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
