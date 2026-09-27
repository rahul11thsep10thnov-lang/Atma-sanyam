import { PrismaClient, StudioFormat, VerificationStatus, Gender, AgeGroup } from "@prisma/client";
import { HttpError } from "../middleware/errorHandler";
import { logAdminAction } from "../lib/auditLog";
import { enqueueStudioJob, retryJob } from "./jobs/jobRunner";
import { clampTargetDuration, resolveOutputSettings } from "./config";
import { contentHash } from "./hashing";
import { isStudioLanguage } from "./language/languageProfiles";
import { estimateSceneSeconds } from "./content/durationPlanner";
import { ANIMATION_STYLES } from "./media/visualPromptBuilder";
import { NARRATOR_SPEAKER_KEY } from "./media/voiceCatalog";
import { assignStoryVoices, currentLanguageScript, currentMasterScript, enqueueMediaGeneration, publishStory } from "./StudioPipeline";
import { DialogueLine, LanguageScriptContent, MasterScene } from "./types";
import { snapshotVersion } from "./versioning";

export interface CreateStoryInput {
  title: string;
  articleText: string;
  sourceName?: string;
  sourceUrl?: string;
  locationText?: string;
  state?: string;
  district?: string;
  languages: string[];
  masterLanguage?: string;
  format?: StudioFormat;
  targetDurationSeconds?: number;
  animationStyle?: string;
  narratorVoiceCode?: string;
  contentWarnings?: string[];
  characterNotes?: string;
  sceneNotes?: string;
  pronunciationGuide?: { term: string; pronunciation: string; languageCode?: string }[];
  images?: { url: string; caption?: string }[];
  allowDramatizedReconstruction?: boolean;
  burnSubtitles?: boolean;
  multiAudioPackage?: boolean;
  resolution?: "720p" | "1080p";
  fps?: number;
}

const REVIEWABLE_AFTER_EDIT = new Set(["APPROVED", "RENDERED", "PUBLISHED"]);

/** Admin operations for the Video Studio. Every change is granular: only the affected unit is regenerated. */
export class StudioService {
  constructor(private readonly db: PrismaClient) {}

  private validateLanguages(languages: string[], masterLanguage: string) {
    const bad = [...languages, masterLanguage].filter((l) => !isStudioLanguage(l));
    if (bad.length) throw new HttpError(400, `Unsupported language(s): ${bad.join(", ")}`);
    if (languages.length === 0) throw new HttpError(400, "Select at least one output language");
  }

  private async reopenForReview(storyId: string, adminUserId: string, reason: string) {
    const story = await this.db.studioStory.findUniqueOrThrow({ where: { id: storyId } });
    if (REVIEWABLE_AFTER_EDIT.has(story.status)) {
      await this.db.studioStory.update({ where: { id: storyId }, data: { status: "ADMIN_REVIEW", qcStatus: "NOT_RUN" } });
      await logAdminAction(this.db, adminUserId, "STUDIO_REOPENED", "StudioStory", storyId, { reason, previousStatus: story.status });
    }
  }

  async createStory(input: CreateStoryInput, adminUserId: string) {
    const masterLanguage = input.masterLanguage ?? "en";
    const languages = [...new Set(input.languages)];
    this.validateLanguages(languages, masterLanguage);
    if (input.articleText.trim().length < 200) throw new HttpError(400, "Article text is too short to produce a factual video (min 200 characters).");
    const format = input.format ?? "SHORT";
    const animationStyle = input.animationStyle && ANIMATION_STYLES[input.animationStyle] ? input.animationStyle : "flat-2d-editorial";
    if (input.narratorVoiceCode && !(await this.db.voice.findUnique({ where: { code: input.narratorVoiceCode } }))) throw new HttpError(400, "Unknown narrator voice");

    const story = await this.db.studioStory.create({
      data: {
        title: input.title.trim(),
        format,
        targetDurationSeconds: clampTargetDuration(format, input.targetDurationSeconds),
        animationStyle,
        languages,
        masterLanguage,
        narratorVoiceCode: input.narratorVoiceCode ?? "VOICE_08",
        sourceName: input.sourceName,
        sourceUrl: input.sourceUrl,
        locationText: input.locationText,
        state: input.state,
        district: input.district,
        contentWarnings: input.contentWarnings ?? [],
        allowDramatizedReconstruction: !!input.allowDramatizedReconstruction,
        createdByAdminId: adminUserId,
        articles: {
          create: {
            version: 1,
            title: input.title.trim(),
            rawText: input.articleText,
            sourceName: input.sourceName,
            sourceUrl: input.sourceUrl,
            characterNotes: input.characterNotes,
            sceneNotes: input.sceneNotes,
            pronunciationGuide: input.pronunciationGuide ?? undefined,
            images: input.images ?? undefined,
            contentHash: contentHash(input.articleText),
            createdByAdminId: adminUserId,
          },
        },
      },
    });
    // Output settings live on the project from the start; the master script fills in its timeline.
    const output = resolveOutputSettings(input.resolution, input.fps);
    await this.db.videoProject.create({
      data: { storyId: story.id, masterScriptId: "", timeline: [], width: output.width, height: output.height, fps: output.fps, burnSubtitles: !!input.burnSubtitles, multiAudioPackage: !!input.multiAudioPackage },
    });
    await logAdminAction(this.db, adminUserId, "STUDIO_CREATE", "StudioStory", story.id, { title: story.title, languages });
    await enqueueStudioJob(this.db, { storyId: story.id, type: "ANALYZE_ARTICLE", requestedBy: adminUserId });
    return story;
  }

  /** "Send to Studio": builds the article from an automated-pipeline MasterStory and its latest script. */
  async importFromMasterStory(masterStoryId: string, opts: { languages: string[]; format?: StudioFormat }, adminUserId: string) {
    const ms = await this.db.masterStory.findUnique({
      where: { id: masterStoryId },
      include: { location: true, storySources: { include: { source: true } }, scripts: { where: { languageCode: "en" }, orderBy: { version: "desc" }, take: 1 } },
    });
    if (!ms) throw new HttpError(404, "Master story not found");
    const script = ms.scripts[0];
    const text = script
      ? [script.introduction, script.location, script.people, script.background, script.sequence, script.authorities, script.currentStatus, script.context].filter(Boolean).join("\n\n")
      : [ms.whatHappened, ms.background, ms.policeAction, ms.legalStatus, ms.currentStatus].filter(Boolean).join("\n\n");
    const sourceNames = [...new Set(ms.storySources.map((s) => s.source.name))];
    const story = await this.createStory(
      {
        title: ms.title,
        articleText: text,
        sourceName: sourceNames.join(", ") || undefined,
        sourceUrl: ms.storySources[0]?.sourceUrl,
        state: ms.location?.state,
        district: ms.location?.district ?? undefined,
        languages: opts.languages,
        format: opts.format,
      },
      adminUserId
    );
    await this.db.studioStory.update({ where: { id: story.id }, data: { masterStoryId } });
    return story;
  }

  async updateSettings(
    storyId: string,
    patch: Partial<Pick<CreateStoryInput, "title" | "languages" | "format" | "targetDurationSeconds" | "animationStyle" | "narratorVoiceCode" | "contentWarnings" | "allowDramatizedReconstruction" | "burnSubtitles" | "multiAudioPackage">> & { resolution?: "720p" | "1080p"; fps?: number },
    adminUserId: string
  ) {
    const story = await this.db.studioStory.findUniqueOrThrow({ where: { id: storyId } });
    const languages = patch.languages ? [...new Set(patch.languages)] : story.languages;
    this.validateLanguages(languages, story.masterLanguage);
    const format = patch.format ?? story.format;
    const updated = await this.db.studioStory.update({
      where: { id: storyId },
      data: {
        title: patch.title ?? undefined,
        languages,
        format,
        targetDurationSeconds: patch.targetDurationSeconds !== undefined || patch.format ? clampTargetDuration(format, patch.targetDurationSeconds ?? story.targetDurationSeconds) : undefined,
        animationStyle: patch.animationStyle && ANIMATION_STYLES[patch.animationStyle] ? patch.animationStyle : undefined,
        narratorVoiceCode: patch.narratorVoiceCode ?? undefined,
        contentWarnings: patch.contentWarnings ?? undefined,
        allowDramatizedReconstruction: patch.allowDramatizedReconstruction ?? undefined,
      },
    });
    const project = await this.db.videoProject.findUnique({ where: { storyId } });
    if (project && (patch.burnSubtitles !== undefined || patch.multiAudioPackage !== undefined || patch.resolution || patch.fps)) {
      const dims = patch.resolution ? (patch.resolution === "720p" ? { width: 1280, height: 720 } : { width: 1920, height: 1080 }) : {};
      const portrait = project.height > project.width;
      await this.db.videoProject.update({
        where: { storyId },
        data: {
          burnSubtitles: patch.burnSubtitles ?? undefined,
          multiAudioPackage: patch.multiAudioPackage ?? undefined,
          fps: patch.fps && [24, 25, 30].includes(patch.fps) ? patch.fps : undefined,
          ...("width" in dims ? (portrait ? { width: dims.height, height: dims.width } : dims) : {}),
        },
      });
    }
    await logAdminAction(this.db, adminUserId, "STUDIO_SETTINGS", "StudioStory", storyId, patch);

    if (patch.narratorVoiceCode && patch.narratorVoiceCode !== story.narratorVoiceCode) {
      await this.db.voiceAssignment.updateMany({ where: { storyId, speakerKey: NARRATOR_SPEAKER_KEY }, data: { lockedByAdmin: false } });
      await assignStoryVoices(this.db, storyId);
      await this.reopenForReview(storyId, adminUserId, "Narrator voice changed");
    }
    const added = languages.filter((l) => !story.languages.includes(l));
    if (added.length && story.currentMasterScriptId) {
      for (const languageCode of added) {
        await enqueueStudioJob(this.db, { storyId, type: "GENERATE_LANGUAGE_SCRIPT", languageCode, requestedBy: adminUserId, dedupeKey: `lang-script:${story.currentMasterScriptId}:${languageCode}` });
      }
      await this.reopenForReview(storyId, adminUserId, `Languages added: ${added.join(", ")}`);
    }
    return updated;
  }

  async updateArticle(storyId: string, patch: { title?: string; articleText?: string; characterNotes?: string; sceneNotes?: string; pronunciationGuide?: CreateStoryInput["pronunciationGuide"] }, adminUserId: string) {
    const latest = await this.db.studioArticle.findFirstOrThrow({ where: { storyId }, orderBy: { version: "desc" } });
    const rawText = patch.articleText ?? latest.rawText;
    const article = await this.db.studioArticle.create({
      data: {
        storyId,
        version: latest.version + 1,
        title: patch.title ?? latest.title,
        rawText,
        sourceName: latest.sourceName,
        sourceUrl: latest.sourceUrl,
        images: latest.images ?? undefined,
        characterNotes: patch.characterNotes ?? latest.characterNotes,
        sceneNotes: patch.sceneNotes ?? latest.sceneNotes,
        pronunciationGuide: patch.pronunciationGuide ?? latest.pronunciationGuide ?? undefined,
        contentHash: contentHash(rawText),
        createdByAdminId: adminUserId,
      },
    });
    await snapshotVersion(this.db, { storyId, entityType: "ARTICLE", entityId: article.id, version: article.version, snapshot: { title: article.title, rawText }, reason: "Article edited", createdByAdminId: adminUserId });
    await this.db.studioStory.update({ where: { id: storyId }, data: { status: "DRAFT", qcStatus: "NOT_RUN", title: patch.title ?? undefined } });
    await logAdminAction(this.db, adminUserId, "STUDIO_ARTICLE_EDIT", "StudioStory", storyId, { version: article.version });
    await enqueueStudioJob(this.db, { storyId, type: "ANALYZE_ARTICLE", requestedBy: adminUserId });
    return article;
  }

  async reanalyze(storyId: string, adminUserId: string) {
    await this.db.studioStory.update({ where: { id: storyId }, data: { status: "DRAFT", qcStatus: "NOT_RUN" } });
    return enqueueStudioJob(this.db, { storyId, type: "ANALYZE_ARTICLE", requestedBy: adminUserId });
  }

  async updateFact(storyId: string, factId: string, patch: { value?: string; verificationStatus?: VerificationStatus; isKeyFact?: boolean }, adminUserId: string) {
    const fact = await this.db.studioFact.findFirst({ where: { id: factId, storyId } });
    if (!fact) throw new HttpError(404, "Fact not found");
    const updated = await this.db.studioFact.update({ where: { id: factId }, data: { ...patch, adminEdited: true } });
    await logAdminAction(this.db, adminUserId, "STUDIO_FACT_EDIT", "StudioFact", factId, { before: { value: fact.value, status: fact.verificationStatus }, after: patch });
    return updated;
  }

  async updateCharacter(
    storyId: string,
    characterId: string,
    patch: { displayName?: string; role?: string; gender?: Gender; ageGroup?: AgeGroup; isOfficial?: boolean; anonymized?: boolean; appearance?: Record<string, string>; pronunciations?: Record<string, string> },
    adminUserId: string
  ) {
    const character = await this.db.studioCharacter.findFirst({ where: { id: characterId, storyId } });
    if (!character) throw new HttpError(404, "Character not found");
    if (character.isMinor && patch.anonymized === false) throw new HttpError(400, "Minors must stay anonymised");
    const updated = await this.db.studioCharacter.update({
      where: { id: characterId },
      data: { ...patch, realName: patch.anonymized ? null : undefined, adminEdited: true, appearance: patch.appearance ?? undefined, pronunciations: patch.pronunciations ?? undefined },
    });
    await assignStoryVoices(this.db, storyId);
    await logAdminAction(this.db, adminUserId, "STUDIO_CHARACTER_EDIT", "StudioCharacter", characterId, patch);
    return updated;
  }

  async setVoiceAssignment(storyId: string, speakerKey: string, voiceCode: string, adminUserId: string) {
    const voice = await this.db.voice.findUnique({ where: { code: voiceCode } });
    if (!voice || !voice.isActive) throw new HttpError(400, "Unknown or inactive voice");
    const story = await this.db.studioStory.findUniqueOrThrow({ where: { id: storyId } });
    const narrator = await this.db.voiceAssignment.findUnique({ where: { storyId_speakerKey: { storyId, speakerKey: NARRATOR_SPEAKER_KEY } }, include: { voice: true } });
    if (speakerKey !== NARRATOR_SPEAKER_KEY && narrator?.voice.code === voiceCode) throw new HttpError(400, "That voice is reserved for this story's narrator");
    const character = speakerKey === NARRATOR_SPEAKER_KEY ? null : await this.db.studioCharacter.findUnique({ where: { storyId_key: { storyId, key: speakerKey } } });
    if (speakerKey !== NARRATOR_SPEAKER_KEY && !character) throw new HttpError(404, "Character not found");
    await this.db.voiceAssignment.upsert({
      where: { storyId_speakerKey: { storyId, speakerKey } },
      create: { storyId, speakerKey, characterId: character?.id, voiceId: voice.id, lockedByAdmin: true, reason: "set by admin" },
      update: { voiceId: voice.id, lockedByAdmin: true, reason: "set by admin" },
    });
    if (speakerKey === NARRATOR_SPEAKER_KEY && story.narratorVoiceCode !== voiceCode) await this.db.studioStory.update({ where: { id: storyId }, data: { narratorVoiceCode: voiceCode } });
    await logAdminAction(this.db, adminUserId, "STUDIO_VOICE_ASSIGN", "StudioStory", storyId, { speakerKey, voiceCode });
    await this.reopenForReview(storyId, adminUserId, `Voice changed for ${speakerKey}`);
  }

  async regenerateMasterScript(storyId: string, adminUserId: string) {
    await this.reopenForReview(storyId, adminUserId, "Master script regenerated");
    await logAdminAction(this.db, adminUserId, "REGENERATE_SCRIPT", "StudioStory", storyId);
    return enqueueStudioJob(this.db, { storyId, type: "GENERATE_MASTER_SCRIPT", requestedBy: adminUserId });
  }

  /** Edit one master scene → new master version; other scenes (and their translations/visuals/audio) are reused. */
  async editScene(
    storyId: string,
    sceneId: string,
    patch: Partial<Pick<MasterScene, "narratorText" | "dialogue" | "onScreenText" | "cameraDirection" | "background" | "props" | "timeOfDay" | "transition" | "emotionalTone" | "location">>,
    adminUserId: string
  ) {
    const master = await currentMasterScript(this.db, storyId);
    if (!master) throw new HttpError(409, "No master script yet");
    const target = master.scenes.find((s) => s.id === sceneId);
    if (!target) throw new HttpError(404, "Scene not found in the current master script");
    const story = await this.db.studioStory.findUniqueOrThrow({ where: { id: storyId } });
    const scenes: MasterScene[] = master.scenes.map((s) => {
      const base: MasterScene = {
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
        audioRequirements: s.audioRequirements as unknown as MasterScene["audioRequirements"],
        contentRestrictions: s.contentRestrictions,
        transition: s.transition as MasterScene["transition"],
        onScreenText: s.onScreenText ?? undefined,
      };
      if (s.id !== sceneId) return base;
      const next = { ...base, ...patch };
      next.durationSeconds = Math.round(estimateSceneSeconds(next, story.masterLanguage) * 10) / 10;
      return next;
    });
    await this.reopenForReview(storyId, adminUserId, `Scene ${target.sceneNumber} edited`);
    await logAdminAction(this.db, adminUserId, "STUDIO_SCENE_EDIT", "StudioScene", sceneId, patch);
    return enqueueStudioJob(this.db, { storyId, type: "GENERATE_MASTER_SCRIPT", requestedBy: adminUserId, payload: { scenes } });
  }

  async regenerateSceneVisual(storyId: string, sceneId: string, adminUserId: string) {
    const scene = await this.db.studioScene.findFirst({ where: { id: sceneId, storyId } });
    if (!scene) throw new HttpError(404, "Scene not found");
    await logAdminAction(this.db, adminUserId, "STUDIO_REGENERATE_VISUAL", "StudioScene", sceneId);
    return enqueueStudioJob(this.db, { storyId, type: "GENERATE_SCENE_VISUAL", sceneId, requestedBy: adminUserId, payload: { variation: (Date.now() % 1_000_000) + 1 } });
  }

  async regenerateLanguageScript(storyId: string, languageCode: string, force: boolean, adminUserId: string) {
    await this.requireLanguage(storyId, languageCode);
    await this.reopenForReview(storyId, adminUserId, `${languageCode} script regenerated`);
    await logAdminAction(this.db, adminUserId, "STUDIO_REGENERATE_LANGUAGE", "StudioStory", storyId, { languageCode, force });
    return enqueueStudioJob(this.db, { storyId, type: "GENERATE_LANGUAGE_SCRIPT", languageCode, requestedBy: adminUserId, payload: { force } });
  }

  /** Edit one scene's lines in ONE language. No other language, visual or music is touched. */
  async editLanguageScene(storyId: string, languageCode: string, sceneNumber: number, patch: { narratorText?: string; dialogue?: string[]; onScreenText?: string }, adminUserId: string) {
    const master = await currentMasterScript(this.db, storyId);
    if (!master) throw new HttpError(409, "No master script yet");
    const script = await currentLanguageScript(this.db, storyId, languageCode, master.id);
    if (!script) throw new HttpError(404, `No ${languageCode} script yet`);
    const content = script.content as unknown as LanguageScriptContent;
    const scene = content.scenes.find((s) => s.sceneNumber === sceneNumber);
    if (!scene) throw new HttpError(404, "Scene not found");
    const edited = {
      ...scene,
      narratorText: patch.narratorText ?? scene.narratorText,
      dialogue: scene.dialogue.map((d, i) => ({ ...d, text: patch.dialogue?.[i] ?? d.text })),
      onScreenText: patch.onScreenText ?? scene.onScreenText,
    };
    await this.reopenForReview(storyId, adminUserId, `${languageCode} scene ${sceneNumber} edited`);
    await logAdminAction(this.db, adminUserId, "STUDIO_LANGUAGE_EDIT", "StudioScript", script.id, { sceneNumber, patch });
    return enqueueStudioJob(this.db, { storyId, type: "GENERATE_LANGUAGE_SCRIPT", languageCode, requestedBy: adminUserId, payload: { editedScenes: [edited] } });
  }

  async regenerateVoice(storyId: string, languageCode: string, force: boolean, adminUserId: string) {
    await this.requireLanguage(storyId, languageCode);
    await logAdminAction(this.db, adminUserId, "REGENERATE_AUDIO", "StudioStory", storyId, { languageCode, force });
    return enqueueStudioJob(this.db, { storyId, type: "GENERATE_VOICE", languageCode, requestedBy: adminUserId, payload: { force } });
  }

  async rerender(storyId: string, languageCode: string, adminUserId: string) {
    await this.requireLanguage(storyId, languageCode);
    await logAdminAction(this.db, adminUserId, "REGENERATE_VIDEO", "StudioStory", storyId, { languageCode });
    return enqueueStudioJob(this.db, { storyId, type: "RENDER_LANGUAGE", languageCode, requestedBy: adminUserId });
  }

  async submitForReview(storyId: string, adminUserId: string) {
    return enqueueStudioJob(this.db, { storyId, type: "AI_REVIEW", requestedBy: adminUserId });
  }

  async approve(storyId: string, adminUserId: string, notes?: string) {
    const story = await this.db.studioStory.findUniqueOrThrow({ where: { id: storyId } });
    if (story.status !== "ADMIN_REVIEW") throw new HttpError(409, `Only stories in ADMIN_REVIEW can be approved (this one is ${story.status})`);
    const master = await currentMasterScript(this.db, storyId);
    if (!master) throw new HttpError(409, "No master script");
    const missing = [];
    for (const l of story.languages) if (!(await currentLanguageScript(this.db, storyId, l, master.id))) missing.push(l);
    if (missing.length) throw new HttpError(409, `Language scripts still generating: ${missing.join(", ")}`);
    await this.db.studioScript.updateMany({ where: { storyId, OR: [{ id: master.id }, { parentScriptId: master.id }], status: { not: "SUPERSEDED" } }, data: { status: "APPROVED" } });
    await this.db.studioStory.update({ where: { id: storyId }, data: { status: "APPROVED", approvedAt: new Date(), approvedByAdminId: adminUserId, rejectionReason: null } });
    await logAdminAction(this.db, adminUserId, "APPROVE", "StudioStory", storyId, { notes });
    await enqueueMediaGeneration(this.db, storyId, adminUserId);
  }

  async reject(storyId: string, adminUserId: string, notes?: string) {
    await this.db.studioStory.update({ where: { id: storyId }, data: { status: "REJECTED", rejectionReason: notes ?? null } });
    await logAdminAction(this.db, adminUserId, "REJECT", "StudioStory", storyId, { notes });
  }

  async publish(storyId: string, adminUserId: string, overrideNote?: string) {
    const story = await this.db.studioStory.findUniqueOrThrow({ where: { id: storyId } });
    if (story.status !== "RENDERED" && story.status !== "PUBLISHED") throw new HttpError(409, `Story must be RENDERED before publishing (is ${story.status})`);
    if (story.qcStatus !== "PASSED" && !overrideNote?.trim()) {
      throw new HttpError(409, "Quality check did not pass. Fix the issues, or publish with an override note explaining why it is acceptable.");
    }
    try {
      const result = await publishStory(this.db, storyId, { adminUserId });
      await logAdminAction(this.db, adminUserId, "STUDIO_PUBLISH", "StudioStory", storyId, { overrideNote, qcStatus: story.qcStatus, sensitive: story.isSensitive, ...result });
      return result;
    } catch (err) {
      throw new HttpError(409, (err as Error).message);
    }
  }

  async retry(jobId: string, adminUserId: string) {
    const job = await this.db.generationJob.findUnique({ where: { id: jobId } });
    if (!job) throw new HttpError(404, "Job not found");
    if (job.status !== "FAILED") throw new HttpError(409, `Only failed jobs can be retried (this one is ${job.status})`);
    await logAdminAction(this.db, adminUserId, "STUDIO_RETRY_JOB", "GenerationJob", jobId, { type: job.type, languageCode: job.languageCode });
    return retryJob(this.db, jobId);
  }

  private async requireLanguage(storyId: string, languageCode: string) {
    const story = await this.db.studioStory.findUniqueOrThrow({ where: { id: storyId } });
    if (!story.languages.includes(languageCode)) throw new HttpError(400, `${languageCode} is not one of this story's languages`);
  }

  /** Everything the admin workspace needs in one payload. */
  async workspace(storyId: string) {
    const story = await this.db.studioStory.findUnique({ where: { id: storyId } });
    if (!story) throw new HttpError(404, "Story not found");
    const [article, facts, characters, assignments, project, jobs, versions, safety, voices] = await Promise.all([
      this.db.studioArticle.findFirst({ where: { storyId }, orderBy: { version: "desc" } }),
      this.db.studioFact.findMany({ where: { storyId }, orderBy: [{ isKeyFact: "desc" }, { type: "asc" }] }),
      this.db.studioCharacter.findMany({ where: { storyId }, orderBy: { key: "asc" } }),
      this.db.voiceAssignment.findMany({ where: { storyId }, include: { voice: { select: { code: true, label: true } } } }),
      this.db.videoProject.findUnique({ where: { storyId } }),
      this.db.generationJob.findMany({ where: { storyId }, orderBy: { createdAt: "desc" }, take: 80, include: { logs: { orderBy: { createdAt: "asc" }, take: 60 } } }),
      this.db.contentVersion.findMany({ where: { storyId }, orderBy: { createdAt: "desc" }, take: 60, select: { id: true, entityType: true, entityId: true, languageCode: true, version: true, reason: true, createdAt: true, createdByAdminId: true } }),
      this.db.contentSafetyReview.findMany({ where: { storyId }, orderBy: { createdAt: "desc" }, take: 60 }),
      this.db.voice.findMany({ where: { isActive: true }, orderBy: { code: "asc" }, select: { code: true, label: true, gender: true, ageGroup: true, tone: true } }),
    ]);
    const master = await currentMasterScript(this.db, storyId);
    const scenes = master
      ? await Promise.all(
          master.scenes.map(async (s) => ({
            ...s,
            visualPrompt: await this.db.visualPrompt.findFirst({ where: { sceneId: s.id }, orderBy: { createdAt: "desc" } }),
            asset: await this.db.sceneAsset.findFirst({ where: { sceneId: s.id, status: "READY", kind: "IMAGE" }, orderBy: { createdAt: "desc" } }),
          }))
        )
      : [];
    const languages = await Promise.all(
      story.languages.map(async (languageCode) => {
        const script = master ? await currentLanguageScript(this.db, storyId, languageCode, master.id) : null;
        const segments = script ? await this.db.audioSegment.findMany({ where: { scriptId: script.id }, orderBy: [{ sceneNumber: "asc" }, { lineIndex: "asc" }] }) : [];
        const render = await this.db.videoRender.findFirst({ where: { storyId, languageCode, kind: "SINGLE_LANGUAGE", isCurrent: true }, orderBy: { createdAt: "desc" } });
        const subtitles = render ? await this.db.studioSubtitle.findMany({ where: { renderId: render.id }, select: { format: true, url: true } }) : [];
        const tracks = render ? await this.db.audioFile.findMany({ where: { storyId, languageCode, inputsHash: render.inputsHash }, select: { trackType: true, url: true } }) : [];
        return { languageCode, script, segments, render, subtitles, tracks };
      })
    );
    const packageRender = await this.db.videoRender.findFirst({ where: { storyId, kind: "MULTI_AUDIO", isCurrent: true }, orderBy: { createdAt: "desc" } });
    return { story, article, facts, characters, assignments, project, master: master ? { ...master, scenes: undefined } : null, scenes, languages, packageRender, jobs, versions, safety, voices };
  }
}
