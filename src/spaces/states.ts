// Which lighting state a space shows, and how states that were not
// rendered are derived from the nearest rendered one with a colour veil.
import { LightState, SpacePack } from './packTypes';
import { Atmosphere } from './model';

/** The hour decides: morning, afternoon, sunset, evening, night. */
export function stateForClock(date = new Date()): LightState {
  const h = date.getHours() + date.getMinutes() / 60;
  if (h >= 5 && h < 10.5) return 'morning';
  if (h >= 10.5 && h < 16.5) return 'afternoon';
  if (h >= 16.5 && h < 18.5) return 'sunset';
  if (h >= 18.5 && h < 20.5) return 'evening';
  return 'night';
}

export function resolveState(atmosphere: Atmosphere, date = new Date()): LightState {
  return atmosphere === 'auto' ? stateForClock(date) : atmosphere;
}

export interface Veil {
  color: string;
  opacity: number;
}

/** For a wanted state: which rendered state to draw, and a veil over it. */
export function sourceState(pack: SpacePack, wanted: LightState): { source: LightState; veil: Veil | null } {
  const have = new Set(pack.renderedStates);
  if (have.has(wanted)) return { source: wanted, veil: null };
  const derive: Partial<Record<LightState, [LightState, Veil][]>> = {
    afternoon: [['morning', { color: '#FFFFFF', opacity: 0.06 }]],
    evening: [['sunset', { color: '#1B2140', opacity: 0.42 }], ['night', { color: '#FFB070', opacity: 0.12 }]],
    sunset: [['morning', { color: '#FF8A3D', opacity: 0.22 }]],
    night: [['morning', { color: '#0B1430', opacity: 0.72 }]],
    rain: [['morning', { color: '#3A4350', opacity: 0.4 }]],
    morning: [],
  };
  for (const [src, veil] of derive[wanted] ?? []) {
    if (have.has(src)) return { source: src, veil };
  }
  const first = pack.renderedStates[0] ?? 'morning';
  return { source: first, veil: null };
}

export const ATMOSPHERE_ORDER: Atmosphere[] = ['auto', 'morning', 'afternoon', 'sunset', 'evening', 'night', 'rain'];

export function nextAtmosphere(a: Atmosphere): Atmosphere {
  const i = ATMOSPHERE_ORDER.indexOf(a);
  return ATMOSPHERE_ORDER[(i + 1) % ATMOSPHERE_ORDER.length];
}

export function isDark(state: LightState): boolean {
  return state === 'evening' || state === 'night';
}
