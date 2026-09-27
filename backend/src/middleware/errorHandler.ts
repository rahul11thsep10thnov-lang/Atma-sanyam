import type { ErrorRequestHandler, RequestHandler } from 'express';
import { HttpError } from '../lib/httpError.js';
import { log } from '../lib/logger.js';

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: { code: 'not_found', message: 'Route not found' } });
};

// Never leaks stack traces, SQL, or internal messages to clients.
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
    return;
  }
  // Malformed JSON bodies from express.json()
  if (err && typeof err === 'object' && 'type' in err && err.type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'bad_request', message: 'Malformed JSON body' } });
    return;
  }
  if (err && typeof err === 'object' && 'type' in err && err.type === 'entity.too.large') {
    res.status(413).json({ error: { code: 'payload_too_large', message: 'Request body too large' } });
    return;
  }
  // Postgres unique violation that slipped past explicit checks
  if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
    res.status(409).json({ error: { code: 'conflict', message: 'That record already exists' } });
    return;
  }
  const message = err instanceof Error ? err.message : String(err);
  log.error('request.failed', { requestId: req.requestId, method: req.method, path: req.path, message });
  if (err instanceof Error && err.stack && process.env.NODE_ENV === 'development') console.error(err.stack);
  res.status(500).json({ error: { code: 'internal', message: 'Something went wrong. Please try again.' } });
};
