import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../../lib/prisma";
import { asyncHandler, HttpError } from "../../../middleware/errorHandler";
import { requireSuperAdmin } from "../../../middleware/auth";
import { logAdminAction } from "../../../lib/auditLog";
import { getStudioProviders, invalidateProviderCache } from "../../../studio/providers/registry";
import { STUDIO_LANGUAGE_CODES } from "../../../studio/language/languageProfiles";
import { contentHash } from "../../../studio/hashing";

export const adminVoicesRouter = Router();

// Sample sentences for previewing a base voice in each language.
const SAMPLES: Record<string, string> = {
  en: "Police have registered a case and the investigation is continuing.",
  hi: "पुलिस ने मामला दर्ज कर लिया है और जांच जारी है।",
  bn: "পুলিশ মামলা দায়ের করেছে এবং তদন্ত চলছে।",
  mr: "पोलिसांनी गुन्हा दाखल केला असून तपास सुरू आहे.",
  gu: "પોલીસે ગુનો નોંધ્યો છે અને તપાસ ચાલુ છે.",
  ta: "காவல்துறை வழக்குப் பதிவு செய்துள்ளது, விசாரணை தொடர்கிறது.",
  te: "పోలీసులు కేసు నమోదు చేశారు, దర్యాప్తు కొనసాగుతోంది.",
  kn: "ಪೊಲೀಸರು ಪ್ರಕರಣ ದಾಖಲಿಸಿಕೊಂಡಿದ್ದು ತನಿಖೆ ಮುಂದುವರಿದಿದೆ.",
  ml: "പോലീസ് കേസ് രജിസ്റ്റർ ചെയ്തു, അന്വേഷണം തുടരുകയാണ്.",
  pa: "ਪੁਲਿਸ ਨੇ ਮਾਮਲਾ ਦਰਜ ਕਰ ਲਿਆ ਹੈ ਅਤੇ ਜਾਂਚ ਜਾਰੀ ਹੈ।",
  or: "ପୋଲିସ ମାମଲା ରୁଜୁ କରିଛି ଏବଂ ତଦନ୍ତ ଜାରି ରହିଛି।",
  as: "আৰক্ষীয়ে গোচৰ পঞ্জীয়ন কৰিছে আৰু তদন্ত চলি আছে।",
};

adminVoicesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const voices = await prisma.voice.findMany({ orderBy: { code: "asc" }, include: { _count: { select: { assignments: true } } } });
    const providers = await getStudioProviders(prisma);
    // For each voice and language: which provider would speak it right now.
    const routing = voices.map((v) => ({
      code: v.code,
      languages: Object.fromEntries(
        STUDIO_LANGUAGE_CODES.map((l) => {
          const route = providers.voices.route({ code: v.code, gender: v.gender, ageGroup: v.ageGroup, tone: v.tone, providerVoiceIds: (v.providerVoiceIds ?? {}) as Record<string, unknown> }, l);
          return [l, route.isFallback ? "placeholder" : route.provider.key];
        })
      ),
    }));
    res.json({ voices, routing });
  })
);

adminVoicesRouter.put(
  "/:id",
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const patch = z
      .object({
        label: z.string().min(2).optional(),
        description: z.string().optional(),
        providerVoiceIds: z
          .object({ elevenlabs: z.string().optional(), chatterbox: z.string().optional(), google: z.record(z.string()).optional() })
          .strict()
          .optional(),
        settings: z.object({ stability: z.number().min(0).max(1).optional(), similarity: z.number().min(0).max(1).optional(), style: z.number().min(0).max(1).optional(), speakingRate: z.number().min(0.7).max(1.2).optional(), exaggeration: z.number().min(0).max(1).optional(), cfgWeight: z.number().min(0).max(1).optional() }).optional(),
        isActive: z.boolean().optional(),
        isNarratorEligible: z.boolean().optional(),
      })
      .parse(req.body);
    const voice = await prisma.voice.update({ where: { id: req.params.id }, data: patch });
    invalidateProviderCache();
    await logAdminAction(prisma, req.admin!.adminUserId, "STUDIO_VOICE_EDIT", "Voice", voice.id, patch);
    res.json({ voice });
  })
);

adminVoicesRouter.post(
  "/:id/preview",
  asyncHandler(async (req, res) => {
    const { languageCode, text } = z.object({ languageCode: z.string().refine((l) => STUDIO_LANGUAGE_CODES.includes(l)), text: z.string().max(300).optional() }).parse(req.body);
    const voice = await prisma.voice.findUnique({ where: { id: req.params.id } });
    if (!voice) throw new HttpError(404, "Voice not found");
    const providers = await getStudioProviders(prisma);
    const ref = { code: voice.code, gender: voice.gender, ageGroup: voice.ageGroup, tone: voice.tone, providerVoiceIds: (voice.providerVoiceIds ?? {}) as Record<string, unknown>, settings: (voice.settings ?? null) as Record<string, unknown> | null };
    const route = providers.voices.route(ref, languageCode);
    const sample = text ?? SAMPLES[languageCode];
    const audio = await route.provider.synthesize({ text: sample, languageCode, voice: ref, providerVoiceId: route.providerVoiceId });
    const key = `studio/voice-previews/${voice.code}/${contentHash(route.provider.key, route.providerVoiceId, languageCode, sample)}.${audio.format}`;
    const stored = await providers.storage.put(key, audio.audio);
    res.json({ url: stored.url, provider: route.provider.key, isPlaceholder: audio.isPlaceholder, reason: route.reason, durationSeconds: audio.durationSeconds });
  })
);
