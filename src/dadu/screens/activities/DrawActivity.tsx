import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { P } from '../../ui/palette';
import { useDadu } from '../../state/DaduContext';
import { Hint, SmallChip } from './common';
import type { ActivityProps } from './common';
import type { Pt } from './logic';

const COLOURS = ['#3A2E2A', '#D9663D', '#2E86AB', '#4E9F3D', '#FFC94D', '#8E4585'];
const W = 300, H = 220;

/** Saves a drawing (as polyline strings) to the child's gallery, capped at 20. */
export async function saveToGallery(childId: string, strokes: { colour: string; points: Pt[] }[]): Promise<void> {
  const key = `dadu.gallery.v1.${childId}`;
  try {
    const raw = await AsyncStorage.getItem(key);
    const list: { at: number; strokes: { colour: string; points: Pt[] }[] }[] = raw ? JSON.parse(raw) : [];
    list.push({ at: Date.now(), strokes });
    await AsyncStorage.setItem(key, JSON.stringify(list.slice(-20)));
  } catch { /* storage unavailable */ }
}

/** draw: a free canvas; "Done" always succeeds (creativity is never graded). */
export function DrawActivity({ prefs, onAnswer, result, disabled }: ActivityProps) {
  const { child } = useDadu();
  const [colour, setColour] = useState(COLOURS[0]);
  const [strokes, setStrokes] = useState<{ colour: string; points: Pt[] }[]>([]);
  const cur = useRef<Pt[]>([]);
  const colourRef = useRef(colour); colourRef.current = colour;
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled,
    onMoveShouldSetPanResponder: () => !disabled,
    onPanResponderGrant: (e) => { cur.current = [{ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY }]; setStrokes((s) => [...s, { colour: colourRef.current, points: cur.current }]); },
    onPanResponderMove: (e) => { cur.current = [...cur.current, { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY }]; setStrokes((s) => [...s.slice(0, -1), { colour: colourRef.current, points: cur.current }]); },
  }), [disabled]);
  const hi = prefs.primary === 'hi';
  const done = async () => { if (child) await saveToGallery(child.id, strokes); onAnswer(strokes.length); };
  return (
    <>
      <Hint text={hi ? 'रंग चुनो और बनाओ। जब मन भर जाए, "पूरा" दबाओ।' : 'Pick a colour and draw. Press "Done" when you are happy.'} />
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 14, marginBottom: 8 }}>
        {COLOURS.map((c) => <Pressable key={c} accessibilityRole="button" accessibilityLabel={c} onPress={() => setColour(c)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c, borderWidth: 3, borderColor: colour === c ? P.saffron : P.line }} />)}
      </View>
      <View style={{ alignItems: 'center' }}>
        <View {...pan.panHandlers} style={{ width: W, height: H, backgroundColor: '#fff', borderRadius: 16, borderWidth: 3, borderColor: result?.ok ? P.ok : P.line, overflow: 'hidden' }}>
          <Svg width={W} height={H}>{strokes.map((st, i) => st.points.length > 1 ? <Polyline key={i} points={st.points.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={st.colour} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" /> : null)}</Svg>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
          <SmallChip label={hi ? 'साफ़' : 'Clear'} onPress={() => setStrokes([])} testID="draw-clear" />
          <SmallChip label={hi ? 'पूरा' : 'Done'} onPress={strokes.length && !result?.ok ? () => void done() : undefined} tone={strokes.length ? undefined : 'muted'} testID="draw-done" />
        </View>
      </View>
    </>
  );
}
