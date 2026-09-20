import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import path from "node:path";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import { localStorageRoot } from "./lib/storage";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { publicApiRateLimit } from "./middleware/rateLimit";

import { languagesRouter } from "./api/routes/languages";
import { categoriesRouter } from "./api/routes/categories";
import { locationsRouter } from "./api/routes/locations";
import { feedRouter } from "./api/routes/feed";
import { storiesRouter } from "./api/routes/stories";
import { videosRouter } from "./api/routes/videos";
import { searchRouter } from "./api/routes/search";
import { authRouter } from "./api/routes/auth";
import { preferencesRouter } from "./api/routes/preferences";
import { engagementRouter } from "./api/routes/engagement";
import { devicesRouter } from "./api/routes/devices";
import { adminRouter } from "./api/routes/admin";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.use(pinoHttp({ logger }));

  // Local-disk media serving for dev (production points STORAGE_PUBLIC_BASE_URL
  // at a real CDN/object-storage bucket instead — see lib/storage.ts).
  app.use("/media", express.static(localStorageRoot()));

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  const v1 = express.Router();
  v1.use(publicApiRateLimit);
  v1.use("/languages", languagesRouter);
  v1.use("/categories", categoriesRouter);
  v1.use("/locations", locationsRouter);
  v1.use("/feed", feedRouter);
  v1.use("/stories", storiesRouter);
  v1.use("/videos", videosRouter);
  v1.use("/search", searchRouter);
  v1.use("/auth", authRouter);
  v1.use("/me/preferences", preferencesRouter);
  v1.use("/engagement", engagementRouter);
  v1.use("/devices", devicesRouter);
  v1.use("/admin", adminRouter);

  app.use("/api/v1", v1);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(env.port, () => {
    logger.info(`Atma Sanyam API listening on port ${env.port}`);
  });
}
