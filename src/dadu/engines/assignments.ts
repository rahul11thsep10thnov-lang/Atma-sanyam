// Dadaji's Real World Adventures: lifecycle, consent rules and supervision gating. Pure.
import type { AgeBand } from '../core/ageBands';
import type { Assignment } from '../core/content';
import type { WorldState } from '../core/worldState';
import { grant } from './rewards';

export type Tier = Assignment['supervision'];
export const TIER_ORDER: Tier[] = ['self', 'nearby', 'assist', 'together'];

/** Younger bands never get a "self" adventure; A0 is always together. */
export function effectiveTier(a: Assignment, band: AgeBand): Tier {
  if (band === 'A0') return 'together';
  if ((band === 'A1' || band === 'A2') && a.supervision === 'self') return 'nearby';
  return a.supervision;
}

export function allowedForBand(a: Assignment, band: AgeBand): boolean {
  return a.meta.bands.includes(band);
}

export type AssignmentStatus = NonNullable<WorldState['assignments'][string]>['status'];

export function statusOf(w: WorldState, id: string): AssignmentStatus {
  return w.assignments[id]?.status ?? 'available';
}

export function startAssignment(w: WorldState, a: Assignment, band: AgeBand): WorldState {
  if (!allowedForBand(a, band) || statusOf(w, a.meta.id) !== 'available') return w;
  return { ...w, assignments: { ...w.assignments, [a.meta.id]: { status: 'started' } } };
}

export interface Completion { parentConfirmed: boolean; note?: string; photoId?: string; photosAllowed: boolean; now: number }

/** Completion requires a parent; a photo is stored only when the parent allows photos. A badge rewards participation. */
export function completeAssignment(w: WorldState, a: Assignment, c: Completion): { world: WorldState; error?: 'needs-parent' | 'not-started' | 'photo-not-allowed' } {
  if (!c.parentConfirmed) return { world: w, error: 'needs-parent' };
  const st = statusOf(w, a.meta.id);
  if (st === 'completed') return { world: w };
  if (c.photoId && !c.photosAllowed) return { world: w, error: 'photo-not-allowed' };
  const entry = { status: 'completed' as const, completedAt: c.now, note: c.note?.slice(0, 280), photoId: c.photosAllowed ? c.photoId : undefined };
  const next = { ...w, assignments: { ...w.assignments, [a.meta.id]: entry } };
  const household = a.meta.subject === 'household' || a.meta.subject === 'life-skills';
  const householdDone = Object.keys(next.assignments).filter((k) => k.startsWith('rwa.household') || k.startsWith('rwa.life')).length;
  return { world: grant(next, { stars: 1, coins: 10, badges: [a.badge, ...(household && householdDone >= 3 ? ['helper'] : [])] }) };
}

export function assignmentsFor(all: Assignment[], band: AgeBand, lessonId?: string): Assignment[] {
  return all.filter((a) => allowedForBand(a, band) && (!lessonId || a.lesson === lessonId));
}
