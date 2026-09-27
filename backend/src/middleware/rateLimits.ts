import { rateLimit, ipKeyGenerator, type Options } from 'express-rate-limit';

// In-memory store: correct for a single API instance. When running several
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
    adminLogin: rateLimit({
      windowMs: 15 * 60_000,
      limit: 10,
      skip,
      keyGenerator: (req) => {
        const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase().slice(0, 200) : '';
        return `${ipKeyGenerator(req.ip ?? 'unknown')}|${email}`;
      },
      ...json('Too many sign-in attempts. Try again in 15 minutes.'),
    }),
    userAuth: rateLimit({ windowMs: 60 * 60_000, limit: 30, skip, ...json('Too many sign-ins from this network. Try later.') }),
    attempts: rateLimit({ windowMs: 60_000, limit: 30, skip, ...json('Too many test submissions. Wait a minute.') }),
    // AI spend is money: cap how often jobs can be created.
    generation: rateLimit({ windowMs: 60 * 60_000, limit: 30, skip, ...json('Too many generation jobs this hour.') }),
    imports: rateLimit({ windowMs: 60 * 60_000, limit: 20, skip, ...json('Too many imports this hour.') }),
  };
}

export type RateLimits = ReturnType<typeof createRateLimits>;
