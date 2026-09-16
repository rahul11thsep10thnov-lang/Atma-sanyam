import React, { useMemo, useRef } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, typography } from '../theme/colors';
import { MAX_DURATION_MINUTES, MIN_DURATION_MINUTES, DURATION_STEP_MINUTES } from '../utils/grid';

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

export function DialTimerPicker({ value, onChange, size = 260 }: DialTimerPickerProps) {
  const center = size / 2;
  const radius = center - HANDLE_RADIUS;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

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
    <View style={{ width: size, height: size }} {...panResponder.panHandlers}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.border}
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
        <Circle cx={handleX} cy={handleY} r={HANDLE_RADIUS} fill={colors.card} />
        <Circle cx={handleX} cy={handleY} r={HANDLE_RADIUS - 4} fill={colors.primary} />
      </Svg>
      <View style={styles.centerLabel} pointerEvents="none">
        <Text style={styles.valueText}>{value}</Text>
        <Text style={styles.unitText}>minutes</Text>
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
  valueText: { ...typography.heading, fontSize: 44, color: colors.text },
  unitText: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
});
