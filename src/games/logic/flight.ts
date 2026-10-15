// Paper Airplane flight model: a toy but honest glider. Distance depends on
// throw power (too hard stalls), launch angle (best around 10–15°), nose
// weight (balances the glide) and wing shape, plus a seeded breeze.

export interface Design { nose: 0 | 1 | 2; wings: 'narrow' | 'standard' | 'wide'; flaps: -1 | 0 | 1 }
export interface Throw { power: number; angle: number }

export function glide(design: Design, t: Throw, wind: number): { distance: number; path: [number, number][] } {
  const lift = design.wings === 'wide' ? 1.25 : design.wings === 'narrow' ? 0.8 : 1;
  const drag = design.wings === 'wide' ? 1.2 : design.wings === 'narrow' ? 0.85 : 1;
  const mass = 1 + design.nose * 0.25;
  // A stable plane has a bit of nose weight and neutral/slightly-up flaps.
  const stability = 1 - Math.abs(design.nose - 1) * 0.15 - Math.abs(design.flaps) * 0.1;
  const bestAngle = 12;
  const angleFactor = Math.max(0.2, 1 - Math.abs(t.angle - bestAngle) / 45);
  const p = Math.max(0, Math.min(1, t.power));
  const powerFactor = p < 0.85 ? p : Math.max(0.3, 1.7 - p); // overthrow → stall
  const base = 32 * powerFactor * angleFactor * stability * (lift / drag) / Math.sqrt(mass) * mass; // metres
  const distance = Math.max(1, base + wind * 3);
  // Path for drawing: parabola-ish glide.
  const h0 = 1.5;
  const peak = h0 + (t.angle / 45) * 4 * p;
  const path: [number, number][] = [];
  for (let i = 0; i <= 24; i++) {
    const x = (distance * i) / 24;
    const f = i / 24;
    const y = f < 0.3 ? h0 + (peak - h0) * (f / 0.3) : peak * (1 - (f - 0.3) / 0.7) ** 1.3;
    path.push([x, Math.max(0, y)]);
  }
  return { distance: Math.round(distance * 10) / 10, path };
}

export function starsForDistance(best: number): number {
  return best >= 28 ? 3 : best >= 18 ? 2 : best >= 8 ? 1 : 0;
}
