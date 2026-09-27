import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { setInlineMode, waitForInlineJobs } from "../src/studio/jobs/jobRunner";
import { StudioService } from "../src/studio/StudioService";
import { BASE_VOICES } from "../src/studio/media/voiceCatalog";
import { SAMPLE_ARTICLE } from "./fixtures";

// Integration test: runs the whole Studio pipeline in-process against the
// database in DATABASE_URL (skipped when no database is reachable).
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
  const admin = await prisma.adminUser.upsert({ where: { email: "studio-test@atma.test" }, update: {}, create: { email: "studio-test@atma.test", passwordHash: "x", role: "SUPER_ADMIN" } });
  adminId = admin.id;
}, 30_000);

afterAll(async () => {
  await prisma.$disconnect();
});

describe("studio pipeline (inline, end-to-end)", () => {
  it("goes DRAFT → ADMIN_REVIEW → APPROVED → RENDERED and regenerates only what changed", async (ctx) => {
    if (!dbAvailable) ctx.skip();
    const svc = new StudioService(prisma);
    const story = await svc.createStory({ title: "Dowry harassment complaint in Jaipur", articleText: SAMPLE_ARTICLE, sourceName: "Example Times", languages: ["hi", "en"], resolution: "720p" }, adminId);
    await waitForInlineJobs();

    let s = await prisma.studioStory.findUniqueOrThrow({ where: { id: story.id } });
    expect(s.status).toBe("ADMIN_REVIEW");
    expect(s.isSensitive).toBe(true);
    const facts = await prisma.studioFact.findMany({ where: { storyId: story.id } });
    expect(facts.some((f) => f.verificationStatus === "ALLEGED")).toBe(true);
    const assignments = await prisma.voiceAssignment.findMany({ where: { storyId: story.id }, include: { voice: true } });
    expect(assignments.find((a) => a.speakerKey === "NARRATOR")?.voice.code).toBe("VOICE_08");

    await expect(svc.publish(story.id, adminId)).rejects.toThrow(/RENDERED/);
    await svc.approve(story.id, adminId);
    await waitForInlineJobs();
    s = await prisma.studioStory.findUniqueOrThrow({ where: { id: story.id } });
    expect(s.status).toBe("RENDERED");
    expect(s.qcStatus).toBe("NEEDS_REVIEW"); // placeholder voices + untranslated Hindi without API keys

    const firstRenders = await prisma.videoRender.findMany({ where: { storyId: story.id, isCurrent: true, status: "READY" } });
    expect(firstRenders.map((r) => r.languageCode).sort()).toEqual(["en", "hi"]);
    for (const r of firstRenders) expect(r.durationSeconds!).toBeLessThanOrEqual(300);
    const enRender = firstRenders.find((r) => r.languageCode === "en")!;
    const visualJobsBefore = await prisma.generationJob.count({ where: { storyId: story.id, type: "GENERATE_SCENE_VISUAL" } });

    // Edit one Hindi scene: only Hindi is re-voiced and re-rendered.
    await svc.editLanguageScene(story.id, "hi", 2, { narratorText: "यह एक संपादित पंक्ति है।" }, adminId);
    await waitForInlineJobs();
    s = await prisma.studioStory.findUniqueOrThrow({ where: { id: story.id } });
    expect(s.status).toBe("ADMIN_REVIEW");
    await svc.approve(story.id, adminId);
    await waitForInlineJobs();

    const current = await prisma.videoRender.findMany({ where: { storyId: story.id, isCurrent: true, status: "READY" } });
    expect(current.find((r) => r.languageCode === "en")!.id).toBe(enRender.id); // English reused
    expect(current.find((r) => r.languageCode === "hi")!.version).toBe(2);
    expect(await prisma.generationJob.count({ where: { storyId: story.id, type: "GENERATE_SCENE_VISUAL" } })).toBe(visualJobsBefore);
    expect(await prisma.generationJob.count({ where: { storyId: story.id, type: "GENERATE_LANGUAGE_SCRIPT", languageCode: "en" } })).toBe(1);

    // Publishing with failed QC requires an explicit override note; sensitive stories are never auto-published.
    await expect(svc.publish(story.id, adminId)).rejects.toThrow(/override/);
    const failedJobs = await prisma.generationJob.count({ where: { storyId: story.id, status: "FAILED" } });
    expect(failedJobs).toBe(0);
  }, 600_000);
});
