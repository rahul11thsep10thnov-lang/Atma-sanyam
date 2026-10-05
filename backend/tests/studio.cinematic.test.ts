import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { setInlineMode, waitForInlineJobs } from "../src/studio/jobs/jobRunner";
import { StudioService } from "../src/studio/StudioService";
import { BASE_VOICES } from "../src/studio/media/voiceCatalog";
import { DEFAULT_MODELS } from "../src/studio/models/defaultModels";
import { advanceCinematic, cinematicPublishGate } from "../src/studio/production/cinematicPipeline";
import { ProductionService } from "../src/studio/production/productionService";
import { SAMPLE_ARTICLE } from "./fixtures";

// Integration test: the cinematic 2.5D path end to end, in-process, against
// DATABASE_URL (skipped when no database is reachable). Uses the draft render
// profile (270×480 @ 15) and the built-in procedural models, so it needs no GPU.
const prisma = new PrismaClient();
let dbAvailable = false;
let adminId = "";

beforeAll(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await prisma.voice.count();
    dbAvailable = true;
  } catch {
    dbAvailable = false;
    return;
  }
  setInlineMode(true, prisma);
  for (const v of BASE_VOICES) await prisma.voice.upsert({ where: { code: v.code }, update: {}, create: { ...v, providerVoiceIds: {} } });
  for (const code of ["hi", "en"]) await prisma.language.upsert({ where: { code }, update: {}, create: { code, englishName: code, nativeName: code } });
  // The procedural models must exist (seeded normally; upserted here for a bare test database).
  for (const { licenseVerifiedAt, config, ...m } of DEFAULT_MODELS.filter((x) => x.provider === "procedural")) {
    void licenseVerifiedAt;
    await prisma.aiModel.upsert({ where: { modelId: m.modelId }, update: {}, create: { ...m, config: (config ?? undefined) as never } });
  }
  const admin = await prisma.adminUser.upsert({ where: { email: "studio-test@atma.test" }, update: {}, create: { email: "studio-test@atma.test", passwordHash: "x", role: "SUPER_ADMIN" } });
  adminId = admin.id;
}, 30_000);

afterAll(async () => {
  await prisma.$disconnect();
});

describe("cinematic 2.5D pipeline (inline, end-to-end)", () => {
  it("plans shots, generates and reuses layer assets, renders, assembles one master visual and gates publishing", async (ctx) => {
    if (!dbAvailable) ctx.skip();
    const svc = new StudioService(prisma);
    const story = await svc.createStory(
      { title: "Dowry harassment complaint in Jaipur (cinematic)", articleText: SAMPLE_ARTICLE, sourceName: "Example Times", languages: ["hi", "en"], productionMode: "CINEMATIC_25D", renderProfileKey: "draft-270x480-15" },
      adminId,
    );
    await waitForInlineJobs();
    const project = await prisma.videoProject.findUniqueOrThrow({ where: { storyId: story.id } });
    expect([project.width, project.height, project.fps]).toEqual([270, 480, 15]);

    // Approval queues PLAN_SHOTS + voices; the fan-in drives everything else to the master visual and language renders.
    await svc.approve(story.id, adminId);
    await waitForInlineJobs();

    const episode = await prisma.studioEpisode.findFirstOrThrow({ where: { storyId: story.id } });
    expect(episode.renderProfileKey).toBe("draft-270x480-15");

    const shots = await prisma.studioShot.findMany({ where: { storyId: story.id }, include: { layers: true, renders: true }, orderBy: { globalNumber: "asc" } });
    expect(shots.length).toBeGreaterThanOrEqual(3);
    // Every shot: director fields, layers with depth, a current render with QC
    for (const sh of shots) {
      expect(sh.viewerSees.length).toBeGreaterThan(3);
      expect(sh.layers.some((l) => l.kind === "BACKGROUND")).toBe(true);
      expect(sh.layers.every((l) => !!l.assetId)).toBe(true);
      expect(sh.currentRenderId).toBeTruthy();
      expect(sh.renderDurationSeconds).toBeGreaterThan(0);
      const r = sh.renders.find((x) => x.id === sh.currentRenderId)!;
      expect(r.status).toBe("READY");
      expect([r.width, r.height, r.fps]).toEqual([270, 480, 15]);
      expect(r.qcReport).toBeTruthy();
    }
    // Restricted scenes are rendered with substitutes: no characters on screen
    const restricted = shots.filter((s) => s.safetyLevel === "RESTRICTED");
    for (const s of restricted) expect(s.layers.some((l) => l.kind === "CHARACTER")).toBe(false);

    // Asset reuse: backgrounds of the same location are shared between shots
    const bgAssetIds = shots.flatMap((s) => s.layers.filter((l) => l.kind === "BACKGROUND").map((l) => l.assetId));
    expect(new Set(bgAssetIds).size).toBeLessThan(bgAssetIds.length);
    expect(shots.flatMap((s) => s.layers).some((l) => l.reuseDecision === "REUSE")).toBe(true);
    // Provenance: every asset version records model, licence and seed
    const versions = await prisma.assetVersion.findMany({ where: { assetId: { in: bgAssetIds.filter((x): x is string => !!x) } } });
    expect(versions.every((v) => v.modelId && v.license && Number.isInteger(v.seed))).toBe(true);

    // One master visual, then per-language renders cut to the same shared timeline
    const ep = await prisma.studioEpisode.findUniqueOrThrow({ where: { id: episode.id } });
    expect(ep.masterVisualAssetId).toBeTruthy();
    const renders = await prisma.videoRender.findMany({ where: { storyId: story.id, isCurrent: true, status: "READY", kind: "SINGLE_LANGUAGE" } });
    expect(renders.map((r) => r.languageCode).sort()).toEqual(["en", "hi"]);
    expect(renders.every((r) => r.renderer === "studio-ffmpeg-v1+engine25d")).toBe(true);
    expect(Math.abs(renders[0].durationSeconds! - renders[1].durationSeconds!)).toBeLessThan(0.05);

    // Idempotent fan-in: advancing again queues nothing new
    const jobsBefore = await prisma.generationJob.count({ where: { storyId: story.id } });
    await advanceCinematic(prisma, story.id);
    await waitForInlineJobs();
    expect(await prisma.generationJob.count({ where: { storyId: story.id } })).toBe(jobsBefore);

    // CAN_PUBLISH: procedural placeholder art blocks publishing until an editor approves it
    let gate = await cinematicPublishGate(prisma, story.id);
    expect(gate.canPublish).toBe(false);
    expect(gate.issues.some((i) => i.check === "cinematic_placeholder_asset")).toBe(true);
    const s = await prisma.studioStory.findUniqueOrThrow({ where: { id: story.id } });
    expect(s.status).toBe("RENDERED");
    expect(s.qcStatus).toBe("NEEDS_REVIEW");
    await expect(svc.publish(story.id, adminId, "override for test")).rejects.toThrow(/CAN_PUBLISH/);

    const layerAssetIds = [...new Set(shots.flatMap((sh) => sh.layers.map((l) => l.assetId)).filter((x): x is string => !!x))];
    await prisma.asset.updateMany({ where: { id: { in: layerAssetIds } }, data: { status: "APPROVED", approvedBy: adminId, approvedAt: new Date() } });
    gate = await cinematicPublishGate(prisma, story.id);
    expect(gate.issues.some((i) => i.check === "cinematic_placeholder_asset")).toBe(false);
    expect(gate.canPublish).toBe(true);

    expect(await prisma.generationJob.count({ where: { storyId: story.id, status: "FAILED" } })).toBe(0);

    // ---- Admin production service: navigation, inspector, preview, overrides, registry, metrics ----
    const prod = new ProductionService(prisma);
    const nav = await prod.production(story.id);
    expect(nav.scenes.flatMap((sc) => sc.shots).length).toBe(shots.length);
    const first = shots[0];
    const detail = await prod.shot(first.id);
    expect(detail.layers.length).toBeGreaterThan(0);
    expect(detail.layers.every((l) => l.version?.modelId)).toBe(true);
    expect(detail.timeline!.length).toBeGreaterThan(5);
    const png = await prod.previewFrame(first.id, { overrides: { camera: { type: "pan_left", intensity: 1.5 } } });
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    await expect(prod.updateShotOverrides(first.id, { layers: { nope: { depth: 0.5 } } }, adminId)).rejects.toThrow(/Unknown layer/);
    await expect(prod.updateShotOverrides(first.id, { camera: { type: "spin" } }, adminId)).rejects.toThrow();
    const before = await prisma.studioShot.findUniqueOrThrow({ where: { id: first.id } });
    const otherBefore = await prisma.studioShot.findUniqueOrThrow({ where: { id: shots[1].id } });
    await prod.updateShotOverrides(first.id, { camera: { type: "pan_left", intensity: 1.2 }, effects: { grain: 0 } }, adminId);
    await waitForInlineJobs();
    const after = await prisma.studioShot.findUniqueOrThrow({ where: { id: first.id } });
    expect(after.currentPackageId).not.toBe(before.currentPackageId);
    expect(after.currentRenderId).not.toBe(before.currentRenderId);
    const pkgAfter = await prisma.scenePackage.findUniqueOrThrow({ where: { id: after.currentPackageId! } });
    expect((pkgAfter.manifest as { camera: { type: string } }).camera.type).toBe("pan_left");
    // only the edited shot re-rendered
    expect((await prisma.studioShot.findUniqueOrThrow({ where: { id: shots[1].id } })).currentRenderId).toBe(otherBefore.currentRenderId);

    const models = await prod.models();
    expect(models.find((m) => m.modelId === "atma-procedural-v1")!.verdict.productionAllowed).toBe(true);
    const metrics = await prod.metrics(24);
    expect(metrics.queues.length).toBe(9);
    expect(metrics.rendering.shotsRendered).toBeGreaterThan(0);
    expect(metrics.rendering.renderSecondsPerVideoSecond).toBeGreaterThan(0);
  }, 900_000);
});
