// What a focus session does to the world. Called by the session screen.
// A completed session pays coins, grows the focus plant of the space it
// happened in and every growable plant there, turns a picture session of
// thirty minutes or more into a framed artwork, and notices any plant
// that just reached full growth (which earns a new one to place).
import { GRACE_SECONDS, PENALTY_REMOVAL_COINS } from './catalog';
import { SpaceId } from './packTypes';
import { packFor } from './packs';
import { addPenalties, clearPenalty, focusVariant, growFocusPlant, growPlacedPlants, wiltFocusPlant, wiltNewestPlant } from './model';
import { loadSpace, saveSpace, updateSpace } from './repository';
import { loadRewards, milestonesCrossed, Milestone, saveRewards } from './rewards';
import { loadGarden, saveGarden } from '../garden/repository';
import { growFocus as growGardenFocus, growPlants as growGardenPlants, wiltFocus as wiltGardenFocus, wiltNewest as wiltGardenNewest, addPenalties as addGardenPenalties, penaltyCount } from '../garden/model';
import { SPRITES } from '../garden/sprites.generated';
import { STAGE_WORDS, WILT_BELOW, stageIndexFor } from './model';
import { ArtworkRecord, JigsawTier, newArtwork, tierForMinutes, addArtwork } from '../collection/model';
import { loadCollection, saveCollection } from '../collection/repository';
import { ImageRef } from '../types';

export interface MaturedPlant {
  /** Where it grew. */
  space: SpaceId;
  uid: string;
  itemId: string;
  name: string;
}

export interface SessionOutcome {
  coinsEarned: number;
  bonusCoins: number;
  coinsTotal: number;
  milestones: Milestone[];
  plant: { name: string; before: string; after: string; revived: boolean; wilted: boolean };
  /** The framed jigsaw this session earned, if it was a picture session of 30 minutes or more. */
  artwork: ArtworkRecord | null;
  /** The picture was revealed but the session was too short for a jigsaw. */
  tooShortForJigsaw: boolean;
  /** Plants that just reached full growth: each earns a new one. */
  matured: MaturedPlant[];
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

/** A completed session. `space` is where the person focused (the balcony
 * for picture sessions); `image` is what they focused on; `aspect` the
 * picture's width/height when known. */
export async function creditCompletedSession(minutes: number, space: SpaceId = 'balcony', image?: ImageRef, aspect = 0.75): Promise<SessionOutcome> {
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

  let plant: SessionOutcome['plant'];
  const matured: MaturedPlant[] = [];
  if (space === 'garden') {
    const g = await loadGarden();
    const tree = SPRITES.focusTree;
    const stageOf = (m: number) => (tree ? tree.stages[stageIndexFor(tree.stages as never, m)]?.id ?? '' : '');
    const beforeWilted = g.focus.health < WILT_BELOW;
    const grown = growGardenFocus(g, minutes);
    const r = growGardenPlants(grown, minutes);
    await saveGarden(r.state);
    for (const it of r.matured) matured.push({ space: 'garden', uid: it.uid, itemId: it.itemId, name: SPRITES.items[it.itemId]?.name ?? it.itemId });
    const afterWilted = r.state.focus.health < WILT_BELOW;
    plant = { name: tree?.name ?? 'Tree', before: stageOf(g.focus.minutes), after: stageOf(r.state.focus.minutes), revived: beforeWilted && !afterWilted, wilted: afterWilted };
  } else {
    const pack = packFor(space);
    const state = await loadSpace(space);
    const before = focusVariant(pack, state.focus.minutes, state.focus.health);
    const focus = growFocusPlant(state.focus, minutes);
    const after = focusVariant(pack, focus.minutes, focus.health);
    const next = growPlacedPlants({ ...state, focus }, minutes);
    // plants that just reached their last stage
    for (const p of next.placed) {
      const item = pack.items[p.itemId];
      const stages = item?.growable ? item.stages?.[p.slot] : undefined;
      if (!stages?.length) continue;
      const prev = state.placed.find((q) => q.uid === p.uid);
      const b = stageIndexFor(stages, prev?.minutes ?? 0);
      const a = stageIndexFor(stages, p.minutes ?? 0);
      if (a === stages.length - 1 && b < a) matured.push({ space, uid: p.uid, itemId: p.itemId, name: item.name });
    }
    await saveSpace(next);
    plant = { name: pack.focusPlant.name, before: before.stage, after: after.stage, revived: before.wilted && !after.wilted, wilted: after.wilted };
  }

  let artwork: ArtworkRecord | null = null;
  let tooShort = false;
  if (image && image.kind !== 'space' && image.kind !== 'balcony') {
    const tier = tierForMinutes(minutes);
    if (tier) {
      artwork = artworkFrom(image, tier, minutes, aspect);
      if (artwork) {
        const c = await loadCollection();
        await saveCollection(addArtwork(c, artwork));
      }
    } else tooShort = true;
  }

  return { coinsEarned: minutes, bonusCoins: bonus, coinsTotal: nextRewards.coins, milestones: crossed, plant, artwork, tooShortForJigsaw: tooShort, matured };
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
  if (space === 'garden') {
    const g = await loadGarden();
    const next = await saveGarden(addGardenPenalties(wiltGardenNewest(wiltGardenFocus(g))));
    return { wilted: next.focus.health < WILT_BELOW, plantName: SPRITES.focusTree?.name ?? 'Tree', penalties: penaltyCount(next) };
  }
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

/** Pay coins to remove a penalty object from a photographed space. */
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
