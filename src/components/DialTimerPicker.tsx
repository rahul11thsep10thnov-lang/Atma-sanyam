import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { typography } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { MAX_DURATION_MINUTES, MIN_DURATION_MINUTES, DURATION_STEP_MINUTES } from '../utils/grid';
import { Icon } from '../ui/Icon';
import { t } from '../i18n';

interface DialTimerPickerProps {
  value: number;
  onChange: (minutes: number) => void;
  size?: number;
}

const STEP_COUNT = (MAX_DURATION_MINUTES - MIN_DURATION_MINUTES) / DURATION_STEP_MINUTES + 1;
const DEG_PER_STEP = 360 / STEP_COUNT;
const STROKE_WIDTH = 10;
const HANDLE_RADIUS = 14;

function angleForValue(value: number): number {
  const step = Math.round((value - MIN_DURATION_MINUTES) / DURATION_STEP_MINUTES);
  return step * DEG_PER_STEP;
}

function valueForAngle(deg: number): number {
  const normalized = ((deg % 360) + 360) % 360;
  const step = Math.round(normalized / DEG_PER_STEP) % STEP_COUNT;
  return MIN_DURATION_MINUTES + step * DURATION_STEP_MINUTES;
}

/** What typed minutes become: the nearest multiple of 5 inside the dial's range. */
export function snapMinutes(raw: number): number {
  const stepped = Math.round(raw / DURATION_STEP_MINUTES) * DURATION_STEP_MINUTES;
  return Math.min(MAX_DURATION_MINUTES, Math.max(MIN_DURATION_MINUTES, stepped));
}

export function DialTimerPicker({ value, onChange, size = 260 }: DialTimerPickerProps) {
  const { colors } = useTheme();
  const center = size / 2;
  const radius = center - HANDLE_RADIUS;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Tap the number to type the minutes instead of turning the dial.
  const [draft, setDraft] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);
  const editing = draft !== null;
  const typed = draft ? parseInt(draft, 10) : NaN;
  const willUse = Number.isFinite(typed) ? snapMinutes(typed) : null;
  const exact = willUse !== null && willUse === typed;
  const commit = () => {
    if (draft === null) return;
    if (willUse !== null) onChange(willUse);
    setDraft(null);
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          const dx = locationX - center;
          const dy = locationY - center;
          const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
          onChangeRef.current(valueForAngle(deg));
        },
      }),
    [center]
  );

  const angleDeg = angleForValue(value);
  const angleRad = (angleDeg * Math.PI) / 180;
  const handleX = center + radius * Math.sin(angleRad);
  const handleY = center - radius * Math.cos(angleRad);

  const circumference = 2 * Math.PI * radius;
  const fraction = angleDeg / 360;
  const dashOffset = circumference * (1 - fraction);

  return (
    <View
      style={{ width: size, height: size }}
      {...panResponder.panHandlers}
      // Screen-reader users adjust the dial with swipe up/down instead of dragging.
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={t('dial.a11y')}
      accessibilityValue={{ text: `${value} minutes` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        const delta = e.nativeEvent.actionName === 'increment' ? DURATION_STEP_MINUTES : -DURATION_STEP_MINUTES;
        onChange(Math.min(MAX_DURATION_MINUTES, Math.max(MIN_DURATION_MINUTES, value + delta)));
      }}
    >
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.borderStrong}
          strokeOpacity={0.6}
          strokeWidth={STROKE_WIDTH}
          fill="none"
          strokeLinecap="round"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.primary}
          strokeWidth={STROKE_WIDTH}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          rotation={-90}
          origin={`${center}, ${center}`}
        />
        <Circle cx={handleX} cy={handleY} r={HANDLE_RADIUS} fill={colors.surfaceRaised} />
        <Circle cx={handleX} cy={handleY} r={HANDLE_RADIUS - 4} fill={colors.primary} />
      </Svg>
      <View style={styles.centerLabel} pointerEvents="box-none">
        {editing ? (
          <View style={styles.editBox}>
            <TextInput
              ref={inputRef}
              value={draft ?? ''}
              onChangeText={(v) => setDraft(v.replace(/\D/g, '').slice(0, 3))}
              onBlur={commit}
              onSubmitEditing={commit}
              autoFocus
              selectTextOnFocus
              // iOS's plain number pad has no Done key; this one does.
              keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'number-pad'}
              returnKeyType="done"
              maxLength={3}
              accessibilityLabel={t('dial.editA11y')}
              style={[styles.valueText, styles.input, { color: colors.text, borderBottomColor: colors.primary }]}
            />
            <Text style={[styles.hint, { color: exact || willUse === null ? colors.textSecondary : colors.primary }]} numberOfLines={1}>
              {willUse !== null && !exact ? t('dial.willUse', { n: willUse }) : t('dial.snap', { min: MIN_DURATION_MINUTES, max: MAX_DURATION_MINUTES })}
            </Text>
          </View>
        ) : (
          <Pressable
            onPress={() => setDraft(String(value))}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`${value} ${t('dial.minutes')}. ${t('dial.edit')}`}
            style={styles.tapArea}
          >
            <Text style={[styles.valueText, { color: colors.text }]}>{value}</Text>
            <View style={styles.unitRow}>
              <Text style={[styles.unitText, { color: colors.textSecondary }]}>{t('dial.minutes')}</Text>
              <Icon name="pencil" size={11} color="secondary" />
            </View>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerLabel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: { ...typography.heading, fontSize: 44, lineHeight: 52 },
  unitText: { ...typography.caption },
  unitRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  tapArea: { alignItems: 'center', paddingHorizontal: 12 },
  editBox: { alignItems: 'center' },
  input: { width: 96, textAlign: 'center', borderBottomWidth: 2, paddingVertical: 0, paddingHorizontal: 6 },
  hint: { ...typography.caption, marginTop: 4, maxWidth: 140, textAlign: 'center' },
});
