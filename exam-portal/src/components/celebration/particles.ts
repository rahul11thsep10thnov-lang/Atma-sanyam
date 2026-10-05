/**
 * Particle pool + rendering for the celebration overlay. Fixed-size pool
 * (no per-frame allocation), free-list reuse, sprite-cached glows.
 */
export const enum Kind {
  Dot = 0,
  Star = 1,
  Diamond = 2,
  Streak = 3,
  Confetti = 4,
  Ribbon = 5,
  Flash = 6,
}

export interface Particle {
  active: boolean;
  kind: Kind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  drag: number;
  age: number;
  life: number;
  size: number;
  rot: number;
  vrot: number;
  color: string;
  alpha: number;
  flip: number;
  flipSpeed: number;
  sway: number;
  swayPhase: number;
  trail: number;
  twinkle: number;
}

/** Gold and warm yellow carry most of the weight (premium feel). */
export const PALETTE = {
  gold: "#d9a514",
  goldDeep: "#b8860b",
  yellow: "#ffd54f",
  pink: "#f06292",
  magenta: "#d81b60",
  red: "#e53935",
  orange: "#fb8c00",
  royal: "#3949ab",
  turquoise: "#26c6da",
  green: "#43a047",
  white: "#ffffff",
} as const;
const WEIGHTED: string[] = [
  ...Array(6).fill(PALETTE.gold),
  ...Array(2).fill(PALETTE.yellow),
  ...Array(3).fill(PALETTE.goldDeep),
  PALETTE.pink,
  PALETTE.magenta,
  PALETTE.red,
  PALETTE.orange,
  PALETTE.orange,
  PALETTE.royal,
  PALETTE.turquoise,
  PALETTE.green,
  PALETTE.white,
];
export function pickColor(r: () => number) {
  return WEIGHTED[Math.floor(r() * WEIGHTED.length)];
}

export class ParticlePool {
  readonly items: Particle[];
  private free: number[];
  constructor(readonly capacity: number) {
    this.items = Array.from({ length: capacity }, () => blank());
    this.free = Array.from({ length: capacity }, (_, i) => capacity - 1 - i);
  }
  get activeCount() {
    return this.capacity - this.free.length;
  }
  /** Returns null when the pool is full — effects simply drop particles. */
  spawn(init: Partial<Particle> & { kind: Kind; x: number; y: number; life: number }): Particle | null {
    const i = this.free.pop();
    if (i === undefined) return null;
    const p = this.items[i];
    Object.assign(p, BASE, init, { active: true, age: 0 });
    return p;
  }
  release(index: number) {
    const p = this.items[index];
    if (!p.active) return;
    p.active = false;
    this.free.push(index);
  }
  clear() {
    for (let i = 0; i < this.capacity; i++) this.release(i);
  }
}

const BASE: Omit<Particle, "kind" | "x" | "y" | "life" | "active" | "age"> = {
  vx: 0,
  vy: 0,
  gravity: 0,
  drag: 1,
  size: 2,
  rot: 0,
  vrot: 0,
  color: PALETTE.gold,
  alpha: 1,
  flip: 0,
  flipSpeed: 0,
  sway: 0,
  swayPhase: 0,
  trail: 0,
  twinkle: 0,
};
function blank(): Particle {
  return { ...BASE, kind: Kind.Dot, x: 0, y: 0, life: 1, active: false, age: 0 };
}

/** Advances one particle; returns false when it has expired. */
export function stepParticle(p: Particle, dt: number): boolean {
  p.age += dt;
  if (p.age >= p.life) return false;
  const d = Math.pow(p.drag, dt * 60);
  p.vx *= d;
  p.vy = p.vy * d + p.gravity * dt;
  p.x += p.vx * dt + (p.sway ? Math.cos(p.age * 3 + p.swayPhase) * p.sway * dt : 0);
  p.y += p.vy * dt;
  p.rot += p.vrot * dt;
  p.flip += p.flipSpeed * dt;
  return true;
}

/** Fade in quickly, hold, ease out — never a hard pop. */
export function lifeAlpha(p: Particle): number {
  const t = p.age / p.life;
  const fadeIn = Math.min(1, p.age / 0.08);
  const fadeOut = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
  const tw = p.twinkle ? 0.55 + 0.45 * Math.abs(Math.sin(p.age * p.twinkle)) : 1;
  return Math.max(0, p.alpha * fadeIn * fadeOut * fadeOut * tw);
}

// ------------------------------------------------------------- rendering --

export interface Ctx2D {
  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  rotate(a: number): void;
  scale(x: number, y: number): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  quadraticCurveTo(cx: number, cy: number, x: number, y: number): void;
  closePath(): void;
  fill(): void;
  stroke(): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  drawImage(img: CanvasImageSource, x: number, y: number, w: number, h: number): void;
  globalAlpha: number;
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  lineCap: CanvasLineCap;
}

const glowCache = new Map<string, HTMLCanvasElement | OffscreenCanvas>();
export function glowSprite(color: string): HTMLCanvasElement | OffscreenCanvas | null {
  if (typeof document === "undefined" && typeof OffscreenCanvas === "undefined") return null;
  let s = glowCache.get(color);
  if (s) return s;
  const size = 32;
  s = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(size, size) : Object.assign(document.createElement("canvas"), { width: size, height: size });
  const g = s.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (!g) return null;
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.18, color);
  grad.addColorStop(0.5, color + "55");
  grad.addColorStop(1, color + "00");
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  glowCache.set(color, s);
  return s;
}

export function drawParticle(ctx: Ctx2D, p: Particle, alpha: number) {
  if (alpha <= 0.01) return;
  ctx.globalAlpha = alpha;
  switch (p.kind) {
    case Kind.Flash: {
      const t = p.age / p.life;
      const r = p.size * (0.4 + t * 1.6);
      const g = glowSprite(p.color);
      if (g) ctx.drawImage(g as CanvasImageSource, p.x - r, p.y - r, r * 2, r * 2);
      return;
    }
    case Kind.Dot: {
      const g = glowSprite(p.color);
      const r = p.size * 2.6;
      if (g) ctx.drawImage(g as CanvasImageSource, p.x - r, p.y - r, r * 2, r * 2);
      return;
    }
    case Kind.Streak: {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.size;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(p.x - p.vx * p.trail, p.y - p.vy * p.trail);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      const g = glowSprite(p.color);
      if (g) ctx.drawImage(g as CanvasImageSource, p.x - p.size * 2, p.y - p.size * 2, p.size * 4, p.size * 4);
      return;
    }
    case Kind.Star: {
      const s = p.size;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(0, -s * 2);
      ctx.quadraticCurveTo(0, 0, s * 2, 0);
      ctx.quadraticCurveTo(0, 0, 0, s * 2);
      ctx.quadraticCurveTo(0, 0, -s * 2, 0);
      ctx.quadraticCurveTo(0, 0, 0, -s * 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      return;
    }
    case Kind.Diamond: {
      const s = p.size;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(0, -s * 1.4);
      ctx.lineTo(s * 0.8, 0);
      ctx.lineTo(0, s * 1.4);
      ctx.lineTo(-s * 0.8, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      return;
    }
    case Kind.Confetti: {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, Math.cos(p.flip)); // 3-D tumble
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size * 0.9, -p.size * 0.5, p.size * 1.8, p.size);
      ctx.restore();
      return;
    }
    case Kind.Ribbon: {
      // A curling streamer trailing behind its head along the velocity.
      const sp = Math.hypot(p.vx, p.vy) || 1;
      const dx = -p.vx / sp;
      const dy = -p.vy / sp;
      const nx = -dy;
      const ny = dx;
      const seg = p.size * 2.2;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.size * 0.9;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      for (let i = 1; i <= 8; i++) {
        const w = Math.sin(p.age * 6 + i * 0.75 + p.swayPhase) * p.size * 1.6;
        ctx.lineTo(p.x + dx * seg * i + nx * w, p.y + dy * seg * i + ny * w);
      }
      ctx.stroke();
      return;
    }
  }
}
