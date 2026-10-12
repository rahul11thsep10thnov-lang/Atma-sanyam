import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

// Logs method, path (no query string: it can carry search text or tokens),
// status and duration. Never logs headers or bodies.
export function requestLogger(enabled: boolean): RequestHandler {
  return (req, res, next) => {
    req.requestId = randomUUID();
    res.setHeader('X-Request-Id', req.requestId);
    if (!enabled) return next();
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      console.log(`${req.method} ${req.baseUrl}${req.route?.path ?? req.path} ${res.statusCode} ${ms.toFixed(1)}ms`);
    });
    next();
  };
}
