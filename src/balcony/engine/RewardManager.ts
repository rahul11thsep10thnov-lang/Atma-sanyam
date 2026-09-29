import { RewardRule } from '../types';
import { REWARD_TABLE } from '../config/rewardConfig';

/** Every rule whose minute threshold falls strictly between the previous and
 * new lifetime totals, and hasn't already been claimed. Order matters — a
 * big jump (e.g. the demo's "+60 minutes" button) can cross several
 * milestones in one step, and they should unlock in ascending order. */
export function getNewlyUnlockedRules(
  previousTotalMinutes: number,
  newTotalMinutes: number,
  claimedRewardIds: string[],
  table: RewardRule[] = REWARD_TABLE,
): RewardRule[] {
  return table
    .filter((rule) => !claimedRewardIds.includes(rule.id))
    .filter((rule) => rule.minutes > previousTotalMinutes && rule.minutes <= newTotalMinutes)
    .sort((a, b) => a.minutes - b.minutes);
}

/** The next locked milestone, for UI copy like "42 more minutes to unlock…". */
export function getNextRule(
  totalMinutes: number,
  claimedRewardIds: string[],
  table: RewardRule[] = REWARD_TABLE,
): RewardRule | null {
  const upcoming = table
    .filter((rule) => !claimedRewardIds.includes(rule.id) && rule.minutes > totalMinutes)
    .sort((a, b) => a.minutes - b.minutes);
  return upcoming[0] ?? null;
}
