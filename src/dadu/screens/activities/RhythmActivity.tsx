import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { P, FONT } from '../../ui/palette';
import { Hint, SmallChip, isLittle } from './common';
import type { ActivityProps } from './common';
import { rhythmSpec } from './logic';

/** rhythm: a visual four-beat metronome; tap once per beat. Taps are timestamps for the engine. */
export function RhythmActivity({ spec, level, prefs, onAnswer, result, disabled }: ActivityProps) {
  const little = isLittle(level);
  const { beatMs, taps: needed } = rhythmSpec(spec.items);
  const [beat, setBeat] = useState(0);
  const [running, setRunning] = useState(false);
  const [taps, setTaps] = useState<number[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const hi = prefs.primary === 'hi';
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);
  const start = () => { setTaps([]); setBeat(0); setRunning(true); if (timer.current) clearInterval(timer.current); timer.current = setInterval(() => setBeat((b) => (b + 1) % 4), beatMs); };
  const tap = () => {
    if (!running || disabled) return;
    const next = [...taps, Date.now()];
    setTaps(next);
    if (next.length >= needed) { setRunning(false); if (timer.current) clearInterval(timer.current); onAnswer(next); }
  };
  return (
    <>
      <Hint text={hi ? `हर ताल पर एक बार छुओ (${needed} बार)।` : `Tap once on every beat (${needed} taps).`} />
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 14, marginVertical: 10 }}>
        {[0, 1, 2, 3].map((i) => <View key={i} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: running && beat === i ? P.saffron : P.line }} />)}
      </View>
      <View style={{ alignItems: 'center', gap: 10 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={hi ? 'ताल' : 'beat'} testID="rhythm-tap" onPress={tap} style={({ pressed }) => ({ width: little ? 180 : 140, height: little ? 180 : 140, borderRadius: 999, backgroundColor: pressed ? P.saffron : P.marigold, borderWidth: 6, borderColor: result ? (result.ok ? P.ok : P.retry) : '#C98310', alignItems: 'center', justifyContent: 'center' })}>
          <Text style={{ fontFamily: FONT.displayHeavy, fontSize: 22, color: '#2A1A05' }}>{taps.length}/{needed}</Text>
        </Pressable>
        {!running ? <SmallChip label={taps.length ? (hi ? 'फिर से' : 'Again') : (hi ? 'शुरू' : 'Start')} onPress={result?.ok ? undefined : start} testID="rhythm-start" /> : null}
      </View>
    </>
  );
}
