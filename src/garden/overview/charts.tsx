// Small SVG charts for the Garden analytics. No chart library: bars, a line
// with a highlighted peak, and horizontal comparison bars.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { AppText } from '../../ui/AppText';
import type { Bucket } from './stats';
import { formatMinutes } from './stats';

export const GREEN = '#2E9E78';
export const GREEN_DARK = '#16604A';
export const MINT = '#BFE8D6';
const GRID = 'rgba(20,60,45,0.12)';
const INK = '#2B3B35';

function niceMax(v: number): number {
  if (v <= 0) return 60;
  const steps = [10, 20, 30, 60, 120, 180, 240, 300, 600, 1200, 1800, 3000, 6000];
  return steps.find((s) => s >= v) ?? Math.ceil(v / 600) * 600;
}

interface BarProps {
  buckets: Bucket[];
  width: number;
  height?: number;
  motion: boolean;
}

/** Focused-time bars. Tap a bar for its exact time. The bars grow in when the period changes. */
export function BarChart({ buckets, width, height = 150, motion }: BarProps) {
  const [sel, setSel] = useState<number | null>(null);
  const grow = useRef(new Animated.Value(motion ? 0 : 1)).current;
  const [g, setG] = useState(motion ? 0 : 1);
  useEffect(() => {
    setSel(null);
    if (!motion) return setG(1);
    grow.setValue(0);
    const id = grow.addListener(({ value }) => setG(value));
    Animated.timing(grow, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => grow.removeListener(id);
  }, [buckets, motion, grow]);
  const maxV = niceMax(Math.max(...buckets.map((b) => b.minutes), 0));
  const left = 34;
  const bottom = 22;
  const plotW = width - left - 4;
  const plotH = height - bottom - 8;
  const n = buckets.length;
  const bw = plotW / n;
  const every = n > 20 ? 5 : n > 12 ? 2 : 1;
  const ticks = [0, 0.5, 1];
  return (
    <View>
      <Svg width={width} height={height}>
        {ticks.map((t) => {
          const y = 8 + plotH * (1 - t);
          return (
            <React.Fragment key={t}>
              <Line x1={left} x2={width - 4} y1={y} y2={y} stroke={GRID} strokeWidth={1} />
              <SvgText x={left - 6} y={y + 3} fontSize={10} fill={INK} textAnchor="end" opacity={0.7}>
                {t === 0 ? '0' : formatMinutes(maxV * t).replace(' min', 'm')}
              </SvgText>
            </React.Fragment>
          );
        })}
        {buckets.map((b, i) => {
          const h = (b.minutes / maxV) * plotH * g;
          const x = left + i * bw + bw * 0.14;
          return <Rect key={i} x={x} y={8 + plotH - h} width={Math.max(2, bw * 0.72)} height={Math.max(h, b.minutes > 0 ? 2 : 0)} rx={Math.min(4, bw * 0.3)} fill={sel === i ? GREEN_DARK : GREEN} opacity={sel === null || sel === i ? 1 : 0.55} />;
        })}
        {buckets.map((b, i) =>
          i % every === 0 ? (
            <SvgText key={`l${i}`} x={left + i * bw + bw / 2} y={height - 6} fontSize={10} fill={INK} textAnchor="middle" opacity={0.75}>
              {b.label}
            </SvgText>
          ) : null,
        )}
      </Svg>
      <View style={[StyleSheet.absoluteFill, { left, right: 4, bottom, flexDirection: 'row' }]}>
        {buckets.map((b, i) => (
          <Pressable key={i} style={{ flex: 1 }} onPress={() => setSel(sel === i ? null : i)} accessibilityRole="button" accessibilityLabel={`${b.title}: ${formatMinutes(b.minutes)}`} />
        ))}
      </View>
      {sel !== null && (
        <View style={[styles.tip, { left: Math.max(0, Math.min(width - 150, left + sel * bw + bw / 2 - 75)) }]} pointerEvents="none">
          <AppText variant="caption" style={{ color: '#fff' }}>
            {buckets[sel]!.title}
          </AppText>
          <AppText variant="bodyStrong" style={{ color: '#fff' }}>
            {formatMinutes(buckets[sel]!.minutes)}
          </AppText>
        </View>
      )}
    </View>
  );
}

interface LineProps {
  values: number[];
  labels: string[];
  peak: number;
  width: number;
  height?: number;
  every?: number;
}

/** A line over equal steps (weekdays or hours), with the peak highlighted. */
export function LineChart({ values, labels, peak, width, height = 120, every = 1 }: LineProps) {
  const maxV = niceMax(Math.max(...values, 0));
  const left = 8;
  const bottom = 20;
  const plotW = width - left * 2;
  const plotH = height - bottom - 14;
  const n = values.length;
  const x = (i: number) => left + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => 12 + plotH * (1 - v / maxV);
  const d = values.map((v, i) => `${i ? 'L' : 'M'} ${x(i)} ${y(v)}`).join(' ');
  return (
    <Svg width={width} height={height}>
      <Line x1={left} x2={width - left} y1={12 + plotH} y2={12 + plotH} stroke={GRID} strokeWidth={1} />
      <Line x1={left} x2={width - left} y1={12} y2={12} stroke={GRID} strokeWidth={1} />
      <Path d={`${d} L ${x(n - 1)} ${12 + plotH} L ${x(0)} ${12 + plotH} Z`} fill={MINT} opacity={0.45} />
      <Path d={d} stroke={GREEN} strokeWidth={2.2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      {peak >= 0 && (
        <>
          <Line x1={x(peak)} x2={x(peak)} y1={y(values[peak]!)} y2={12 + plotH} stroke={GREEN_DARK} strokeWidth={1.2} strokeDasharray="3,3" />
          <Circle cx={x(peak)} cy={y(values[peak]!)} r={5} fill={GREEN_DARK} stroke="#fff" strokeWidth={2} />
        </>
      )}
      {labels.map((l, i) =>
        i % every === 0 ? (
          <SvgText key={i} x={x(i)} y={height - 5} fontSize={10} fill={i === peak ? GREEN_DARK : INK} fontWeight={i === peak ? '700' : '400'} textAnchor="middle" opacity={i === peak ? 1 : 0.7}>
            {l}
          </SvgText>
        ) : null,
      )}
    </Svg>
  );
}

interface HBarProps {
  rows: { label: string; minutes: number }[];
  width: number;
}

/** Horizontal comparison bars, longest = full width. */
export function HBars({ rows, width }: HBarProps) {
  const maxV = Math.max(...rows.map((r) => r.minutes), 1);
  return (
    <View style={{ gap: 10 }}>
      {rows.map((r, i) => (
        <View key={r.label}>
          <View style={styles.hRow}>
            <AppText variant="caption" style={{ color: INK }}>
              {r.label}
            </AppText>
            <AppText variant="caption" style={{ color: INK }}>
              {formatMinutes(r.minutes)}
            </AppText>
          </View>
          <View style={{ height: 12, width, backgroundColor: 'rgba(20,60,45,0.08)', borderRadius: 6, overflow: 'hidden' }}>
            <View style={{ height: 12, width: Math.max(r.minutes > 0 ? 4 : 0, (r.minutes / maxV) * width), backgroundColor: i === 0 ? GREEN : '#9BD3BB', borderRadius: 6 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tip: { position: 'absolute', top: -4, width: 150, backgroundColor: 'rgba(20,50,40,0.92)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  hRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
});
