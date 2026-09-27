import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import { log } from '../lib/logger.js';

// Logs method, route pattern (never the query string or body: they can carry
// search text or tokens), status and duration.
export function requestLogger(enabled: boolean): RequestHandler {
  return (req, res, next) => {
    req.requestId = randomUUID();
    res.setHeader('X-Request-Id', req.requestId);
    if (!enabled) return next();
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      log.info('http.request', {
        method: req.method,
        route: `${req.baseUrl}${req.route?.path ?? ''}` || req.path,
        status: res.statusCode,
        ms: Math.round(ms),
      });
    });
    next();
  };
}
