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

export function createRateLimits(disabled = false) {
  const skip = () => disabled;
  return {
    general: rateLimit({ windowMs: 60_000, limit: 300, skip, ...json('Too many requests, slow down.') }),
    login: rateLimit({
      windowMs: 15 * 60_000,
      limit: 10,
      skip,
      // Per IP + email so one attacker can't lock out everyone behind a NAT
      keyGenerator: (req) => {
        const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase().slice(0, 200) : '';
        return `${ipKeyGenerator(req.ip ?? 'unknown')}|${email}`;
      },
      ...json('Too many sign-in attempts. Try again in 15 minutes.'),
    }),
    register: rateLimit({ windowMs: 60 * 60_000, limit: 10, skip, ...json('Too many sign-ups from this network. Try later.') }),
    events: rateLimit({ windowMs: 60_000, limit: 60, skip, ...json('Too many analytics requests.') }),
  };
}
