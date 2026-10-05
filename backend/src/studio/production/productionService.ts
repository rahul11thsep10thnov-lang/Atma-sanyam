import { createHash } from "node:crypto";
import { AiTask, AssetLifecycle, Prisma, PrismaClient } from "@prisma/client";
import { env } from "../../config/env";
import { HttpError } from "../../middleware/errorHandler";
import { logAdminAction } from "../../lib/auditLog";
import { cancelJob, enqueueStudioJob, retryJob } from "../jobs/jobRunner";
import { getStudioProviders } from "../providers/registry";
import { currentMasterScript } from "../StudioPipeline";
import { decodeImageBuffer } from "../engine25d/raster";
import { findRenderProfile, PREVIEW_RENDER_PROFILE_KEY, DEFAULT_RENDER_PROFILES } from "../engine25d/profiles";
import { loadSceneData } from "../engine25d/scene";
import { renderStillPng } from "../engine25d/shotRenderer";
import { sampleTimeline } from "../engine25d/timeline";
import { parseManifest } from "../engine25d/spec";
import { licenseVerdict, setModelOverride } from "../models/modelRegistry";
import { advanceCinematic, computePackage, currentEpisode } from "./cinematicPipeline";
import { buildManifest } from "./scenePackage";
import { manifestOverridesFor, ShotOverrides, shotOverridesSchema } from "./shotOverrides";
import { CompositionPlan } from "./visualCompositionPlanner";
import { LayerGenRequest } from "./assetLibrary";
import { storageKeys } from "./scenePackage";
import { productionMetrics } from "./metrics";
import { ShotQcReport } from "./shotQc";

const json = (v: unknown) => JSON.parse(JSON.stringify(v ?? null)) as Prisma.InputJsonValue;

// Preview stills render in the API process; cap them so editors can't starve request handling.
const MAX_CONCURRENT_PREVIEWS = 2;
let activePreviews = 0;

/**
 * Admin operations on the cinematic production: navigation (story → episode
 * → scene → shot), the Shot Inspector (preview, overrides, re-render),
 * asset library (approve, reject, regenerate, replace, inpaint), model
 * registry (enable, default, licence override), jobs and metrics.
 * Every mutating action is audited.
 */
export class ProductionService {
  constructor(private readonly db: PrismaClient) {}

  // ---------------- navigation ----------------

  async production(storyId: string) {
    const story = await this.db.studioStory.findUnique({ where: { id: storyId } });
    if (!story) throw new HttpError(404, "Story not found");
    const master = await currentMasterScript(this.db, storyId);
    const episode = master ? await currentEpisode(this.db, storyId, master.id) : null;
    if (!master || !episode) return { story: { id: story.id, title: story.title, productionMode: story.productionMode, status: story.status }, episode: null, scenes: [] };
    const shots = await this.db.studioShot.findMany({ where: { episodeId: episode.id }, include: { layers: { select: { assetId: true } } }, orderBy: { globalNumber: "asc" } });
    const renderIds = shots.map((s) => s.currentRenderId).filter((x): x is string => !!x);
    const renders = await this.db.shotRender.findMany({ where: { id: { in: renderIds } } });
    const assetIds = [...new Set(shots.flatMap((s) => s.layers.map((l) => l.assetId)).filter((x): x is string => !!x))];
    const assets = await this.db.asset.findMany({ where: { id: { in: assetIds } }, select: { id: true, isPlaceholder: true, status: true } });
    const mv = episode.masterVisualAssetId ? await this.db.asset.findUnique({ where: { id: episode.masterVisualAssetId } }) : null;
    return {
      story: { id: story.id, title: story.title, productionMode: story.productionMode, status: story.status },
      episode: { ...episode, masterVisualUrl: mv?.url ?? null, renderProfile: findRenderProfile(episode.renderProfileKey) },
      scenes: master.scenes
        .sort((a, b) => a.sceneNumber - b.sceneNumber)
        .map((sc) => ({
          id: sc.id,
          sceneNumber: sc.sceneNumber,
          location: sc.location,
          timeOfDay: sc.timeOfDay,
          safetyLevel: sc.safetyLevel,
          narratorText: sc.narratorText,
          shots: shots
            .filter((s) => s.sceneId === sc.id)
            .map((s) => {
              const r = renders.find((x) => x.id === s.currentRenderId);
              const qc = r?.qcReport as unknown as ShotQcReport | null;
              const layerAssets = assets.filter((a) => s.layers.some((l) => l.assetId === a.id));
              return {
                id: s.id,
                globalNumber: s.globalNumber,
                shotNumber: s.shotNumber,
                shotType: s.shotType,
                cameraMovement: s.cameraMovement,
                viewerSees: s.viewerSees,
                durationSeconds: s.durationSeconds,
                renderDurationSeconds: s.renderDurationSeconds,
                status: s.status,
                motionDecision: s.motionDecision,
                selectedRenderer: s.selectedRenderer,
                safetyLevel: s.safetyLevel,
                hasOverrides: !!s.overrides && Object.keys(s.overrides as object).length > 0,
                render: r ? { id: r.id, url: r.url, thumbnailUrl: r.thumbnailUrl, renderer: r.renderer, qcStatus: qc?.status ?? null } : null,
                placeholders: layerAssets.filter((a) => a.isPlaceholder && a.status !== "APPROVED").length,
              };
            }),
        })),
    };
  }

  async shot(shotId: string) {
    const shot = await this.db.studioShot.findUnique({ where: { id: shotId }, include: { layers: { orderBy: { zIndex: "asc" } }, scene: true, episode: true } });
    if (!shot) throw new HttpError(404, "Shot not found");
    const layers = [];
    for (const l of shot.layers) {
      const asset = l.assetId ? await this.db.asset.findUnique({ where: { id: l.assetId } }) : null;
      const version = asset?.currentVersionId ? await this.db.assetVersion.findUnique({ where: { id: asset.currentVersionId } }) : null;
      const depth = asset ? await this.db.asset.findFirst({ where: { sourceAssetId: asset.id, kind: "DEPTH", status: { in: ["READY", "APPROVED"] } }, orderBy: { updatedAt: "desc" } }) : null;
      const model = version ? await this.db.aiModel.findUnique({ where: { modelId: version.modelId } }) : null;
      layers.push({
        ...l,
        asset: asset ? { id: asset.id, kind: asset.kind, role: asset.role, name: asset.name, status: asset.status, isPlaceholder: asset.isPlaceholder, url: asset.url, width: asset.width, height: asset.height, hasAlpha: asset.hasAlpha, reuseKey: asset.reuseKey, failureReason: asset.failureReason, approvedAt: asset.approvedAt } : null,
        version: version ? { version: version.version, generator: version.generator, modelId: version.modelId, license: version.license, commercialUse: version.commercialUse, seed: version.seed, prompt: version.prompt, durationMs: version.durationMs, licenceVerdict: model ? licenseVerdict(model) : null } : null,
        depthUrl: depth?.url ?? null,
      });
    }
    const renders = await this.db.shotRender.findMany({ where: { shotId }, orderBy: { createdAt: "desc" }, take: 10 });
    const pkg = shot.currentPackageId ? await this.db.scenePackage.findUnique({ where: { id: shot.currentPackageId } }) : null;
    const jobs = await this.db.generationJob.findMany({ where: { OR: [{ shotId }, { assetId: { in: layers.map((l) => l.asset?.id).filter((x): x is string => !!x) } }] }, orderBy: { createdAt: "desc" }, take: 50 });
    const manifest = pkg ? parseManifest(pkg.manifest) : null;
    return {
      shot: { ...shot, layers: undefined },
      layers,
      package: pkg ? { id: pkg.id, version: pkg.version, contentHash: pkg.contentHash, storagePrefix: pkg.storagePrefix, issues: pkg.issues, createdAt: pkg.createdAt } : null,
      manifest,
      timeline: manifest ? sampleTimeline(manifest, 10) : null,
      renders,
      jobs,
      overridesSchemaHint: Object.keys(shotOverridesSchema.shape),
    };
  }

  // ---------------- shot inspector actions ----------------

  async updateShotOverrides(shotId: string, raw: unknown, adminUserId: string) {
    const overrides = shotOverridesSchema.parse(raw);
    const shot = await this.db.studioShot.findUnique({ where: { id: shotId } });
    if (!shot) throw new HttpError(404, "Shot not found");
    const comp = shot.composition as unknown as CompositionPlan;
    for (const k of Object.keys(overrides.layers ?? {})) if (!comp.layers.some((l) => l.key === k)) throw new HttpError(400, `Unknown layer ${k}`);
    if (overrides.focus?.focusLayerKey && !comp.layers.some((l) => l.key === overrides.focus!.focusLayerKey)) throw new HttpError(400, "Unknown focus layer");
    await this.db.studioShot.update({ where: { id: shotId }, data: { overrides: json(overrides) } });
    await logAdminAction(this.db, adminUserId, "SHOT_OVERRIDES", "StudioShot", shotId, overrides);
    await advanceCinematic(this.db, shot.storyId);
    return this.shot(shotId);
  }

  /** Renders one frame of the shot at preview size with (optionally unsaved) overrides — instant feedback for editors. */
  async previewFrame(shotId: string, opts: { t?: number; overrides?: unknown }) {
    if (activePreviews >= MAX_CONCURRENT_PREVIEWS) throw new HttpError(429, "Too many previews rendering — try again in a moment");
    activePreviews++;
    try {
      return await this.renderPreview(shotId, opts);
    } finally {
      activePreviews--;
    }
  }

  private async renderPreview(shotId: string, opts: { t?: number; overrides?: unknown }) {
    const shot = await this.db.studioShot.findUnique({ where: { id: shotId }, include: { episode: true } });
    if (!shot) throw new HttpError(404, "Shot not found");
    const profile = findRenderProfile(PREVIEW_RENDER_PROFILE_KEY);
    const base = findRenderProfile(shot.episode.renderProfileKey);
    const pkg = await computePackage(this.db, { ...shot, renderDurationSeconds: shot.renderDurationSeconds ?? shot.durationSeconds }, base);
    if (!pkg) throw new HttpError(409, "Shot assets are not ready yet");
    const overrides = opts.overrides !== undefined ? (shotOverridesSchema.parse(opts.overrides) as ShotOverrides) : shot.overrides;
    const comp = shot.composition as unknown as CompositionPlan;
    const manifest = buildManifest({ shotId: shot.id, storyId: shot.storyId, plan: comp, canvas: pkg.manifest.canvas, seed: shot.seed, assets: pkg.refs, overrides: manifestOverridesFor(overrides, comp) });
    const providers = await getStudioProviders(this.db);
    const scene = await loadSceneData(manifest, (k) => providers.storage.materialize(k), {});
    const frame = Math.round(Math.max(0, Math.min(manifest.canvas.durationSeconds, opts.t ?? manifest.canvas.durationSeconds * 0.4)) * profile.fps);
    return renderStillPng(scene, { width: profile.width, height: profile.height, fps: profile.fps }, frame);
  }

  async rerenderShot(shotId: string, adminUserId: string) {
    const shot = await this.db.studioShot.findUnique({ where: { id: shotId } });
    if (!shot) throw new HttpError(404, "Shot not found");
    if (!shot.currentPackageId) throw new HttpError(409, "Shot has no scene package yet");
    await logAdminAction(this.db, adminUserId, "SHOT_RERENDER", "StudioShot", shotId);
    return enqueueStudioJob(this.db, { storyId: shot.storyId, type: "RENDER_SHOT", shotId, episodeId: shot.episodeId, payload: { force: true }, requestedBy: adminUserId, dedupeKey: `render-force:${shotId}:${Date.now()}`, priority: 2 });
  }

  // ---------------- asset library ----------------

  async listAssets(filter: { role?: string; status?: string; placeholder?: boolean; storyId?: string; take?: number }) {
    return this.db.asset.findMany({
      where: {
        kind: { notIn: ["DEPTH", "MASK", "VIDEO"] },
        ...(filter.role ? { role: filter.role } : {}),
        ...(filter.status ? { status: filter.status as AssetLifecycle } : {}),
        ...(filter.placeholder !== undefined ? { isPlaceholder: filter.placeholder } : {}),
        ...(filter.storyId ? { OR: [{ storyId: filter.storyId }, { layers: { some: { shot: { storyId: filter.storyId } } } }] } : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: Math.min(500, filter.take ?? 200),
      include: { _count: { select: { layers: true } } },
    });
  }

  async approveAsset(assetId: string, adminUserId: string) {
    const a = await this.db.asset.findUnique({ where: { id: assetId } });
    if (!a) throw new HttpError(404, "Asset not found");
    if (a.status !== "READY" && a.status !== "APPROVED") throw new HttpError(409, `Only ready assets can be approved (is ${a.status})`);
    const updated = await this.db.asset.update({ where: { id: assetId }, data: { status: "APPROVED", approvedBy: adminUserId, approvedAt: new Date() } });
    await logAdminAction(this.db, adminUserId, "ASSET_APPROVE", "Asset", assetId, { placeholder: a.isPlaceholder, reuseKey: a.reuseKey });
    await this.advanceStoriesUsing(assetId);
    return updated;
  }

  async rejectAsset(assetId: string, adminUserId: string, reason: string) {
    const a = await this.db.asset.findUnique({ where: { id: assetId } });
    if (!a) throw new HttpError(404, "Asset not found");
    const updated = await this.db.asset.update({ where: { id: assetId }, data: { status: "REJECTED", failureReason: reason.slice(0, 500), approvedAt: null, approvedBy: null } });
    await logAdminAction(this.db, adminUserId, "ASSET_REJECT", "Asset", assetId, { reason });
    await this.advanceStoriesUsing(assetId); // layers re-resolve: a fresh asset is generated
    return updated;
  }

  /** New version of the shared asset (every shot using it updates), with a different seed. */
  async regenerateAsset(assetId: string, adminUserId: string, opts: { prompt?: string } = {}) {
    const a = await this.db.asset.findUnique({ where: { id: assetId } });
    if (!a) throw new HttpError(404, "Asset not found");
    const meta = (a.metadata ?? {}) as { request?: LayerGenRequest };
    if (!meta.request) throw new HttpError(409, "This asset was not generated from a request (uploaded or derived)");
    const versions = await this.db.assetVersion.count({ where: { assetId } });
    const request = { ...meta.request, seed: (meta.request.seed + 7919 * (versions + 1)) & 0x7fffffff, ...(opts.prompt ? { prompt: opts.prompt } : {}) };
    await this.db.asset.update({ where: { id: assetId }, data: { status: "REQUIRED", failureReason: null, approvedAt: null, approvedBy: null, metadata: json({ ...meta, request }) } });
    await this.db.asset.updateMany({ where: { sourceAssetId: assetId, kind: { in: ["DEPTH", "MASK"] } }, data: { status: "REJECTED" } });
    await logAdminAction(this.db, adminUserId, "ASSET_REGENERATE", "Asset", assetId, { seed: request.seed, promptChanged: !!opts.prompt });
    await this.advanceStoriesUsing(assetId);
    return this.db.asset.findUnique({ where: { id: assetId } });
  }

  /** Replaces an asset with an editor-supplied image (rights asserted by the uploader). */
  async replaceAsset(assetId: string, adminUserId: string, file: Buffer, rights: { license: string; commercialUse: boolean }) {
    const a = await this.db.asset.findUnique({ where: { id: assetId } });
    if (!a) throw new HttpError(404, "Asset not found");
    if (a.kind === "RIG") throw new HttpError(409, "Rigs cannot be replaced by a single image; regenerate instead");
    let img;
    try {
      img = await decodeImageBuffer(file);
    } catch {
      throw new HttpError(400, "Unsupported image");
    }
    let translucent = false;
    for (let i = 3; i < img.data.length; i += 4 * 97) if (img.data[i] < 0.98) translucent = true;
    const providers = await getStudioProviders(this.db);
    const version = (await this.db.assetVersion.count({ where: { assetId } })) + 1;
    const key = `${storageKeys.assetVersion(assetId, version)}/image.png`;
    await providers.storage.put(key, file, "image/png");
    const v = await this.db.assetVersion.create({ data: { assetId, version, storageKey: key, url: providers.storage.url(key), generator: "upload", modelId: "editor-upload", modelVersion: "1", license: rights.license, commercialUse: rights.commercialUse, seed: 0, prompt: "", negativePrompt: "", parameters: json({ uploadedBy: adminUserId }), references: json([]), contentHash: createHash("sha256").update(file).digest("hex").slice(0, 32) } });
    const needsMask = a.role !== "background" && !translucent;
    await this.db.asset.updateMany({ where: { sourceAssetId: assetId, kind: { in: ["DEPTH", "MASK"] } }, data: { status: "REJECTED" } });
    await this.db.asset.update({ where: { id: assetId }, data: { currentVersionId: v.id, storageKey: key, url: providers.storage.url(key), width: img.width, height: img.height, hasAlpha: translucent, isPlaceholder: false, status: needsMask ? "GENERATING" : "READY", approvedAt: null, approvedBy: null } });
    await logAdminAction(this.db, adminUserId, "ASSET_REPLACE", "Asset", assetId, { license: rights.license, commercialUse: rights.commercialUse, width: img.width, height: img.height });
    const story = await this.anyStoryUsing(assetId);
    if (needsMask && story) await enqueueStudioJob(this.db, { storyId: story, type: "GENERATE_MASK", assetId, dedupeKey: `mask:${assetId}:v${version}` });
    await this.advanceStoriesUsing(assetId);
    return this.db.asset.findUnique({ where: { id: assetId } });
  }

  async inpaintAsset(assetId: string, adminUserId: string, mask: Buffer, prompt?: string) {
    const a = await this.db.asset.findUnique({ where: { id: assetId } });
    if (!a?.storageKey) throw new HttpError(404, "Asset not found");
    const story = await this.anyStoryUsing(assetId);
    if (!story) throw new HttpError(409, "Asset is not used by any story");
    const providers = await getStudioProviders(this.db);
    const maskKey = `${storageKeys.assetVersion(assetId, 0)}/inpaint-mask-${Date.now()}.png`;
    await providers.storage.put(maskKey, mask, "image/png");
    await logAdminAction(this.db, adminUserId, "ASSET_INPAINT", "Asset", assetId, { prompt });
    return enqueueStudioJob(this.db, { storyId: story, type: "INPAINT_ASSET", assetId, payload: { maskStorageKey: maskKey, prompt }, requestedBy: adminUserId, dedupeKey: `inpaint:${assetId}:${maskKey}` });
  }

  private async anyStoryUsing(assetId: string): Promise<string | null> {
    const layer = await this.db.shotLayer.findFirst({ where: { assetId }, include: { shot: { select: { storyId: true } } } });
    return layer?.shot.storyId ?? null;
  }

  private async advanceStoriesUsing(assetId: string) {
    const layers = await this.db.shotLayer.findMany({ where: { assetId }, include: { shot: { select: { storyId: true } } } });
    for (const storyId of new Set(layers.map((l) => l.shot.storyId))) await advanceCinematic(this.db, storyId);
  }

  // ---------------- model registry ----------------

  async models() {
    const rows = await this.db.aiModel.findMany({ orderBy: [{ task: "asc" }, { provider: "asc" }, { modelId: "asc" }] });
    return rows.map((m) => ({ ...m, verdict: licenseVerdict(m) }));
  }

  async updateModel(modelId: string, patch: { enabled?: boolean; isDefault?: boolean; endpoint?: string | null; config?: Record<string, unknown> }, adminUserId: string) {
    const m = await this.db.aiModel.findUnique({ where: { modelId } });
    if (!m) throw new HttpError(404, "Model not found");
    // Enabling a licence-blocked model is allowed (previews may use it); production resolution skips it.
    if (patch.isDefault) await this.db.aiModel.updateMany({ where: { task: m.task as AiTask, provider: { not: "procedural" }, isDefault: true }, data: { isDefault: false } });
    const updated = await this.db.aiModel.update({ where: { modelId }, data: { enabled: patch.enabled, isDefault: patch.isDefault, endpoint: patch.endpoint === undefined ? undefined : patch.endpoint, config: patch.config === undefined ? undefined : json(patch.config) } });
    await logAdminAction(this.db, adminUserId, "AI_MODEL_UPDATE", "AiModel", m.id, { modelId, ...patch, licence: licenseVerdict(m).status });
    return { ...updated, verdict: licenseVerdict(updated) };
  }

  async overrideModel(modelId: string, input: { approved: boolean; reason: string }, admin: { adminUserId: string; label: string }) {
    const updated = await setModelOverride(this.db, modelId, { approved: input.approved, reason: input.reason, adminUserId: admin.adminUserId, adminName: admin.label });
    return { ...updated, verdict: licenseVerdict(updated) };
  }

  // ---------------- jobs, workers, metrics ----------------

  async jobs(filter: { queue?: string; status?: string; type?: string; storyId?: string; take?: number }) {
    return this.db.generationJob.findMany({
      where: { ...(filter.queue ? { queue: filter.queue } : {}), ...(filter.status ? { status: filter.status as never } : {}), ...(filter.type ? { type: filter.type as never } : {}), ...(filter.storyId ? { storyId: filter.storyId } : {}) },
      orderBy: { createdAt: "desc" },
      take: Math.min(500, filter.take ?? 200),
      include: { story: { select: { title: true } } },
    });
  }

  async cancel(jobId: string, adminUserId: string) {
    const job = await cancelJob(this.db, jobId, adminUserId);
    await logAdminAction(this.db, adminUserId, "JOB_CANCEL", "GenerationJob", jobId);
    return job;
  }

  async retry(jobId: string, adminUserId: string) {
    const job = await this.db.generationJob.findUnique({ where: { id: jobId } });
    if (!job) throw new HttpError(404, "Job not found");
    if (job.status !== "FAILED" && job.status !== "CANCELLED") throw new HttpError(409, `Only failed or cancelled jobs can be retried (is ${job.status})`);
    await logAdminAction(this.db, adminUserId, "JOB_RETRY", "GenerationJob", jobId);
    return retryJob(this.db, jobId);
  }

  metrics(sinceHours = 24) {
    return productionMetrics(this.db, { sinceHours, staleAfterSeconds: env.gpu.staleAfterSeconds });
  }

  renderProfiles() {
    return DEFAULT_RENDER_PROFILES;
  }
}
