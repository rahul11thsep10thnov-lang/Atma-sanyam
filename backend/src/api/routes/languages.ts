import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../middleware/errorHandler";

export const languagesRouter = Router();

languagesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const languages = await prisma.language.findMany({
      where: { isEnabled: true },
      orderBy: { englishName: "asc" },
    });
    res.json({ languages });
  })
);
