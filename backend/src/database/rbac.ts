// Single source of truth for roles and permissions. `syncRbac` (run on every
// migration) upserts these rows so the database always matches the code; the
// backend then enforces them per request (see middleware/auth.ts).
//
// Content publishing (games, crafts, facts) is deliberately separate from
// everything a guardian or player can do: those accounts never hold any of
// these permissions, they are a different table with different tokens.

export const PERMISSIONS = {
  'dashboard:read': 'View the dashboard',
  'guardians:read': 'View guardian accounts and their activity (never children\'s names)',
  'guardians:write': 'Activate/deactivate guardian accounts',
  'guardians:delete': 'Permanently delete guardian accounts and their children',
  'content:read': 'View games, crafts, facts, images and categories',
  'content:write': 'Create and edit games, crafts, facts, images and categories',
  'content:verify': 'Mark a Did You Know? fact as verified against its source',
  'content:publish': 'Publish or unpublish games, crafts, facts and images',
  'content:delete': 'Delete content and categories',
  'subscriptions:read': 'View subscription statistics and billing events',
  'subscriptions:write': 'Revoke or extend an entitlement (support cases)',
  'settings:read': 'View app configuration',
  'settings:write': 'Change app configuration, feature flags and maintenance mode',
  'notifications:read': 'View notification history',
  'notifications:send': 'Create and send push notifications',
  'analytics:read': 'View analytics and system health',
  'admins:read': 'View admin users and roles',
  'admins:write': 'Create, edit and remove admin users',
  'audit:read': 'View the admin audit log',
} as const;

export type Permission = keyof typeof PERMISSIONS;

const ALL = Object.keys(PERMISSIONS) as Permission[];

export const ROLES: Record<string, { name: string; description: string; permissions: Permission[] }> = {
  super_admin: {
    name: 'Super Admin',
    description: 'Full access, including managing other admins.',
    permissions: ALL,
  },
  admin: {
    name: 'Admin',
    description: 'Manages guardians, content, subscriptions, configuration, notifications and analytics. Cannot manage admins.',
    permissions: ALL.filter((p) => p !== 'admins:read' && p !== 'admins:write'),
  },
  editor: {
    name: 'Editor',
    description: 'Content manager: creates, edits and publishes games, crafts and facts.',
    permissions: ['dashboard:read', 'content:read', 'content:write', 'content:publish'],
  },
  fact_checker: {
    name: 'Fact checker',
    description: 'Reads content and marks Did You Know? facts as verified. Cannot publish.',
    permissions: ['dashboard:read', 'content:read', 'content:verify'],
  },
  support: {
    name: 'Support',
    description: 'Looks up guardian accounts and subscriptions to help with billing questions.',
    permissions: ['dashboard:read', 'guardians:read', 'subscriptions:read', 'subscriptions:write'],
  },
};

export type RoleKey = keyof typeof ROLES;
export const ROLE_KEYS = Object.keys(ROLES) as [string, ...string[]];
