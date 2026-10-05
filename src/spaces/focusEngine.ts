// What a focus session does to the world. Called by the session screen.
// A completed session pays coins; a plant session grows one new plant in
// the paradise garden, sized by its minutes; a balcony session grows the
// balcony's peace lily; a picture session of fifteen minutes or more
// becomes a framed artwork. An abandoned session leaves a wilted sapling
// where the plant would have stood (or, on the balcony, its penalties).
import { GRACE_SECONDS, PENALTY_REMOVAL_COINS } from './catalog';
import { SpaceId } from './packTypes';
import { packFor } from './packs';
import { addPenalties, clearPenalty, focusVariant, growFocusPlant, growPlacedPlants, wiltFocusPlant, wiltNewestPlant } from './model';
import { loadSpace, saveSpace, updateSpace } from './repository';
import { loadRewards, milestonesCrossed, Milestone, saveRewards } from './rewards';
import { STAGE_WORDS } from './model';
import { ArtworkRecord, JigsawTier, newArtwork, tierForMinutes, addArtwork } from '../collection/model';
import { loadCollection, saveCollection } from '../collection/repository';
import { PlantGrowthSize } from '../growth/size';
import { SPECIES_BY_ID, SegmentId } from '../paradise/catalog';
import { addPenalty as addParadisePenalty, plantFromSession } from '../paradise/model';
import { loadParadise, saveParadise } from '../paradise/repository';
import { ImageRef } from '../types';

export interface NewPlant {
  id: string;
  speciesId: string;
  name: string;
  size: PlantGrowthSize;
  segment: SegmentId;
}

export interface SessionOutcome {
  coinsEarned: number;
  bonusCoins: number;
  coinsTotal: number;
  milestones: Milestone[];
  /** The balcony's focus plant, for balcony sessions. */
  plant: { name: string; before: string; after: string; revived: boolean; wilted: boolean } | null;
  /** The plant a plant session grew. */
  newPlant: NewPlant | null;
  /** The framed jigsaw a picture session earned. */
  artwork: ArtworkRecord | null;
  /** The picture was revealed but the session was too short for a jigsaw. */
  tooShortForJigsaw: boolean;
}

function titleFor(image: ImageRef): string {
  if (image.kind === 'remote') return image.title;
  if (image.kind === 'custom') return 'My photo';
  if (image.kind === 'quote') return image.quote.author;
  return 'Picture';
}

function artworkFrom(image: ImageRef, tier: JigsawTier, minutes: number, aspect: number): ArtworkRecord | null {
  if (image.kind === 'remote') return newArtwork({ title: image.title, category: image.category ?? 'library', source: { kind: 'remote', uri: image.uri, imageId: image.imageId }, aspect, tier, minutes });
  if (image.kind === 'custom') return newArtwork({ title: titleFor(image), category: 'user_upload', source: { kind: 'custom', uri: image.uri }, aspect, tier, minutes });
  if (image.kind === 'art') return newArtwork({ title: titleFor(image), category: 'abstract', source: { kind: 'builtin', moduleId: image.uri }, aspect, tier, minutes });
  return null;
}

/** A completed session. `image` is what the person focused on; `sessionId`
 * makes the reward idempotent; `aspect` is a picture's width/height. */
export async function creditCompletedSession(minutes: number, image: ImageRef, sessionId: string, aspect = 0.75): Promise<SessionOutcome> {
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

  let plant: SessionOutcome['plant'] = null;
  let newPlant: NewPlant | null = null;
  if (image.kind === 'plant') {
    const paradise = await loadParadise();
    const r = plantFromSession(paradise, image.speciesId, minutes, sessionId);
    if (r.plant) {
      await saveParadise(r.state);
      newPlant = { id: r.plant.id, speciesId: r.plant.speciesId, name: SPECIES_BY_ID[r.plant.speciesId]?.name ?? r.plant.speciesId, size: r.plant.size, segment: r.plant.segment };
    }
  } else if (image.kind === 'space' || image.kind === 'balcony') {
    const space: SpaceId = 'balcony';
    const pack = packFor(space);
    const state = await loadSpace(space);
    const before = focusVariant(pack, state.focus.minutes, state.focus.health);
    const focus = growFocusPlant(state.focus, minutes);
    const after = focusVariant(pack, focus.minutes, focus.health);
    await saveSpace(growPlacedPlants({ ...state, focus }, minutes));
    plant = { name: pack.focusPlant.name, before: before.stage, after: after.stage, revived: before.wilted && !after.wilted, wilted: after.wilted };
  }

  let artwork: ArtworkRecord | null = null;
  let tooShort = false;
  if (image.kind !== 'space' && image.kind !== 'balcony' && image.kind !== 'plant') {
    const tier = tierForMinutes(minutes);
    if (tier) {
      artwork = artworkFrom(image, tier, minutes, aspect);
      if (artwork) {
        const c = await loadCollection();
        await saveCollection(addArtwork(c, artwork));
      }
    } else tooShort = true;
  }

  return { coinsEarned: minutes, bonusCoins: bonus, coinsTotal: nextRewards.coins, milestones: crossed, plant, newPlant, artwork, tooShortForJigsaw: tooShort };
}

export interface PausedOutcome {
  wilted: boolean;
  plantName: string;
  /** Where the wilted sapling was left: the balcony, or a garden segment. */
  where: 'balcony' | SegmentId;
  penalties: number;
}

/** An abandoned session. On the balcony the focus plant droops and a
 * wilted sapling and a broken picture are left; a plant session leaves a
 * wilted sapling in the segment the plant was meant for. Nothing happens
 * inside the grace period, and no plant ever grows from it. */
export async function recordPausedSession(image: ImageRef, elapsedSeconds = GRACE_SECONDS + 1): Promise<PausedOutcome | null> {
  if (elapsedSeconds < GRACE_SECONDS) return null;
  const rewards = await loadRewards();
  await saveRewards({ ...rewards, pausedSessions: rewards.pausedSessions + 1 });
  if (image.kind === 'plant') {
    const species = SPECIES_BY_ID[image.speciesId];
    const segment = species?.segment ?? 'flowers';
    const paradise = await loadParadise();
    await saveParadise(addParadisePenalty(paradise, segment));
    return { wilted: false, plantName: species?.name ?? image.speciesId, where: segment, penalties: 1 };
  }
  const space: SpaceId = 'balcony';
  const pack = packFor(space);
  const state = await loadSpace(space);
  const focus = wiltFocusPlant(state.focus);
  const next = await saveSpace(addPenalties(wiltNewestPlant({ ...state, focus })));
  return {
    wilted: focusVariant(pack, focus.minutes, focus.health).wilted,
    plantName: pack.focusPlant.name,
    where: 'balcony',
    penalties: next.placed.filter((p) => p.itemId === 'dead_sapling' || p.itemId === 'broken_frame').length,
  };
}

/** Pay coins to remove a penalty object from the balcony. */
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

export { STAGE_WORDS };
