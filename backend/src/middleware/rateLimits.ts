import { rateLimit, ipKeyGenerator, type Options } from 'express-rate-limit';

// In-memory store: correct for a single API instance. If you scale to several
// instances, switch to a shared store (e.g. rate-limit-redis).
const json = (message: string): Partial<Options> => ({
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: { code: 'rate_limited', message } });
  },
});

import type { Request } from 'express';

const userKey = (req: Request) => req.user?.id ?? ipKeyGenerator(req.ip ?? 'unknown');

function identifierOf(body: unknown): string {
  const b = (body ?? {}) as Record<string, unknown>;
  const v = typeof b.phone === 'string' ? b.phone : typeof b.email === 'string' ? b.email : '';
  return v.toLowerCase().replace(/[\s().-]/g, '').slice(0, 200);
}

export function createRateLimits(disabled = false) {
  const skip = () => disabled;
  return {
    general: rateLimit({ windowMs: 60_000, limit: 300, skip, ...json('Too many requests, slow down.') }),
    login: rateLimit({
      windowMs: 15 * 60_000,
      limit: 10,
      skip,
      // Per IP + email so one attacker can't lock out everyone behind a NAT
      keyGenerator: (req) => `${ipKeyGenerator(req.ip ?? 'unknown')}|${identifierOf(req.body)}`,
      ...json('Too many sign-in attempts. Try again in 15 minutes.'),
    }),
    register: rateLimit({ windowMs: 60 * 60_000, limit: 10, skip, ...json('Too many sign-ups from this network. Try later.') }),
    passwordReset: rateLimit({
      windowMs: 60 * 60_000,
      limit: 10,
      skip,
      keyGenerator: (req) => {
        const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase().slice(0, 200) : '';
        return `${ipKeyGenerator(req.ip ?? 'unknown')}|${email}`;
      },
      ...json('Too many password reset attempts. Try again later.'),
    }),
    // One-time codes: per IP + number, so one number can't be flooded with SMS
    // (the route also caps sends per number per hour in the database).
    otp: rateLimit({
      windowMs: 60 * 60_000,
      limit: 20,
      skip,
      keyGenerator: (req) => `${ipKeyGenerator(req.ip ?? 'unknown')}|${identifierOf(req.body)}`,
      ...json('Too many code requests. Try again later.'),
    }),
    // People search while typing, friend requests, pokes: per person (the token), else per IP.
    search: rateLimit({ windowMs: 60_000, limit: 40, skip, keyGenerator: userKey, ...json('Too many searches. Slow down.') }),
    friendRequest: rateLimit({ windowMs: 60 * 60_000, limit: 30, skip, keyGenerator: userKey, ...json('Too many friend requests this hour.') }),
    poke: rateLimit({ windowMs: 60_000, limit: 20, skip, keyGenerator: userKey, ...json('Too many pokes. Give your friends a minute.') }),
    groupCreate: rateLimit({ windowMs: 60 * 60_000, limit: 20, skip, keyGenerator: userKey, ...json('Too many group sessions this hour.') }),
    groupChat: rateLimit({ windowMs: 60_000, limit: 15, skip, keyGenerator: userKey, ...json('Slow down a little in the chat.') }),
    // Live username checks while typing.
    usernameCheck: rateLimit({ windowMs: 60_000, limit: 60, skip, ...json('Too many username checks. Slow down.') }),
    events: rateLimit({ windowMs: 60_000, limit: 60, skip, ...json('Too many analytics requests.') }),
  };
}
