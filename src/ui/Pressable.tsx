// Press feedback shared by every tappable surface: scale to 0.97 on press
// in, spring back on release, optional selection haptic. Respects the
// 48 px minimum touch target through `hitSlop` when the visual is smaller.
import React, { useRef } from 'react';
import { Animated, GestureResponderEvent, Pressable as RNPressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { press } from '../theme/motion';

export interface TactileProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** Fire a light haptic on press (default true). */
  haptic?: boolean;
  scaleTo?: number;
  children?: React.ReactNode;
}

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

export function Tactile({ style, haptic = true, scaleTo = press.scale, onPressIn, onPressOut, onPress, disabled, children, ...rest }: TactileProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = (e: GestureResponderEvent) => {
    Animated.spring(scale, { toValue: scaleTo, ...press.spring }).start();
    onPressIn?.(e);
  };
  const pressOut = (e: GestureResponderEvent) => {
    Animated.spring(scale, { toValue: 1, ...press.spring }).start();
    onPressOut?.(e);
  };
  const handlePress = (e: GestureResponderEvent) => {
    if (haptic) Haptics.selectionAsync().catch(() => undefined);
    onPress?.(e);
  };
  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={pressIn}
      onPressOut={pressOut}
      onPress={handlePress}
      style={[style, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressable>
  );
}
