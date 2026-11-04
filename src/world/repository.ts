// Saving the 3D world: its own key, written with the same "never overwrite
// what could not be read" rules as the rest of the app (src/storage/safeStore).
// The existing garden key (focus.paradise.v1) is only ever READ by the world.
import { preserveUnreadable, readJson, writeJson } from '../storage/safeStore';
import { WorldState, initialWorld, isWorld } from './model';

import { WORLD_KEY } from './repository.keys';
export { WORLD_KEY };

let memo: WorldState | null = null;

export async function loadWorld(now = Date.now()): Promise<WorldState> {
  if (memo) return memo;
  const read = await readJson<WorldState>(WORLD_KEY);
  let w = read.value;
  if (w && !isWorld(w)) {
    // a world this version can't use is kept aside, never silently replaced
    await preserveUnreadable(WORLD_KEY, JSON.stringify(w));
    w = null;
  }
  memo = w ?? initialWorld(now);
  return memo;
}

export async function saveWorld(w: WorldState): Promise<boolean> {
  memo = w;
  return writeJson(WORLD_KEY, w);
}

/** For tests. */
export function forgetWorldCache(): void {
  memo = null;
}
