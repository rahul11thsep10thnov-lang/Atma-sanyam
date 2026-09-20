import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../middleware/errorHandler";
import { requireUserAuth } from "../../middleware/auth";
import { PrimaryCategory } from "@prisma/client";

export const preferencesRouter = Router();

preferencesRouter.get(
  "/",
  requireUserAuth,
  asyncHandler(async (req, res) => {
    const preference = await prisma.userPreference.findUnique({ where: { userId: req.user!.userId } });
    res.json({ preference: preference ?? { categories: [], states: [], notificationsEnabled: true } });
  })
);

const updateSchema = z.object({
  categories: z.array(z.nativeEnum(PrimaryCategory)).optional(),
  states: z.array(z.string()).optional(),
  notificationsEnabled: z.boolean().optional(),
});

preferencesRouter.put(
  "/",
  requireUserAuth,
  asyncHandler(async (req, res) => {
    const body = updateSchema.parse(req.body);
    const preference = await prisma.userPreference.upsert({
      where: { userId: req.user!.userId },
      update: body,
      create: {
        userId: req.user!.userId,
        categories: body.categories ?? [],
        states: body.states ?? [],
        notificationsEnabled: body.notificationsEnabled ?? true,
      },
    });
    res.json({ preference });
  })
);
