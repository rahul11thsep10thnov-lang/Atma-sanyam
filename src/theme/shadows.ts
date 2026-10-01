// Four elevation levels: soft, warm, low-opacity, large-blur. `shadowColor`
// is the warm bark tone so shadows read as ambient light, not soot.
import { Platform, ViewStyle } from 'react-native';

function level(opacity: number, radius: number, y: number, elevation: number, color: string): ViewStyle {
  return Platform.select<ViewStyle>({
    android: { elevation, shadowColor: color },
    default: { shadowColor: color, shadowOpacity: opacity, shadowRadius: radius, shadowOffset: { width: 0, height: y } },
  }) as ViewStyle;
}

export function shadows(color: string) {
  return {
    none: {} as ViewStyle,
    level1: level(0.06, 8, 2, 1, color),
    level2: level(0.09, 16, 6, 3, color),
    level3: level(0.12, 24, 10, 6, color),
    level4: level(0.16, 36, 16, 10, color),
  };
}

export type ShadowLevel = keyof ReturnType<typeof shadows>;
