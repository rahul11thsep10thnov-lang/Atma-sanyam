// Motion language: durations, curves and the one press-feedback spring.
import { Easing } from 'react-native';

export const duration = {
  fast: 150,
  normal: 240,
  expressive: 420,
  environmental: 4000,
} as const;

export const easing = {
  standard: Easing.bezier(0.2, 0, 0, 1),
  decelerate: Easing.out(Easing.cubic),
  accelerate: Easing.in(Easing.cubic),
  gentle: Easing.inOut(Easing.sin),
} as const;

export const press = {
  scale: 0.97,
  spring: { friction: 6, tension: 220, useNativeDriver: true as const },
} as const;
