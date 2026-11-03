import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, View, Text } from 'react-native';
import Svg, { Circle, Path, Polyline } from 'react-native-svg';
import { P, FONT } from '../../ui/palette';
import { tx } from '../../i18n';
import { Hint, SmallChip } from './common';
import type { ActivityProps } from './common';
import { samplePath, templateFor, traceCoverage } from './logic';
import type { Pt } from './logic';

const SIZE = 220;

/** trace: draw over a dotted glyph with a finger; coverage ≥ 70 % completes. */
export function TraceActivity({ spec, prefs, onAnswer, result, disabled }: ActivityProps) {
  const item = spec.items[0];
  const strokes = useMemo(() => templateFor(item?.key ?? 'o'), [item]);
  const template = useMemo(() => strokes.flatMap((st) => samplePath(st, 10)), [strokes]);
  const [drawn, setDrawn] = useState<Pt[][]>([]);
  const cur = useRef<Pt[]>([]);
  const box = useRef({ x: 0, y: 0 });
  const [coverage, setCoverage] = useState(0);
  const scale = SIZE / 200;
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled,
    onMoveShouldSetPanResponder: () => !disabled,
    onPanResponderGrant: (e) => { cur.current = [{ x: e.nativeEvent.locationX / scale, y: e.nativeEvent.locationY / scale }]; },
    onPanResponderMove: (e) => { cur.current = [...cur.current, { x: e.nativeEvent.locationX / scale, y: e.nativeEvent.locationY / scale }]; setDrawn((d) => [...d.slice(0, -1), cur.current]); },
    onPanResponderRelease: () => { setDrawn((d) => { const all = [...d.slice(0, -1), cur.current]; const cov = traceCoverage(template, all.flat()); setCoverage(cov); onAnswer(cov); return [...all, []]; }); cur.current = []; },
  }), [disabled, scale, template, onAnswer]);
  const hi = prefs.primary === 'hi';
  return (
    <>
      <Hint text={hi ? 'बिंदुओं पर उँगली चलाओ।' : 'Run your finger over the dots.'} />
      <View style={{ alignItems: 'center' }}>
        <View {...pan.panHandlers} onLayout={(e) => { box.current = { x: e.nativeEvent.layout.x, y: e.nativeEvent.layout.y }; }} style={{ width: SIZE, height: SIZE, backgroundColor: P.card, borderRadius: 20, borderWidth: 3, borderColor: result?.ok ? P.ok : P.line }}>
          <Svg width={SIZE} height={SIZE} viewBox="0 0 200 200">
            {template.map((p, i) => <Circle key={i} cx={p.x} cy={p.y} r={3} fill={P.line} />)}
            {drawn.map((st, i) => st.length > 1 ? <Polyline key={i} points={st.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={P.indigo} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" /> : null)}
            {strokes.map((st, i) => <Path key={`g${i}`} d={st.map((p, j) => `${j ? 'L' : 'M'}${p.x} ${p.y}`).join(' ')} stroke={P.saffron} strokeWidth={1.5} strokeDasharray="4 6" fill="none" />)}
          </Svg>
        </View>
        <Text style={{ fontFamily: FONT.display, color: P.inkSoft, marginTop: 6 }}>{item ? tx(item.label, prefs) : ''} · {Math.round(coverage * 100)}%</Text>
        {!result?.ok ? <SmallChip label={hi ? 'साफ़ करो' : 'Clear'} onPress={() => { setDrawn([]); setCoverage(0); }} testID="trace-clear" /> : null}
      </View>
    </>
  );
}
