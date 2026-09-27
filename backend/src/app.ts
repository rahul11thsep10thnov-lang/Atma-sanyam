import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { createAuth } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { createRateLimits } from './middleware/rateLimits.js';
import { requestLogger } from './middleware/requestLogger.js';
import { publicRouter } from './routes/public/index.js';
import { adminRouter } from './routes/admin/index.js';
import type { AppDeps } from './types.js';

export interface AppOptions {
  disableRateLimits?: boolean;
  logRequests?: boolean;
}

export function createApp(deps: AppDeps, options: AppOptions = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', deps.env.TRUST_PROXY);
  app.set('etag', false);

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || deps.env.CORS_ORIGINS.includes(origin)),
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 600,
    })
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(requestLogger(options.logRequests ?? deps.env.NODE_ENV !== 'test'));

  const auth = createAuth(deps);
  const limits = createRateLimits(options.disableRateLimits);

  app.get('/', (_req, res) => {
    res.json({ name: 'FOCUS API', status: 'ok' });
  });
  app.use('/v1', limits.general, publicRouter(deps, auth, limits));
  app.use('/admin/v1', limits.general, (_req, res, next) => {
    // Admin responses carry personal data: never cache them anywhere.
    res.set('Cache-Control', 'no-store');
    next();
  }, adminRouter(deps, auth, limits));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
