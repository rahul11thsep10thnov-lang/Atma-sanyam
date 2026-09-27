import { Router } from 'express';
import type { Auth } from '../../middleware/auth.js';
import type { RateLimits } from '../../middleware/rateLimits.js';
import type { AppDeps } from '../../types.js';
import { adminAuthRouter } from './auth.js';
import { adminContentRouter } from './content.js';
import { adminOperationsRouter } from './operations.js';

export function adminRouter(deps: AppDeps, auth: Auth, limits: RateLimits) {
  const r = Router();
  r.use(adminAuthRouter(deps, auth, limits));
  r.use(adminContentRouter(deps, auth, limits));
  r.use(adminOperationsRouter(deps, auth));
  return r;
}
