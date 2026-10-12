import { Router } from 'express';
import type { Auth } from '../../middleware/auth.js';
import type { createRateLimits } from '../../middleware/rateLimits.js';
import type { AppDeps } from '../../types.js';
import { adminAuthRouter } from './auth.js';
import { adminUsersRouter } from './users.js';
import { adminContentRouter } from './content.js';
import { adminSettingsRouter } from './settings.js';
import { adminNotificationsRouter } from './notifications.js';
import { adminInsightsRouter } from './insights.js';
import { adminAdminsRouter } from './admins.js';

export function adminRouter(deps: AppDeps, auth: Auth, limits: ReturnType<typeof createRateLimits>) {
  const r = Router();
  r.use('/auth', adminAuthRouter(deps, auth, limits));
  // Everything below requires a valid admin session; each route then checks
  // its specific permission.
  r.use(auth.requireAdmin);
  r.use('/users', adminUsersRouter(deps, auth));
  r.use('/settings', adminSettingsRouter(deps, auth));
  r.use('/notifications', adminNotificationsRouter(deps, auth));
  r.use('/', adminContentRouter(deps, auth));
  r.use('/', adminInsightsRouter(deps, auth));
  r.use('/', adminAdminsRouter(deps, auth));
  return r;
}
