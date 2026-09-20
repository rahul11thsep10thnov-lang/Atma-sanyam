import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../middleware/errorHandler";
import { signUserToken } from "../../middleware/auth";
import { authRateLimit } from "../../middleware/rateLimit";

export const authRouter = Router();

const anonymousSchema = z.object({
  deviceId: z.string().min(8),
  preferredLanguageCode: z.string().default("en"),
});

// No GPS/location permission is ever requested (spec §20); the only
// identity we need at signup is a locally-generated device id.
authRouter.post(
  "/anonymous",
  authRateLimit,
  asyncHandler(async (req, res) => {
    const body = anonymousSchema.parse(req.body);

    const user = await prisma.user.upsert({
      where: { deviceId: body.deviceId },
      update: {},
      create: { deviceId: body.deviceId, preferredLanguageCode: body.preferredLanguageCode },
    });

    const token = signUserToken({ userId: user.id });
    res.json({ token, userId: user.id });
  })
);
