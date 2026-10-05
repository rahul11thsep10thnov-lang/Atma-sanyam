import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Prisma, PrismaClient, StudioCharacter, StudioScene, StudioScript } from "@prisma/client";
import { env } from "../config/env";
import { JobContext, enqueueStudioJob } from "./jobs/jobRunner";
import { getStudioProviders } from "./providers/registry";
import { analyzeArticle } from "./content/articleAnalyzer";
import { generateMasterScript } from "./content/masterScriptGenerator";
import { FORMAT_LIMITS, MAX_VIDEO_SECONDS, resolveOutputSettings } from "./config";
import { ArticleAnalysis, CharacterAppearance, DialogueLine, ExtractedCharacter, ExtractedFact, LanguageScriptContent, LintFlag, MasterScene, TimelineEvent } from "./types";
import { classifyScene } from "./safety/sceneSafety";
import { buildStyleBible, buildVisualPrompt, cameraMotionFor, StyleBible } from "./media/visualPromptBuilder";
import { assignVoices } from "./media/voiceAssignment";
import { NARRATOR_SPEAKER_KEY } from "./media/voiceCatalog";
import { generateLanguageScript } from "./language/languageScriptGenerator";
import { getLanguageProfile } from "./language/languageProfiles";
import { contentHash } from "./hashing";
import { buildLanguageTimeline, commonSceneFloors, LanguageTimeline, TimelineSegmentInput } from "./rendering/audioTimeline";
import { buildSubtitleCues, cuesToAss, cuesToSrt, cuesToVtt } from "./rendering/subtitles";
import { isFfmpegAvailable, renderWithFfmpeg, RenderScene } from "./rendering/ffmpegRunner";
import { runQualityCheck } from "./qc/qualityCheck";
import { snapshotVersion } from "./versioning";
import { Transition } from "./rendering/ffmpegCommands";
import {
  advanceCinematic,
  cinematicPublishGate,
  currentEpisode,
  PLANNER_VERSION,
  stageAssembleMasterVisual,
  stageBuildScenePackage,
  stageGenerateDepth,
  stageGenerateLayerAsset,
  stageGenerateMask,
  stageInpaintAsset,
  stagePlanShots,
  stageRenderShot,
  stageShotQc,
} from "./production/cinematicPipeline";

const RENDERER_VERSION = "studio-ffmpeg-v1";
const CINEMATIC_RENDERER_VERSION = "studio-ffmpeg-v1+engine25d";
const ILLUSTRATION_LABEL = "Illustration";

type Db = PrismaClient;

// ---------------------------------------------------------------------------
// Loading helpers
// ---------------------------------------------------------------------------

export async function latestArticle(db: Db, storyId: string) {
  return db.studioArticle.findFirstOrThrow({ where: { storyId }, orderBy: { version: "desc" } });
}

export async function currentMasterScript(db: Db, storyId: string) {
  const story = await db.studioStory.findUniqueOrThrow({ where: { id: storyId } });
  if (!story.currentMasterScriptId) return null;
  return db.studioScript.findUnique({ where: { id: story.currentMasterScriptId }, include: { scenes: { orderBy: { sceneNumber: "asc" } } } });
}

/** Latest language script derived from the current master version. */
export async function currentLanguageScript(db: Db, storyId: string, languageCode: string, masterScriptId: string) {
  return db.studioScript.findFirst({
    where: { storyId, kind: "LANGUAGE", languageCode, parentScriptId: masterScriptId },
    orderBy: { version: "desc" },
  });
}

function toCharacter(c: StudioCharacter): ExtractedCharacter {
  return {
    key: c.key,
    displayName: c.displayName,
    realName: c.realName ?? undefined,
    role: c.role,
    gender: c.gender,
    ageGroup: c.ageGroup,
    isMinor: c.isMinor,
    isOfficial: c.isOfficial,
    isRealPerson: c.isRealPerson,
    anonymized: c.anonymized,
    speaks: c.speaks,
    appearance: (c.appearance as unknown as CharacterAppearance) ?? { clothing: "", build: "", hair: "", accessories: "", palette: "" },
  };
}

async function loadAnalysis(db: Db, storyId: string): Promise<ArticleAnalysis> {
  const story = await db.studioStory.findUniqueOrThrow({ where: { id: storyId } });
  const article = await latestArticle(db, storyId);
  const facts = await db.studioFact.findMany({ where: { storyId }, orderBy: { createdAt: "asc" } });
  const characters = await db.studioCharacter.findMany({ where: { storyId }, orderBy: { key: "asc" } });
  const summary = (story.analysisSummary ?? {}) as { settings?: string[]; locationLabel?: string };
  return {
    cleanedText: article.cleanedText ?? article.rawText,
    facts: facts.map((f) => ({
      type: f.type,
      value: f.value,
      normalizedValue: f.normalizedValue ?? undefined,
      sourceSentence: f.sourceSentence ?? undefined,
      attributedTo: f.attributedTo ?? undefined,
      statementType: f.statementType ?? undefined,
      verificationStatus: f.verificationStatus,
      isKeyFact: f.isKeyFact,
      timelineOrder: f.timelineOrder ?? undefined,
    })),
    timeline: (story.timeline as unknown as TimelineEvent[]) ?? [],
    characters: characters.map(toCharacter),
    location: {
      label: summary.locationLabel ?? story.locationText ?? [story.district, story.state].filter(Boolean).join(", ") ?? "India",
      state: story.state ?? undefined,
      district: story.district ?? undefined,
      settings: summary.settings ?? ["city street"],
    },
    sensitiveTopics: story.sensitiveTopics,
    isSensitive: story.isSensitive,
    warnings: [],
    provider: "db",
  };
}

function sceneToMaster(s: StudioScene): MasterScene {
  return {
    sceneNumber: s.sceneNumber,
    durationSeconds: s.durationSeconds,
    location: s.location,
    timeOfDay: s.timeOfDay as MasterScene["timeOfDay"],
    characters: s.characters,
    narratorText: s.narratorText,
    dialogue: (s.dialogue as unknown as DialogueLine[]) ?? [],
    emotionalTone: s.emotionalTone,
    cameraDirection: s.cameraDirection,
    background: s.background,
    props: s.props,
    animationRequirements: s.animationRequirements,
    audioRequirements: (s.audioRequirements as unknown as MasterScene["audioRequirements"]) ?? { ambient: "room-tone", sfx: [] },
    contentRestrictions: s.contentRestrictions,
    transition: s.transition as MasterScene["transition"],
    onScreenText: s.onScreenText ?? undefined,
    safetyLevel: s.safetyLevel,
    safetyReasons: s.safetyReasons,
  };
}

function formatLimits(story: { format: "SHORT" | "LONG"; targetDurationSeconds: number }) {
  const limits = FORMAT_LIMITS[story.format];
  return { minSeconds: limits.minSeconds, maxSeconds: Math.min(limits.maxSeconds, MAX_VIDEO_SECONDS), targetSeconds: story.targetDurationSeconds };
}

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

// ---------------------------------------------------------------------------
// Stage 1: ANALYZE_ARTICLE
// ---------------------------------------------------------------------------

async function stageAnalyze(db: Db, ctx: JobContext) {
  const storyId = ctx.job.storyId;
  const story = await db.studioStory.findUniqueOrThrow({ where: { id: storyId } });
  const article = await latestArticle(db, storyId);
  const providers = await getStudioProviders(db);

  const analysis = await analyzeArticle(
    {
      title: article.title,
      text: article.rawText,
      characterNotes: article.characterNotes,
      locationHint: { state: story.state ?? undefined, district: story.district ?? undefined, locationText: story.locationText ?? undefined },
      contentWarnings: story.contentWarnings,
    },
    providers.llm
  );
  for (const w of analysis.warnings) await ctx.log(w, undefined, "warn");
  await ctx.log(`Analysis via ${analysis.provider}: ${analysis.facts.length} facts, ${analysis.timeline.length} timeline events, ${analysis.characters.length} characters`);

  await db.$transaction(async (tx) => {
    await tx.studioArticle.update({ where: { id: article.id }, data: { cleanedText: analysis.cleanedText } });
    await tx.studioFact.deleteMany({ where: { storyId, adminEdited: false } });
    await tx.studioFact.createMany({ data: analysis.facts.map((f) => ({ ...factData(f), storyId, articleVersion: article.version })) });

    const existing = await tx.studioCharacter.findMany({ where: { storyId } });
    const keep = new Set(existing.filter((c) => c.adminEdited).map((c) => c.key));
    await tx.studioCharacter.deleteMany({ where: { storyId, adminEdited: false } });
    for (const c of analysis.characters) {
      if (keep.has(c.key)) continue;
      await tx.studioCharacter.create({
        data: {
          storyId,
          key: c.key,
          displayName: c.displayName,
          realName: c.realName,
          role: c.role,
          gender: c.gender,
          ageGroup: c.ageGroup,
          isMinor: c.isMinor,
          isOfficial: c.isOfficial,
          isRealPerson: c.isRealPerson,
          anonymized: c.anonymized,
          speaks: c.speaks,
          appearance: json(c.appearance),
        },
      });
    }
    await tx.studioStory.update({
      where: { id: storyId },
      data: {
        timeline: json(analysis.timeline),
        sensitiveTopics: analysis.sensitiveTopics,
        isSensitive: analysis.isSensitive,
        state: story.state ?? analysis.location.state,
        district: story.district ?? analysis.location.district,
        analysisSummary: json({ provider: analysis.provider, warnings: analysis.warnings, settings: analysis.location.settings, locationLabel: analysis.location.label, analyzedAt: new Date().toISOString() }),
      },
    });
    await tx.contentSafetyReview.create({
      data: { storyId, level: analysis.isSensitive ? "SENSITIVE" : "SAFE", reasons: analysis.sensitiveTopics, source: "auto" },
    });
  });

  await enqueueStudioJob(db, { storyId, type: "GENERATE_MASTER_SCRIPT", requestedBy: ctx.job.requestedBy ?? undefined });
  return { facts: analysis.facts.length, characters: analysis.characters.length, sensitiveTopics: analysis.sensitiveTopics, provider: analysis.provider };
}

function factData(f: ExtractedFact) {
  return {
    type: f.type,
    value: f.value,
    normalizedValue: f.normalizedValue,
    sourceSentence: f.sourceSentence,
    attributedTo: f.attributedTo,
    statementType: f.statementType,
    verificationStatus: f.verificationStatus,
    isKeyFact: f.isKeyFact,
    timelineOrder: f.timelineOrder,
  };
}

// ---------------------------------------------------------------------------
// Stage 2: GENERATE_MASTER_SCRIPT (+ scene breakdown, safety, visual prompts,
// safe replacement, voice assignment)
// ---------------------------------------------------------------------------

async function stageMasterScript(db: Db, ctx: JobContext) {
  const storyId = ctx.job.storyId;
  const story = await db.studioStory.findUniqueOrThrow({ where: { id: storyId } });
  const article = await latestArticle(db, storyId);
  const analysis = await loadAnalysis(db, storyId);
  const providers = await getStudioProviders(db);
  const limits = formatLimits(story);

  const payloadScenes = (ctx.job.payload as { scenes?: MasterScene[] } | null)?.scenes;
  let scenes: MasterScene[];
  let provider: string;
  let title = story.title;
  if (payloadScenes) {
    // An editor changed scenes: new version from their edit, no regeneration.
    scenes = payloadScenes;
    provider = "editor";
  } else {
    const out = await generateMasterScript(
      {
        title: story.title,
        analysis,
        targetSeconds: limits.targetSeconds,
        maxSeconds: limits.maxSeconds,
        minSeconds: limits.minSeconds,
        languageCode: story.masterLanguage,
        sourceName: story.sourceName,
        allowDramatizedReconstruction: story.allowDramatizedReconstruction,
        sceneNotes: article.sceneNotes,
      },
      providers.llm
    );
    for (const w of out.warnings) await ctx.log(w, undefined, "warn");
    scenes = out.script.scenes;
    provider = out.script.provider;
    title = out.script.title || story.title;
  }

  const bible = buildStyleBible({ storyId, animationStyle: story.animationStyle, characters: analysis.characters.map((c) => ({ ...c, appearance: c.appearance })) });
  const previous = await db.studioScript.findFirst({ where: { storyId, kind: "MASTER" }, orderBy: { version: "desc" } });
  const version = (previous?.version ?? 0) + 1;
  const estimated = scenes.reduce((s, x) => s + x.durationSeconds, 0);

  const script = await db.$transaction(async (tx) => {
    if (previous) await tx.studioScript.updateMany({ where: { storyId, kind: "MASTER", status: { not: "SUPERSEDED" } }, data: { status: "SUPERSEDED" } });
    const created = await tx.studioScript.create({
      data: {
        storyId,
        kind: "MASTER",
        languageCode: story.masterLanguage,
        version,
        provider,
        content: json({ title, scenes }),
        estimatedDurationSeconds: Math.round(estimated),
        contentHash: contentHash(scenes),
        createdByAdminId: ctx.job.requestedBy && ctx.job.requestedBy !== "pipeline" ? ctx.job.requestedBy : null,
      },
    });
    for (const scene of scenes) {
      const safety = classifyScene(scene);
      const prompt = buildVisualPrompt(scene, { level: safety.level, topics: safety.topics }, bible, analysis.sensitiveTopics);
      const row = await tx.studioScene.create({
        data: {
          storyId,
          scriptId: created.id,
          sceneNumber: scene.sceneNumber,
          durationSeconds: scene.durationSeconds,
          location: scene.location,
          timeOfDay: scene.timeOfDay,
          characters: scene.characters,
          narratorText: scene.narratorText,
          dialogue: json(scene.dialogue),
          emotionalTone: scene.emotionalTone,
          cameraDirection: scene.cameraDirection,
          background: scene.background,
          props: scene.props,
          animationRequirements: scene.animationRequirements,
          audioRequirements: json(scene.audioRequirements),
          contentRestrictions: scene.contentRestrictions,
          transition: scene.transition,
          onScreenText: scene.onScreenText,
          safetyLevel: safety.level,
          safetyReasons: safety.reasons,
          visualHash: prompt.hash,
        },
      });
      await tx.visualPrompt.create({
        data: { sceneId: row.id, prompt: prompt.prompt, negativePrompt: prompt.negativePrompt, isSubstitute: prompt.isSubstitute, substituteReason: prompt.substituteReason, promptHash: prompt.hash },
      });
      if (safety.level !== "SAFE") {
        await tx.contentSafetyReview.create({ data: { storyId, sceneId: row.id, level: safety.level, reasons: safety.reasons, substitution: prompt.substituteReason, source: "auto" } });
      }
    }
    const output = resolveOutputSettings();
    await tx.videoProject.upsert({
      where: { storyId },
      create: { storyId, masterScriptId: created.id, timeline: json(scenes.map((s) => ({ sceneNumber: s.sceneNumber, baseDurationSeconds: 5, transition: s.transition }))), width: output.width, height: output.height, fps: output.fps },
      update: { masterScriptId: created.id, timeline: json(scenes.map((s) => ({ sceneNumber: s.sceneNumber, baseDurationSeconds: 5, transition: s.transition }))), version: { increment: 1 } },
    });
    await tx.studioStory.update({
      where: { id: storyId },
      data: { currentMasterScriptId: created.id, styleBible: json(bible), status: story.status === "DRAFT" ? "AI_REVIEW" : story.status },
    });
    return created;
  });

  await assignStoryVoices(db, storyId, scenes);
  await snapshotVersion(db, { storyId, entityType: "MASTER_SCRIPT", entityId: script.id, version, snapshot: { title, scenes }, reason: provider === "editor" ? "Scene edited" : "Generated", createdByAdminId: script.createdByAdminId });
  await ctx.log(`Master script v${version}: ${scenes.length} scenes, ~${Math.round(estimated)}s (${provider})`);

  for (const languageCode of story.languages) {
    await enqueueStudioJob(db, { storyId, type: "GENERATE_LANGUAGE_SCRIPT", languageCode, payload: { masterScriptId: script.id }, dedupeKey: `lang-script:${script.id}:${languageCode}` });
  }
  return { masterScriptId: script.id, version, scenes: scenes.length, estimatedSeconds: Math.round(estimated) };
}

export async function assignStoryVoices(db: Db, storyId: string, scenes?: MasterScene[]) {
  const story = await db.studioStory.findUniqueOrThrow({ where: { id: storyId } });
  const characters = await db.studioCharacter.findMany({ where: { storyId } });
  const voices = await db.voice.findMany();
  const existing = await db.voiceAssignment.findMany({ where: { storyId }, include: { voice: true } });
  const sceneCharacters = scenes?.map((s) => s.characters) ?? (await currentMasterScript(db, storyId))?.scenes.map((s) => s.characters) ?? [];
  const decisions = assignVoices({
    characters,
    voices,
    narratorVoiceCode: story.narratorVoiceCode,
    sceneCharacters,
    locked: existing.filter((a) => a.lockedByAdmin).map((a) => ({ speakerKey: a.speakerKey, voiceCode: a.voice.code })),
  });
  const byCode = new Map(voices.map((v) => [v.code, v.id]));
  for (const d of decisions) {
    const voiceId = byCode.get(d.voiceCode);
    if (!voiceId) continue;
    const characterId = d.characterKey ? characters.find((c) => c.key === d.characterKey)?.id : null;
    await db.voiceAssignment.upsert({
      where: { storyId_speakerKey: { storyId, speakerKey: d.speakerKey } },
      create: { storyId, speakerKey: d.speakerKey, characterId, voiceId, reason: d.reason },
      update: existing.find((e) => e.speakerKey === d.speakerKey)?.lockedByAdmin ? {} : { voiceId, characterId, reason: d.reason },
    });
  }
  // Characters removed by re-analysis lose their (unlocked) assignment.
  const validKeys = new Set([NARRATOR_SPEAKER_KEY, ...characters.map((c) => c.key)]);
  await db.voiceAssignment.deleteMany({ where: { storyId, lockedByAdmin: false, speakerKey: { notIn: [...validKeys] } } });
}

// ---------------------------------------------------------------------------
// Stage 3: GENERATE_LANGUAGE_SCRIPT (one language)
// ---------------------------------------------------------------------------

async function stageLanguageScript(db: Db, ctx: JobContext) {
  const storyId = ctx.job.storyId;
  const lang = ctx.job.languageCode!;
  const payload = (ctx.job.payload ?? {}) as { force?: boolean; editedScenes?: LanguageScriptContent["scenes"] };
  const story = await db.studioStory.findUniqueOrThrow({ where: { id: storyId } });
  const master = await currentMasterScript(db, storyId);
  if (!master) throw new Error("No master script");
  const providers = await getStudioProviders(db);
  const characters = await db.studioCharacter.findMany({ where: { storyId } });
  const article = await latestArticle(db, storyId);
  const previous = await db.studioScript.findFirst({ where: { storyId, kind: "LANGUAGE", languageCode: lang }, orderBy: { version: "desc" } });
  const limits = formatLimits(story);

  let content: LanguageScriptContent;
  let lintFlags: LintFlag[];
  let estimatedSeconds: number;
  let provider: string;
  if (payload.editedScenes && previous) {
    // Editor changed lines in this language only: keep everything else, re-lint.
    const prevContent = previous.content as unknown as LanguageScriptContent;
    const edited = new Map(payload.editedScenes.map((s) => [s.sceneNumber, s]));
    content = { ...prevContent, scenes: prevContent.scenes.map((s) => (edited.has(s.sceneNumber) ? { ...s, ...edited.get(s.sceneNumber)!, edited: true } : s)) };
    const result = await generateLanguageScript(
      db,
      { title: master.content ? (master.content as { title: string }).title : story.title, masterLanguage: story.masterLanguage, targetLanguage: lang, scenes: master.scenes.map(sceneToMaster), previous: content, glossary: [], context: "", maxSeconds: limits.maxSeconds },
      providers.translation,
      null
    );
    content = result.content;
    lintFlags = result.lintFlags;
    estimatedSeconds = result.estimatedSeconds;
    provider = "editor";
  } else {
    const glossary = [
      ...characters.filter((c) => !c.anonymized && c.realName).map((c) => ({ term: c.realName!, rendering: (c.pronunciations as Record<string, string> | null)?.[lang] })),
      ...(((article.pronunciationGuide as { term: string; pronunciation: string; languageCode?: string }[] | null) ?? []).filter((p) => !p.languageCode || p.languageCode === lang).map((p) => ({ term: p.term, rendering: p.pronunciation }))),
    ];
    const result = await generateLanguageScript(
      db,
      {
        title: (master.content as { title?: string }).title ?? story.title,
        masterLanguage: story.masterLanguage,
        targetLanguage: lang,
        scenes: master.scenes.map(sceneToMaster),
        previous: payload.force ? null : ((previous?.content as unknown as LanguageScriptContent) ?? null),
        glossary,
        context: `${story.title}. Location: ${story.locationText ?? [story.district, story.state].filter(Boolean).join(", ")}. Sensitive topics: ${story.sensitiveTopics.join(", ") || "none"}.`,
        maxSeconds: limits.maxSeconds,
      },
      providers.translation,
      providers.llm
    );
    content = result.content;
    lintFlags = result.lintFlags;
    estimatedSeconds = result.estimatedSeconds;
    provider = result.provider;
    await ctx.log(`Localised ${result.localizedScenes} scene(s), reused ${result.reusedScenes} unchanged scene(s) via ${provider}`);
  }

  const version = (previous?.version ?? 0) + 1;
  const script = await db.$transaction(async (tx) => {
    await tx.studioScript.updateMany({ where: { storyId, kind: "LANGUAGE", languageCode: lang, status: { not: "SUPERSEDED" } }, data: { status: "SUPERSEDED" } });
    return tx.studioScript.create({
      data: {
        storyId,
        kind: "LANGUAGE",
        languageCode: lang,
        version,
        parentScriptId: master.id,
        provider,
        content: json(content),
        estimatedDurationSeconds: estimatedSeconds,
        lintFlags: json(lintFlags),
        contentHash: contentHash(content.scenes.map((s) => [s.sceneNumber, s.narratorText, s.dialogue.map((d) => d.text), s.onScreenText ?? ""])),
        createdByAdminId: ctx.job.requestedBy && ctx.job.requestedBy !== "pipeline" ? ctx.job.requestedBy : null,
      },
    });
  });
  await snapshotVersion(db, { storyId, entityType: "LANGUAGE_SCRIPT", entityId: script.id, languageCode: lang, version, snapshot: content, reason: provider === "editor" ? "Lines edited" : "Generated", createdByAdminId: script.createdByAdminId });
  const blocking = lintFlags.filter((f) => f.severity === "BLOCKING").length;
  await ctx.log(`${lang} script v${version}: ~${estimatedSeconds}s, ${lintFlags.length} lint flag(s) (${blocking} blocking)`, blocking ? lintFlags.filter((f) => f.severity === "BLOCKING") : undefined, blocking ? "warn" : "info");

  await maybeEnqueueAiReview(db, storyId);
  return { scriptId: script.id, version, estimatedSeconds, lintFlags: lintFlags.length };
}

async function maybeEnqueueAiReview(db: Db, storyId: string) {
  const story = await db.studioStory.findUniqueOrThrow({ where: { id: storyId } });
  if (!story.currentMasterScriptId) return;
  const scripts = await Promise.all(story.languages.map((l) => currentLanguageScript(db, storyId, l, story.currentMasterScriptId!)));
  if (scripts.some((s) => !s)) return;
  const key = contentHash(scripts.map((s) => s!.id));
  await enqueueStudioJob(db, { storyId, type: "AI_REVIEW", dedupeKey: `ai-review:${storyId}:${key}` });
}

// ---------------------------------------------------------------------------
// Stage 4: AI_REVIEW — text-level QC before an editor sees it
// ---------------------------------------------------------------------------

async function stageAiReview(db: Db, ctx: JobContext) {
  const storyId = ctx.job.storyId;
  const report = await buildQcReport(db, storyId, { includeMedia: false });
  const story = await db.studioStory.findUniqueOrThrow({ where: { id: storyId } });
  const master = await currentMasterScript(db, storyId);
  await db.studioScript.updateMany({ where: { storyId, status: "DRAFT", OR: [{ id: master?.id }, { parentScriptId: master?.id }] }, data: { status: "AI_REVIEWED" } });
  await db.studioStory.update({
    where: { id: storyId },
    data: {
      qcReport: json({ ...report, phase: "text" }),
      qcStatus: report.status,
      status: ["DRAFT", "AI_REVIEW", "ADMIN_REVIEW"].includes(story.status) ? "ADMIN_REVIEW" : story.status,
    },
  });
  await ctx.log(`AI review: ${report.status} with ${report.issues.length} issue(s); awaiting admin review`);
  return { status: report.status, issues: report.issues.length };
}

// ---------------------------------------------------------------------------
// After approval: media generation
// ---------------------------------------------------------------------------

/** Queues whatever media is missing for the current approved scripts; reuses everything else. */
export async function enqueueMediaGeneration(db: Db, storyId: string, requestedBy?: string) {
  const story = await db.studioStory.findUniqueOrThrow({ where: { id: storyId } });
  const master = await currentMasterScript(db, storyId);
  if (!master) throw new Error("No master script");
  if (story.productionMode === "CINEMATIC_25D") {
    // Cinematic: episode → shots → layered assets → 2.5D shot renders → master visual.
    await enqueueStudioJob(db, { storyId, type: "PLAN_SHOTS", requestedBy, dedupeKey: `plan:${master.id}:${PLANNER_VERSION}` });
  } else {
    for (const scene of master.scenes) {
      const ready = await db.sceneAsset.findFirst({ where: { sceneId: scene.id, status: "READY", promptHash: scene.visualHash } });
      if (!ready) await enqueueStudioJob(db, { storyId, type: "GENERATE_SCENE_VISUAL", sceneId: scene.id, requestedBy, dedupeKey: `visual:${scene.id}:${scene.visualHash}` });
    }
  }
  for (const lang of story.languages) {
    const script = await currentLanguageScript(db, storyId, lang, master.id);
    if (!script) continue;
    await enqueueStudioJob(db, { storyId, type: "GENERATE_VOICE", languageCode: lang, requestedBy, payload: { scriptId: script.id }, dedupeKey: `voice:${script.id}` });
  }
  await maybeEnqueueRenders(db, storyId);
}

// ---------------------------------------------------------------------------
// Stage 5: GENERATE_SCENE_VISUAL (one scene)
// ---------------------------------------------------------------------------

async function stageSceneVisual(db: Db, ctx: JobContext) {
  const scene = await db.studioScene.findUniqueOrThrow({ where: { id: ctx.job.sceneId! }, include: { visualPrompts: { orderBy: { createdAt: "desc" }, take: 1 } } });
  const prompt = scene.visualPrompts[0];
  if (!prompt) throw new Error("Scene has no visual prompt");
  const providers = await getStudioProviders(db);
  const story = await db.studioStory.findUniqueOrThrow({ where: { id: scene.storyId } });
  const output = resolveOutputSettings();
  const variation = Number((ctx.job.payload as { variation?: number } | null)?.variation ?? 0);
  const promptHash = variation ? contentHash(prompt.promptHash, variation) : prompt.promptHash;

  // Cache: any READY image made from the identical prompt (any story) is reused.
  const cached = await db.sceneAsset.findFirst({ where: { promptHash, kind: "IMAGE", status: "READY", storageKey: { not: null } }, orderBy: { createdAt: "desc" } });
  let imageKey: string;
  let isPlaceholder: boolean;
  let providerKey: string;
  if (cached?.storageKey && (await providers.storage.exists(cached.storageKey))) {
    imageKey = cached.storageKey;
    isPlaceholder = cached.isPlaceholder;
    providerKey = cached.provider;
    await ctx.log(`Reused cached image for prompt ${promptHash.slice(0, 8)}`);
  } else {
    const bible = story.styleBible as unknown as StyleBible | null;
    const seed = (bible?.seedBase ?? 1) + parseInt(promptHash.slice(0, 6), 16) + variation;
    const result = await providers.image.generate({
      prompt: prompt.prompt,
      negativePrompt: prompt.negativePrompt,
      width: output.width,
      height: output.height,
      seed,
      hints: { timeOfDay: scene.timeOfDay, setting: scene.location },
    });
    imageKey = `studio/${story.id}/scenes/${scene.sceneNumber}-${promptHash.slice(0, 12)}.${result.format}`;
    await providers.storage.put(imageKey, result.image, `image/${result.format}`);
    isPlaceholder = result.isPlaceholder;
    providerKey = providers.image.key;
    await ctx.log(`Generated image with ${providerKey}${isPlaceholder ? " (placeholder)" : ""}`);
  }
  await db.sceneAsset.updateMany({ where: { sceneId: scene.id, status: "READY" }, data: { status: "FAILED", failureReason: "superseded" } });
  await db.sceneAsset.create({
    data: { sceneId: scene.id, visualPromptId: prompt.id, kind: "IMAGE", provider: providerKey, storageKey: imageKey, url: providers.storage.url(imageKey), width: output.width, height: output.height, promptHash: scene.visualHash, status: "READY", isPlaceholder },
  });

  if (!providers.video.rendersInline) {
    const image = await providers.storage.read(imageKey);
    const clip = await providers.video.animate({ image, prompt: prompt.prompt, motion: cameraMotionFor(scene.cameraDirection), durationSeconds: Math.max(5, scene.durationSeconds), width: output.width, height: output.height, fps: output.fps });
    const clipKey = `studio/${story.id}/scenes/${scene.sceneNumber}-${promptHash.slice(0, 12)}.mp4`;
    await providers.storage.put(clipKey, clip.video, "video/mp4");
    await db.sceneAsset.create({
      data: { sceneId: scene.id, visualPromptId: prompt.id, kind: "ANIMATION", provider: providers.video.key, storageKey: clipKey, url: providers.storage.url(clipKey), width: output.width, height: output.height, durationSeconds: scene.durationSeconds, promptHash: scene.visualHash, status: "READY" },
    });
    await ctx.log(`Animated clip with ${providers.video.key}`);
  }
  await maybeEnqueueRenders(db, story.id);
  return { imageKey, isPlaceholder };
}

// ---------------------------------------------------------------------------
// Stage 6: GENERATE_VOICE (one language)
// ---------------------------------------------------------------------------

async function stageVoice(db: Db, ctx: JobContext) {
  const storyId = ctx.job.storyId;
  const lang = ctx.job.languageCode!;
  const force = !!(ctx.job.payload as { force?: boolean } | null)?.force;
  const master = await currentMasterScript(db, storyId);
  if (!master) throw new Error("No master script");
  const script = await currentLanguageScript(db, storyId, lang, master.id);
  if (!script) throw new Error(`No ${lang} script for the current master version`);
  const content = script.content as unknown as LanguageScriptContent;
  const providers = await getStudioProviders(db);
  const assignments = await db.voiceAssignment.findMany({ where: { storyId }, include: { voice: true } });
  const bySpeaker = new Map(assignments.map((a) => [a.speakerKey, a.voice]));
  const narrator = bySpeaker.get(NARRATOR_SPEAKER_KEY);
  if (!narrator) throw new Error("Narrator voice is not assigned");

  let synthesized = 0;
  let reused = 0;
  const fallbacks = new Set<string>();
  for (const scene of content.scenes) {
    const lines = [{ speakerKey: NARRATOR_SPEAKER_KEY, text: scene.narratorText }, ...scene.dialogue.map((d) => ({ speakerKey: d.speakerKey, text: d.text }))];
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      if (!line.text.trim()) continue;
      const voice = bySpeaker.get(line.speakerKey) ?? narrator;
      const voiceRef = { code: voice.code, gender: voice.gender, ageGroup: voice.ageGroup, tone: voice.tone, providerVoiceIds: (voice.providerVoiceIds ?? {}) as Record<string, unknown>, settings: (voice.settings ?? null) as Record<string, unknown> | null };
      const route = providers.voices.route(voiceRef, lang);
      if (route.isFallback) fallbacks.add(`${voice.code}: ${route.reason}`);
      const cacheHash = contentHash(route.provider.key, route.providerVoiceId, lang, line.text, voiceRef.settings ?? {}, force ? Date.now() : 0);

      const cached = force ? null : await db.audioSegment.findFirst({ where: { cacheHash }, orderBy: { createdAt: "desc" } });
      let storageKey: string;
      let durationSeconds: number;
      let isPlaceholder: boolean;
      if (cached && (await providers.storage.exists(cached.storageKey))) {
        storageKey = cached.storageKey;
        durationSeconds = cached.durationSeconds;
        isPlaceholder = cached.isPlaceholder;
        reused++;
      } else {
        const audio = await route.provider.synthesize({ text: line.text, languageCode: lang, voice: voiceRef, providerVoiceId: route.providerVoiceId });
        storageKey = `studio/${storyId}/audio/${lang}/${cacheHash}.${audio.format}`;
        await providers.storage.put(storageKey, audio.audio, audio.format === "mp3" ? "audio/mpeg" : "audio/wav");
        durationSeconds = Math.round(audio.durationSeconds * 1000) / 1000;
        isPlaceholder = audio.isPlaceholder;
        synthesized++;
      }
      await db.audioSegment.upsert({
        where: { scriptId_sceneNumber_lineIndex: { scriptId: script.id, sceneNumber: scene.sceneNumber, lineIndex } },
        create: { storyId, languageCode: lang, scriptId: script.id, sceneNumber: scene.sceneNumber, lineIndex, speakerKey: line.speakerKey, voiceCode: voice.code, provider: route.provider.key, providerVoiceId: route.providerVoiceId, text: line.text, storageKey, url: providers.storage.url(storageKey), durationSeconds, isPlaceholder, cacheHash },
        update: { speakerKey: line.speakerKey, voiceCode: voice.code, provider: route.provider.key, providerVoiceId: route.providerVoiceId, text: line.text, storageKey, url: providers.storage.url(storageKey), durationSeconds, isPlaceholder, cacheHash, startSeconds: null },
      });
    }
  }
  for (const f of fallbacks) await ctx.log(`No real voice available — using silent placeholder (${f})`, undefined, "warn");
  await ctx.log(`${lang}: synthesised ${synthesized} line(s), reused ${reused} cached line(s)`);
  await maybeEnqueueRenders(db, storyId);
  return { synthesized, reused, placeholders: fallbacks.size > 0 };
}

// ---------------------------------------------------------------------------
// Render readiness / fan-in
// ---------------------------------------------------------------------------

interface LanguageInputs {
  languageCode: string;
  script: StudioScript;
  content: LanguageScriptContent;
  segments: Awaited<ReturnType<Db["audioSegment"]["findMany"]>>;
}

async function gatherRenderInputs(db: Db, storyId: string) {
  const story = await db.studioStory.findUniqueOrThrow({ where: { id: storyId } });
  const master = await currentMasterScript(db, storyId);
  const project = await db.videoProject.findUnique({ where: { storyId } });
  if (!master || !project) return null;
  const assets = new Map<string, { image?: { storageKey: string; isPlaceholder: boolean; id: string }; clip?: { storageKey: string; id: string } }>();
  const cinematic = story.productionMode === "CINEMATIC_25D";
  let visualsReady: boolean;
  if (cinematic) {
    // One master visual (per-scene clips cut from the shot renders) shared by every language.
    const episode = await currentEpisode(db, storyId, master.id);
    const mv = episode?.masterVisualAssetId ? await db.asset.findUnique({ where: { id: episode.masterVisualAssetId } }) : null;
    const clips = ((mv?.metadata ?? {}) as { scenes?: { sceneNumber: number; storageKey: string }[] }).scenes ?? [];
    for (const scene of master.scenes) {
      const c = clips.find((x) => x.sceneNumber === scene.sceneNumber);
      assets.set(scene.id, { clip: c && mv ? { storageKey: c.storageKey, id: mv.id } : undefined });
    }
    visualsReady = !!mv && mv.status === "READY" && master.scenes.every((s) => assets.get(s.id)?.clip);
  } else {
    for (const scene of master.scenes) {
      const rows = await db.sceneAsset.findMany({ where: { sceneId: scene.id, status: "READY", promptHash: scene.visualHash }, orderBy: { createdAt: "desc" } });
      const image = rows.find((r) => r.kind === "IMAGE" && r.storageKey);
      const clip = rows.find((r) => r.kind === "ANIMATION" && r.storageKey);
      assets.set(scene.id, { image: image ? { storageKey: image.storageKey!, isPlaceholder: image.isPlaceholder, id: image.id } : undefined, clip: clip ? { storageKey: clip.storageKey!, id: clip.id } : undefined });
    }
    visualsReady = master.scenes.every((s) => assets.get(s.id)?.image);
  }
  const languages: LanguageInputs[] = [];
  for (const lang of story.languages) {
    const script = await currentLanguageScript(db, storyId, lang, master.id);
    if (!script) continue;
    const content = script.content as unknown as LanguageScriptContent;
    const segments = await db.audioSegment.findMany({ where: { scriptId: script.id }, orderBy: [{ sceneNumber: "asc" }, { lineIndex: "asc" }] });
    const expected = content.scenes.reduce((n, s) => n + (s.narratorText.trim() ? 1 : 0) + s.dialogue.filter((d) => d.text.trim()).length, 0);
    if (segments.length >= expected && expected > 0) languages.push({ languageCode: lang, script, content, segments });
  }
  return { story, master, project, assets, visualsReady, languages, cinematic };
}

function languageInputsHash(inputs: NonNullable<Awaited<ReturnType<typeof gatherRenderInputs>>>, langs: LanguageInputs[], musicKey: string | null) {
  return contentHash(
    inputs.cinematic ? CINEMATIC_RENDERER_VERSION : RENDERER_VERSION,
    inputs.master.id,
    inputs.master.scenes.map((s) => [s.sceneNumber, s.visualHash, s.cameraDirection, s.transition, inputs.assets.get(s.id)?.image?.storageKey, inputs.assets.get(s.id)?.clip?.storageKey]),
    langs.map((l) => [l.languageCode, l.content.scenes.map((s) => s.onScreenText ?? ""), l.segments.map((g) => [g.sceneNumber, g.lineIndex, g.cacheHash])]),
    [inputs.project.width, inputs.project.height, inputs.project.fps, inputs.project.burnSubtitles],
    musicKey
  );
}

async function pickMusic(db: Db, storyId: string, mood: string, minDurationSeconds: number) {
  const providers = await getStudioProviders(db);
  return providers.music.pick({ mood, minDurationSeconds, seed: parseInt(contentHash(storyId).slice(0, 6), 16) });
}

function storyMood(topics: string[]): string {
  if (topics.some((t) => ["death", "suicide", "dead_body", "graphic_violence"].includes(t))) return "somber";
  if (topics.length > 0) return "tense-subtle";
  return "neutral";
}

/** Fan-in: queue renders for languages whose inputs are complete, then QC when every render is done. */
export async function maybeEnqueueRenders(db: Db, storyId: string) {
  const mode = await db.studioStory.findUnique({ where: { id: storyId }, select: { productionMode: true } });
  if (mode?.productionMode === "CINEMATIC_25D") await advanceCinematic(db, storyId);
  const inputs = await gatherRenderInputs(db, storyId);
  if (!inputs || !["APPROVED", "RENDERED"].includes(inputs.story.status) || !inputs.visualsReady) return;
  const music = await pickMusic(db, storyId, storyMood(inputs.story.sensitiveTopics), 0);
  const musicKey = music?.storageKey ?? null;

  let allCurrent = inputs.languages.length === inputs.story.languages.length;
  const renderIds: string[] = [];
  for (const lang of inputs.languages) {
    const inputsHash = languageInputsHash(inputs, [lang], musicKey);
    // Prefer the current render, else the newest: a forced re-render shares its inputs hash with older versions.
    const done = await db.videoRender.findFirst({ where: { storyId, languageCode: lang.languageCode, inputsHash, status: "READY", kind: "SINGLE_LANGUAGE" }, orderBy: [{ isCurrent: "desc" }, { createdAt: "desc" }] });
    if (done) {
      if (!done.isCurrent) {
        await db.videoRender.updateMany({ where: { storyId, languageCode: lang.languageCode, kind: "SINGLE_LANGUAGE", isCurrent: true }, data: { isCurrent: false } });
        await db.videoRender.update({ where: { id: done.id }, data: { isCurrent: true } });
      }
      renderIds.push(done.id);
      continue;
    }
    allCurrent = false;
    await enqueueStudioJob(db, { storyId, type: "RENDER_LANGUAGE", languageCode: lang.languageCode, payload: { inputsHash }, dedupeKey: `render:${storyId}:${lang.languageCode}:${inputsHash}` });
  }
  if (inputs.project.multiAudioPackage && inputs.languages.length === inputs.story.languages.length && inputs.languages.length > 1) {
    const inputsHash = languageInputsHash(inputs, inputs.languages, musicKey);
    const done = await db.videoRender.findFirst({ where: { storyId, kind: "MULTI_AUDIO", inputsHash, status: "READY" }, orderBy: [{ isCurrent: "desc" }, { createdAt: "desc" }] });
    if (done) renderIds.push(done.id);
    else {
      allCurrent = false;
      await enqueueStudioJob(db, { storyId, type: "RENDER_PACKAGE", payload: { inputsHash }, dedupeKey: `package:${storyId}:${inputsHash}` });
    }
  }
  if (allCurrent && renderIds.length > 0) {
    await enqueueStudioJob(db, { storyId, type: "FINAL_QC", dedupeKey: `qc:${storyId}:${contentHash(renderIds.sort())}` });
  }
}

// ---------------------------------------------------------------------------
// Stage 7: RENDER_LANGUAGE / RENDER_PACKAGE
// ---------------------------------------------------------------------------

async function stageRender(db: Db, ctx: JobContext, packageMode: boolean) {
  const storyId = ctx.job.storyId;
  const inputs = await gatherRenderInputs(db, storyId);
  if (!inputs || !inputs.visualsReady) throw new Error("Render inputs are not ready (visuals or audio missing)");
  const providers = await getStudioProviders(db);
  const langs = packageMode ? inputs.languages : inputs.languages.filter((l) => l.languageCode === ctx.job.languageCode);
  if (langs.length === 0) throw new Error(`Audio for ${ctx.job.languageCode} is not ready`);
  const music = await pickMusic(db, storyId, storyMood(inputs.story.sensitiveTopics), 0);
  const inputsHash = (ctx.job.payload as { inputsHash?: string } | null)?.inputsHash ?? languageInputsHash(inputs, langs, music?.storageKey ?? null);
  const sceneNumbers = inputs.master.scenes.map((s) => s.sceneNumber);

  // Timelines: per-language pacing, or one shared master timeline for the package.
  const toSegInputs = (l: LanguageInputs): TimelineSegmentInput[] =>
    l.segments.map((g) => ({ sceneNumber: g.sceneNumber, lineIndex: g.lineIndex, speakerKey: g.speakerKey, durationSeconds: g.durationSeconds, text: g.text }));
  let timelines: LanguageTimeline[] = langs.map((l) => buildLanguageTimeline(l.languageCode, sceneNumbers, toSegInputs(l)));
  if (packageMode || inputs.cinematic) {
    // Cinematic: the picture is one master visual cut to the shared scene floors of every language.
    const all = inputs.cinematic ? inputs.languages : langs;
    const floors = commonSceneFloors(all.map((l) => buildLanguageTimeline(l.languageCode, sceneNumbers, toSegInputs(l))));
    timelines = langs.map((l) => buildLanguageTimeline(l.languageCode, sceneNumbers, toSegInputs(l), floors));
  }
  const over = timelines.find((t) => t.overLimit);
  if (over) throw new Error(`${over.languageCode} timeline is ${over.totalSeconds}s — over the ${MAX_VIDEO_SECONDS}s limit. Condense the script.`);
  const timeline = timelines[0];

  const version = (await db.videoRender.count({ where: { storyId, languageCode: packageMode ? null : langs[0].languageCode, kind: packageMode ? "MULTI_AUDIO" : "SINGLE_LANGUAGE" } })) + 1;
  const render = await db.videoRender.create({
    data: {
      projectId: inputs.project.id,
      storyId,
      languageCode: packageMode ? null : langs[0].languageCode,
      kind: packageMode ? "MULTI_AUDIO" : "SINGLE_LANGUAGE",
      version,
      status: "RENDERING",
      width: inputs.project.width,
      height: inputs.project.height,
      fps: inputs.project.fps,
      inputsHash,
      isCurrent: false,
    },
  });

  const suffix = packageMode ? "multi" : langs[0].languageCode;
  const baseKey = `studio/${storyId}/renders/v${version}-${suffix}`;
  const fileBase = `story_${storyId}_${suffix}`;
  const workDir = await mkdtemp(path.join(tmpdir(), "atma-studio-"));
  try {
    // Subtitles (from the exact approved script lines + real timings) per language.
    const langFiles = [];
    for (let i = 0; i < langs.length; i++) {
      const l = langs[i];
      const tl = timelines[i];
      const profile = getLanguageProfile(l.languageCode);
      const cues = buildSubtitleCues(tl.segments);
      const srt = cuesToSrt(cues);
      const vtt = cuesToVtt(cues);
      const ass = cuesToAss(cues, { fontName: profile.notoFont, width: inputs.project.width, height: inputs.project.height });
      const srtPath = path.join(workDir, `${l.languageCode}.srt`);
      const assPath = path.join(workDir, `${l.languageCode}.ass`);
      await writeFile(srtPath, srt);
      await writeFile(assPath, ass);
      for (const [format, body] of [["SRT", srt], ["VTT", vtt]] as const) {
        const key = `${baseKey}/story_${storyId}_${l.languageCode}.${format.toLowerCase()}`;
        await providers.storage.put(key, Buffer.from(body, "utf8"), format === "SRT" ? "application/x-subrip" : "text/vtt");
        await db.studioSubtitle.create({ data: { storyId, languageCode: l.languageCode, renderId: render.id, format, storageKey: key, url: providers.storage.url(key), cues: json(cues) } });
      }
      if (!packageMode) {
        for (const seg of tl.segments) {
          await db.audioSegment.update({ where: { scriptId_sceneNumber_lineIndex: { scriptId: l.script.id, sceneNumber: seg.sceneNumber, lineIndex: seg.lineIndex } }, data: { startSeconds: seg.startSeconds } });
        }
      }
      const segments = await Promise.all(
        tl.segments.map(async (seg) => {
          const row = l.segments.find((g) => g.sceneNumber === seg.sceneNumber && g.lineIndex === seg.lineIndex)!;
          return { ...seg, path: await providers.storage.materialize(row.storageKey) };
        })
      );
      langFiles.push({ languageCode: l.languageCode, iso6392: profile.iso6392, title: profile.nativeName, segments, srtPath, assPath });
    }

    // Visuals + ambience per scene (captions in the render's language; none in the package).
    const captionLang = packageMode ? null : langs[0];
    const sfxLibrary = await db.soundEffect.findMany({ where: { isActive: true } });
    const scenes: RenderScene[] = [];
    for (const scene of inputs.master.scenes) {
      const asset = inputs.assets.get(scene.id)!;
      const audioReq = (scene.audioRequirements as unknown as MasterScene["audioRequirements"]) ?? { ambient: "room-tone", sfx: [] };
      const ambience = sfxLibrary.find((s) => s.tag === audioReq.ambient);
      const sfx = [];
      for (const tag of audioReq.sfx ?? []) {
        const effect = sfxLibrary.find((s) => s.tag === tag);
        if (effect) sfx.push({ path: await providers.storage.materialize(effect.storageKey), offsetSeconds: 0.5 });
      }
      const caption = captionLang?.content.scenes.find((s) => s.sceneNumber === scene.sceneNumber)?.onScreenText;
      scenes.push({
        sceneNumber: scene.sceneNumber,
        imagePath: asset.clip ? undefined : await providers.storage.materialize(asset.image!.storageKey),
        clipPath: asset.clip ? await providers.storage.materialize(asset.clip.storageKey) : undefined,
        motion: cameraMotionFor(scene.cameraDirection),
        transition: scene.transition as Transition,
        caption,
        ambience: audioReq.ambient,
        ambienceLibraryPath: ambience ? await providers.storage.materialize(ambience.storageKey) : undefined,
        sfx,
      });
    }

    const outputPath = path.join(workDir, `${fileBase}.mp4`);
    const thumbnailPath = path.join(workDir, `${fileBase}.jpg`);
    let renderer: string;
    if (await isFfmpegAvailable()) {
      const result = await renderWithFfmpeg({
        workDir: path.join(workDir, "work"),
        width: inputs.project.width,
        height: inputs.project.height,
        fps: inputs.project.fps,
        scenes,
        timeline: timeline.scenes,
        totalSeconds: timeline.totalSeconds,
        languages: langFiles,
        captionFontFamily: captionLang ? getLanguageProfile(captionLang.languageCode).notoFont : "Noto Sans",
        labelText: inputs.cinematic ? undefined : ILLUSTRATION_LABEL,
        disclosure: inputs.cinematic ? { languageCode: packageMode ? inputs.story.masterLanguage : langs[0].languageCode } : undefined,
        musicPath: music ? await providers.storage.materialize(music.storageKey) : undefined,
        burnSubtitles: inputs.project.burnSubtitles && !packageMode,
        outputPath,
        thumbnailPath,
        onProgress: (m) => ctx.log(m),
      });
      renderer = inputs.cinematic ? CINEMATIC_RENDERER_VERSION : RENDERER_VERSION;
      if (!packageMode) {
        // Keep the separate tracks as independently editable audio files.
        const tracks = result.tracks[langs[0].languageCode];
        for (const [trackType, file] of Object.entries(tracks)) {
          const key = `${baseKey}/tracks/${langs[0].languageCode}_${trackType.toLowerCase()}.wav`;
          await providers.storage.put(key, await readFile(file), "audio/wav");
          await db.audioFile.create({ data: { storyId, languageCode: langs[0].languageCode, scriptId: langs[0].script.id, trackType: trackType as "NARRATION", provider: renderer, storageKey: key, url: providers.storage.url(key), durationSeconds: timeline.totalSeconds, inputsHash } });
        }
      }
    } else {
      // No ffmpeg on this host: write a manifest so the rest of the pipeline stays testable.
      renderer = "mock-manifest";
      await writeFile(outputPath, JSON.stringify({ note: "MOCK RENDER — ffmpeg is not installed on this worker.", timeline, scenes, languages: langFiles.map((l) => l.languageCode) }, null, 2));
      await writeFile(thumbnailPath, "");
      await ctx.log("ffmpeg not found — wrote a render manifest instead of an MP4", undefined, "warn");
    }

    const videoKey = `${baseKey}/${fileBase}.${renderer === "mock-manifest" ? "json" : "mp4"}`;
    const thumbKey = `${baseKey}/${fileBase}.jpg`;
    await providers.storage.put(videoKey, await readFile(outputPath), "video/mp4");
    await providers.storage.put(thumbKey, await readFile(thumbnailPath), "image/jpeg");

    await db.$transaction([
      db.videoRender.updateMany({ where: { storyId, languageCode: packageMode ? null : langs[0].languageCode, kind: packageMode ? "MULTI_AUDIO" : "SINGLE_LANGUAGE", isCurrent: true }, data: { isCurrent: false } }),
      db.videoRender.update({
        where: { id: render.id },
        data: { status: "READY", storageKey: videoKey, url: providers.storage.url(videoKey), thumbnailUrl: providers.storage.url(thumbKey), durationSeconds: timeline.totalSeconds, renderer, isCurrent: true },
      }),
    ]);
    await snapshotVersion(db, { storyId, entityType: "RENDER", entityId: render.id, languageCode: packageMode ? undefined : langs[0].languageCode, version, snapshot: { inputsHash, timeline: timeline.scenes, url: providers.storage.url(videoKey), renderer }, reason: "Rendered" });
    await ctx.log(`Rendered ${fileBase} v${version}: ${timeline.totalSeconds}s at ${inputs.project.width}x${inputs.project.height}@${inputs.project.fps}`);
  } catch (err) {
    await db.videoRender.update({ where: { id: render.id }, data: { status: "FAILED", failureReason: (err as Error).message.slice(0, 1000) } });
    throw err;
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }

  await maybeEnqueueRenders(db, storyId);
  return { renderId: render.id, durationSeconds: timeline.totalSeconds };
}

// ---------------------------------------------------------------------------
// Stage 8: FINAL_QC
// ---------------------------------------------------------------------------

export async function buildQcReport(db: Db, storyId: string, opts: { includeMedia: boolean }) {
  const story = await db.studioStory.findUniqueOrThrow({ where: { id: storyId } });
  const article = await latestArticle(db, storyId);
  const master = await currentMasterScript(db, storyId);
  if (!master) throw new Error("No master script");
  const characters = await db.studioCharacter.findMany({ where: { storyId } });
  const assignments = await db.voiceAssignment.findMany({ where: { storyId }, include: { voice: true } });

  const cinematic = story.productionMode === "CINEMATIC_25D";
  const masterScenes = [];
  for (const scene of master.scenes) {
    if (cinematic) {
      // Restricted scenes are directed with substitute visuals (no characters); shot QC enforces it.
      const shots = await db.studioShot.findMany({ where: { sceneId: scene.id } });
      masterScenes.push({
        sceneNumber: scene.sceneNumber,
        narratorText: scene.narratorText,
        dialogue: (scene.dialogue as unknown as DialogueLine[]) ?? [],
        safetyLevel: scene.safetyLevel,
        hasSubstituteVisual: scene.safetyLevel !== "RESTRICTED" || shots.every((s) => s.characterIds.length === 0),
        hasVisualAsset: opts.includeMedia ? shots.length > 0 && shots.every((s) => !!s.currentRenderId) : true,
        visualIsPlaceholder: false,
      });
      continue;
    }
    const prompt = await db.visualPrompt.findFirst({ where: { sceneId: scene.id }, orderBy: { createdAt: "desc" } });
    const asset = await db.sceneAsset.findFirst({ where: { sceneId: scene.id, status: "READY", kind: "IMAGE", promptHash: scene.visualHash } });
    masterScenes.push({
      sceneNumber: scene.sceneNumber,
      narratorText: scene.narratorText,
      dialogue: (scene.dialogue as unknown as DialogueLine[]) ?? [],
      safetyLevel: scene.safetyLevel,
      hasSubstituteVisual: !!prompt?.isSubstitute,
      hasVisualAsset: opts.includeMedia ? !!asset : true,
      visualIsPlaceholder: !!asset?.isPlaceholder,
    });
  }

  const languages = [];
  for (const lang of story.languages) {
    const script = await currentLanguageScript(db, storyId, lang, master.id);
    if (!script) {
      languages.push({ languageCode: lang, content: { title: "", languageCode: lang, scenes: [] }, lintFlags: [{ rule: "LANGUAGE_SCRIPT_MISSING", severity: "BLOCKING" as const }], segments: [] });
      continue;
    }
    const segments = opts.includeMedia ? await db.audioSegment.findMany({ where: { scriptId: script.id } }) : [];
    const render = opts.includeMedia ? await db.videoRender.findFirst({ where: { storyId, languageCode: lang, kind: "SINGLE_LANGUAGE", isCurrent: true, status: "READY" } }) : null;
    const timeline =
      opts.includeMedia && segments.length > 0
        ? buildLanguageTimeline(lang, master.scenes.map((s) => s.sceneNumber), segments.map((g) => ({ sceneNumber: g.sceneNumber, lineIndex: g.lineIndex, speakerKey: g.speakerKey, durationSeconds: g.durationSeconds, text: g.text })))
        : undefined;
    languages.push({
      languageCode: lang,
      content: script.content as unknown as LanguageScriptContent,
      lintFlags: (script.lintFlags as unknown as LintFlag[]) ?? [],
      timeline,
      segments: segments.map((g) => ({ sceneNumber: g.sceneNumber, lineIndex: g.lineIndex, speakerKey: g.speakerKey, voiceCode: g.voiceCode, startSeconds: g.startSeconds, durationSeconds: g.durationSeconds, isPlaceholder: g.isPlaceholder })),
      renderDurationSeconds: render?.durationSeconds ?? null,
    });
    if (opts.includeMedia && !render) languages[languages.length - 1].lintFlags = [...languages[languages.length - 1].lintFlags, { rule: "RENDER_MISSING", severity: "BLOCKING" }];
  }

  const report = runQualityCheck({
    articleText: article.cleanedText ?? article.rawText,
    extraAllowedNames: story.sourceName ? [story.sourceName] : [],
    masterLanguage: story.masterLanguage,
    allowReconstruction: story.allowDramatizedReconstruction,
    characters: characters.map((c) => ({ key: c.key, displayName: c.displayName, realName: c.realName, isRealPerson: c.isRealPerson, anonymized: c.anonymized })),
    masterScenes,
    voiceAssignments: Object.fromEntries(assignments.map((a) => [a.speakerKey, a.voice.code])),
    languages,
  });
  if (cinematic && opts.includeMedia) {
    // CAN_PUBLISH for cinematic stories: shot QC, placeholders, licences, master visual.
    const gate = await cinematicPublishGate(db, storyId);
    report.issues.push(...gate.issues);
    if (!gate.canPublish) {
      report.status = "NEEDS_REVIEW";
      report.checks.push({ name: "cinematic_can_publish", passed: false });
    } else report.checks.push({ name: "cinematic_can_publish", passed: true });
  }
  return report;
}

async function stageFinalQc(db: Db, ctx: JobContext) {
  const storyId = ctx.job.storyId;
  const report = await buildQcReport(db, storyId, { includeMedia: true });
  const story = await db.studioStory.update({
    where: { id: storyId },
    data: { qcReport: json({ ...report, phase: "final" }), qcStatus: report.status, status: "RENDERED" },
  });
  await ctx.log(`Final QC: ${report.status} (${report.issues.filter((i) => i.severity === "BLOCKING").length} blocking issue(s))`, report.issues.filter((i) => i.severity === "BLOCKING"));
  if (env.studio.autoPublishNonSensitive && !story.isSensitive && report.status === "PASSED") {
    await enqueueStudioJob(db, { storyId, type: "PUBLISH", payload: { auto: true }, dedupeKey: `auto-publish:${ctx.job.id}` });
    await ctx.log("Non-sensitive story passed QC — queued automatic publish");
  } else if (story.isSensitive) {
    await ctx.log("Sensitive story — will only be published by an administrator");
  }
  return { status: report.status, issues: report.issues.length };
}

// ---------------------------------------------------------------------------
// Stage 9: PUBLISH — into the app feed (VideoAsset rows on a MasterStory)
// ---------------------------------------------------------------------------

export async function publishStory(db: Db, storyId: string, opts: { adminUserId?: string; auto?: boolean }) {
  const story = await db.studioStory.findUniqueOrThrow({ where: { id: storyId } });
  if (story.status !== "RENDERED" && story.status !== "PUBLISHED") throw new Error(`Story must be RENDERED to publish (is ${story.status})`);
  if (opts.auto && story.isSensitive) throw new Error("Sensitive stories are never published automatically");
  const renders = await db.videoRender.findMany({ where: { storyId, kind: "SINGLE_LANGUAGE", isCurrent: true, status: "READY" } });
  if (renders.some((r) => r.renderer === "mock-manifest")) throw new Error("Cannot publish mock renders (ffmpeg was not available)");
  if (renders.length === 0) throw new Error("No renders to publish");
  if (story.productionMode === "CINEMATIC_25D") {
    const gate = await cinematicPublishGate(db, storyId);
    if (!gate.canPublish) throw new Error(`CAN_PUBLISH is false: ${gate.issues.filter((i) => i.severity === "BLOCKING").map((i) => i.message).slice(0, 5).join("; ")}`);
  }

  let masterStoryId = story.masterStoryId;
  if (!masterStoryId) {
    const { RuleBasedClassifier } = await import("../modules/classification/RuleBasedClassifier");
    const master = await currentMasterScript(db, storyId);
    const summary = master?.scenes.slice(1, 3).map((s) => s.narratorText).join(" ") ?? story.title;
    const classification = await new RuleBasedClassifier().classify({ headline: story.title, summary });
    const location = story.state ? await db.location.findFirst({ where: { state: story.state, district: story.district ?? undefined } }) : null;
    const characters = await db.studioCharacter.findMany({ where: { storyId } });
    const created = await db.masterStory.create({
      data: {
        masterStoryHash: `studio:${storyId}`,
        title: story.title,
        eventType: classification.primaryCategory === "NOT_RELEVANT" ? "OTHER_HUMAN_INTEREST" : classification.primaryCategory,
        locationId: location?.id,
        peopleInvolved: json(characters.map((c) => ({ name: c.displayName, role: c.role }))),
        relationships: json([]),
        whatHappened: summary,
        familyRelevanceScore: classification.familyRelevanceScore,
        suitabilityScore: 100,
        qualityScore: story.qcStatus === "PASSED" ? 100 : 70,
        pipelineStatus: "PUBLISHED",
      },
    });
    masterStoryId = created.id;
  } else {
    await db.masterStory.update({ where: { id: masterStoryId }, data: { pipelineStatus: "PUBLISHED" } });
  }

  const now = new Date();
  for (const r of renders) {
    await db.videoAsset.upsert({
      where: { masterStoryId_languageCode: { masterStoryId, languageCode: r.languageCode! } },
      create: { masterStoryId, languageCode: r.languageCode!, storageUrl: r.url, thumbnailUrl: r.thumbnailUrl, durationSeconds: Math.round(r.durationSeconds ?? 0), resolution: `${r.width}x${r.height}`, templateVersion: RENDERER_VERSION, renderStatus: "READY", publishedAt: now },
      update: { storageUrl: r.url, thumbnailUrl: r.thumbnailUrl, durationSeconds: Math.round(r.durationSeconds ?? 0), resolution: `${r.width}x${r.height}`, templateVersion: RENDERER_VERSION, renderStatus: "READY", publishedAt: now, failureReason: null },
    });
  }
  await db.studioStory.update({ where: { id: storyId }, data: { status: "PUBLISHED", publishedAt: now, masterStoryId } });
  if (story.productionMode === "CINEMATIC_25D") await db.studioShot.updateMany({ where: { storyId, currentRenderId: { not: null } }, data: { status: "PUBLISHED" } });
  return { masterStoryId, languages: renders.map((r) => r.languageCode) };
}

async function stagePublish(db: Db, ctx: JobContext) {
  const result = await publishStory(db, ctx.job.storyId, { auto: !!(ctx.job.payload as { auto?: boolean } | null)?.auto, adminUserId: ctx.job.requestedBy ?? undefined });
  await ctx.log(`Published ${result.languages.join(", ")} to the app feed`);
  return result;
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

export async function runStudioJob(db: Db, ctx: JobContext): Promise<unknown> {
  switch (ctx.job.type) {
    case "ANALYZE_ARTICLE":
      return stageAnalyze(db, ctx);
    case "GENERATE_MASTER_SCRIPT":
      return stageMasterScript(db, ctx);
    case "GENERATE_LANGUAGE_SCRIPT":
      return stageLanguageScript(db, ctx);
    case "AI_REVIEW":
      return stageAiReview(db, ctx);
    case "GENERATE_SCENE_VISUAL":
      return stageSceneVisual(db, ctx);
    case "GENERATE_VOICE":
      return stageVoice(db, ctx);
    case "RENDER_LANGUAGE":
      return stageRender(db, ctx, false);
    case "RENDER_PACKAGE":
      return stageRender(db, ctx, true);
    case "FINAL_QC":
      return stageFinalQc(db, ctx);
    case "PUBLISH":
      return stagePublish(db, ctx);
    case "PLAN_SHOTS":
      return stagePlanShots(db, ctx);
    case "GENERATE_LAYER_ASSET":
      return stageGenerateLayerAsset(db, ctx);
    case "GENERATE_MASK":
      return stageGenerateMask(db, ctx);
    case "GENERATE_DEPTH":
      return stageGenerateDepth(db, ctx);
    case "INPAINT_ASSET":
      return stageInpaintAsset(db, ctx);
    case "BUILD_SCENE_PACKAGE":
      return stageBuildScenePackage(db, ctx);
    case "RENDER_SHOT":
      return stageRenderShot(db, ctx, false);
    case "RENDER_SHOT_I2V":
      return stageRenderShot(db, ctx, true);
    case "SHOT_QC":
      return stageShotQc(db, ctx);
    case "ASSEMBLE_MASTER_VISUAL":
      return stageAssembleMasterVisual(db, ctx);
    default:
      throw new Error(`Unknown studio job type ${ctx.job.type}`);
  }
}
