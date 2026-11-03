import React from 'react';
import type { ActivityKind } from '../../core/content';
import type { ActivityProps } from './common';
import { ChooseActivity } from './ChooseActivity';
import { SortActivity } from './SortActivity';
import { SequenceActivity } from './SequenceActivity';
import { MemoryActivity } from './MemoryActivity';
import { TraceActivity } from './TraceActivity';
import { CountActivity } from './CountActivity';
import { MixColoursActivity } from './MixColoursActivity';
import { PlayNotesActivity } from './PlayNotesActivity';
import { RhythmActivity } from './RhythmActivity';
import { DrawActivity } from './DrawActivity';
import { CodeBlocksActivity } from './CodeBlocksActivity';
import { CircuitActivity } from './CircuitActivity';
import { MazeActivity } from './MazeActivity';
import { BalanceActivity } from './BalanceActivity';

export const ACTIVITY_COMPONENTS: Record<ActivityKind, (p: ActivityProps) => React.ReactElement> = {
  'tap-target': ChooseActivity, choose: ChooseActivity, pattern: ChooseActivity, water: ChooseActivity, feed: ChooseActivity, groom: ChooseActivity, harvest: ChooseActivity,
  sort: SortActivity, clean: SortActivity,
  sequence: SequenceActivity, plant: SequenceActivity, cook: SequenceActivity,
  'play-notes': PlayNotesActivity,
  memory: MemoryActivity, trace: TraceActivity, count: CountActivity, 'mix-colours': MixColoursActivity, rhythm: RhythmActivity, draw: DrawActivity,
  'code-blocks': CodeBlocksActivity, circuit: CircuitActivity, maze: MazeActivity, balance: BalanceActivity,
};

/** Picks the right activity component for a spec. Keyed on spec.kind so a retry remounts cleanly. */
export function ActivityView(props: ActivityProps) {
  const C = ACTIVITY_COMPONENTS[props.spec.kind] ?? ChooseActivity;
  return <C {...props} />;
}

export type { ActivityProps } from './common';
