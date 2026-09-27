import express, { Router } from "express";
import { z } from "zod";
import { prisma } from "../../../lib/prisma";
import { asyncHandler, HttpError } from "../../../middleware/errorHandler";
import { requireSuperAdmin } from "../../../middleware/auth";
import { StudioService } from "../../../studio/StudioService";
import { STUDIO_LANGUAGE_CODES, LANGUAGE_PROFILES } from "../../../studio/language/languageProfiles";
import { ANIMATION_STYLES } from "../../../studio/media/visualPromptBuilder";
import { getStudioProviders } from "../../../studio/providers/registry";
import { probeDurationSeconds } from "../../../studio/providers/voice/audioProbe";
import { contentHash } from "../../../studio/hashing";
import { logAdminAction } from "../../../lib/auditLog";

export const adminStudioRouter = Router();
const service = new StudioService(prisma);

const lang = z.string().refine((l) => STUDIO_LANGUAGE_CODES.includes(l), "Unsupported language");

adminStudioRouter.get(
  "/options",
  asyncHandler(async (_req, res) => {
    const voices = await prisma.voice.findMany({ where: { isActive: true }, orderBy: { code: "asc" }, select: { code: true, label: true, gender: true, ageGroup: true, tone: true, isNarratorEligible: true } });
    res.json({
      languages: STUDIO_LANGUAGE_CODES.map((code) => ({ code, englishName: LANGUAGE_PROFILES[code].englishName, nativeName: LANGUAGE_PROFILES[code].nativeName })),
      animationStyles: Object.keys(ANIMATION_STYLES),
      voices,
      formats: [
        { key: "SHORT", label: "Short (1–3 min)" },
        { key: "LONG", label: "Long (3–5 min)" },
      ],
    });
  })
);

adminStudioRouter.get(
  "/stories",
  asyncHandler(async (req, res) => {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const stories = await prisma.studioStory.findMany({
      where: status ? { status: status as never } : undefined,
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: {
        renders: { where: { isCurrent: true, status: "READY" }, select: { languageCode: true, kind: true } },
        jobs: { where: { status: { in: ["PENDING", "PROCESSING", "RETRYING", "FAILED"] } }, select: { status: true } },
      },
    });
    res.json({
      stories: stories.map(({ renders, jobs, ...s }) => ({
        ...s,
        renderedLanguages: renders.filter((r) => r.kind === "SINGLE_LANGUAGE").map((r) => r.languageCode),
        activeJobs: jobs.filter((j) => j.status !== "FAILED").length,
        failedJobs: jobs.filter((j) => j.status === "FAILED").length,
      })),
    });
  })
);

const createSchema = z.object({
  title: z.string().min(5).max(300),
  articleText: z.string().min(200).max(60000),
  sourceName: z.string().max(200).optional(),
  sourceUrl: z.string().url().optional().or(z.literal("").transform(() => undefined)),
  locationText: z.string().max(200).optional(),
  state: z.string().optional(),
  district: z.string().optional(),
  languages: z.array(lang).min(1),
  masterLanguage: lang.optional(),
  format: z.enum(["SHORT", "LONG"]).optional(),
  targetDurationSeconds: z.number().int().min(60).max(300).optional(),
  animationStyle: z.string().optional(),
  narratorVoiceCode: z.string().optional(),
  contentWarnings: z.array(z.string().max(60)).max(20).optional(),
  characterNotes: z.string().max(4000).optional(),
  sceneNotes: z.string().max(4000).optional(),
  pronunciationGuide: z.array(z.object({ term: z.string(), pronunciation: z.string(), languageCode: lang.optional() })).max(100).optional(),
  images: z.array(z.object({ url: z.string().url(), caption: z.string().optional() })).max(30).optional(),
  allowDramatizedReconstruction: z.boolean().optional(),
  burnSubtitles: z.boolean().optional(),
  multiAudioPackage: z.boolean().optional(),
  resolution: z.enum(["720p", "1080p"]).optional(),
  fps: z.union([z.literal(24), z.literal(25), z.literal(30)]).optional(),
});

adminStudioRouter.post(
  "/stories",
  express.json({ limit: "2mb" }),
  asyncHandler(async (req, res) => {
    const story = await service.createStory(createSchema.parse(req.body), req.admin!.adminUserId);
    res.status(201).json({ story });
  })
);

adminStudioRouter.post(
  "/stories/from-master/:masterStoryId",
  asyncHandler(async (req, res) => {
    const body = z.object({ languages: z.array(lang).min(1), format: z.enum(["SHORT", "LONG"]).optional() }).parse(req.body);
    const story = await service.importFromMasterStory(req.params.masterStoryId, body, req.admin!.adminUserId);
    res.status(201).json({ story });
  })
);

adminStudioRouter.get(
  "/stories/:id",
  asyncHandler(async (req, res) => {
    res.json(await service.workspace(req.params.id));
  })
);

adminStudioRouter.put(
  "/stories/:id",
  asyncHandler(async (req, res) => {
    const patch = z
      .object({
        title: z.string().min(5).max(300).optional(),
        languages: z.array(lang).min(1).optional(),
        format: z.enum(["SHORT", "LONG"]).optional(),
        targetDurationSeconds: z.number().int().min(60).max(300).optional(),
        animationStyle: z.string().optional(),
        narratorVoiceCode: z.string().optional(),
        contentWarnings: z.array(z.string()).optional(),
        allowDramatizedReconstruction: z.boolean().optional(),
        burnSubtitles: z.boolean().optional(),
        multiAudioPackage: z.boolean().optional(),
        resolution: z.enum(["720p", "1080p"]).optional(),
        fps: z.union([z.literal(24), z.literal(25), z.literal(30)]).optional(),
      })
      .parse(req.body);
    res.json({ story: await service.updateSettings(req.params.id, patch, req.admin!.adminUserId) });
  })
);

adminStudioRouter.put(
  "/stories/:id/article",
  express.json({ limit: "2mb" }),
  asyncHandler(async (req, res) => {
    const patch = z
      .object({
        title: z.string().min(5).max(300).optional(),
        articleText: z.string().min(200).max(60000).optional(),
        characterNotes: z.string().max(4000).optional(),
        sceneNotes: z.string().max(4000).optional(),
        pronunciationGuide: z.array(z.object({ term: z.string(), pronunciation: z.string(), languageCode: lang.optional() })).optional(),
      })
      .parse(req.body);
    res.json({ article: await service.updateArticle(req.params.id, patch, req.admin!.adminUserId) });
  })
);

adminStudioRouter.post("/stories/:id/analyze", asyncHandler(async (req, res) => res.status(202).json({ job: await service.reanalyze(req.params.id, req.admin!.adminUserId) })));

adminStudioRouter.put(
  "/stories/:id/facts/:factId",
  asyncHandler(async (req, res) => {
    const patch = z.object({ value: z.string().min(1).optional(), verificationStatus: z.enum(["VERIFIED", "UNVERIFIED", "REPORTED", "ALLEGED", "UNKNOWN"]).optional(), isKeyFact: z.boolean().optional() }).parse(req.body);
    res.json({ fact: await service.updateFact(req.params.id, req.params.factId, patch, req.admin!.adminUserId) });
  })
);

adminStudioRouter.put(
  "/stories/:id/characters/:characterId",
  asyncHandler(async (req, res) => {
    const patch = z
      .object({
        displayName: z.string().min(1).optional(),
        role: z.string().min(1).optional(),
        gender: z.enum(["MALE", "FEMALE", "UNKNOWN"]).optional(),
        ageGroup: z.enum(["CHILD", "YOUNG", "ADULT", "ELDERLY", "UNKNOWN"]).optional(),
        isOfficial: z.boolean().optional(),
        anonymized: z.boolean().optional(),
        appearance: z.record(z.string()).optional(),
        pronunciations: z.record(z.string()).optional(),
      })
      .parse(req.body);
    res.json({ character: await service.updateCharacter(req.params.id, req.params.characterId, patch, req.admin!.adminUserId) });
  })
);

adminStudioRouter.put(
  "/stories/:id/voices",
  asyncHandler(async (req, res) => {
    const { speakerKey, voiceCode } = z.object({ speakerKey: z.string(), voiceCode: z.string() }).parse(req.body);
    await service.setVoiceAssignment(req.params.id, speakerKey, voiceCode, req.admin!.adminUserId);
    res.json({ ok: true });
  })
);

adminStudioRouter.post("/stories/:id/master-script", asyncHandler(async (req, res) => res.status(202).json({ job: await service.regenerateMasterScript(req.params.id, req.admin!.adminUserId) })));

const dialogueSchema = z.array(z.object({ speakerKey: z.string(), text: z.string().min(1), statementType: z.enum(["DIRECT_QUOTE", "REPORTED_STATEMENT", "AI_NARRATION", "RECONSTRUCTED_DIALOGUE"]) }));

adminStudioRouter.put(
  "/stories/:id/scenes/:sceneId",
  asyncHandler(async (req, res) => {
    const patch = z
      .object({
        narratorText: z.string().min(1).optional(),
        dialogue: dialogueSchema.optional(),
        onScreenText: z.string().max(120).optional(),
        cameraDirection: z.string().optional(),
        background: z.string().optional(),
        location: z.string().optional(),
        props: z.array(z.string()).optional(),
        timeOfDay: z.enum(["morning", "afternoon", "evening", "night", "unspecified"]).optional(),
        transition: z.enum(["cut", "fade", "dissolve", "slide"]).optional(),
        emotionalTone: z.string().optional(),
      })
      .parse(req.body);
    res.status(202).json({ job: await service.editScene(req.params.id, req.params.sceneId, patch, req.admin!.adminUserId) });
  })
);

adminStudioRouter.post(
  "/stories/:id/scenes/:sceneId/regenerate-visual",
  asyncHandler(async (req, res) => res.status(202).json({ job: await service.regenerateSceneVisual(req.params.id, req.params.sceneId, req.admin!.adminUserId) }))
);

adminStudioRouter.post(
  "/stories/:id/languages/:lang/script",
  asyncHandler(async (req, res) => {
    const { force } = z.object({ force: z.boolean().optional() }).parse(req.body ?? {});
    res.status(202).json({ job: await service.regenerateLanguageScript(req.params.id, lang.parse(req.params.lang), !!force, req.admin!.adminUserId) });
  })
);

adminStudioRouter.put(
  "/stories/:id/languages/:lang/scenes/:sceneNumber",
  asyncHandler(async (req, res) => {
    const patch = z.object({ narratorText: z.string().min(1).optional(), dialogue: z.array(z.string().min(1)).optional(), onScreenText: z.string().max(120).optional() }).parse(req.body);
    res.status(202).json({ job: await service.editLanguageScene(req.params.id, lang.parse(req.params.lang), Number(req.params.sceneNumber), patch, req.admin!.adminUserId) });
  })
);

adminStudioRouter.post(
  "/stories/:id/languages/:lang/voice",
  asyncHandler(async (req, res) => {
    const { force } = z.object({ force: z.boolean().optional() }).parse(req.body ?? {});
    res.status(202).json({ job: await service.regenerateVoice(req.params.id, lang.parse(req.params.lang), !!force, req.admin!.adminUserId) });
  })
);

adminStudioRouter.post("/stories/:id/languages/:lang/render", asyncHandler(async (req, res) => res.status(202).json({ job: await service.rerender(req.params.id, lang.parse(req.params.lang), req.admin!.adminUserId) })));

adminStudioRouter.post("/stories/:id/submit-review", asyncHandler(async (req, res) => res.status(202).json({ job: await service.submitForReview(req.params.id, req.admin!.adminUserId) })));

adminStudioRouter.post(
  "/stories/:id/approve",
  asyncHandler(async (req, res) => {
    const { notes } = z.object({ notes: z.string().optional() }).parse(req.body ?? {});
    await service.approve(req.params.id, req.admin!.adminUserId, notes);
    res.json({ ok: true, message: "Approved — generating voices, visuals and renders" });
  })
);

adminStudioRouter.post(
  "/stories/:id/reject",
  asyncHandler(async (req, res) => {
    const { notes } = z.object({ notes: z.string().optional() }).parse(req.body ?? {});
    await service.reject(req.params.id, req.admin!.adminUserId, notes);
    res.json({ ok: true });
  })
);

adminStudioRouter.post(
  "/stories/:id/publish",
  asyncHandler(async (req, res) => {
    const { overrideNote } = z.object({ overrideNote: z.string().optional() }).parse(req.body ?? {});
    res.json({ ok: true, ...(await service.publish(req.params.id, req.admin!.adminUserId, overrideNote)) });
  })
);

adminStudioRouter.get(
  "/stories/:id/jobs",
  asyncHandler(async (req, res) => {
    const jobs = await prisma.generationJob.findMany({ where: { storyId: req.params.id }, orderBy: { createdAt: "desc" }, take: 200, include: { logs: { orderBy: { createdAt: "asc" } } } });
    res.json({ jobs });
  })
);

adminStudioRouter.post("/jobs/:jobId/retry", asyncHandler(async (req, res) => res.json({ job: await service.retry(req.params.jobId, req.admin!.adminUserId) })));

adminStudioRouter.get(
  "/stories/:id/versions/:versionId",
  asyncHandler(async (req, res) => {
    const version = await prisma.contentVersion.findFirst({ where: { id: req.params.versionId, storyId: req.params.id } });
    if (!version) throw new HttpError(404, "Version not found");
    res.json({ version });
  })
);

adminStudioRouter.get(
  "/stories/:id/download/:lang",
  asyncHandler(async (req, res) => {
    const format = (req.query.format as string) ?? "mp4";
    const isPackage = req.params.lang === "multi";
    const render = await prisma.videoRender.findFirst({
      where: { storyId: req.params.id, isCurrent: true, status: "READY", ...(isPackage ? { kind: "MULTI_AUDIO" } : { languageCode: req.params.lang, kind: "SINGLE_LANGUAGE" }) },
    });
    if (!render?.url) throw new HttpError(404, "No finished render");
    if (format === "mp4") return res.redirect(render.url);
    const sub = await prisma.studioSubtitle.findFirst({ where: { renderId: render.id, format: format === "vtt" ? "VTT" : "SRT", ...(isPackage ? {} : { languageCode: req.params.lang }) } });
    if (!sub) throw new HttpError(404, "Subtitle file not found");
    res.redirect(sub.url);
  })
);

// --- Music & sound-effect libraries (licensed files, uploaded as raw bodies) ---

adminStudioRouter.get(
  "/library",
  asyncHandler(async (_req, res) => {
    const [music, soundEffects] = await Promise.all([prisma.musicTrack.findMany({ orderBy: { createdAt: "desc" } }), prisma.soundEffect.findMany({ orderBy: { tag: "asc" } })]);
    res.json({ music, soundEffects });
  })
);

adminStudioRouter.post(
  "/library/:kind",
  requireSuperAdmin,
  express.raw({ type: ["audio/*", "application/octet-stream"], limit: "40mb" }),
  asyncHandler(async (req, res) => {
    const kind = req.params.kind;
    if (kind !== "music" && kind !== "sfx") throw new HttpError(400, "kind must be music or sfx");
    const meta = z.object({ title: z.string().min(1), license: z.string().min(3), mood: z.string().optional(), tag: z.string().optional(), ext: z.enum(["mp3", "wav", "m4a", "ogg"]).default("mp3") }).parse(req.query);
    const body = req.body as Buffer;
    if (!Buffer.isBuffer(body) || body.length === 0) throw new HttpError(400, "Send the audio file as the request body");
    const durationSeconds = await probeDurationSeconds(body, meta.ext);
    if (!durationSeconds) throw new HttpError(400, "Could not read the audio file (is ffprobe installed?)");
    const providers = await getStudioProviders(prisma);
    const key = `studio/library/${kind}/${contentHash(body.toString("base64"))}.${meta.ext}`;
    const stored = await providers.storage.put(key, body);
    const row =
      kind === "music"
        ? await prisma.musicTrack.create({ data: { title: meta.title, mood: meta.mood ?? "neutral", storageKey: key, url: stored.url, durationSeconds, license: meta.license } })
        : await prisma.soundEffect.create({ data: { title: meta.title, tag: meta.tag ?? "room-tone", storageKey: key, url: stored.url, durationSeconds, license: meta.license } });
    await logAdminAction(prisma, req.admin!.adminUserId, "STUDIO_LIBRARY_UPLOAD", kind, row.id, { title: meta.title, license: meta.license });
    res.status(201).json({ item: row });
  })
);

adminStudioRouter.put(
  "/library/:kind/:id",
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
    const item = req.params.kind === "music" ? await prisma.musicTrack.update({ where: { id: req.params.id }, data: { isActive } }) : await prisma.soundEffect.update({ where: { id: req.params.id }, data: { isActive } });
    res.json({ item });
  })
);
