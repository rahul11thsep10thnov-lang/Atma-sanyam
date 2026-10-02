// Floating bottom navigation (PHASE 6): a rounded, warm, elevated container
// that hovers above the content; the active item scales up a touch and gets
// a small accent dot. Used through the Tab.Navigator `tabBar` prop.
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import { Icon, IconName } from './Icon';
import { Tactile } from './Pressable';
import { radii } from '../theme/radii';
import { space } from '../theme/spacing';
import { duration, easing } from '../theme/motion';
import { useTheme } from '../theme/ThemeContext';

export const TAB_BAR_HEIGHT = 64;
export const TAB_BAR_MARGIN = 12;

export interface TabSpec {
  icon: IconName;
  label: string;
}

function TabItem({ spec, focused, onPress, onLongPress }: { spec: TabSpec; focused: boolean; onPress: () => void; onLongPress: () => void }) {
  const { colors } = useTheme();
  const t = useRef(new Animated.Value(focused ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(t, { toValue: focused ? 1 : 0, duration: duration.normal, easing: easing.standard, useNativeDriver: true }).start();
  }, [focused, t]);
  const scale = t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const lift = t.interpolate({ inputRange: [0, 1], outputRange: [0, -1.5] });
  return (
    <Tactile
      onPress={onPress}
      onLongPress={onLongPress}
      haptic={!focused}
      scaleTo={0.94}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={spec.label}
      style={styles.item}
    >
      <Animated.View style={{ transform: [{ scale }, { translateY: lift }] }}>
        <Icon name={spec.icon} size="md" color={focused ? 'active' : 'icon'} strokeWidth={focused ? 2.1 : 1.75} />
      </Animated.View>
      <AppText variant="caption" style={{ color: focused ? colors.primary : colors.textMuted, marginTop: 4 }}>
        {spec.label}
      </AppText>
      <Animated.View style={[styles.dot, { backgroundColor: colors.primary, opacity: t, transform: [{ scale: t }] }]} />
    </Tactile>
  );
}

export function FloatingTabBar({ state, descriptors, navigation, specs }: BottomTabBarProps & { specs: Record<string, TabSpec> }) {
  const { colors, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  // A screen can step out of the way of its own content (the balcony hides
  // every control for a clean look) with tabBarStyle: { display: 'none' }.
  const focusedStyle = descriptors[state.routes[state.index].key]?.options.tabBarStyle as ViewStyle | undefined;
  if (focusedStyle?.display === 'none') return null;
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, TAB_BAR_MARGIN) }]}>
      <View style={[styles.bar, { backgroundColor: colors.navSurface, borderColor: colors.border }, shadow.level3]}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const spec = specs[route.name] ?? { icon: 'home' as IconName, label: descriptors[route.key]?.options.title ?? route.name };
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };
          const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });
          return <TabItem key={route.key} spec={spec} focused={focused} onPress={onPress} onLongPress={onLongPress} />;
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.lg, backgroundColor: 'transparent' },
  bar: {
    height: TAB_BAR_HEIGHT,
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: space.sm,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 6 },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 3 },
});

/** Bottom padding content needs so it never hides under the floating bar. */
export function useTabBarInset() {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + Math.max(insets.bottom, TAB_BAR_MARGIN) + space.md;
}
