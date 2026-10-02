// What a focus session does to the balcony. Called by the session screen.
import { ARTWORKS, FIRST_ART_MINUTES } from './catalog';
import { addArtMinutes, focusVariant, growFocusPlant, nextArtwork, wiltFocusPlant } from './model';
import { loadBalcony, saveBalcony } from './repository';
import { loadRewards, milestonesCrossed, Milestone, saveRewards } from './rewards';

export interface SessionOutcome {
  coinsEarned: number;
  bonusCoins: number;
  coinsTotal: number;
  milestones: Milestone[];
  plant: { before: string; after: string; revived: boolean; wilted: boolean };
  art: { title: string; newPieces: number; pieces: number; finished: boolean; started: boolean } | null;
}

export async function creditCompletedSession(minutes: number): Promise<SessionOutcome> {
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

  const state = await loadBalcony();
  const before = focusVariant(state.focus.minutes, state.focus.health);
  const focus = growFocusPlant(state.focus, minutes);
  const after = focusVariant(focus.minutes, focus.health);

  let art = state.art;
  let started = false;
  if (!art.currentId && lifetime >= FIRST_ART_MINUTES) {
    const id = nextArtwork(art);
    if (id) {
      art = { ...art, currentId: id, pieces: 0, seen: 0 };
      started = true;
    }
  }
  const credited = addArtMinutes(art, started ? Math.max(0, lifetime - FIRST_ART_MINUTES) : minutes);
  await saveBalcony({ ...state, focus, art: credited.art });

  const artwork = ARTWORKS.find((a) => a.id === credited.art.currentId);
  return {
    coinsEarned: minutes,
    bonusCoins: bonus,
    coinsTotal: nextRewards.coins,
    milestones: crossed,
    plant: { before: before.stage, after: after.stage, revived: before.wilted && !after.wilted, wilted: after.wilted },
    art: artwork ? { title: artwork.title, newPieces: credited.newPieces, pieces: credited.art.pieces, finished: credited.finished, started } : null,
  };
}

export async function recordPausedSession(): Promise<{ wilted: boolean }> {
  const rewards = await loadRewards();
  await saveRewards({ ...rewards, pausedSessions: rewards.pausedSessions + 1 });
  const state = await loadBalcony();
  const focus = wiltFocusPlant(state.focus);
  await saveBalcony({ ...state, focus });
  return { wilted: focusVariant(focus.minutes, focus.health).wilted };
}
