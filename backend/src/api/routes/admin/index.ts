import { Router } from "express";
import { adminAuthRouter } from "./auth";
import { adminPipelineRouter } from "./pipeline";
import { adminStoriesRouter } from "./storiesAdmin";
import { adminSourcesRouter } from "./sources";
import { adminConfigRouter } from "./config";
import { requireAdminAuth } from "../../../middleware/auth";

export const adminRouter = Router();

// Login is the only unauthenticated admin route.
adminRouter.use("/auth", adminAuthRouter);

adminRouter.use(requireAdminAuth);
adminRouter.use("/pipeline", adminPipelineRouter);
adminRouter.use("/stories", adminStoriesRouter);
adminRouter.use("/sources", adminSourcesRouter);
adminRouter.use("/config", adminConfigRouter);
