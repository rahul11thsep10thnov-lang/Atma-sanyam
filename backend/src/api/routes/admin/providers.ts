import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../../lib/prisma";
import { asyncHandler } from "../../../middleware/errorHandler";
import { requireSuperAdmin } from "../../../middleware/auth";
import { logAdminAction } from "../../../lib/auditLog";
import { describeProviders, invalidateProviderCache } from "../../../studio/providers/registry";
import { isFfmpegAvailable } from "../../../studio/rendering/ffmpegRunner";
import { STUDIO_LANGUAGE_CODES } from "../../../studio/language/languageProfiles";

export const adminProvidersRouter = Router();

adminProvidersRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json({ providers: await describeProviders(prisma), ffmpegAvailable: await isFfmpegAvailable() });
  })
);

// Only non-secret settings can be changed here. API keys are environment variables.
adminProvidersRouter.put(
  "/:kind/:key",
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const kind = z.enum(["LLM", "TRANSLATION", "VOICE", "IMAGE", "VIDEO", "MUSIC", "STORAGE"]).parse(req.params.kind);
    const body = z
      .object({
        isEnabled: z.boolean().optional(),
        priority: z.number().int().min(0).max(1000).optional(),
        settings: z.object({ languages: z.array(z.string().refine((l) => STUDIO_LANGUAGE_CODES.includes(l))).optional() }).strict().optional(),
      })
      .parse(req.body);
    const config = await prisma.providerConfig.upsert({
      where: { kind_key: { kind, key: req.params.key } },
      create: { kind, key: req.params.key, isEnabled: body.isEnabled ?? true, priority: body.priority ?? 100, settings: body.settings },
      update: { isEnabled: body.isEnabled, priority: body.priority, settings: body.settings },
    });
    invalidateProviderCache();
    await logAdminAction(prisma, req.admin!.adminUserId, "STUDIO_PROVIDER_CONFIG", "ProviderConfig", config.id, body);
    res.json({ config });
  })
);
