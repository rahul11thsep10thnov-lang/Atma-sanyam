import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { queuesForRoles } from "../src/studio/jobs/studioWorkers";
import { GPU_QUEUES, queueForJobType } from "../src/studio/jobs/jobRunner";
import { heartbeat, markStaleWorkers, registerGpuWorker, schedulerSnapshot } from "../src/studio/gpu/gpuRegistry";

const prisma = new PrismaClient();
let db = false;
beforeAll(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await prisma.gpuWorker.count();
    db = true;
  } catch {
    db = false;
  }
});
afterAll(async () => {
  if (db) await prisma.gpuWorker.deleteMany({ where: { workerId: { startsWith: "test-gpu-" } } });
  await prisma.$disconnect();
});

describe("queues and worker roles", () => {
  it("routes job types to resource queues", () => {
    expect(queueForJobType("GENERATE_LAYER_ASSET")).toBe("image-generation");
    expect(queueForJobType("GENERATE_DEPTH")).toBe("depth-generation");
    expect(queueForJobType("RENDER_SHOT_I2V")).toBe("i2v");
    expect(queueForJobType("RENDER_SHOT")).toBe("2.5d-render");
    expect(queueForJobType("ASSEMBLE_MASTER_VISUAL")).toBe("studio-render");
    expect(queueForJobType("SHOT_QC")).toBe("qc");
    expect(queueForJobType("ANALYZE_ARTICLE")).toBe("studio");
  });
  it("maps roles to queues", () => {
    expect(queuesForRoles("gpu").sort()).toEqual([...GPU_QUEUES].sort());
    expect(queuesForRoles("render").sort()).toEqual(["2.5d-render", "qc", "studio-render"]);
    expect(queuesForRoles("studio,depth-generation").sort()).toEqual(["depth-generation", "studio"]);
    expect(queuesForRoles("all")).toHaveLength(9);
    expect(queuesForRoles("pipeline")).toEqual([]);
    expect(queuesForRoles("pipeline,studio")).toEqual(["studio"]);
  });
});

describe("GPU worker registry", () => {
  it("registers, heartbeats, goes stale and warns about unserved queues", async (ctx) => {
    if (!db) ctx.skip();
    const id = `test-gpu-${Date.now()}`;
    await registerGpuWorker(prisma, { workerId: id, queues: ["image-generation", "depth-generation"], maxConcurrentJobs: 2, vramGbOverride: 24 });
    await heartbeat(prisma, id, { index: 0, name: "Test GPU", memoryTotalGb: 24, memoryFreeGb: 20, utilization: 10 });
    let snap = await schedulerSnapshot(prisma, 90);
    const w = snap.workers.find((x) => x.workerId === id)!;
    expect(w.status).toBe("ONLINE");
    expect(w.vramFreeGb).toBe(20);
    expect(snap.queues.find((q) => q.queue === "image-generation")!.slots).toBeGreaterThanOrEqual(2);
    await prisma.gpuWorker.update({ where: { workerId: id }, data: { lastHeartbeatAt: new Date(Date.now() - 600_000) } });
    expect(await markStaleWorkers(prisma, 90)).toBeGreaterThanOrEqual(1);
    snap = await schedulerSnapshot(prisma, 90);
    expect(snap.workers.find((x) => x.workerId === id)!.status).toBe("OFFLINE");
  });
});
