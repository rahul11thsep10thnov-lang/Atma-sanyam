// Single source of truth for roles and permissions. `syncRbac` (run on every
// migration) upserts these rows so the database always matches the code; the
// backend then enforces them per request (see middleware/auth.ts).

export const PERMISSIONS = {
  'dashboard:read': 'View the dashboard',
  'users:read': 'View app users and their activity',
  'users:write': 'Activate/deactivate app users',
  'users:delete': 'Permanently delete app users',
  'content:read': 'View content and categories',
  'content:write': 'Create and edit content and categories',
  'content:publish': 'Publish or unpublish content',
  'content:delete': 'Delete content and categories',
  'settings:read': 'View app configuration',
  'settings:write': 'Change app configuration, feature flags and maintenance mode',
  'notifications:read': 'View notification history',
  'notifications:send': 'Create and send push notifications',
  'analytics:read': 'View analytics',
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
    description: 'Manages users, content, configuration, notifications and analytics. Cannot manage admins.',
    permissions: ALL.filter((p) => p !== 'admins:read' && p !== 'admins:write'),
  },
  editor: {
    name: 'Editor',
    description: 'Content manager: creates, edits and publishes content.',
    permissions: ['dashboard:read', 'content:read', 'content:write', 'content:publish'],
  },
};

export type RoleKey = keyof typeof ROLES;
export const ROLE_KEYS = Object.keys(ROLES) as [string, ...string[]];
