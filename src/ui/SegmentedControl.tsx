// Segmented control: a pill track with a sliding selected segment.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { AppText } from './AppText';
import { radii } from '../theme/radii';
import { duration, easing } from '../theme/motion';
import { useTheme } from '../theme/ThemeContext';

export interface Segment<T extends string> {
  value: T;
  label: string;
}

export function SegmentedControl<T extends string>({ segments, value, onChange, accessibilityLabel }: { segments: Segment<T>[]; value: T; onChange: (v: T) => void; accessibilityLabel?: string }) {
  const { colors, shadow } = useTheme();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, segments.findIndex((s) => s.value === value));
  const x = useRef(new Animated.Value(0)).current;
  const segW = width > 0 ? (width - 8) / segments.length : 0;

  useEffect(() => {
    Animated.timing(x, { toValue: index * segW, duration: duration.normal, easing: easing.standard, useNativeDriver: true }).start();
  }, [index, segW, x]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]} onLayout={onLayout} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {segW > 0 && <Animated.View style={[styles.thumb, { width: segW, backgroundColor: colors.surfaceRaised, transform: [{ translateX: x }] }, shadow.level1]} />}
      {segments.map((s) => {
        const selected = s.value === value;
        return (
          <Pressable
            key={s.value}
            style={styles.segment}
            onPress={() => {
              if (selected) return;
              Haptics.selectionAsync().catch(() => undefined);
              onChange(s.value);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected, checked: selected }}
            accessibilityLabel={s.label}
          >
            <AppText variant="bodySmallStrong" style={{ color: selected ? colors.text : colors.textMuted }} numberOfLines={1}>
              {s.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderRadius: radii.pill, padding: 4, height: 44, alignItems: 'stretch' },
  thumb: { position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: radii.pill },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
