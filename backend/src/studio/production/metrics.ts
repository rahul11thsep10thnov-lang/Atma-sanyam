import { PrismaClient } from "@prisma/client";
import { ALL_QUEUES } from "../jobs/jobRunner";
import { schedulerSnapshot } from "../gpu/gpuRegistry";

function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
}

/**
 * Production observability for the admin dashboard: queue health, job
 * latency and failure rates per stage, render throughput, cache/reuse
 * effectiveness, GPU workers, and a capacity estimate against the
 * 1,000-videos-a-month target.
 */
export async function productionMetrics(db: PrismaClient, opts: { sinceHours: number; staleAfterSeconds: number }) {
  const since = new Date(Date.now() - opts.sinceHours * 3600_000);
  const queues = [];
  for (const q of ALL_QUEUES) {
    const grouped = await db.generationJob.groupBy({ by: ["status"], where: { queue: q }, _count: { _all: true } });
    const by = Object.fromEntries(grouped.map((g) => [g.status, g._count._all]));
    queues.push({ queue: q, pending: (by.PENDING ?? 0) + (by.RETRYING ?? 0), processing: by.PROCESSING ?? 0, failed: by.FAILED ?? 0, cancelled: by.CANCELLED ?? 0, completed: by.COMPLETED ?? 0 });
  }
  const recent = await db.generationJob.findMany({ where: { createdAt: { gte: since } }, select: { type: true, status: true, durationMs: true, model: true } });
  const stageMap = new Map<string, { total: number; failed: number; durations: number[] }>();
  for (const j of recent) {
    const e = stageMap.get(j.type) ?? { total: 0, failed: 0, durations: [] };
    e.total++;
    if (j.status === "FAILED") e.failed++;
    if (j.durationMs) e.durations.push(j.durationMs);
    stageMap.set(j.type, e);
  }
  const stages = [...stageMap.entries()].map(([type, e]) => ({ type, jobs: e.total, failureRate: e.total ? e.failed / e.total : 0, p50Ms: percentile(e.durations, 50), p95Ms: percentile(e.durations, 95) }));

  const renders = await db.shotRender.findMany({ where: { createdAt: { gte: since }, status: "READY", preview: false }, select: { renderMs: true, durationSeconds: true, frames: true, renderer: true, width: true, height: true, fps: true } });
  const fresh = renders.filter((r) => (r.renderMs ?? 0) > 0);
  const renderSeconds = fresh.reduce((s, r) => s + (r.renderMs ?? 0) / 1000, 0);
  const frames = fresh.reduce((s, r) => s + (r.frames ?? 0), 0);
  const layers = await db.shotLayer.groupBy({ by: ["reuseDecision"], where: { updatedAt: { gte: since } }, _count: { _all: true } });
  const reuse = Object.fromEntries(layers.map((l) => [l.reuseDecision ?? "UNRESOLVED", l._count._all]));
  // Throughput is only meaningful per output profile (a draft render is ~30× cheaper than 1080×1920).
  const profiles = new Map<string, { shots: number; renderSeconds: number; outputSeconds: number; frames: number }>();
  for (const r of fresh) {
    const k = `${r.width}x${r.height}@${r.fps}`;
    const e = profiles.get(k) ?? { shots: 0, renderSeconds: 0, outputSeconds: 0, frames: 0 };
    e.shots++;
    e.renderSeconds += (r.renderMs ?? 0) / 1000;
    e.outputSeconds += r.durationSeconds ?? 0;
    e.frames += r.frames ?? 0;
    profiles.set(k, e);
  }
  const byProfile = [...profiles.entries()]
    .map(([profile, e]) => {
      const rate = e.outputSeconds > 0 ? e.renderSeconds / e.outputSeconds : null;
      // Capacity per render host running 24/7, for a typical 90-second video.
      return { profile, shots: e.shots, averageFps: e.renderSeconds > 0 ? e.frames / e.renderSeconds : null, renderSecondsPerVideoSecond: rate, estimatedMonthlyCapacityPerRenderHost: rate ? Math.floor((30 * 86400) / (rate * 90)) : null };
    })
    .sort((a, b) => Number(b.profile.split("x")[0]) - Number(a.profile.split("x")[0]));
  const primary = byProfile[0];
  const renderSecondsPerVideoSecond = primary?.renderSecondsPerVideoSecond ?? null;
  const capacityPerRenderHost = primary?.estimatedMonthlyCapacityPerRenderHost ?? null;
  return {
    since: since.toISOString(),
    queues,
    stages,
    rendering: {
      shotsRendered: fresh.length,
      shotsReusedFromCache: renders.length - fresh.length,
      framesRendered: frames,
      averageFps: primary?.averageFps ?? (renderSeconds > 0 ? frames / renderSeconds : null),
      /** Figures below are for the highest-resolution profile rendered in the window. */
      primaryProfile: primary?.profile ?? null,
      renderSecondsPerVideoSecond,
      estimatedMonthlyCapacityPerRenderHost: capacityPerRenderHost,
      byProfile,
      renderers: Object.fromEntries([...new Set(renders.map((r) => r.renderer))].map((k) => [k, renders.filter((r) => r.renderer === k).length])),
    },
    assetReuse: reuse,
    gpu: await schedulerSnapshot(db, opts.staleAfterSeconds),
  };
}
