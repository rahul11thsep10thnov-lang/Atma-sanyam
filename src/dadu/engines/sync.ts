// Offline-first sync: merge a local WorldState with the server copy without
// losing progress, and turn local changes into an idempotent event batch.
import type { WorldState } from '../core/worldState';

export interface ProgressEvent { clientId: string; type: string; at: number; payload: Record<string, unknown> }

const byId = <T extends { id: string }>(list: T[]) => new Map(list.map((x) => [x.id, x]));

export function mergeWorld(local: WorldState, remote: WorldState | null): WorldState {
  if (!remote) return local;
  const plants = new Map(byId(remote.plants));
  for (const p of local.plants) {
    const r = plants.get(p.id);
    plants.set(p.id, !r || Math.max(p.lastWateredAt, p.plantedAt) >= Math.max(r.lastWateredAt, r.plantedAt) ? p : r);
  }
  const animals = remote.animals.map((ra) => {
    const la = local.animals.find((a) => a.key === ra.key);
    return la && la.lastCaredAt >= ra.lastCaredAt ? la : ra;
  });
  for (const la of local.animals) if (!animals.some((a) => a.key === la.key)) animals.push(la);
  const objects = { ...remote.objects };
  for (const [id, o] of Object.entries(local.objects)) {
    const r = objects[id];
    objects[id] = !r || (o.lastInteractedAt ?? 0) >= (r.lastInteractedAt ?? 0) ? { ...o, completions: Math.max(o.completions, r?.completions ?? 0) } : { ...r, completions: Math.max(o.completions, r.completions) };
  }
  const mastery = { ...remote.mastery };
  for (const [c, m] of Object.entries(local.mastery)) if (!mastery[c] || m.lastSeenAt >= mastery[c].lastSeenAt) mastery[c] = m;
  const assignments = { ...remote.assignments };
  for (const [id, a] of Object.entries(local.assignments)) {
    const r = assignments[id];
    if (!r || a.status === 'completed' || (r.status !== 'completed' && a.status === 'started')) assignments[id] = a;
  }
  const union = (a: string[], b: string[]) => [...new Set([...a, ...b])];
  const inventory = { ...remote.inventory };
  for (const [k, v] of Object.entries(local.inventory)) inventory[k] = local.tickedAt >= remote.tickedAt ? v : Math.max(v, inventory[k] ?? 0);
  return {
    ...(local.tickedAt >= remote.tickedAt ? local : remote),
    plants: [...plants.values()],
    animals,
    objects,
    mastery,
    assignments,
    inventory,
    rewards: {
      stars: Math.max(local.rewards.stars, remote.rewards.stars),
      coins: Math.max(local.rewards.coins, remote.rewards.coins),
      badges: union(local.rewards.badges, remote.rewards.badges),
      certificates: union(local.rewards.certificates, remote.rewards.certificates),
    },
    lessonsCompleted: union(remote.lessonsCompleted, local.lessonsCompleted),
    storiesRead: union(remote.storiesRead, local.storiesRead),
    decorations: union(remote.decorations, local.decorations),
    unlockedLocations: union(remote.unlockedLocations, local.unlockedLocations),
    echoQueue: local.echoQueue,
    tickedAt: Math.max(local.tickedAt, remote.tickedAt),
  };
}

/** Events for everything in `next` that `prev` did not have; client ids are stable for the same change. */
export function diffEvents(prev: WorldState, next: WorldState, childId: string): ProgressEvent[] {
  const out: ProgressEvent[] = [];
  const at = next.tickedAt;
  for (const id of next.lessonsCompleted) if (!prev.lessonsCompleted.includes(id)) out.push({ clientId: `${childId}:lesson:${id}`, type: 'lesson.completed', at, payload: { lessonId: id } });
  for (const id of next.storiesRead) if (!prev.storiesRead.includes(id)) out.push({ clientId: `${childId}:story:${id}`, type: 'story.read', at, payload: { storyId: id } });
  for (const b of next.rewards.badges) if (!prev.rewards.badges.includes(b)) out.push({ clientId: `${childId}:badge:${b}`, type: 'badge.earned', at, payload: { badgeId: b } });
  for (const [id, a] of Object.entries(next.assignments)) {
    if (a.status === 'completed' && prev.assignments[id]?.status !== 'completed') out.push({ clientId: `${childId}:rwa:${id}:${a.completedAt}`, type: 'assignment.completed', at, payload: { assignmentId: id, note: a.note ?? null, photoId: a.photoId ?? null } });
  }
  for (const [c, m] of Object.entries(next.mastery)) {
    const p = prev.mastery[c];
    if (!p || p.attempts !== m.attempts) out.push({ clientId: `${childId}:mastery:${c}:${m.attempts}`, type: 'mastery.updated', at, payload: { concept: c, score: m.score, attempts: m.attempts, nextReviewAt: m.nextReviewAt } });
  }
  return out;
}
