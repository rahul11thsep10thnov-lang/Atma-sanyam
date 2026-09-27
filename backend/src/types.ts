import type { Env } from './config/env.js';
import type { Db } from './database/client.js';
import type { Permission } from './database/rbac.js';
import type { PushSender } from './lib/push.js';

export interface AppDeps {
  db: Db;
  env: Env;
  push: PushSender;
}

export interface AuthUser {
  id: string;
  email: string;
  sessionId: string;
}

export interface AuthAdmin {
  id: string;
  email: string;
  name: string;
  roleKey: string;
  sessionId: string;
  permissions: Set<Permission>;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      admin?: AuthAdmin;
      requestId?: string;
    }
  }
}
