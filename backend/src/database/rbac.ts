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
  'reports:read': 'View reports people made about other users',
  'reports:write': 'Resolve or dismiss reports',
  'analytics:read': 'View analytics',
  'admins:read': 'View admin users and roles',
  'admins:write': 'Create, edit and remove admin users',
  'audit:read': 'View the admin audit log',
  // DADU content pipeline and parent support
  'dadu:content:read': 'View DADU lessons, stories, assignments, objects, characters and locations',
  'dadu:content:write': 'Create and edit DADU content drafts',
  'dadu:review:educational': 'Sign off the educational review step',
  'dadu:review:factual': 'Sign off the factual verification step',
  'dadu:review:language': 'Sign off the language proofreading step',
  'dadu:review:cultural': 'Sign off the cultural review step',
  'dadu:review:rights': 'Sign off the copyright and rights step',
  'dadu:review:safety': 'Sign off the child-safety review step',
  'dadu:content:approve': 'Give final approval to reviewed DADU content',
  'dadu:content:publish': 'Publish, unpublish and roll back DADU content',
  'dadu:assets:write': 'Register and edit DADU media assets',
  'dadu:packs:publish': 'Build and publish DADU offline packs',
  'dadu:flags:write': 'Change DADU feature flags',
  'dadu:parents:read': 'Read-only parent support view of child profiles',
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
    description: 'Content manager: creates, edits and publishes content; drafts DADU content.',
    permissions: ['dashboard:read', 'content:read', 'content:write', 'content:publish', 'dadu:content:read', 'dadu:content:write'],
  },
  reviewer: {
    name: 'Reviewer',
    description: 'DADU reviewer: signs off the educational, factual, language, cultural, rights and safety steps.',
    permissions: [
      'dashboard:read',
      'dadu:content:read',
      'dadu:review:educational',
      'dadu:review:factual',
      'dadu:review:language',
      'dadu:review:cultural',
      'dadu:review:rights',
      'dadu:review:safety',
    ],
  },
};

export type RoleKey = keyof typeof ROLES;
export const ROLE_KEYS = Object.keys(ROLES) as [string, ...string[]];
