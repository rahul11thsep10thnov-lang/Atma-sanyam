import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../middleware/errorHandler";
import { requireUserAuth } from "../../middleware/auth";

export const devicesRouter = Router();

const registerSchema = z.object({ fcmToken: z.string().min(10) });

devicesRouter.post(
  "/register",
  requireUserAuth,
  asyncHandler(async (req, res) => {
    const body = registerSchema.parse(req.body);
    await prisma.deviceToken.upsert({
      where: { fcmToken: body.fcmToken },
      update: { userId: req.user!.userId },
      create: { userId: req.user!.userId, fcmToken: body.fcmToken },
    });
    res.status(201).json({ ok: true });
  })
);
