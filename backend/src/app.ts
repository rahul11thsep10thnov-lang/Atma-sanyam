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

// Routes that accept large bodies parse JSON themselves with a higher limit.
const LARGE_BODY_ROUTES = /^\/api\/admin\/(imports|source-materials)(\/|$)/;

export function createApp(deps: AppDeps, options: AppOptions = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', deps.env.TRUST_PROXY);
  app.set('etag', false);

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || deps.env.CORS_ORIGINS.includes(origin)),
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 600,
    })
  );
  const smallJson = express.json({ limit: '100kb' });
  app.use((req, res, next) => (LARGE_BODY_ROUTES.test(req.path) ? next() : smallJson(req, res, next)));
  app.use(requestLogger(options.logRequests ?? deps.env.NODE_ENV !== 'test'));

  const auth = createAuth(deps);
  const limits = createRateLimits(options.disableRateLimits);

  app.get('/', (_req, res) => {
    res.json({ name: 'PoliceExams API', status: 'ok' });
  });
  app.use(
    '/api/admin',
    limits.general,
    (_req, res, next) => {
      // Admin responses include unpublished content: never cache them.
      res.set('Cache-Control', 'no-store');
      next();
    },
    adminRouter(deps, auth, limits)
  );
  app.use('/api', limits.general, publicRouter(deps, auth, limits));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
