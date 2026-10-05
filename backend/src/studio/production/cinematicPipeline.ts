import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { Asset, Prisma, PrismaClient, ProductionState, StudioCharacter, StudioEpisode, StudioScene, StudioShot, StudioStory } from "@prisma/client";
import { env } from "../../config/env";
import { JobContext, enqueueStudioJob } from "../jobs/jobRunner";
import { getStudioProviders } from "../providers/registry";
import { contentHash } from "../hashing";
import { AgeGroupKey, DialogueLine, GenderKey, QcIssue } from "../types";
import { buildLanguageTimeline, commonSceneFloors } from "../rendering/audioTimeline";
import { currentLanguageScript, currentMasterScript, maybeEnqueueRenders } from "../StudioPipeline";
import { findRenderProfile, profileForOutput, RenderProfileDef } from "../engine25d/profiles";
import { parseManifest, ScenePackageManifest } from "../engine25d/spec";
import { loadSceneData } from "../engine25d/scene";
import { ENGINE_VERSION, renderShotToFile, renderStillPng } from "../engine25d/shotRenderer";
import { LocalAiFactory, localAiConfigFromEnv } from "../localai/factory";
import { LocalAiError } from "../localai/types";
import { licenseVerdict } from "../models/modelRegistry";
import { directEpisode } from "./episodeDirector";
import { CompositionPlan, planComposition } from "./visualCompositionPlanner";
import { characterRefKey } from "./continuity";
import { DirectorCharacter, DirectorContext, SceneInput, ShotPlan } from "./types";
import { depthFor, effectiveReuseKey, isUnresolvedPlaceholder, LayerGenRequest, resolveLayerAsset, seedFor } from "./assetLibrary";
import { buildManifest, LayerAssetRef, packageHash, shotFileName, storageKeys } from "./scenePackage";
import { runShotQc, ShotQcReport } from "./shotQc";
import { manifestOverridesFor, rendererOverride } from "./shotOverrides";
import { getEnvironment } from "./library/environments";
import { getProp } from "./library/props";
import { resolveCharacterLook } from "./procedural/characterRig";

const execFileAsync = promisify(execFile);
type Db = PrismaClient;

/** Bump when directing/composition rules change in a way that should re-plan shots. */
export const PLANNER_VERSION = "planner-1";
const USABLE = ["READY", "APPROVED"] as const;

let factorySingleton: LocalAiFactory | null = null;
export function localAi(): LocalAiFactory {
  if (!factorySingleton) factorySingleton = new LocalAiFactory(localAiConfigFromEnv());
  return factorySingleton;
}
/** Tests inject a factory with mock backends. */
export function setLocalAiFactory(f: LocalAiFactory | null) {
  factorySingleton = f;
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export function normalizeTimeOfDay(t: string): SceneInput["timeOfDay"] {
  const s = (t ?? "").toLowerCase();
  if (/night|midnight/.test(s)) return "night";
  if (/evening|dusk|sunset|twilight/.test(s)) return "evening";
  if (/morning|dawn|sunrise/.test(s)) return "morning";
  if (/afternoon|noon|day/.test(s)) return "afternoon";
  return "unspecified";
}

export function sceneInputOf(s: StudioScene): SceneInput {
  return {
    id: s.id,
    sceneNumber: s.sceneNumber,
    durationSeconds: s.durationSeconds,
    location: s.location,
    timeOfDay: normalizeTimeOfDay(s.timeOfDay),
    characters: s.characters,
    narratorText: s.narratorText,
    dialogue: (s.dialogue as unknown as DialogueLine[]) ?? [],
    emotionalTone: s.emotionalTone,
    cameraDirection: s.cameraDirection,
    background: s.background,
    props: s.props,
    onScreenText: s.onScreenText,
    safetyLevel: s.safetyLevel,
    safetyReasons: s.safetyReasons,
    transition: s.transition,
  };
}

export function directorCharacter(c: StudioCharacter): DirectorCharacter {
  return {
    id: c.id,
    key: c.key,
    displayName: c.displayName,
    role: c.role,
    gender: c.gender as GenderKey,
    ageGroup: c.ageGroup as AgeGroupKey,
    isMinor: c.isMinor,
    isOfficial: c.isOfficial,
    anonymized: c.anonymized,
    speaks: c.speaks,
    appearance: (c.appearance as DirectorCharacter["appearance"]) ?? null,
  };
}

async function directorContext(db: Db, story: StudioStory, characters: StudioCharacter[]): Promise<DirectorContext> {
  let i2vAvailable = false;
  if (env.localAi.i2vEnabled) i2vAvailable = !!(await localAi().resolve(db, "VIDEO_GENERATION", "production").catch(() => null));
  const bible = story.styleBible as { styleKey?: string } | null;
  return {
    storyId: story.id,
    storyTitle: story.title,
    sensitiveTopics: story.sensitiveTopics,
    locationLabel: story.locationText ?? "",
    state: story.state,
    characters: characters.map(directorCharacter),
    i2vAvailable,
    styleKey: bible?.styleKey ? `graphic-novel-in-${bible.styleKey}` : "graphic-novel-in",
  };
}

function json(v: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(v ?? null)) as Prisma.InputJsonValue;
}

export async function currentEpisode(db: Db, storyId: string, masterScriptId: string): Promise<StudioEpisode | null> {
  return db.studioEpisode.findUnique({ where: { storyId_masterScriptId_episodeNumber: { storyId, masterScriptId, episodeNumber: 1 } } });
}

// ---------------------------------------------------------------------------
// PLAN_SHOTS: EpisodeDirector → ShotDirector → VisualCompositionPlanner
// ---------------------------------------------------------------------------

export async function stagePlanShots(db: Db, ctx: JobContext) {
  const storyId = ctx.job.storyId;
  const story = await db.studioStory.findUniqueOrThrow({ where: { id: storyId } });
  const master = await currentMasterScript(db, storyId);
  if (!master) throw new Error("No master script");
  const characters = await db.studioCharacter.findMany({ where: { storyId } });
  const dctx = await directorContext(db, story, characters);
  const scenes = [...master.scenes].sort((a, b) => a.sceneNumber - b.sceneNumber);
  const project = await db.videoProject.findUnique({ where: { storyId } });
  const episode = await db.studioEpisode.upsert({
    where: { storyId_masterScriptId_episodeNumber: { storyId, masterScriptId: master.id, episodeNumber: 1 } },
    create: { storyId, masterScriptId: master.id, episodeNumber: 1, title: story.title, status: "DRAFT", renderProfileKey: project ? profileForOutput(project.width, project.height, project.fps).key : undefined },
    update: {},
  });
  const profile = findRenderProfile(episode.renderProfileKey);
  const plan = await directEpisode(dctx, scenes.map(sceneInputOf));
  await db.studioEpisode.update({ where: { id: episode.id }, data: { title: plan.title, synopsis: plan.synopsis, emotionalArc: json(plan.emotionalArc), directorProvider: plan.provider, status: "PLANNED" } });

  // Continuity: one CharacterReference per drawable character (never minors).
  const charRefIds = new Map<string, string>();
  for (const c of characters) {
    if (c.isMinor) continue;
    const dc = directorCharacter(c);
    const key = characterRefKey(storyId, dc);
    const look = resolveCharacterLook({ key: c.key, gender: dc.gender, ageGroup: dc.ageGroup, role: c.role, isOfficial: c.isOfficial, appearance: dc.appearance });
    const ref = await db.characterReference.upsert({
      where: { key },
      create: { key, name: c.anonymized ? c.role : c.displayName, description: `${c.role}`, gender: c.gender, ageGroup: c.ageGroup, build: look.build, skinTone: look.skin, hair: look.hair, clothing: json({ outfit: look.outfit, primary: look.primary, secondary: look.secondary }), accessories: [look.spectacles ? "spectacles" : "", look.cap ? "cap" : ""].filter(Boolean), occupation: c.role, styleKey: dctx.styleKey, seed: seedFor(key), isGeneric: key.startsWith("generic:") },
      update: {},
    });
    charRefIds.set(c.key, ref.id);
    if (c.characterRefId !== ref.id) await db.studioCharacter.update({ where: { id: c.id }, data: { characterRefId: ref.id } });
  }

  const flat: { scene: StudioScene; shot: ShotPlan }[] = [];
  for (const sp of plan.scenes) {
    const scene = scenes.find((s) => s.sceneNumber === sp.sceneNumber)!;
    for (const shot of sp.shots) flat.push({ scene, shot });
  }
  const bible = story.styleBible as { seedBase?: number } | null;
  let planned = 0;
  let kept = 0;
  for (let i = 0; i < flat.length; i++) {
    const { scene, shot } = flat[i];
    const sceneInput = sceneInputOf(scene);
    const seed = seedFor(`${storyId}:${scene.sceneNumber}:${shot.shotNumber}`, bible?.seedBase ?? 0);
    const comp = planComposition({ shot, scene: sceneInput, ctx: dctx, canvas: { width: profile.width, height: profile.height, fps: profile.fps, aspectRatio: profile.aspectRatio }, seed, position: { firstShotOfEpisode: i === 0, lastShotOfEpisode: i === flat.length - 1 } });
    const planHash = contentHash(PLANNER_VERSION, profile.key, shot, comp);
    const env0 = getEnvironment(comp.locationCategory);
    const locRef = await db.locationReference.upsert({
      where: { key: comp.locationRefKey },
      create: { key: comp.locationRefKey, category: comp.locationCategory, name: shot.substitute ? `Substitute: ${shot.substitute.description}` : env0.label, description: env0.backgroundPrompt, region: story.state ?? "IN", timeOfDay: sceneInput.timeOfDay, styleKey: dctx.styleKey, seed: seedFor(comp.locationRefKey) },
      update: {},
    });
    const existing = await db.studioShot.findUnique({ where: { sceneId_shotNumber: { sceneId: scene.id, shotNumber: shot.shotNumber } } });
    if (existing && existing.planHash === planHash) {
      if (existing.globalNumber !== i + 1) await db.studioShot.update({ where: { id: existing.id }, data: { globalNumber: i + 1 } });
      kept++;
      continue;
    }
    const data = {
      storyId,
      episodeId: episode.id,
      sceneId: scene.id,
      shotNumber: shot.shotNumber,
      globalNumber: i + 1,
      shotType: shot.shotType,
      durationSeconds: shot.durationSeconds,
      renderDurationSeconds: null,
      aspectRatio: profile.aspectRatio,
      visualStyle: comp.style,
      viewerSees: shot.viewerSees,
      emotionalPurpose: shot.emotionalPurpose,
      cameraMovement: shot.cameraMovement,
      camera: json(comp.camera),
      composition: json(comp),
      locationRefId: locRef.id,
      characterIds: shot.characterKeys.map((k) => characters.find((c) => c.key === k)?.id).filter((x): x is string => !!x),
      characterRefIds: shot.characterKeys.map((k) => charRefIds.get(k)).filter((x): x is string => !!x),
      propRefIds: [] as string[],
      lightingProfile: json(comp.lighting),
      environmentProfile: json(comp.environment),
      animationProfile: json({ camera: comp.camera, layers: Object.fromEntries(comp.layers.filter((l) => l.motion || l.character).map((l) => [l.key, { motion: l.motion, character: l.character }])) }),
      focusProfile: json(comp.focus),
      effectsProfile: json(comp.effects),
      dialogue: json(shot.dialogue),
      narration: shot.narration,
      sfx: json([]),
      safetyLevel: scene.safetyLevel,
      seed,
      motionDecision: shot.motion.decision,
      motionReason: shot.motion.reason,
      motionConfidence: shot.motion.confidence,
      selectedRenderer: shot.motion.selectedRenderer,
      status: "PLANNED" as ProductionState,
      renderStatus: "PENDING" as const,
      planHash,
      currentPackageId: null,
      currentRenderId: null,
    };
    const row = existing ? await db.studioShot.update({ where: { id: existing.id }, data }) : await db.studioShot.create({ data });
    await db.shotLayer.deleteMany({ where: { shotId: row.id } });
    const propRefIds: string[] = [];
    for (const l of comp.layers) {
      let propRefId: string | undefined;
      if (l.propKey && l.propRefKey) {
        const prop = getProp(l.propKey);
        const pr = await db.propReference.upsert({ where: { key: l.propRefKey }, create: { key: l.propRefKey, name: prop?.name ?? l.propKey, description: prop?.prompt ?? l.prompt, category: prop?.placement ?? "ground", styleKey: comp.style, seed: seedFor(l.propRefKey) }, update: {} });
        propRefId = pr.id;
        propRefIds.push(pr.id);
      }
      await db.shotLayer.create({
        data: {
          shotId: row.id,
          layerKey: l.key,
          kind: l.kind,
          name: l.name,
          zIndex: l.zIndex,
          depth: l.depth,
          placement: json(l.placement),
          blend: l.blend,
          lightResponse: l.lightResponse,
          castsShadow: l.castsShadow,
          silhouette: l.silhouette,
          motion: json({ motion: l.motion ?? null, character: l.character ?? null }),
          characterId: l.characterKey ? characters.find((c) => c.key === l.characterKey)?.id : undefined,
          characterRefId: l.characterKey ? charRefIds.get(l.characterKey) : undefined,
          propRefId,
          expression: l.expression,
          pose: l.pose,
          prompt: l.prompt,
        },
      });
    }
    if (propRefIds.length) await db.studioShot.update({ where: { id: row.id }, data: { propRefIds } });
    planned++;
  }
  // Shots beyond the new plan (a scene now has fewer shots) are removed.
  for (const scene of scenes) {
    const count = flat.filter((f) => f.scene.id === scene.id).length;
    await db.studioShot.deleteMany({ where: { sceneId: scene.id, shotNumber: { gt: count } } });
    if (scene.episodeId !== episode.id) await db.studioScene.update({ where: { id: scene.id }, data: { episodeId: episode.id } });
  }
  await ctx.log(`Planned ${flat.length} shot(s) over ${scenes.length} scene(s): ${planned} new/changed, ${kept} unchanged`);
  await advanceCinematic(db, storyId);
  return { episodeId: episode.id, shots: flat.length, planned, kept };
}

// ---------------------------------------------------------------------------
// Durations: one master visual for every language (shared scene floors)
// ---------------------------------------------------------------------------

/** Per-scene duration shared by all languages, or null while any language's audio is incomplete. */
export async function audioFloors(db: Db, story: StudioStory, master: { id: string; scenes: StudioScene[] }): Promise<Record<number, number> | null> {
  const sceneNumbers = master.scenes.map((s) => s.sceneNumber).sort((a, b) => a - b);
  const timelines = [];
  for (const lang of story.languages) {
    const script = await currentLanguageScript(db, story.id, lang, master.id);
    if (!script) return null;
    const content = script.content as unknown as { scenes: { narratorText: string; dialogue: { text: string }[] }[] };
    const segments = await db.audioSegment.findMany({ where: { scriptId: script.id } });
    const expected = content.scenes.reduce((n, s) => n + (s.narratorText.trim() ? 1 : 0) + s.dialogue.filter((d) => d.text.trim()).length, 0);
    if (expected === 0 || segments.length < expected) return null;
    timelines.push(buildLanguageTimeline(lang, sceneNumbers, segments.map((g) => ({ sceneNumber: g.sceneNumber, lineIndex: g.lineIndex, speakerKey: g.speakerKey, durationSeconds: g.durationSeconds, text: g.text }))));
  }
  return timelines.length ? commonSceneFloors(timelines) : null;
}

/** Splits each scene's shared duration across its shots in whole frames (planned proportions). */
export function allocateShotDurations(planned: number[], sceneSeconds: number, fps: number): number[] {
  const frames = Math.max(planned.length, Math.round(sceneSeconds * fps));
  const total = planned.reduce((s, d) => s + d, 0) || planned.length;
  const out = planned.map((d) => Math.max(1, Math.round((d / total) * frames)));
  const diff = frames - out.reduce((s, f) => s + f, 0);
  out[out.length - 1] = Math.max(1, out[out.length - 1] + diff);
  return out.map((f) => f / fps);
}

async function applyRenderDurations(db: Db, shots: StudioShot[], scenes: StudioScene[], floors: Record<number, number>, fps: number) {
  for (const scene of scenes) {
    const ss = shots.filter((s) => s.sceneId === scene.id).sort((a, b) => a.shotNumber - b.shotNumber);
    if (!ss.length || floors[scene.sceneNumber] === undefined) continue;
    const durations = allocateShotDurations(ss.map((s) => s.durationSeconds), floors[scene.sceneNumber], fps);
    for (let i = 0; i < ss.length; i++) {
      if (Math.abs((ss[i].renderDurationSeconds ?? -1) - durations[i]) > 1e-6) {
        await db.studioShot.update({ where: { id: ss[i].id }, data: { renderDurationSeconds: durations[i] } });
        ss[i].renderDurationSeconds = durations[i];
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Scene packages
// ---------------------------------------------------------------------------

async function isVersionCleared(db: Db, asset: Asset): Promise<boolean> {
  if (!asset.currentVersionId) return true;
  const v = await db.assetVersion.findUnique({ where: { id: asset.currentVersionId } });
  if (!v) return true;
  const m = await db.aiModel.findUnique({ where: { modelId: v.modelId } });
  return m ? licenseVerdict(m).productionAllowed : v.commercialUse;
}

interface ComputedPackage {
  manifest: ScenePackageManifest;
  refs: Record<string, LayerAssetRef>;
  hash: string;
  provenance: Record<string, unknown>[];
}

/** Builds a shot's manifest from its plan + ready assets (null if any asset is missing). */
export async function computePackage(db: Db, shot: StudioShot, profile: RenderProfileDef): Promise<ComputedPackage | null> {
  if (shot.renderDurationSeconds == null) return null;
  const comp = shot.composition as unknown as CompositionPlan;
  const layers = await db.shotLayer.findMany({ where: { shotId: shot.id } });
  const refs: Record<string, LayerAssetRef> = {};
  const provenance: Record<string, unknown>[] = [];
  for (const l of comp.layers) {
    const row = layers.find((x) => x.layerKey === l.key);
    if (!row?.assetId) return null;
    const a = await db.asset.findUnique({ where: { id: row.assetId } });
    if (!a || !(USABLE as readonly string[]).includes(a.status) || !a.storageKey) return null;
    const v = a.currentVersionId ? await db.assetVersion.findUnique({ where: { id: a.currentVersionId } }) : null;
    let depthPath: string | undefined;
    let depthHash = "";
    if (l.assetRole === "background") {
      const d = await depthFor(db, a);
      if (!d?.storageKey) return null;
      depthPath = d.storageKey;
      depthHash = d.updatedAt.toISOString();
    }
    refs[l.key] = { kind: a.kind === "RIG" ? "rig" : "image", path: a.storageKey, depthPath, width: a.width ?? l.pixelSize.width, height: a.height ?? l.pixelSize.height, placeholder: a.isPlaceholder && a.status !== "APPROVED", assetId: a.id, contentHash: `${v?.contentHash ?? a.updatedAt.toISOString()}:${depthHash}` };
    provenance.push({ layer: l.key, assetId: a.id, version: v?.version ?? null, generator: v?.generator ?? null, modelId: v?.modelId ?? null, license: v?.license ?? null, commercialUse: v?.commercialUse ?? null, placeholder: a.isPlaceholder, approved: a.status === "APPROVED" });
  }
  const manifest = buildManifest({
    shotId: shot.id,
    storyId: shot.storyId,
    plan: comp,
    canvas: { width: profile.width, height: profile.height, fps: profile.fps, durationSeconds: shot.renderDurationSeconds, aspectRatio: profile.aspectRatio },
    seed: shot.seed,
    assets: refs,
    overrides: manifestOverridesFor(shot.overrides, comp),
  });
  return { manifest, refs, hash: packageHash(manifest, refs, ENGINE_VERSION, profile), provenance };
}

export async function stageBuildScenePackage(db: Db, ctx: JobContext) {
  const shot = await db.studioShot.findUniqueOrThrow({ where: { id: ctx.job.shotId! }, include: { episode: true } });
  const profile = findRenderProfile(shot.episode.renderProfileKey);
  const pkg = await computePackage(db, shot, profile);
  if (!pkg) throw new Error("Scene package inputs are not ready (assets or render duration missing)");
  const latest = await db.scenePackage.findFirst({ where: { shotId: shot.id }, orderBy: { version: "desc" } });
  if (latest?.contentHash === pkg.hash) {
    await db.studioShot.update({ where: { id: shot.id }, data: { currentPackageId: latest.id, status: "SHOT_READY" } });
    await advanceCinematic(db, shot.storyId);
    return { packageId: latest.id, reused: true };
  }
  const version = (latest?.version ?? 0) + 1;
  const prefix = storageKeys.package(shot.storyId, shot.id, version);
  const providers = await getStudioProviders(db);
  await providers.storage.put(`${prefix}/manifest.json`, Buffer.from(JSON.stringify(pkg.manifest, null, 2)), "application/json");
  await providers.storage.put(`${prefix}/package.json`, Buffer.from(JSON.stringify({ shotId: shot.id, version, engine: ENGINE_VERSION, contentHash: pkg.hash, layers: pkg.provenance }, null, 2)), "application/json");
  const placeholders = pkg.manifest.layers.filter((l) => l.source.placeholder).map((l) => l.key);
  const row = await db.scenePackage.create({ data: { shotId: shot.id, version, manifest: json(pkg.manifest), storagePrefix: prefix, contentHash: pkg.hash, status: "READY", issues: json({ unresolvedPlaceholders: placeholders }) } });
  await db.studioShot.update({ where: { id: shot.id }, data: { currentPackageId: row.id, status: "SHOT_READY" } });
  await ctx.log(`Scene package v${version} (${pkg.manifest.layers.length} layers${placeholders.length ? `, placeholders: ${placeholders.join(", ")}` : ""})`);
  await advanceCinematic(db, shot.storyId);
  return { packageId: row.id, version };
}

// ---------------------------------------------------------------------------
// Asset generation (local AI via the model registry; procedural fallback)
// ---------------------------------------------------------------------------

async function resolveModelFor(db: Db, task: "IMAGE_GENERATION" | "SEGMENTATION" | "DEPTH" | "INPAINTING" | "VIDEO_GENERATION") {
  const f = localAi();
  return (await f.resolve(db, task, "production")) ?? (task === "VIDEO_GENERATION" ? null : await f.resolve(db, task, "preview"));
}

function sha(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex").slice(0, 32);
}

export async function stageGenerateLayerAsset(db: Db, ctx: JobContext) {
  const asset = await db.asset.findUniqueOrThrow({ where: { id: ctx.job.assetId! } });
  if ((USABLE as readonly string[]).includes(asset.status)) return { skipped: "already ready" };
  const meta = (asset.metadata ?? {}) as { request?: LayerGenRequest };
  const req = meta.request;
  if (!req) throw new Error(`Asset ${asset.id} has no generation request`);
  await db.asset.update({ where: { id: asset.id }, data: { status: "GENERATING", failureReason: null } });
  try {
    const resolved = await resolveModelFor(db, "IMAGE_GENERATION");
    if (!resolved) throw new Error("No enabled image model (not even the procedural fallback)");
    const f = localAi();
    await ctx.setExecution({ provider: resolved.model.provider, model: resolved.model.modelId });
    if (resolved.skipped.length) await ctx.log(`Skipped image models: ${resolved.skipped.map((s) => `${s.modelId} (${s.reason})`).join("; ")}`, undefined, "warn");
    const providers = await getStudioProviders(db);
    const references = [];
    for (const r of req.references ?? []) references.push({ kind: r.kind, path: await providers.storage.materialize(r.storageKey) });
    const out = await f.image(resolved.model).generateSceneAsset({ ...req, references, jobId: ctx.job.id, signal: ctx.signal }, resolved.model);
    const version = (await db.assetVersion.count({ where: { assetId: asset.id } })) + 1;
    const prefix = storageKeys.assetVersion(asset.id, version);
    for (const file of out.files) await providers.storage.put(`${prefix}/${file.name}`, file.data, file.contentType);
    const hash = sha(Buffer.concat(out.files.map((x) => x.data)));
    const v = await db.assetVersion.create({
      data: { assetId: asset.id, version, storageKey: `${prefix}/${out.primary}`, url: providers.storage.url(`${prefix}/${out.primary}`), generator: out.provenance.generator, modelId: out.provenance.modelId, modelVersion: out.provenance.modelVersion, license: out.provenance.license, commercialUse: out.provenance.commercialUse, seed: req.seed, prompt: req.prompt, negativePrompt: req.negativePrompt, parameters: json(out.provenance.parameters), references: json(req.references ?? []), gpuWorkerId: out.provenance.gpuWorkerId, durationMs: out.provenance.durationMs, contentHash: hash },
    });
    if (out.depthFile) {
      const dKey = `${prefix}/${out.depthFile}`;
      await db.asset.create({ data: { kind: "DEPTH", role: "depth", name: `${asset.name} depth`, reuseKey: `${asset.reuseKey}:depth`, storyId: asset.storyId, status: "READY", storageKey: dKey, url: providers.storage.url(dKey), width: out.width, height: out.height, sourceAssetId: asset.id, isPlaceholder: out.isPlaceholder, metadata: json({ sourceVersionId: v.id, generator: out.provenance.generator }) } });
    }
    const needsMask = req.transparent && !out.hasAlpha;
    await db.asset.update({
      where: { id: asset.id },
      data: { currentVersionId: v.id, storageKey: `${prefix}/${out.primary}`, url: providers.storage.url(`${prefix}/${out.primary}`), width: out.width, height: out.height, hasAlpha: out.hasAlpha, isPlaceholder: out.isPlaceholder, status: needsMask ? "GENERATING" : "READY", metadata: json({ ...meta, generated: out.metadata }) },
    });
    await ctx.log(`Generated ${asset.role} "${asset.name}" with ${out.provenance.modelId} (${out.provenance.license})${out.isPlaceholder ? " — placeholder art, needs editor approval before publishing" : ""}`);
    if (needsMask) await enqueueStudioJob(db, { storyId: ctx.job.storyId, type: "GENERATE_MASK", assetId: asset.id, dedupeKey: `mask:${asset.id}:v${version}` });
    await advanceCinematic(db, ctx.job.storyId);
    return { assetId: asset.id, version, model: out.provenance.modelId, placeholder: out.isPlaceholder };
  } catch (e) {
    // Non-final failures keep GENERATING (the job runner retries this same job); the last one marks the asset FAILED.
    const final = ctx.job.attempts >= ctx.job.maxAttempts || ctx.signal.aborted;
    await db.asset.update({ where: { id: asset.id }, data: { status: final ? "FAILED" : "GENERATING", failureReason: (e as Error).message.slice(0, 1000) } });
    throw e;
  }
}

export async function stageGenerateMask(db: Db, ctx: JobContext) {
  const asset = await db.asset.findUniqueOrThrow({ where: { id: ctx.job.assetId! } });
  if (!asset.storageKey) throw new Error("Asset has no image to segment");
  const resolved = await resolveModelFor(db, "SEGMENTATION");
  if (!resolved) throw new Error("No segmentation model available");
  await ctx.setExecution({ provider: resolved.model.provider, model: resolved.model.modelId });
  const providers = await getStudioProviders(db);
  const image = await providers.storage.read(asset.storageKey);
  let out;
  try {
    out = await localAi().segmentation(resolved.model).segment({ image, mode: "subject", prompt: asset.name, jobId: ctx.job.id, signal: ctx.signal }, resolved.model);
  } catch (e) {
    // A learned segmenter failing must not stall the episode: fall back to the built-in matte.
    const fallback = resolved.model.provider === "procedural" ? null : await db.aiModel.findFirst({ where: { task: "SEGMENTATION", provider: "procedural", enabled: true } });
    if (!fallback || ctx.signal.aborted) {
      if (ctx.job.attempts >= ctx.job.maxAttempts) await db.asset.update({ where: { id: asset.id }, data: { status: "FAILED", failureReason: `Segmentation failed: ${(e as Error).message}`.slice(0, 1000) } });
      throw e;
    }
    await ctx.log(`${resolved.model.modelId} failed (${(e as Error).message}); using ${fallback.modelId}`, undefined, "warn");
    out = await localAi().segmentation(fallback).segment({ image, mode: "subject", prompt: asset.name, jobId: ctx.job.id, signal: ctx.signal }, fallback);
  }
  if (out.coverage < 0.005 || out.coverage > 0.98) await ctx.log(`Segmentation coverage ${Math.round(out.coverage * 100)}% looks wrong — check the asset`, undefined, "warn");
  const version = (await db.assetVersion.count({ where: { assetId: asset.id } })) + 1;
  const prefix = storageKeys.assetVersion(asset.id, version);
  await providers.storage.put(`${prefix}/image.png`, out.cutout, "image/png");
  await providers.storage.put(`${prefix}/mask.png`, out.mask, "image/png");
  const prev = asset.currentVersionId ? await db.assetVersion.findUnique({ where: { id: asset.currentVersionId } }) : null;
  const v = await db.assetVersion.create({
    data: { assetId: asset.id, version, storageKey: `${prefix}/image.png`, url: providers.storage.url(`${prefix}/image.png`), generator: `segmentation:${out.provenance.generator}`, modelId: prev?.modelId ?? out.provenance.modelId, modelVersion: prev?.modelVersion ?? out.provenance.modelVersion, license: prev?.license ?? out.provenance.license, commercialUse: (prev?.commercialUse ?? true) && out.provenance.commercialUse, seed: prev?.seed ?? 0, prompt: prev?.prompt ?? "", negativePrompt: prev?.negativePrompt ?? "", parameters: json({ segmentation: { modelId: out.provenance.modelId, license: out.provenance.license, coverage: out.coverage } }), references: json([]), durationMs: out.provenance.durationMs, contentHash: sha(out.cutout) },
  });
  await db.asset.create({ data: { kind: "MASK", role: "mask", name: `${asset.name} mask`, reuseKey: `${asset.reuseKey}:mask`, storyId: asset.storyId, status: "READY", storageKey: `${prefix}/mask.png`, url: providers.storage.url(`${prefix}/mask.png`), width: out.width, height: out.height, sourceAssetId: asset.id, metadata: json({ coverage: out.coverage, modelId: out.provenance.modelId }) } });
  await db.asset.update({ where: { id: asset.id }, data: { currentVersionId: v.id, storageKey: `${prefix}/image.png`, url: providers.storage.url(`${prefix}/image.png`), hasAlpha: true, status: "READY" } });
  await ctx.log(`Matted "${asset.name}" with ${out.provenance.modelId} (${Math.round(out.coverage * 100)}% kept)`);
  await advanceCinematic(db, ctx.job.storyId);
  return { assetId: asset.id, coverage: out.coverage };
}

export async function stageGenerateDepth(db: Db, ctx: JobContext) {
  const asset = await db.asset.findUniqueOrThrow({ where: { id: ctx.job.assetId! } });
  if (!asset.storageKey) throw new Error("Asset has no image");
  if (await depthFor(db, asset)) return { skipped: "depth exists" };
  const resolved = await resolveModelFor(db, "DEPTH");
  if (!resolved) throw new Error("No depth model available");
  await ctx.setExecution({ provider: resolved.model.provider, model: resolved.model.modelId });
  const providers = await getStudioProviders(db);
  const image = await providers.storage.read(asset.storageKey);
  const generated = ((asset.metadata ?? {}) as { generated?: Record<string, unknown> }).generated ?? {};
  const req = { image, role: asset.role as never, hints: generated, jobId: ctx.job.id, signal: ctx.signal };
  let out;
  try {
    out = await localAi().depth(resolved.model).estimate(req, resolved.model);
  } catch (e) {
    const fallback = resolved.model.provider === "procedural" ? null : await db.aiModel.findFirst({ where: { task: "DEPTH", provider: "procedural", enabled: true } });
    if (!fallback || ctx.signal.aborted) throw e;
    await ctx.log(`${resolved.model.modelId} failed (${(e as Error).message}); using ${fallback.modelId}`, undefined, "warn");
    out = await localAi().depth(fallback).estimate(req, fallback);
  }
  const key = `${storageKeys.assetVersion(asset.id, 0)}/depth-${resolved.model.modelId}-${Date.now()}.png`;
  await providers.storage.put(key, out.depth, "image/png");
  await db.asset.create({ data: { kind: "DEPTH", role: "depth", name: `${asset.name} depth`, reuseKey: `${asset.reuseKey}:depth`, storyId: asset.storyId, status: "READY", storageKey: key, url: providers.storage.url(key), width: out.width, height: out.height, sourceAssetId: asset.id, metadata: json({ modelId: out.provenance.modelId, license: out.provenance.license, sourceVersionId: asset.currentVersionId }) } });
  await ctx.log(`Depth for "${asset.name}" with ${out.provenance.modelId}`);
  await advanceCinematic(db, ctx.job.storyId);
  return { assetId: asset.id };
}

/** Admin-requested clean-up of an asset region (e.g. remove a stray figure from a plate). */
export async function stageInpaintAsset(db: Db, ctx: JobContext) {
  const asset = await db.asset.findUniqueOrThrow({ where: { id: ctx.job.assetId! } });
  const payload = (ctx.job.payload ?? {}) as { maskStorageKey?: string; prompt?: string };
  if (!asset.storageKey || !payload.maskStorageKey) throw new Error("Inpainting needs the asset image and a mask");
  const resolved = await resolveModelFor(db, "INPAINTING");
  if (!resolved) throw new Error("No inpainting model available");
  await ctx.setExecution({ provider: resolved.model.provider, model: resolved.model.modelId });
  const providers = await getStudioProviders(db);
  const out = await localAi()
    .inpainting(resolved.model)
    .inpaint({ image: await providers.storage.read(asset.storageKey), mask: await providers.storage.read(payload.maskStorageKey), prompt: payload.prompt, seed: 1, jobId: ctx.job.id, signal: ctx.signal }, resolved.model);
  const version = (await db.assetVersion.count({ where: { assetId: asset.id } })) + 1;
  const prefix = storageKeys.assetVersion(asset.id, version);
  await providers.storage.put(`${prefix}/image.png`, out.image, "image/png");
  const prev = asset.currentVersionId ? await db.assetVersion.findUnique({ where: { id: asset.currentVersionId } }) : null;
  const v = await db.assetVersion.create({ data: { assetId: asset.id, version, storageKey: `${prefix}/image.png`, url: providers.storage.url(`${prefix}/image.png`), generator: `inpaint:${out.provenance.generator}`, modelId: prev?.modelId ?? out.provenance.modelId, modelVersion: prev?.modelVersion ?? "", license: prev?.license ?? out.provenance.license, commercialUse: (prev?.commercialUse ?? true) && out.provenance.commercialUse, seed: prev?.seed ?? 0, prompt: payload.prompt ?? "", negativePrompt: "", parameters: json({ inpaint: out.provenance }), references: json([]), contentHash: sha(out.image) } });
  // Depth maps of the old version are stale.
  await db.asset.updateMany({ where: { sourceAssetId: asset.id, kind: "DEPTH" }, data: { status: "REJECTED" } });
  await db.asset.update({ where: { id: asset.id }, data: { currentVersionId: v.id, storageKey: `${prefix}/image.png`, url: providers.storage.url(`${prefix}/image.png`), status: "READY", approvedAt: null, approvedBy: null } });
  await advanceCinematic(db, ctx.job.storyId);
  return { assetId: asset.id, version };
}

// ---------------------------------------------------------------------------
// Shot rendering (2.5D engine; optional local I2V)
// ---------------------------------------------------------------------------

/** Conforms an I2V clip to the shot: profile size and fps, exact length (slow-down ≤1.6× then hold), fades. */
export async function conformClip(input: string, output: string, profile: RenderProfileDef, durationSeconds: number, clipSeconds: number, fadeIn: number, fadeOut: number) {
  // Short clips are slowed (≤1.6×) before holding the last frame, so motion never stops abruptly.
  const slow = Math.min(1.6, Math.max(1, durationSeconds / Math.max(0.1, clipSeconds)));
  const filters = [
    `setpts=${slow.toFixed(4)}*PTS`,
    `scale=${profile.width}:${profile.height}:force_original_aspect_ratio=increase`,
    `crop=${profile.width}:${profile.height}`,
    `fps=${profile.fps}`,
    `tpad=stop_mode=clone:stop_duration=${durationSeconds.toFixed(3)}`,
    `trim=duration=${durationSeconds.toFixed(3)}`,
    "setpts=PTS-STARTPTS",
    ...(fadeIn > 0 ? [`fade=t=in:st=0:d=${fadeIn.toFixed(3)}`] : []),
    ...(fadeOut > 0 ? [`fade=t=out:st=${(durationSeconds - fadeOut).toFixed(3)}:d=${fadeOut.toFixed(3)}`] : []),
    "format=yuv420p",
  ];
  const frames = Math.round(durationSeconds * profile.fps);
  await execFileAsync("ffmpeg", ["-v", "error", "-y", "-i", input, "-vf", filters.join(","), "-frames:v", String(frames), "-an", "-c:v", "libx264", "-preset", profile.preset, "-crf", String(profile.crf), "-pix_fmt", "yuv420p", "-movflags", "+faststart", output], { maxBuffer: 16 * 1024 * 1024 });
}

export async function stageRenderShot(db: Db, ctx: JobContext, wantI2V: boolean) {
  const shot = await db.studioShot.findUniqueOrThrow({ where: { id: ctx.job.shotId! }, include: { episode: true } });
  if (!shot.currentPackageId) throw new Error("Shot has no scene package");
  const pkg = await db.scenePackage.findUniqueOrThrow({ where: { id: shot.currentPackageId } });
  const profile = findRenderProfile(shot.episode.renderProfileKey);
  const providers = await getStudioProviders(db);

  // Render cache: identical package (any shot) → reuse the file.
  const force = !!(ctx.job.payload as { force?: boolean } | null)?.force;
  const cached = force ? null : await db.shotRender.findFirst({ where: { inputsHash: pkg.contentHash, status: "READY", preview: false, storageKey: { not: null } }, orderBy: { createdAt: "desc" } });
  if (cached && (await providers.storage.exists(cached.storageKey!))) {
    const version = (await db.shotRender.count({ where: { shotId: shot.id } })) + 1;
    await db.shotRender.updateMany({ where: { shotId: shot.id, isCurrent: true }, data: { isCurrent: false } });
    const r = cached.shotId === shot.id ? await db.shotRender.update({ where: { id: cached.id }, data: { isCurrent: true } }) : await db.shotRender.create({ data: { shotId: shot.id, version, renderer: cached.renderer, status: "READY", storageKey: cached.storageKey, url: cached.url, thumbnailUrl: cached.thumbnailUrl, width: cached.width, height: cached.height, fps: cached.fps, frames: cached.frames, durationSeconds: cached.durationSeconds, inputsHash: cached.inputsHash, packageId: pkg.id, renderMs: 0, isCurrent: true } });
    await db.studioShot.update({ where: { id: shot.id }, data: { currentRenderId: r.id, status: "QC_PENDING", renderStatus: "READY" } });
    await ctx.log(`Reused render ${cached.id} (identical scene package)`);
    await advanceCinematic(db, shot.storyId);
    return { renderId: r.id, reused: true };
  }

  await db.studioShot.update({ where: { id: shot.id }, data: { status: "RENDERING", renderStatus: "RENDERING" } });
  const manifest = parseManifest(pkg.manifest);
  const version = (await db.shotRender.count({ where: { shotId: shot.id } })) + 1;
  const workDir = await mkdtemp(path.join(tmpdir(), "atma-shot-"));
  const started = Date.now();
  try {
    const scene = await loadSceneData(manifest, (k) => providers.storage.materialize(k), { shared: true });
    const outPath = path.join(workDir, shotFileName(shot.globalNumber));
    const dur = manifest.canvas.durationSeconds;
    let renderer = "engine25d";
    let i2vNote: string | undefined;
    if (wantI2V) {
      try {
        const resolved = await resolveModelFor(db, "VIDEO_GENERATION");
        if (!resolved) throw new LocalAiError("No licence-cleared I2V model is enabled", false, "CONFIG");
        await ctx.setExecution({ provider: resolved.model.provider, model: resolved.model.modelId });
        const fadeIn = manifest.transition.in === "fade" ? manifest.transition.durationSeconds : 0;
        const keyFrame = renderStillPng(scene, { width: profile.width, height: profile.height, fps: profile.fps }, Math.ceil(fadeIn * profile.fps));
        const clip = await localAi()
          .video(resolved.model)
          .generateShot({ image: keyFrame, prompt: `${shot.viewerSees}, ${manifest.style} illustrated style, subtle natural motion, steady camera`, negativePrompt: "photorealistic footage, text, watermark, distorted face, extra limbs, gore", durationSeconds: Math.max(3, Math.min(5, dur)), fps: profile.fps, width: profile.width, height: profile.height, seed: shot.seed, jobId: ctx.job.id, signal: ctx.signal }, resolved.model);
        const raw = path.join(workDir, "i2v_raw.mp4");
        await writeFile(raw, clip.video);
        await conformClip(raw, outPath, profile, dur, clip.frames / clip.fps, fadeIn, manifest.transition.out === "fade" ? manifest.transition.durationSeconds : 0);
        renderer = `i2v:${resolved.model.modelId}`;
      } catch (e) {
        i2vNote = (e as Error).message;
        await ctx.log(`I2V unavailable or failed — rendering with the 2.5D engine instead: ${i2vNote}`, undefined, "warn");
      }
    }
    if (renderer === "engine25d") {
      await renderShotToFile(scene, outPath, { width: profile.width, height: profile.height, fps: profile.fps, crf: profile.crf, preset: profile.preset, workers: env.engine.renderThreads || undefined, signal: ctx.signal, onProgress: (d, t) => void ctx.progress((d / t) * 95) });
    }
    const thumb = renderStillPng(scene, { width: Math.round(profile.width / 3), height: Math.round(profile.height / 3), fps: profile.fps }, Math.round(dur * profile.fps * 0.4));
    const prefix = storageKeys.render(shot.storyId, shot.id, version);
    const videoKey = `${prefix}/${shotFileName(shot.globalNumber)}`;
    await providers.storage.put(videoKey, await readFile(outPath), "video/mp4");
    await providers.storage.put(`${prefix}/thumb.png`, thumb, "image/png");
    await db.shotRender.updateMany({ where: { shotId: shot.id, isCurrent: true }, data: { isCurrent: false } });
    const r = await db.shotRender.create({
      data: { shotId: shot.id, version, renderer, status: "READY", storageKey: videoKey, url: providers.storage.url(videoKey), thumbnailUrl: providers.storage.url(`${prefix}/thumb.png`), width: profile.width, height: profile.height, fps: profile.fps, frames: Math.round(dur * profile.fps), durationSeconds: dur, inputsHash: pkg.contentHash, packageId: pkg.id, renderMs: Date.now() - started, failureReason: i2vNote ? `I2V fallback: ${i2vNote.slice(0, 500)}` : null, isCurrent: true },
    });
    await db.studioShot.update({ where: { id: shot.id }, data: { currentRenderId: r.id, status: "QC_PENDING", renderStatus: "READY", selectedRenderer: renderer.startsWith("i2v") ? "i2v" : "engine25d" } });
    await ctx.log(`Rendered ${shotFileName(shot.globalNumber)} (${renderer}) ${profile.width}x${profile.height}@${profile.fps}, ${dur.toFixed(2)}s in ${Math.round((Date.now() - started) / 1000)}s`);
    await advanceCinematic(db, shot.storyId);
    return { renderId: r.id, renderer };
  } catch (e) {
    await db.studioShot.update({ where: { id: shot.id }, data: { status: ctx.signal.aborted ? "SHOT_READY" : "FAILED", renderStatus: "FAILED" } });
    throw e;
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

// ---------------------------------------------------------------------------
// Shot QC and the publish gate
// ---------------------------------------------------------------------------

async function shotAssetFindings(db: Db, shot: StudioShot & { layers?: { layerKey: string; assetId: string | null; characterId: string | null }[] }) {
  const layers = shot.layers ?? (await db.shotLayer.findMany({ where: { shotId: shot.id } }));
  const unresolvedPlaceholders: string[] = [];
  const licenseBlocked: string[] = [];
  const forbidden: string[] = [];
  for (const l of layers) {
    if (l.characterId) {
      const c = await db.studioCharacter.findUnique({ where: { id: l.characterId } });
      if (c?.isMinor) forbidden.push(l.layerKey);
    }
    if (!l.assetId) continue;
    const a = await db.asset.findUnique({ where: { id: l.assetId } });
    if (!a) continue;
    if (isUnresolvedPlaceholder(a)) unresolvedPlaceholders.push(l.layerKey);
    if (!(await isVersionCleared(db, a))) licenseBlocked.push(l.layerKey);
  }
  return { unresolvedPlaceholders, licenseBlocked, forbidden };
}

export async function stageShotQc(db: Db, ctx: JobContext) {
  const shot = await db.studioShot.findUniqueOrThrow({ where: { id: ctx.job.shotId! }, include: { episode: true, layers: true } });
  if (!shot.currentRenderId) throw new Error("Shot has no render");
  const render = await db.shotRender.findUniqueOrThrow({ where: { id: shot.currentRenderId } });
  const pkg = await db.scenePackage.findUniqueOrThrow({ where: { id: render.packageId ?? shot.currentPackageId! } });
  const profile = findRenderProfile(shot.episode.renderProfileKey);
  const providers = await getStudioProviders(db);
  const findings = await shotAssetFindings(db, shot);
  const report = await runShotQc({
    videoPath: await providers.storage.materialize(render.storageKey!),
    manifest: parseManifest(pkg.manifest),
    expected: { width: profile.width, height: profile.height, fps: profile.fps, durationSeconds: render.durationSeconds ?? shot.renderDurationSeconds ?? shot.durationSeconds },
    safetyLevel: shot.safetyLevel,
    unresolvedPlaceholders: findings.unresolvedPlaceholders,
    licenseBlocked: findings.licenseBlocked,
    forbiddenCharacterLayers: findings.forbidden,
  });
  await db.shotRender.update({ where: { id: render.id }, data: { qcReport: json(report) } });
  await db.studioShot.update({ where: { id: shot.id }, data: { status: report.status === "FAILED" ? "QC_FAILED" : "RENDERED" } });
  await ctx.log(`Shot ${shot.globalNumber} QC ${report.status} (${report.issues.length} issue(s))`, report.issues);
  await advanceCinematic(db, shot.storyId);
  return { status: report.status, issues: report.issues.length };
}

/** CAN_PUBLISH for a cinematic story: every shot rendered and QC-clean, no unresolved placeholders or licence blocks, master visual current. */
export async function cinematicPublishGate(db: Db, storyId: string): Promise<{ canPublish: boolean; issues: QcIssue[] }> {
  const issues: QcIssue[] = [];
  const master = await currentMasterScript(db, storyId);
  if (!master) return { canPublish: false, issues: [{ check: "cinematic_master_visual", severity: "BLOCKING", message: "No master script" }] };
  const episode = await currentEpisode(db, storyId, master.id);
  if (!episode) return { canPublish: false, issues: [{ check: "cinematic_master_visual", severity: "BLOCKING", message: "Shots have not been planned" }] };
  const shots = await db.studioShot.findMany({ where: { episodeId: episode.id }, include: { layers: true, scene: true }, orderBy: { globalNumber: "asc" } });
  const renderIds: string[] = [];
  for (const shot of shots) {
    const where = { sceneNumber: shot.scene.sceneNumber };
    if (!shot.currentRenderId) {
      issues.push({ check: "cinematic_shot_rendered", severity: "BLOCKING", message: `Shot ${shot.globalNumber} is not rendered`, ...where });
      continue;
    }
    renderIds.push(shot.currentRenderId);
    const render = await db.shotRender.findUnique({ where: { id: shot.currentRenderId } });
    const qc = render?.qcReport as unknown as ShotQcReport | null;
    if (!qc) issues.push({ check: "cinematic_shot_qc", severity: "BLOCKING", message: `Shot ${shot.globalNumber} has not passed shot QC yet`, ...where });
    else for (const i of qc.issues.filter((x) => x.severity === "BLOCKING")) issues.push({ check: `cinematic_${i.check}`, severity: "BLOCKING", message: `Shot ${shot.globalNumber}: ${i.message}`, ...where });
    const f = await shotAssetFindings(db, shot);
    for (const k of f.unresolvedPlaceholders) issues.push({ check: "cinematic_placeholder_asset", severity: "BLOCKING", message: `Shot ${shot.globalNumber}: layer ${k} uses placeholder art — approve it in the asset library or regenerate with a local model`, ...where });
    for (const k of f.licenseBlocked) issues.push({ check: "cinematic_licence", severity: "BLOCKING", message: `Shot ${shot.globalNumber}: layer ${k} comes from a model that is not licence-cleared`, ...where });
  }
  const expectedHash = contentHash(renderIds);
  if (!episode.masterVisualAssetId || episode.masterVisualHash !== expectedHash) issues.push({ check: "cinematic_master_visual", severity: "BLOCKING", message: "The master visual is missing or out of date" });
  return { canPublish: !issues.some((i) => i.severity === "BLOCKING"), issues: dedupeIssues(issues) };
}

function dedupeIssues(issues: QcIssue[]): QcIssue[] {
  const seen = new Set<string>();
  return issues.filter((i) => {
    const k = `${i.check}|${i.message}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Master visual (one picture track for every language)
// ---------------------------------------------------------------------------

export async function stageAssembleMasterVisual(db: Db, ctx: JobContext) {
  const episode = await db.studioEpisode.findUniqueOrThrow({ where: { id: ctx.job.episodeId! } });
  const shots = await db.studioShot.findMany({ where: { episodeId: episode.id }, include: { scene: true }, orderBy: { globalNumber: "asc" } });
  const providers = await getStudioProviders(db);
  const renders = [];
  for (const s of shots) {
    if (!s.currentRenderId) throw new Error(`Shot ${s.globalNumber} has no render`);
    renders.push({ shot: s, render: await db.shotRender.findUniqueOrThrow({ where: { id: s.currentRenderId } }) });
  }
  const visualHash = contentHash(renders.map((r) => r.render.id));
  const allEngine = renders.every((r) => r.render.renderer === "engine25d");
  const version = (await db.asset.count({ where: { role: "master_visual", sourceAssetId: null, name: { startsWith: `Episode ${episode.id}` } } })) + 1;
  const prefix = storageKeys.master(episode.storyId, episode.id, version);
  const workDir = await mkdtemp(path.join(tmpdir(), "atma-master-"));
  try {
    const sceneNumbers = [...new Set(renders.map((r) => r.shot.scene.sceneNumber))].sort((a, b) => a - b);
    const sceneClips: { sceneNumber: number; storageKey: string; durationSeconds: number }[] = [];
    const sceneFiles: string[] = [];
    // Shots share codec settings, so they concatenate without re-encoding (I2V shots are conformed but re-encoded to be safe).
    const codec = allEngine ? ["-c", "copy"] : ["-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p"];
    for (const n of sceneNumbers) {
      const items = renders.filter((r) => r.shot.scene.sceneNumber === n);
      const list = path.join(workDir, `scene_${n}.txt`);
      const files = [];
      for (const r of items) files.push(await providers.storage.materialize(r.render.storageKey!));
      await writeFile(list, files.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join("\n") + "\n");
      const out = path.join(workDir, `scene_${String(n).padStart(3, "0")}.mp4`);
      await execFileAsync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, ...codec, "-an", "-movflags", "+faststart", out]);
      const key = `${prefix}/scene_${String(n).padStart(3, "0")}.mp4`;
      await providers.storage.put(key, await readFile(out), "video/mp4");
      sceneClips.push({ sceneNumber: n, storageKey: key, durationSeconds: items.reduce((s, r) => s + (r.render.durationSeconds ?? 0), 0) });
      sceneFiles.push(out);
    }
    const list = path.join(workDir, "master.txt");
    await writeFile(list, sceneFiles.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join("\n") + "\n");
    const masterPath = path.join(workDir, "master_visual.mp4");
    await execFileAsync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-an", "-movflags", "+faststart", masterPath]);
    const masterKey = `${prefix}/master_visual.mp4`;
    await providers.storage.put(masterKey, await readFile(masterPath), "video/mp4");
    const total = sceneClips.reduce((s, c) => s + c.durationSeconds, 0);
    const asset = await db.asset.create({
      data: { kind: "VIDEO", role: "master_visual", name: `Episode ${episode.id} master visual v${version}`, reuseKey: `master:${episode.id}:${visualHash}`, storyId: episode.storyId, status: "READY", storageKey: masterKey, url: providers.storage.url(masterKey), width: renders[0]?.render.width, height: renders[0]?.render.height, metadata: json({ scenes: sceneClips, shotRenderIds: renders.map((r) => r.render.id), visualHash }) },
    });
    await db.studioEpisode.update({ where: { id: episode.id }, data: { masterVisualAssetId: asset.id, masterVisualHash: visualHash, durationSeconds: total, status: "RENDERED" } });
    await ctx.log(`Master visual v${version}: ${renders.length} shots, ${sceneClips.length} scenes, ${total.toFixed(2)}s`);
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
  await maybeEnqueueRenders(db, episode.storyId);
  return { episodeId: episode.id, visualHash };
}

// ---------------------------------------------------------------------------
// Fan-in orchestration (idempotent; called after every stage)
// ---------------------------------------------------------------------------

/**
 * Moves every shot of the current episode forward one step: resolve and
 * generate assets (REUSE ▸ MODIFY ▸ GENERATE), masks and depth, set render
 * durations from the shared audio timeline, build scene packages, render,
 * QC — and assemble the master visual when every shot is done. Each step is
 * a deduplicated job, so calling this repeatedly is safe.
 */
export async function advanceCinematic(db: Db, storyId: string): Promise<void> {
  const story = await db.studioStory.findUnique({ where: { id: storyId } });
  if (!story || story.productionMode !== "CINEMATIC_25D" || !["APPROVED", "RENDERED"].includes(story.status)) return;
  const master = await currentMasterScript(db, storyId);
  if (!master) return;
  const episode = await currentEpisode(db, storyId, master.id);
  if (!episode) return;
  const shots = await db.studioShot.findMany({ where: { episodeId: episode.id }, include: { layers: true }, orderBy: { globalNumber: "asc" } });
  if (!shots.length) return;
  const profile = findRenderProfile(episode.renderProfileKey);
  const imageModel = await resolveModelFor(db, "IMAGE_GENERATION");
  const imageProvider = imageModel?.model.provider ?? "procedural";
  const floors = await audioFloors(db, story, master);
  if (floors) await applyRenderDurations(db, shots, master.scenes, floors, profile.fps);
  const bible = story.styleBible as { seedBase?: number } | null;

  let done = 0;
  const renderIds: string[] = [];
  const setStatus = async (shot: StudioShot, status: ProductionState) => {
    if (shot.status !== status) await db.studioShot.update({ where: { id: shot.id }, data: { status } });
  };
  for (const shot of shots) {
    const comp = shot.composition as unknown as CompositionPlan;
    let assetsReady = true;
    for (const layer of comp.layers) {
      const row = shot.layers.find((l) => l.layerKey === layer.key);
      if (!row) continue;
      let asset = row.assetId ? await db.asset.findUnique({ where: { id: row.assetId } }) : null;
      const wantKey = effectiveReuseKey(layer, imageProvider);
      if (!asset || asset.status === "REJECTED" || (asset.reuseKey !== wantKey && !(USABLE as readonly string[]).includes(asset.status))) {
        const resolved = await resolveLayerAsset(db, layer, { storyId, imageProvider, seedBase: bible?.seedBase ?? 0, style: comp.style, refs: { characterRefId: row.characterRefId ?? undefined, locationRefId: layer.locationRefKey ? shot.locationRefId ?? undefined : undefined, propRefId: row.propRefId ?? undefined }, isVersionUsable: (a) => isVersionCleared(db, a) });
        asset = resolved.asset;
        await db.shotLayer.update({ where: { id: row.id }, data: { assetId: asset.id, reuseDecision: resolved.decision } });
      }
      if (asset.status === "FAILED") {
        assetsReady = false;
        continue; // surfaced in the asset library; an admin regenerates or replaces it
      }
      if (asset.status === "REQUIRED") {
        const versions = await db.assetVersion.count({ where: { assetId: asset.id } });
        await enqueueStudioJob(db, { storyId, type: "GENERATE_LAYER_ASSET", assetId: asset.id, shotId: shot.id, episodeId: episode.id, dedupeKey: `asset:${asset.id}:v${versions}` });
      }
      if (!(USABLE as readonly string[]).includes(asset.status)) {
        assetsReady = false;
        continue;
      }
      if (layer.assetRole === "background" && !(await depthFor(db, asset))) {
        await enqueueStudioJob(db, { storyId, type: "GENERATE_DEPTH", assetId: asset.id, shotId: shot.id, dedupeKey: `depth:${asset.id}:${asset.currentVersionId ?? "v0"}` });
        assetsReady = false;
      }
    }
    if (!assetsReady) {
      await setStatus(shot, "GENERATING_ASSETS");
      continue;
    }
    const fresh = await db.studioShot.findUniqueOrThrow({ where: { id: shot.id } });
    if (fresh.renderDurationSeconds == null) {
      await setStatus(fresh, "ASSETS_READY");
      continue;
    }
    const pkg = await computePackage(db, fresh, profile);
    if (!pkg) continue;
    const current = fresh.currentPackageId ? await db.scenePackage.findUnique({ where: { id: fresh.currentPackageId } }) : null;
    if (!current || current.contentHash !== pkg.hash) {
      await setStatus(fresh, "DEPTH_READY");
      await enqueueStudioJob(db, { storyId, type: "BUILD_SCENE_PACKAGE", shotId: shot.id, episodeId: episode.id, dedupeKey: `package:${shot.id}:${pkg.hash}` });
      continue;
    }
    const render = fresh.currentRenderId ? await db.shotRender.findUnique({ where: { id: fresh.currentRenderId } }) : null;
    if (!render || render.inputsHash !== current.contentHash || render.status !== "READY") {
      const forced = rendererOverride(fresh.overrides);
      const i2v = env.localAi.i2vEnabled && (forced === "i2v" || (forced === "auto" && fresh.motionDecision === "LOCAL_I2V_REQUIRED"));
      await enqueueStudioJob(db, { storyId, type: i2v ? "RENDER_SHOT_I2V" : "RENDER_SHOT", shotId: shot.id, episodeId: episode.id, dedupeKey: `render:${shot.id}:${current.contentHash}`, priority: fresh.globalNumber <= 2 ? 3 : 5 });
      continue;
    }
    if (!render.qcReport) {
      await enqueueStudioJob(db, { storyId, type: "SHOT_QC", shotId: shot.id, episodeId: episode.id, dedupeKey: `shotqc:${render.id}` });
      continue;
    }
    if ((render.qcReport as unknown as ShotQcReport).status === "FAILED") {
      await setStatus(fresh, "QC_FAILED");
      continue;
    }
    renderIds.push(render.id);
    done++;
  }
  if (done === shots.length) {
    const visualHash = contentHash(renderIds);
    if (episode.masterVisualHash !== visualHash) await enqueueStudioJob(db, { storyId, type: "ASSEMBLE_MASTER_VISUAL", episodeId: episode.id, payload: { visualHash }, dedupeKey: `master:${episode.id}:${visualHash}` });
  }
}

