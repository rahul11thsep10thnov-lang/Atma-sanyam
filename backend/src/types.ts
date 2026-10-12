import type { Env } from './config/env.js';
import type { Db } from './database/client.js';
import type { Permission } from './database/rbac.js';
import type { PushSender } from './lib/push.js';
import type { Mailer } from './lib/mailer.js';
import type { SmsSender } from './lib/sms.js';
import type { RealtimeHub } from './realtime/hub.js';

export interface AppDeps {
  db: Db;
  env: Env;
  push: PushSender;
  // null when email isn't configured (password reset is then unavailable).
  mailer: Mailer | null;
  // null when no SMS provider is configured (phone sign-in is then unavailable).
  sms: SmsSender | null;
  // Live delivery over WebSocket (presence, pokes, notifications).
  realtime: RealtimeHub;
}

export interface AuthUser {
  id: string;
  email: string | null;
  phone: string | null;
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
