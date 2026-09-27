import type { Env } from './config/env.js';
import type { Db } from './database/client.js';
import type { Permission } from './lib/roles.js';
import type { AiProvider } from './pipeline/ai/types.js';

export interface AppDeps {
  db: Db;
  env: Env;
  ai: AiProvider;
  /** Verifies a Supabase access token; null when Supabase isn't configured. */
  verifySupabaseToken: ((token: string) => Promise<SupabaseIdentity | null>) | null;
}

export interface SupabaseIdentity {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
}

export interface AuthUser {
  id: string;
  sessionId: string;
}

export interface AuthAdmin {
  id: string;
  email: string;
  name: string;
  role: string;
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
