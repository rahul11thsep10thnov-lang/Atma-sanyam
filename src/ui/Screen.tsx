// Screen scaffold: themed background, safe-area padding, optional scroll.
import React from 'react';
import { ScrollView, ScrollViewProps, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { space } from '../theme/spacing';
import { useTheme } from '../theme/ThemeContext';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  /** Extra bottom inset, e.g. the floating tab bar's height. */
  bottomInset?: number;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  scrollProps?: ScrollViewProps;
}

export function Screen({ children, scroll, padded = true, bottomInset = 0, style, contentStyle, scrollProps }: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const pad: ViewStyle = {
    paddingTop: insets.top + space.lg,
    paddingBottom: insets.bottom + space.xxl + bottomInset,
    paddingHorizontal: padded ? space.screen : 0,
  };
  if (scroll) {
    return (
      <ScrollView
        style={[styles.flex, { backgroundColor: colors.background }, style]}
        contentContainerStyle={[pad, contentStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        {...scrollProps}
      >
        {children}
      </ScrollView>
    );
  }
  return <View style={[styles.flex, { backgroundColor: colors.background }, pad, style, contentStyle]}>{children}</View>;
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
