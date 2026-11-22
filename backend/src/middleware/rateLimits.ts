import { createHash } from 'node:crypto';
import type { Request } from 'express';
import { rateLimit, ipKeyGenerator, type Options } from 'express-rate-limit';
import { bearerToken } from './auth.js';

// In-memory store: correct for a single API instance. When running several
// instances, switch to a shared store (e.g. rate-limit-redis).
const json = (message: string): Partial<Options> => ({
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: { code: 'rate_limited', message } });
  },
});

/**
 * Per session when the request carries one, else per IP. Students in one
 * school or coaching centre often share a single public IP; counting them
 * per IP would make their autosaves fail. Used only on routes that require
 * a valid session (a made-up token gets 401 there), behind the per-IP
 * general limit; new sessions are themselves rate-limited.
 */
export function sessionOrIp(req: Request): string {
  const token = bearerToken(req);
  if (token) return `s:${createHash('sha256').update(token).digest('hex').slice(0, 32)}`;
  return `ip:${ipKeyGenerator(req.ip ?? 'unknown')}`;
}

export function createRateLimits(disabled = false) {
  const skip = () => disabled;
  return {
    // Per IP (a made-up token must not buy a fresh budget). High enough for
    // a classroom of students sharing one public IP during a test; the
    // per-session limits below do the fine-grained work.
    general: rateLimit({ windowMs: 60_000, limit: 1200, skip, ...json('Too many requests, slow down.') }),
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
    attempts: rateLimit({ windowMs: 60_000, limit: 30, skip, keyGenerator: sessionOrIp, ...json('Too many test submissions. Wait a minute.') }),
    // Autosave sends one request per answer change (debounced in the browser).
    autosave: rateLimit({ windowMs: 60_000, limit: 240, skip, keyGenerator: sessionOrIp, ...json('Saving too often. Your answers are kept on this device.') }),
    // Progress uploads are batched by the browser; a separate budget so they
    // never compete with exam autosaves.
    progress: rateLimit({ windowMs: 60_000, limit: 60, skip, keyGenerator: sessionOrIp, ...json('Syncing too often. Your progress is kept on this device.') }),
    // AI spend is money: cap how often jobs can be created.
    generation: rateLimit({ windowMs: 60 * 60_000, limit: 30, skip, ...json('Too many generation jobs this hour.') }),
    // PDF rendering is CPU work on the API process.
    pdfs: rateLimit({ windowMs: 60 * 60_000, limit: 60, skip, ...json('Too many PDFs this hour. Try again later.') }),
    imports: rateLimit({ windowMs: 60 * 60_000, limit: 20, skip, ...json('Too many imports this hour.') }),
  };
}

export type RateLimits = ReturnType<typeof createRateLimits>;
