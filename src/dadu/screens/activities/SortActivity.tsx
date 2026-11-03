import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { tx } from '../../i18n';
import { ChoiceCard, Grid, Hint, SmallChip, Zone, isLittle } from './common';
import type { ActivityProps } from './common';
import { sortZones } from './logic';

const ZONE_NAMES: Record<string, [string, string]> = { half: ['Halves', 'आधे'], quarter: ['Quarters', 'चौथाई'], asia: ['Asia', 'एशिया'], africa: ['Africa', 'अफ़्रीका'], plain: ['No matra', 'बिना मात्रा'], matra: ['With matra', 'मात्रा के साथ'], yes: ['Yes', 'हाँ'], no: ['No', 'नहीं'], attracted: ['Attracted', 'खिंचे'], not: ['Not attracted', 'नहीं खिंचे'], living: ['Living', 'सजीव'], nonliving: ['Non-living', 'निर्जीव'], wet: ['Wet waste', 'गीला कचरा'], dry: ['Dry waste', 'सूखा कचरा'] };

/** sort and clean: tap an item, then tap the zone it belongs to. */
export function SortActivity({ spec, level, prefs, onAnswer, result, disabled }: ActivityProps) {
  const little = isLittle(level);
  const zones = useMemo(() => sortZones(spec.items), [spec]);
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [held, setHeld] = useState<string | null>(null);
  const items = spec.items.filter((i) => i.group !== undefined);
  const zoneName = (z: string) => { const n = ZONE_NAMES[z]; return n ? (prefs.primary === 'hi' ? n[1] : n[0]) : z.replace(/[_-]/g, ' '); };
  const place = (z: string) => {
    if (!held) return;
    const next = { ...placed, [held]: z };
    setPlaced(next); setHeld(null);
    if (Object.keys(next).length === items.length) onAnswer(next);
  };
  const reset = () => { setPlaced({}); setHeld(null); };
  const hi = prefs.primary === 'hi';
  return (
    <>
      <Hint text={hi ? 'पहले चीज़ छुओ, फिर उसका डिब्बा।' : 'Tap an item, then tap its box.'} />
      <Grid columns={little ? 2 : 3}>
        {items.filter((i) => !placed[i.key]).map((it) => <ChoiceCard key={it.key} item={it} prefs={prefs} little={little} compact={!little} state={held === it.key ? 'selected' : null} disabled={disabled} testID={`choice-${it.key}`} onPress={() => setHeld(held === it.key ? null : it.key)} />)}
      </Grid>
      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 14 }}>
        {zones.map((z) => (
          <Zone key={z} label={zoneName(z)} active={!!held} onPress={() => place(z)} testID={`zone-${z}`}>
            {items.filter((i) => placed[i.key] === z).map((i) => <SmallChip key={i.key} label={tx(i.label, prefs)} tone={result ? (i.group === z ? 'ok' : 'muted') : undefined} onPress={result?.ok ? undefined : () => { const n = { ...placed }; delete n[i.key]; setPlaced(n); }} />)}
          </Zone>
        ))}
      </View>
      {result && !result.ok ? <View style={{ paddingHorizontal: 14, marginTop: 8 }}><SmallChip label={hi ? 'फिर से लगाओ' : 'Place them again'} onPress={reset} testID="sort-reset" /></View> : null}
    </>
  );
}
