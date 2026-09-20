import { PrismaClient } from "@prisma/client";
import { PrimaryCategoryKey } from "../data/categories";
import { CompositeClassifier } from "../modules/classification/CompositeClassifier";
import { getStoryExtractor } from "../modules/extraction";
import { DuplicateDetectionService } from "../modules/dedup/DuplicateDetectionService";
import { scoreSuitability } from "../modules/scoring/SuitabilityScorer";
import { scoreQuality } from "../modules/scoring/QualityScorer";
import { getScriptGenerator, StoryScriptSections } from "../modules/script-generation";
import { JournalisticSafetyService } from "../modules/safety/JournalisticSafetyService";
import { ContentModerationService } from "../modules/safety/ContentModerationService";
import { getTranslationService } from "../modules/translation";
import { getTtsProvider } from "../modules/tts";
import { generateSubtitleCues, cuesToVtt } from "../modules/subtitles/SubtitleGenerator";
import { getVideoRenderer } from "../modules/video-rendering";
import { saveBuffer, localPathFor } from "../lib/storage";
import { getThresholds } from "./thresholds";
import { logger } from "../lib/logger";
import { IngestionService } from "../modules/news-ingestion/IngestionService";
import { buildProviderRegistry } from "../modules/news-ingestion/registry";

const SOURCE_LANGUAGE = "en";

export class PipelineOrchestrator {
  private readonly classifier = new CompositeClassifier();
  private readonly extractor = getStoryExtractor();
  private readonly dedup: DuplicateDetectionService;
  private readonly scriptGenerator = getScriptGenerator();
  private readonly journalisticSafety = new JournalisticSafetyService();
  private readonly moderation = new ContentModerationService();
  private readonly translation = getTranslationService();
  private readonly tts = getTtsProvider();

  constructor(private readonly prisma: PrismaClient) {
    this.dedup = new DuplicateDetectionService(prisma);
  }

  // ---------------------------------------------------------------------
  // Stage 1: ingestion
  // ---------------------------------------------------------------------
  async ingest() {
    const providers = buildProviderRegistry();
    return new IngestionService(this.prisma).ingestFrom(providers);
  }

  // ---------------------------------------------------------------------
  // Stage 2: classification — the first fork in §44's decision tree
  // (IS IT FAMILY RELATED? NO -> DISCARD)
  // ---------------------------------------------------------------------
  async classifyArticle(rawArticleId: string): Promise<{ passed: boolean; category: PrimaryCategoryKey }> {
    const article = await this.prisma.rawArticle.findUniqueOrThrow({ where: { id: rawArticleId } });
    const thresholds = await getThresholds(this.prisma);

    const result = await this.classifier.classify({ headline: article.headline, summary: article.rawSummary });

    const passed = result.primaryCategory !== "NOT_RELEVANT" && result.familyRelevanceScore >= thresholds.minFamilyRelevanceScore;

    await this.prisma.rawArticle.update({
      where: { id: rawArticleId },
      data: {
        primaryCategory: result.primaryCategory,
        familyRelevanceScore: result.familyRelevanceScore,
        dedupStatus: passed ? "UNPROCESSED" : "DISCARDED_NOT_RELEVANT",
        rejectionReason: passed ? null : `Not family-relevant enough (score ${result.familyRelevanceScore}): ${result.reasoning}`,
      },
    });

    return { passed, category: result.primaryCategory };
  }

  // ---------------------------------------------------------------------
  // Stage 3: extraction + dedup + suitability/quality scoring — the
  // second and third forks in §44 (IS IT DUPLICATE? / IS THERE ENOUGH
  // INFORMATION FOR A 2+ MINUTE STORY?)
  // ---------------------------------------------------------------------
  async extractDedupAndScore(rawArticleId: string): Promise<{ masterStoryId: string; passedQuality: boolean; needsScriptGeneration: boolean }> {
    const article = await this.prisma.rawArticle.findUniqueOrThrow({
      where: { id: rawArticleId },
      include: { source: true },
    });
    const thresholds = await getThresholds(this.prisma);
    const category = article.primaryCategory ?? "OTHER_HUMAN_INTEREST";

    const extracted = await this.extractor.extract({ headline: article.headline, summary: article.rawSummary, category });
    const { masterStory, isNewMasterStory } = await this.dedup.findOrCreateMasterStory(extracted);

    await this.prisma.storySource.upsert({
      where: { masterStoryId_rawArticleId: { masterStoryId: masterStory.id, rawArticleId: article.id } },
      update: {},
      create: {
        masterStoryId: masterStory.id,
        rawArticleId: article.id,
        sourceId: article.sourceId,
        sourceUrl: article.url,
        publishedAt: article.publishedAt,
      },
    });

    await this.prisma.rawArticle.update({
      where: { id: article.id },
      data: { dedupStatus: isNewMasterStory ? "NEW_MASTER_STORY" : "MERGED_INTO_EXISTING" },
    });

    const attachedSources = await this.prisma.storySource.findMany({
      where: { masterStoryId: masterStory.id },
      include: { rawArticle: true, source: true },
    });

    const totalSourceTextLength = attachedSources.reduce((sum, s) => sum + s.rawArticle.rawSummary.length, 0);
    const suitability = scoreSuitability({ extracted, totalSourceTextLength, sourceCount: attachedSources.length });

    const averageSourceReliability =
      attachedSources.reduce((sum, s) => sum + s.source.reliabilityScore, 0) / Math.max(1, attachedSources.length);

    const quality = scoreQuality({
      familyRelevanceScore: Math.max(masterStory.familyRelevanceScore, article.familyRelevanceScore ?? 0),
      informationCompletenessScore: (extracted.presentElementCount / 9) * 100,
      sourceCount: attachedSources.length,
      hasPoliceOrLegalDevelopment: !!masterStory.policeAction || !!masterStory.legalStatus,
      hasCurrentStatusUpdate: !!masterStory.currentStatus,
      averageSourceReliability,
      videoSuitabilityScore: suitability.score,
    });

    const passedQuality = suitability.score >= thresholds.minVideoSuitabilityScore && quality.total >= thresholds.minQualityScore;

    // A merge into a story that has already moved past scoring (script
    // generated, under review, approved, or published) must never regress
    // its pipelineStatus back to QUALITY_CHECKED/REJECTED — that would
    // silently undo editorial progress every time a new outlet republishes
    // the same incident. Only pre-script statuses are safe to overwrite here.
    const PRE_SCRIPT_STATUSES = new Set(["COLLECTED", "AI_CLASSIFIED", "DUPLICATE_CHECKED", "QUALITY_CHECKED", "REJECTED"]);
    const canUpdateStatus = PRE_SCRIPT_STATUSES.has(masterStory.pipelineStatus);
    const needsScriptGeneration = passedQuality && (isNewMasterStory || canUpdateStatus);

    await this.prisma.masterStory.update({
      where: { id: masterStory.id },
      data: {
        familyRelevanceScore: Math.max(masterStory.familyRelevanceScore, article.familyRelevanceScore ?? 0),
        suitabilityScore: suitability.score,
        qualityScore: quality.total,
        ...(canUpdateStatus
          ? {
              pipelineStatus: passedQuality ? "QUALITY_CHECKED" : "REJECTED",
              rejectionReason: passedQuality
                ? null
                : `Below threshold — suitability ${suitability.score}/${thresholds.minVideoSuitabilityScore}, quality ${quality.total}/${thresholds.minQualityScore}. Missing: ${suitability.missingElements.join(", ") || "none"}.`,
            }
          : {}),
      },
    });

    await this.prisma.rawArticle.update({ where: { id: article.id }, data: { suitabilityScore: suitability.score } });

    logger.info(
      { masterStoryId: masterStory.id, suitability: suitability.score, quality: quality.total, passedQuality, needsScriptGeneration },
      "Extraction/dedup/scoring complete"
    );

    return { masterStoryId: masterStory.id, passedQuality, needsScriptGeneration };
  }

  // ---------------------------------------------------------------------
  // Stage 4: script generation + journalistic safety + moderation
  // ---------------------------------------------------------------------
  async generateScript(masterStoryId: string): Promise<{ storyScriptId: string; requiresHumanReview: boolean }> {
    const masterStory = await this.prisma.masterStory.findUniqueOrThrow({ where: { id: masterStoryId } });
    const sources = await this.prisma.storySource.findMany({ where: { masterStoryId }, include: { source: true } });
    const sourceNames = [...new Set(sources.map((s) => s.source.name))];

    const extracted = {
      title: masterStory.title,
      eventType: masterStory.eventType,
      eventDate: masterStory.eventDate,
      state: null,
      district: null,
      city: null,
      peopleInvolved: masterStory.peopleInvolved as unknown as { name: string; role: string }[],
      relationships: masterStory.relationships as unknown as { personA: string; personB: string; relationship: string }[],
      whatHappened: masterStory.whatHappened,
      background: masterStory.background,
      policeAction: masterStory.policeAction,
      legalStatus: masterStory.legalStatus,
      currentStatus: masterStory.currentStatus,
      presentElementCount: 0,
      presentElements: [],
    };

    const generated = await this.scriptGenerator.generate({ extracted, sourceNames });

    const safetyFlags = this.journalisticSafety.lint(generated.fullText);
    const moderationFlags = this.moderation.moderate(generated.fullText, masterStory.eventType);
    const allFlags = [...safetyFlags, ...moderationFlags];
    const hasBlocking = this.journalisticSafety.hasBlockingFlags(safetyFlags) || this.moderation.hasBlockingFlags(moderationFlags);

    const thresholds = await getThresholds(this.prisma);
    const isSensitive = ["FAMILY_MURDER", "FAMILY_CRIME", "DOMESTIC_CONFLICT", "FAMILY_KIDNAPPING", "FAMILY_MISSING_PERSON"].includes(
      masterStory.eventType
    );
    const canAutoPublish = thresholds.autoPublishEnabled && !isSensitive && !hasBlocking;

    const previousVersions = await this.prisma.storyScript.count({ where: { masterStoryId, languageCode: SOURCE_LANGUAGE } });

    const script = await this.prisma.storyScript.create({
      data: {
        masterStoryId,
        languageCode: SOURCE_LANGUAGE,
        version: previousVersions + 1,
        introduction: generated.sections.introduction,
        location: generated.sections.location,
        people: generated.sections.people,
        background: generated.sections.background,
        sequence: generated.sections.sequence,
        authorities: generated.sections.authorities,
        currentStatus: generated.sections.currentStatus,
        context: generated.sections.context,
        sourceAttribution: generated.sections.sourceAttribution,
        wordCount: generated.wordCount,
        estimatedDurationSeconds: generated.estimatedDurationSeconds,
        status: hasBlocking ? "DRAFT" : "SAFETY_CHECKED",
        safetyFlags: allFlags as unknown as object,
      },
    });

    await this.prisma.masterStory.update({
      where: { id: masterStoryId },
      data: {
        pipelineStatus: hasBlocking ? "SCRIPT_GENERATED" : canAutoPublish ? "APPROVED" : "PENDING_REVIEW",
        autoPublishEligible: canAutoPublish,
      },
    });

    return { storyScriptId: script.id, requiresHumanReview: !canAutoPublish };
  }

  // ---------------------------------------------------------------------
  // Admin actions
  // ---------------------------------------------------------------------
  async approve(masterStoryId: string, adminUserId: string, notes?: string) {
    await this.prisma.masterStory.update({ where: { id: masterStoryId }, data: { pipelineStatus: "APPROVED" } });
    await this.prisma.adminReview.create({ data: { masterStoryId, adminUserId, action: "APPROVE", notes } });
  }

  async reject(masterStoryId: string, adminUserId: string, notes?: string) {
    await this.prisma.masterStory.update({
      where: { id: masterStoryId },
      data: { pipelineStatus: "REJECTED", rejectionReason: notes ?? "Rejected by admin" },
    });
    await this.prisma.adminReview.create({ data: { masterStoryId, adminUserId, action: "REJECT", notes } });
  }

  // ---------------------------------------------------------------------
  // Stage 5: per-language publication — translation, TTS, subtitles, video
  // ---------------------------------------------------------------------
  async publishLanguage(masterStoryId: string, languageCode: string) {
    const masterStory = await this.prisma.masterStory.findUniqueOrThrow({ where: { id: masterStoryId }, include: { location: true } });
    if (masterStory.pipelineStatus !== "APPROVED" && masterStory.pipelineStatus !== "VIDEO_GENERATED" && masterStory.pipelineStatus !== "PUBLISHED") {
      throw new Error(`Story ${masterStoryId} is not APPROVED (status: ${masterStory.pipelineStatus})`);
    }

    const sourceScript = await this.prisma.storyScript.findFirstOrThrow({
      where: { masterStoryId, languageCode: SOURCE_LANGUAGE },
      orderBy: { version: "desc" },
    });
    const language = await this.prisma.language.findUniqueOrThrow({ where: { code: languageCode } });

    const sourceSections: StoryScriptSections = {
      introduction: sourceScript.introduction,
      location: sourceScript.location,
      people: sourceScript.people,
      background: sourceScript.background,
      sequence: sourceScript.sequence,
      authorities: sourceScript.authorities,
      currentStatus: sourceScript.currentStatus,
      context: sourceScript.context,
      sourceAttribution: sourceScript.sourceAttribution,
    };

    let localizedSections = sourceSections;
    let localizedTitle = masterStory.title;

    if (languageCode !== SOURCE_LANGUAGE) {
      const translated = await this.translation.translate({
        title: masterStory.title,
        summary: sourceScript.sequence,
        sections: sourceSections,
        targetLanguageCode: languageCode,
        targetLanguageName: language.englishName,
      });
      localizedSections = translated.localizedSections;
      localizedTitle = translated.localizedTitle;

      await this.prisma.storyTranslation.upsert({
        where: { masterStoryId_languageCode: { masterStoryId, languageCode } },
        update: { localizedTitle: translated.localizedTitle, localizedSummary: translated.localizedSummary, storyScriptId: sourceScript.id },
        create: {
          masterStoryId,
          languageCode,
          localizedTitle: translated.localizedTitle,
          localizedSummary: translated.localizedSummary,
          storyScriptId: sourceScript.id,
        },
      });
    }

    const fullNarrationText = Object.values(localizedSections).join(" ");
    const ttsResult = await this.tts.synthesize({ text: fullNarrationText, languageCode });

    await this.prisma.audioAsset.upsert({
      where: { storyScriptId_languageCode: { storyScriptId: sourceScript.id, languageCode } },
      update: { storageUrl: ttsResult.storageUrl, durationSeconds: ttsResult.durationSeconds, voiceId: ttsResult.voiceId, provider: ttsResult.provider },
      create: {
        storyScriptId: sourceScript.id,
        languageCode,
        storageUrl: ttsResult.storageUrl,
        durationSeconds: ttsResult.durationSeconds,
        voiceId: ttsResult.voiceId,
        provider: ttsResult.provider,
      },
    });

    const cues = generateSubtitleCues(fullNarrationText, ttsResult.durationSeconds);
    const vtt = cuesToVtt(cues);
    const subtitleKey = `subtitles/${masterStoryId}/${languageCode}.vtt`;
    const subtitleUrl = await saveBuffer(subtitleKey, Buffer.from(vtt));

    await this.prisma.subtitleAsset.upsert({
      where: { storyScriptId_languageCode_format: { storyScriptId: sourceScript.id, languageCode, format: "VTT" } },
      update: { storageUrl: subtitleUrl },
      create: { storyScriptId: sourceScript.id, languageCode, format: "VTT", storageUrl: subtitleUrl },
    });

    const locationLabel = [masterStory.location?.district, masterStory.location?.state].filter(Boolean).join(", ") || "India";
    const renderer = await getVideoRenderer();
    const videoResult = await renderer.render({
      title: localizedTitle,
      locationLabel,
      dateLabel: masterStory.eventDate ? masterStory.eventDate.toDateString() : "",
      sections: localizedSections,
      audioStoragePath: localPathFor(ttsResult.storageKey),
      audioDurationSeconds: ttsResult.durationSeconds,
      subtitleVttPath: localPathFor(subtitleKey),
      sourceAttribution: localizedSections.sourceAttribution,
      outputKey: `videos/${masterStoryId}/${languageCode}.mp4`,
    });

    await this.prisma.videoAsset.upsert({
      where: { masterStoryId_languageCode: { masterStoryId, languageCode } },
      update: {
        storageUrl: videoResult.storageUrl,
        thumbnailUrl: videoResult.thumbnailUrl,
        durationSeconds: videoResult.durationSeconds,
        resolution: videoResult.resolution,
        renderStatus: "READY",
        publishedAt: new Date(),
      },
      create: {
        masterStoryId,
        languageCode,
        storageUrl: videoResult.storageUrl,
        thumbnailUrl: videoResult.thumbnailUrl,
        durationSeconds: videoResult.durationSeconds,
        resolution: videoResult.resolution,
        renderStatus: "READY",
        publishedAt: new Date(),
      },
    });

    await this.prisma.masterStory.update({ where: { id: masterStoryId }, data: { pipelineStatus: "PUBLISHED" } });

    logger.info({ masterStoryId, languageCode }, "Published video for story/language");
  }
}
