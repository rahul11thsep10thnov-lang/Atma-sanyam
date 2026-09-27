// Console roles. Every admin route declares the permission it needs and the
// middleware enforces it; hiding buttons in the console is only UX.

export const PERMISSIONS = [
  'dashboard:read',
  'taxonomy:write',
  'questions:read',
  'questions:write',
  'questions:review',
  'questions:publish',
  'generation:run',
  'mocktests:write',
  'mocktests:publish',
  'users:read',
  'analytics:read',
  'settings:write',
  'admins:write',
  'audit:read',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLES: Record<string, { name: string; permissions: readonly Permission[] }> = {
  super_admin: { name: 'Super Admin', permissions: PERMISSIONS },
  admin: {
    name: 'Admin',
    permissions: PERMISSIONS.filter((p) => p !== 'admins:write'),
  },
  // Content reviewers: can inspect, edit, approve/reject — not publish, not spend AI budget.
  reviewer: {
    name: 'Reviewer',
    permissions: ['dashboard:read', 'questions:read', 'questions:write', 'questions:review'],
  },
};

export const ROLE_KEYS = Object.keys(ROLES) as [string, ...string[]];

export function permissionsFor(role: string): Set<Permission> {
  return new Set(ROLES[role]?.permissions ?? []);
}
