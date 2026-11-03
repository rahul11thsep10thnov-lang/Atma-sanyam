import React, { useState } from 'react';
import { tx } from '../../i18n';
import { ChoiceCard, Grid, Hint, isLittle } from './common';
import type { ActivityProps } from './common';
import { choiceColumns } from './logic';

/** tap-target, choose, pattern and the in-lesson water/feed/groom/harvest: pick the right picture. */
export function ChooseActivity({ spec, level, prefs, onAnswer, result, disabled }: ActivityProps) {
  const little = isLittle(level);
  const [picked, setPicked] = useState<string | null>(null);
  const items = little ? spec.items.slice(0, 3) : spec.items;
  const toolHint = { water: ['Tap the plant that needs water.', 'उस पौधे को छुओ जिसे पानी चाहिए।'], feed: ['Tap the right food.', 'सही खाना छुओ।'], groom: ['Tap where the brush goes.', 'ब्रश जहाँ जाए उसे छुओ।'], harvest: ['Tap the ripe one.', 'पका हुआ छुओ।'] }[spec.kind as 'water' | 'feed' | 'groom' | 'harvest'];
  return (
    <>
      {toolHint ? <Hint text={prefs.primary === 'hi' ? toolHint[1] : toolHint[0]} /> : null}
      <Grid columns={choiceColumns(items.length, little)}>
        {items.map((it) => (
          <ChoiceCard key={it.key} item={it} prefs={prefs} little={little} disabled={disabled || result?.ok === true} testID={`choice-${it.key}`}
            state={picked === it.key ? (result ? (result.ok ? 'ok' : 'no') : 'selected') : null}
            onPress={() => { setPicked(it.key); onAnswer(it.key); }} />
        ))}
      </Grid>
      {spec.kind === 'pattern' && !little ? <Hint text={tx(spec.prompt, prefs)} /> : null}
    </>
  );
}
