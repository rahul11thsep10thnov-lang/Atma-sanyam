import { Kind, ParticlePool, PALETTE, pickColor } from "./particles";
import { type Geometry, type Region, perimeterPoint } from "./geometry";

/** Effect emitters. Each takes the pool, geometry and RNG and spawns a
 * handful of pooled particles — no DOM, no allocation beyond the pool. */
type R = () => number;
const TAU = Math.PI * 2;

export type FireworkVariant = "round" | "ring" | "willow" | "spark";

// --- FireworkSystem --------------------------------------------------------
export function firework(pool: ParticlePool, g: Geometry, r: R, at: { x: number; y: number }, variant: FireworkVariant, size: number, density: number) {
  const s = g.scale * size;
  const c1 = r() < 0.65 ? (r() < 0.6 ? PALETTE.gold : PALETTE.yellow) : pickColor(r);
  const c2 = r() < 0.5 ? c1 : pickColor(r);
  pool.spawn({ kind: Kind.Flash, x: at.x, y: at.y, life: 0.35, size: 7 * s, color: PALETTE.yellow, alpha: 0.9 });
  const base = variant === "spark" ? 7 : variant === "ring" ? 18 : variant === "willow" ? 14 : 22;
  const n = Math.max(6, Math.round((base + r() * 8) * Math.min(1, density)));
  const rot = r() * TAU;
  for (let i = 0; i < n; i++) {
    const ang = rot + (i / n) * TAU + (variant === "ring" ? 0 : (r() - 0.5) * 0.5);
    const speed = (variant === "ring" ? 95 : variant === "spark" ? 55 + r() * 40 : variant === "willow" ? 45 + r() * 45 : 50 + r() * 85) * s;
    const streak = variant !== "spark" && r() < 0.7;
    pool.spawn({
      kind: streak ? Kind.Streak : r() < 0.5 ? Kind.Dot : Kind.Star,
      x: at.x,
      y: at.y,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      gravity: (variant === "willow" ? 70 : 35) * s,
      drag: variant === "willow" ? 0.955 : 0.94,
      life: (variant === "spark" ? 0.45 : 0.7) + r() * (variant === "willow" ? 0.8 : 0.45),
      size: (streak ? 1.8 : 2.1) * s * (0.8 + r() * 0.5),
      trail: 0.06 + r() * 0.05,
      color: i % 2 ? c1 : c2,
      rot: r() * TAU,
      vrot: (r() - 0.5) * 6,
      twinkle: streak ? 0 : 10 + r() * 14,
    });
  }
}

// --- SparkleSystem ---------------------------------------------------------
export function sparkle(pool: ParticlePool, g: Geometry, r: R, region: Region) {
  const p = perimeterPoint(g, region, r);
  pool.spawn({
    kind: r() < 0.6 ? Kind.Star : Kind.Diamond,
    x: p.x,
    y: p.y,
    vx: (r() - 0.5) * 8,
    vy: -4 - r() * 8,
    life: 0.5 + r() * 0.7,
    size: (1.8 + r() * 2.2) * g.scale,
    color: r() < 0.75 ? (r() < 0.5 ? PALETTE.gold : PALETTE.yellow) : PALETTE.white,
    rot: r() * TAU,
    vrot: (r() - 0.5) * 2,
    twinkle: 8 + r() * 10,
    alpha: 0.95,
  });
}

/** A golden glitter shimmer: a small cluster of twinkling points. */
export function glitter(pool: ParticlePool, g: Geometry, r: R, center: { x: number; y: number }, count: number) {
  for (let i = 0; i < count; i++) {
    const a = r() * TAU;
    const d = r() * 26 * g.scale;
    pool.spawn({
      kind: r() < 0.5 ? Kind.Star : Kind.Dot,
      x: center.x + Math.cos(a) * d,
      y: center.y + Math.sin(a) * d * 0.6,
      vx: Math.cos(a) * 6,
      vy: -6 - r() * 10,
      life: 0.6 + r() * 0.8,
      size: (1.4 + r() * 1.6) * g.scale,
      color: r() < 0.8 ? PALETTE.gold : PALETTE.yellow,
      twinkle: 12 + r() * 16,
      rot: r() * TAU,
    });
  }
}

// --- ConfettiSystem --------------------------------------------------------
export function driftingConfetti(pool: ParticlePool, g: Geometry, r: R) {
  const b = g.board;
  // Mostly over the outer thirds so the middle stays calm.
  const side = r() < 0.5 ? r() * 0.32 : 0.68 + r() * 0.32;
  pool.spawn({
    kind: Kind.Confetti,
    x: b.x - g.margin * 0.4 + side * (b.w + g.margin * 0.8),
    y: b.y - g.margin * (0.3 + r() * 0.6),
    vx: (r() - 0.5) * 10,
    vy: 14 + r() * 22,
    sway: 14 + r() * 16,
    swayPhase: r() * TAU,
    life: 3 + r() * 2.5,
    size: (3 + r() * 2) * g.scale,
    color: pickColor(r),
    rot: r() * TAU,
    vrot: (r() - 0.5) * 3,
    flip: r() * TAU,
    flipSpeed: 3 + r() * 5,
    alpha: 0.9,
  });
}

// --- Ribbons ---------------------------------------------------------------
export function ribbon(pool: ParticlePool, g: Geometry, r: R, region: Region, burst = false) {
  const p = perimeterPoint(g, region, r);
  const leftish = region.toLowerCase().includes("left");
  const dir = leftish ? -1 : 1;
  pool.spawn({
    kind: Kind.Ribbon,
    x: p.x,
    y: p.y,
    vx: dir * (burst ? 60 + r() * 60 : 10 + r() * 18) * g.scale,
    vy: (burst ? -(80 + r() * 70) : -(8 + r() * 12)) * g.scale,
    gravity: burst ? 90 * g.scale : 4,
    drag: 0.97,
    life: burst ? 1.4 + r() * 0.6 : 2.2 + r() * 1.2,
    size: (2.2 + r() * 1.2) * g.scale,
    color: r() < 0.4 ? PALETTE.gold : pickColor(r),
    swayPhase: r() * TAU,
    alpha: 0.9,
  });
}

// --- Poppers ---------------------------------------------------------------
export interface Popper {
  active: boolean;
  side: "left" | "right";
  x: number;
  y: number;
  age: number;
  fired: boolean;
  big: boolean;
}
export const POPPER_LIFE = 1.5;
export const POPPER_FIRE_AT = 0.32;

export function newPopper(g: Geometry, r: R, side: "left" | "right", big = false): Popper {
  const b = g.board;
  return {
    active: true,
    side,
    x: side === "left" ? b.x - g.margin * (0.35 + r() * 0.2) : b.x + b.w + g.margin * (0.35 + r() * 0.2),
    y: b.y + b.h * (0.55 + r() * 0.3),
    age: 0,
    fired: false,
    big,
  };
}

/** The burst: confetti, curved ribbons and a few sparks, aimed up and
 * slightly inward (away from the text, which the calm mask protects). */
export function firePopper(pool: ParticlePool, g: Geometry, r: R, pp: Popper, density: number) {
  const dir = pp.side === "left" ? 1 : -1;
  const n = Math.round((pp.big ? 26 : 16) * Math.min(1.2, density) + r() * 6);
  for (let i = 0; i < n; i++) {
    const ang = -Math.PI / 2 + dir * (0.25 + r() * 0.55);
    const sp = (110 + r() * 120) * g.scale * (pp.big ? 1.15 : 1);
    pool.spawn({
      kind: r() < 0.82 ? Kind.Confetti : Kind.Diamond,
      x: pp.x + dir * 6,
      y: pp.y - 10 * g.scale,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp,
      gravity: 150 * g.scale,
      drag: 0.955,
      sway: 10 + r() * 10,
      swayPhase: r() * TAU,
      life: 1.4 + r() * 1.1,
      size: (2.8 + r() * 2) * g.scale,
      color: pickColor(r),
      rot: r() * TAU,
      vrot: (r() - 0.5) * 9,
      flip: r() * TAU,
      flipSpeed: 6 + r() * 7,
    });
  }
  const ribbons = pp.big ? 3 : 2;
  for (let i = 0; i < ribbons; i++) {
    const ang = -Math.PI / 2 + dir * (0.3 + r() * 0.4);
    const sp = (120 + r() * 70) * g.scale;
    pool.spawn({ kind: Kind.Ribbon, x: pp.x, y: pp.y - 10 * g.scale, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, gravity: 120 * g.scale, drag: 0.96, life: 1.3 + r() * 0.5, size: (1.7 + r() * 0.8) * g.scale, color: r() < 0.5 ? PALETTE.gold : pickColor(r), swayPhase: r() * TAU });
  }
  pool.spawn({ kind: Kind.Flash, x: pp.x + dir * 8, y: pp.y - 12 * g.scale, life: 0.25, size: 6 * g.scale, color: PALETTE.yellow, alpha: 0.85 });
}

/** The popper body: a small striped cone that tilts, fires, then fades. */
export function drawPopper(ctx: CanvasRenderingContext2D, g: Geometry, pp: Popper) {
  const t = pp.age;
  const dir = pp.side === "left" ? 1 : -1;
  const tilt = dir * (0.35 + Math.min(1, t / POPPER_FIRE_AT) * 0.25 - (t > POPPER_FIRE_AT ? Math.min(0.2, (t - POPPER_FIRE_AT) * 0.8) : 0));
  const alpha = t < 0.15 ? t / 0.15 : t > POPPER_LIFE - 0.4 ? Math.max(0, (POPPER_LIFE - t) / 0.4) : 1;
  const s = g.scale * (pp.big ? 1.15 : 1);
  ctx.save();
  ctx.globalAlpha = alpha * 0.95;
  ctx.translate(pp.x, pp.y);
  ctx.rotate(tilt);
  const h = 26 * s;
  const w = 9 * s;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-w, -h);
  ctx.lineTo(w, -h);
  ctx.closePath();
  const grad = ctx.createLinearGradient(-w, 0, w, 0);
  grad.addColorStop(0, PALETTE.goldDeep);
  grad.addColorStop(0.5, PALETTE.yellow);
  grad.addColorStop(1, PALETTE.goldDeep);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = PALETTE.magenta;
  ctx.lineWidth = 1.4 * s;
  for (let k = 1; k <= 2; k++) {
    const y = -h * (k / 3);
    const half = w * (k / 3);
    ctx.beginPath();
    ctx.moveTo(-half, y);
    ctx.lineTo(half, y);
    ctx.stroke();
  }
  ctx.fillStyle = PALETTE.red;
  ctx.beginPath();
  ctx.ellipse(0, -h, w, 2.2 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
