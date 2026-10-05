import { ParticlePool, drawParticle, lifeAlpha, stepParticle } from "./particles";
import { calmMask, makeGeometry, makeRng, perimeterPoint, pickRegion, type Geometry, type Region } from "./geometry";
import { firework, sparkle, glitter, driftingConfetti, ribbon, newPopper, firePopper, drawPopper, POPPER_FIRE_AT, POPPER_LIFE, type FireworkVariant, type Popper } from "./systems";

export type Intensity = "subtle" | "normal" | "premium" | "festive";

export interface EngineOptions {
  intensity: Intensity;
  /** Length of one person's display (the board's 7-second slot). */
  displayMs: number;
  /** Device-aware multiplier (lower on weak phones). */
  deviceFactor: number;
  seed: number;
}

/** Accents placed on the board's 7-second timeline (seconds). */
export const TIMELINE: Array<{ at: number; fx: "popper" | "fireworksA" | "fireworksB" | "glitter" | "finale" }> = [
  { at: 1.25, fx: "popper" },
  { at: 2.3, fx: "fireworksA" },
  { at: 4.35, fx: "fireworksB" },
  { at: 5.4, fx: "glitter" },
  { at: 6.25, fx: "finale" },
];

export interface EngineStats {
  fireworks: number;
  poppers: number;
  accents: string[];
  maxActive: number;
}

/**
 * AnimationController: owns the pool, independent streams on their own
 * jittered clocks (so nothing repeats in lock-step), and the accents tied
 * to the server-synchronised 7-second display phase. Pure logic — the
 * React component supplies the canvas and requestAnimationFrame.
 */
export class CelebrationEngine {
  readonly pool: ParticlePool;
  private g: Geometry = makeGeometry(400, 260, 60);
  private r: () => number;
  private t = 0;
  private next = { sparkle: 0, confetti: 0, firework: 0, ribbon: 0, glitter: 0 };
  private poppers: Popper[] = [];
  private lastPhase = -1;
  private popSide: "left" | "right" = "left";
  readonly density: number;
  readonly stats: EngineStats = { fireworks: 0, poppers: 0, accents: [], maxActive: 0 };

  constructor(private opts: EngineOptions) {
    const k = opts.intensity === "subtle" ? 0.55 : opts.intensity === "festive" ? 1.3 : 1;
    this.density = Math.max(0.3, k * opts.deviceFactor);
    this.pool = new ParticlePool(Math.round(240 * this.density));
    this.r = makeRng(opts.seed);
    // Stagger the streams so the very first second already feels alive.
    this.next = { sparkle: 0.05, confetti: 0.2, firework: 0.4 + this.r() * 0.5, ribbon: 0.9, glitter: 2.2 };
  }

  resize(width: number, height: number, margin: number) {
    this.g = makeGeometry(width, height, margin);
  }

  get geometry() {
    return this.g;
  }

  private jitter(min: number, max: number) {
    return min + this.r() * (max - min);
  }

  private launchFirework(regions?: Region[], size = 1, variant?: FireworkVariant) {
    const v = variant ?? ((["round", "ring", "willow", "spark", "round", "spark"] as FireworkVariant[])[Math.floor(this.r() * 6)]);
    const at = perimeterPoint(this.g, pickRegion(this.r, regions ?? ["top", "topLeft", "topRight", "left", "right"]), this.r);
    firework(this.pool, this.g, this.r, at, v, size * (0.7 + this.r() * 0.5), this.density);
    this.stats.fireworks += 1;
  }

  private popper(big = false, side?: "left" | "right") {
    const s = side ?? this.popSide;
    this.popSide = s === "left" ? "right" : "left";
    this.poppers.push(newPopper(this.g, this.r, s, big));
    this.stats.poppers += 1;
  }

  private accent(fx: (typeof TIMELINE)[number]["fx"]) {
    this.stats.accents.push(fx);
    if (this.stats.accents.length > 50) this.stats.accents.shift();
    switch (fx) {
      case "popper":
        this.popper(false);
        break;
      case "fireworksA":
        this.launchFirework(["topLeft"], 1);
        this.launchFirework(["topRight"], 0.9);
        break;
      case "fireworksB":
        this.launchFirework(["left", "top"], 0.95);
        this.launchFirework(["right", "top"], 1.05);
        break;
      case "glitter": {
        const b = this.g.board;
        glitter(this.pool, this.g, this.r, { x: b.x + b.w * (0.2 + this.r() * 0.6), y: b.y - this.g.margin * 0.3 }, Math.round(12 * this.density));
        break;
      }
      case "finale":
        this.launchFirework(["topLeft", "left"], 1.2, "round");
        this.launchFirework(["topRight", "right"], 1.2, "ring");
        this.popper(true, "left");
        this.popper(true, "right");
        break;
    }
  }

  /** Advance by dt seconds; phaseMs = ms into the current 7-second display. */
  step(dt: number, phaseMs: number) {
    dt = Math.min(0.05, Math.max(0, dt)); // no catch-up bursts after a pause
    this.t += dt;
    const t = this.t;
    const d = this.density;
    // Continuous, independently-timed streams.
    if (t >= this.next.sparkle) {
      sparkle(this.pool, this.g, this.r, pickRegion(this.r));
      this.next.sparkle = t + this.jitter(0.09, 0.26) / d;
    }
    if (t >= this.next.confetti) {
      driftingConfetti(this.pool, this.g, this.r);
      this.next.confetti = t + this.jitter(0.22, 0.48) / d;
    }
    if (t >= this.next.firework) {
      this.launchFirework(undefined, 0.75);
      this.next.firework = t + this.jitter(0.7, 1.2);
    }
    if (t >= this.next.ribbon) {
      ribbon(this.pool, this.g, this.r, this.r() < 0.5 ? "bottomLeft" : "bottomRight");
      this.next.ribbon = t + this.jitter(1.6, 2.8);
    }
    if (t >= this.next.glitter) {
      const p = perimeterPoint(this.g, pickRegion(this.r, ["top", "topLeft", "topRight"]), this.r);
      glitter(this.pool, this.g, this.r, p, Math.round(6 * d));
      this.next.glitter = t + this.jitter(2.6, 4.2);
    }
    // Accents on the shared 7-second timeline (handles wrap-around).
    const phase = ((phaseMs % this.opts.displayMs) + this.opts.displayMs) % this.opts.displayMs / 1000;
    // A jump (tab was hidden, clock re-sync) only re-aligns — it never
    // replays the accents that were skipped.
    const total = this.opts.displayMs / 1000;
    const advanced = this.lastPhase < 0 ? 0 : (phase - this.lastPhase + total) % total;
    if (this.lastPhase >= 0 && advanced <= 0.25) {
      for (const a of TIMELINE) {
        const crossed = this.lastPhase <= phase ? this.lastPhase < a.at && a.at <= phase : this.lastPhase < a.at || a.at <= phase;
        if (crossed) this.accent(a.fx);
      }
    }
    this.lastPhase = phase;

    for (const pp of this.poppers) {
      pp.age += dt;
      if (!pp.fired && pp.age >= POPPER_FIRE_AT) {
        pp.fired = true;
        firePopper(this.pool, this.g, this.r, pp, d);
      }
      if (pp.age >= POPPER_LIFE) pp.active = false;
    }
    if (this.poppers.some((p) => !p.active)) this.poppers = this.poppers.filter((p) => p.active);

    const items = this.pool.items;
    for (let i = 0; i < items.length; i++) {
      const p = items[i];
      if (p.active && !stepParticle(p, dt)) this.pool.release(i);
    }
    if (this.pool.activeCount > this.stats.maxActive) this.stats.maxActive = this.pool.activeCount;
  }

  render(ctx: CanvasRenderingContext2D, clear: () => void) {
    clear();
    for (const pp of this.poppers) drawPopper(ctx, this.g, pp);
    const items = this.pool.items;
    for (let i = 0; i < items.length; i++) {
      const p = items[i];
      if (!p.active) continue;
      drawParticle(ctx, p, lifeAlpha(p) * calmMask(this.g, p.x, p.y));
    }
    ctx.globalAlpha = 1;
  }

  dispose() {
    this.pool.clear();
    this.poppers = [];
  }
}

export function deviceFactor(): number {
  if (typeof navigator === "undefined") return 1;
  const cores = navigator.hardwareConcurrency ?? 8;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  let f = 1;
  if (cores <= 4 || mem <= 4) f *= 0.65;
  if (typeof window !== "undefined" && window.innerWidth < 640) f *= 0.8;
  return f;
}
