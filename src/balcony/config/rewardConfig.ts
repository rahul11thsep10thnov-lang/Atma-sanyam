import { RewardRule } from '../types';

/** Sentinel id: when a rule's unlockObjectId is this, the reward routes to the
 * artwork/puzzle system (ArtworkState) rather than the generic object table. */
export const ARTWORK_REWARD_ID = 'special-artwork';

/** Lifetime focus minutes -> unlock, configurable rather than hard-coded
 * (section 7). Edit this table — nothing else — to retune the pacing or add
 * new milestones; BalconyEngine reads it purely by minute threshold. */
export const REWARD_TABLE: RewardRule[] = [
  { id: 'reward-10', minutes: 10, unlockObjectId: 'plant-small' },
  { id: 'reward-25', minutes: 25, unlockObjectId: 'pot-terracotta' },
  { id: 'reward-45', minutes: 45, unlockObjectId: 'plant-flower' },
  { id: 'reward-60', minutes: 60, unlockObjectId: 'planter-hanging' },
  { id: 'reward-90', minutes: 90, unlockObjectId: 'chair-wood' },
  { id: 'reward-120', minutes: 120, unlockObjectId: 'wall-decoration' },
  { id: 'reward-180', minutes: 180, unlockObjectId: 'plant-tree' },
  { id: 'reward-300', minutes: 300, unlockObjectId: 'lighting-lantern' },
  { id: 'reward-500', minutes: 500, unlockObjectId: ARTWORK_REWARD_ID },
];
