// What a focus session does to the spaces. Called by the session screen.
import { ARTWORKS, FIRST_ART_MINUTES, GRACE_SECONDS, PENALTY_REMOVAL_COINS } from './catalog';
import { SpaceId } from './packTypes';
import { packFor } from './packs';
import { addArtMinutes, addPenalties, clearPenalty, focusVariant, growFocusPlant, growPlacedPlants, nextArtwork, wiltFocusPlant, wiltNewestPlant } from './model';
import { loadArt, loadSpace, saveArt, saveSpace, updateSpace } from './repository';
import { loadRewards, milestonesCrossed, Milestone, saveRewards } from './rewards';

export interface SessionOutcome {
  coinsEarned: number;
  bonusCoins: number;
  coinsTotal: number;
  milestones: Milestone[];
  plant: { name: string; before: string; after: string; revived: boolean; wilted: boolean };
  art: { title: string; newPieces: number; pieces: number; finished: boolean; started: boolean } | null;
}

/** A completed session: coins, the space's focus plant and growable
 * plants grow, the jigsaw gains pieces. `space` is where the person
 * focused (the balcony for picture sessions). */
export async function creditCompletedSession(minutes: number, space: SpaceId = 'balcony'): Promise<SessionOutcome> {
  const rewards = await loadRewards();
  const lifetime = rewards.lifetimeMinutes + minutes;
  const crossed = milestonesCrossed(rewards.lifetimeMinutes, lifetime, rewards.claimedMilestoneIds);
  const bonus = crossed.reduce((s, m) => s + m.coins, 0);
  const nextRewards = {
    ...rewards,
    coins: rewards.coins + minutes + bonus,
    lifetimeMinutes: lifetime,
    completedSessions: rewards.completedSessions + 1,
    claimedMilestoneIds: [...rewards.claimedMilestoneIds, ...crossed.map((m) => m.id)],
  };
  await saveRewards(nextRewards);

  const pack = packFor(space);
  const state = await loadSpace(space);
  const before = focusVariant(pack, state.focus.minutes, state.focus.health);
  const focus = growFocusPlant(state.focus, minutes);
  const after = focusVariant(pack, focus.minutes, focus.health);
  await saveSpace(growPlacedPlants({ ...state, focus }, minutes));

  let art = await loadArt();
  let started = false;
  if (!art.currentId && lifetime >= FIRST_ART_MINUTES) {
    const id = nextArtwork(art);
    if (id) {
      art = { ...art, currentId: id, pieces: 0, seen: 0 };
      started = true;
    }
  }
  const credited = addArtMinutes(art, started ? Math.max(0, lifetime - FIRST_ART_MINUTES) : minutes);
  await saveArt(credited.art);

  const artwork = ARTWORKS.find((a) => a.id === credited.art.currentId);
  return {
    coinsEarned: minutes,
    bonusCoins: bonus,
    coinsTotal: nextRewards.coins,
    milestones: crossed,
    plant: { name: pack.focusPlant.name, before: before.stage, after: after.stage, revived: before.wilted && !after.wilted, wilted: after.wilted },
    art: artwork ? { title: artwork.title, newPieces: credited.newPieces, pieces: credited.art.pieces, finished: credited.finished, started } : null,
  };
}

export interface PausedOutcome {
  wilted: boolean;
  plantName: string;
  /** The penalties placed: a wilted sapling and a broken picture. */
  penalties: number;
}

/** An abandoned session: the focus plant droops, the newest growable
 * plant droops, and a wilted sapling and a broken picture are left in
 * the space. Nothing happens inside the grace period. */
export async function recordPausedSession(space: SpaceId = 'balcony', elapsedSeconds = GRACE_SECONDS + 1): Promise<PausedOutcome | null> {
  if (elapsedSeconds < GRACE_SECONDS) return null;
  const rewards = await loadRewards();
  await saveRewards({ ...rewards, pausedSessions: rewards.pausedSessions + 1 });
  const pack = packFor(space);
  const state = await loadSpace(space);
  const focus = wiltFocusPlant(state.focus);
  const next = await saveSpace(addPenalties(wiltNewestPlant({ ...state, focus })));
  return {
    wilted: focusVariant(pack, focus.minutes, focus.health).wilted,
    plantName: pack.focusPlant.name,
    penalties: next.placed.filter((p) => p.itemId === 'dead_sapling' || p.itemId === 'broken_frame').length,
  };
}

/** Pay coins to remove a penalty object. */
export async function payToClearPenalty(space: SpaceId, itemUid: string): Promise<{ ok: boolean; coins: number }> {
  const rewards = await loadRewards();
  if (rewards.coins < PENALTY_REMOVAL_COINS) return { ok: false, coins: rewards.coins };
  const before = await loadSpace(space);
  const after = clearPenalty(before, itemUid);
  if (after === before) return { ok: false, coins: rewards.coins };
  await saveRewards({ ...rewards, coins: rewards.coins - PENALTY_REMOVAL_COINS });
  await updateSpace(space, () => after);
  return { ok: true, coins: rewards.coins - PENALTY_REMOVAL_COINS };
}
