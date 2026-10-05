import { describe, it, expect } from "vitest";
import { CelebrationEngine, TIMELINE } from "./controller";
import { makeGeometry, perimeterPoint, pickRegion, makeRng, calmMask, type Region } from "./geometry";
import { ParticlePool, Kind } from "./particles";

function run(seconds: number, opts: Partial<ConstructorParameters<typeof CelebrationEngine>[0]> = {}, onStep?: (e: CelebrationEngine, t: number) => void) {
  const e = new CelebrationEngine({ intensity: "premium", displayMs: 7000, deviceFactor: 1, seed: 42, ...opts });
  e.resize(480, 340, 60);
  const dt = 1 / 60;
  for (let i = 0; i < seconds * 60; i++) {
    e.step(dt, (i * dt * 1000) % 7000);
    onStep?.(e, i * dt);
  }
  return e;
}

describe("celebration engine", () => {
  it("keeps the particle count bounded by the pool (pooling, no leak)", () => {
    const e = run(60);
    expect(e.stats.maxActive).toBeLessThanOrEqual(e.pool.capacity);
    expect(e.pool.capacity).toBe(240);
    const low = run(20, { deviceFactor: 0.52 });
    expect(low.pool.capacity).toBeLessThan(e.pool.capacity); // device-aware density
  });

  it("fires the 7-second accents in order every cycle: popper → fireworks → fireworks → glitter → finale", () => {
    const e = run(21);
    expect(e.stats.accents).toEqual([...TIMELINE.map((a) => a.fx), ...TIMELINE.map((a) => a.fx), ...TIMELINE.map((a) => a.fx)]);
  });

  it("launches stream fireworks every 0.7–1.2 s on top of the accents (never in lock-step)", () => {
    const times: number[] = [];
    let prev = 0;
    run(30, {}, (e, t) => {
      if (e.stats.fireworks !== prev) {
        times.push(t);
        prev = e.stats.fireworks;
      }
    });
    // ~30 s / 0.95 s ≈ 31 stream launches + accent fireworks
    expect(times.length).toBeGreaterThan(30);
    const gaps = times.slice(1).map((t, i) => +(t - times[i]).toFixed(3));
    expect(new Set(gaps).size).toBeGreaterThan(8); // irregular spacing → no visible loop
  });

  it("is deterministic for a seed and differs across seeds", () => {
    expect(run(5, { seed: 7 }).stats.maxActive).toBe(run(5, { seed: 7 }).stats.maxActive);
    expect(run(5, { seed: 7 }).stats.fireworks + run(5, { seed: 7 }).stats.maxActive).not.toBe(run(5, { seed: 99 }).stats.fireworks + run(5, { seed: 99 }).stats.maxActive);
  });

  it("survives a long pause without a catch-up explosion", () => {
    const e = run(3);
    const before = e.pool.activeCount;
    e.step(30, 1000); // tab was hidden for 30 s
    expect(e.pool.activeCount).toBeLessThanOrEqual(before + 40);
  });
});

describe("geometry", () => {
  const g = makeGeometry(480, 340, 60);
  it("never spawns effects inside the calm text zone", () => {
    const r = makeRng(3);
    const regions: Region[] = ["top", "topLeft", "topRight", "left", "right", "bottomLeft", "bottomRight"];
    for (let i = 0; i < 5000; i++) {
      const p = perimeterPoint(g, regions[i % regions.length], r);
      const c = g.calm;
      const inside = p.x > c.x && p.x < c.x + c.w && p.y > c.y && p.y < c.y + c.h;
      expect(inside).toBe(false);
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(g.width);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(g.height);
    }
    expect(pickRegion(r, ["left"])).toBe("left");
  });
  it("fades anything that drifts over the text to a faint hint", () => {
    const c = g.calm;
    expect(calmMask(g, c.x + c.w / 2, c.y + c.h / 2)).toBeLessThan(0.1);
    expect(calmMask(g, 2, 2)).toBe(1);
  });
  it("scales with the board instead of stretching", () => {
    expect(makeGeometry(300, 260, 36).scale).toBeLessThan(makeGeometry(560, 380, 60).scale);
  });
});

describe("pool", () => {
  it("reuses released slots and refuses beyond capacity", () => {
    const p = new ParticlePool(3);
    for (let i = 0; i < 3; i++) expect(p.spawn({ kind: Kind.Dot, x: 0, y: 0, life: 1 })).not.toBeNull();
    expect(p.spawn({ kind: Kind.Dot, x: 0, y: 0, life: 1 })).toBeNull();
    p.release(1);
    expect(p.activeCount).toBe(2);
    expect(p.spawn({ kind: Kind.Star, x: 1, y: 1, life: 1 })).toBe(p.items[1]);
  });
});
