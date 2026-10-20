import type { Env } from './config/env.js';
import type { Db } from './database/client.js';
import type { Permission } from './database/rbac.js';
import type { AgeBracketKey } from './database/schema.js';
import type { PushSender } from './lib/push.js';
import type { Mailer } from './lib/mailer.js';
import type { SmsSender } from './lib/sms.js';
import type { RealtimeHub } from './realtime/hub.js';
import type { BillingProviders } from './services/billing/index.js';
import type { RegistryRuntime } from './services/sourceRegistryService.js';

export interface AppDeps {
  db: Db;
  env: Env;
  push: PushSender;
  // null when email isn't configured (receipts/support mail are then skipped).
  mailer: Mailer | null;
  // null when no SMS provider is configured (sign-in is then unavailable
  // except for OTP_TEST_NUMBERS).
  sms: SmsSender | null;
  // Live delivery over WebSocket (child status, gameplay mirror, controls).
  realtime: RealtimeHub;
  // Subscription verification per store/provider.
  billing: BillingProviders;
  // Overrides for the source registry's fetching (tests inject a fake fetch).
  sourceRuntime?: Partial<RegistryRuntime>;
}

export interface AuthGuardian {
  id: string;
  phone: string;
  name: string;
  status: 'active' | 'deactivated' | 'deleted_pending';
  sessionId: string;
  stepUpAt: Date | null;
}

export interface AuthPlayer {
  childId: string;
  guardianId: string;
  displayName: string;
  ageBracket: AgeBracketKey;
  effectiveBracket: AgeBracketKey;
  sessionId: string;
  deviceId: string | null;
}

export interface Entitlement {
  active: boolean;
  status: string;
  validUntil: Date | null;
  subscriptionId: string | null;
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
      guardian?: AuthGuardian;
      player?: AuthPlayer;
      entitlement?: Entitlement;
      admin?: AuthAdmin;
      requestId?: string;
    }
  }
}
