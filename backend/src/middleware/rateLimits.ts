import { rateLimit, ipKeyGenerator, type Options } from 'express-rate-limit';
import type { Request } from 'express';

// In-memory store: correct for a single API instance. If you scale to several
// instances, switch to a shared store (e.g. rate-limit-redis).
const json = (message: string): Partial<Options> => ({
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: { code: 'rate_limited', message } });
  },
});

const principalKey = (req: Request) => req.guardian?.id ?? req.player?.childId ?? ipKeyGenerator(req.ip ?? 'unknown');

function identifierOf(body: unknown): string {
  const b = (body ?? {}) as Record<string, unknown>;
  const v = typeof b.phone === 'string' ? b.phone : typeof b.playerId === 'string' ? b.playerId : typeof b.email === 'string' ? b.email : '';
  return v.toLowerCase().replace(/[\s().-]/g, '').slice(0, 200);
}

export function createRateLimits(disabled = false) {
  const skip = () => disabled;
  const byIpAndIdentifier = (req: Request) => `${ipKeyGenerator(req.ip ?? 'unknown')}|${identifierOf(req.body)}`;
  return {
    general: rateLimit({ windowMs: 60_000, limit: 300, skip, ...json('Too many requests, slow down.') }),
    // Password sign-ins (guardian) and PIN sign-ins (player): per IP + identifier
    // so one attacker can't lock out everyone behind a NAT.
    login: rateLimit({ windowMs: 15 * 60_000, limit: 10, skip, keyGenerator: byIpAndIdentifier, ...json('Too many sign-in attempts. Try again in 15 minutes.') }),
    playerLogin: rateLimit({ windowMs: 15 * 60_000, limit: 10, skip, keyGenerator: byIpAndIdentifier, ...json('Too many tries. Ask your grown-up for help and try again in 15 minutes.') }),
    register: rateLimit({ windowMs: 60 * 60_000, limit: 10, skip, ...json('Too many sign-ups from this network. Try later.') }),
    // One-time codes: per IP + number (the OTP library also caps sends per number in the database).
    otp: rateLimit({ windowMs: 60 * 60_000, limit: 20, skip, keyGenerator: byIpAndIdentifier, ...json('Too many code requests. Try again later.') }),
    otpVerify: rateLimit({ windowMs: 15 * 60_000, limit: 30, skip, ...json('Too many attempts. Try again later.') }),
    recovery: rateLimit({ windowMs: 60 * 60_000, limit: 10, skip, keyGenerator: byIpAndIdentifier, ...json('Too many recovery attempts. Try again later.') }),
    // Purchase verification calls a store API: keep it modest per account.
    billing: rateLimit({ windowMs: 60_000, limit: 10, skip, keyGenerator: principalKey, ...json('Too many purchase checks. Wait a minute.') }),
    webhook: rateLimit({ windowMs: 60_000, limit: 120, skip, ...json('Too many notifications.') }),
    // Gameplay heartbeats and mirror frames go over WebSocket; REST heartbeats are a fallback.
    heartbeat: rateLimit({ windowMs: 60_000, limit: 120, skip, keyGenerator: principalKey, ...json('Slow down.') }),
    events: rateLimit({ windowMs: 60_000, limit: 60, skip, ...json('Too many analytics requests.') }),
  };
}
