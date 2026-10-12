// The bottom sheet the balcony's Collection and Gallery slide up in. It is
// mounted only while shown or sliding away: a hidden sheet must never sit
// over the balcony (on web an invisible scrim would still swallow touches).
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../ui/AppText';
import { IconButton } from '../../ui/Button';
import { radii } from '../../theme/radii';
import { space } from '../../theme/spacing';
import { duration, easing } from '../../theme/motion';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  visible: boolean;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  maxHeight?: `${number}%`;
}

export function Sheet({ visible, title, subtitle, right, onClose, children, maxHeight = '82%' }: Props) {
  const { colors, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);
  useEffect(() => {
    if (visible) setMounted(true);
    Animated.timing(t, { toValue: visible ? 1 : 0, duration: duration.expressive, easing: easing.standard, useNativeDriver: true }).start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
  }, [visible, t]);
  if (!mounted) return null;
  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [1200, 0] });

  return (
    <View style={styles.fill} pointerEvents={visible ? 'auto' : 'none'}>
      <Animated.View style={[styles.fill, { backgroundColor: colors.scrim, opacity: t }]}>
        <Pressable style={styles.fill} onPress={onClose} accessibilityLabel={`Close ${title}`} accessibilityRole="button" />
      </Animated.View>
      <Animated.View
        style={[styles.sheet, { maxHeight, backgroundColor: colors.surfaceRaised, paddingBottom: insets.bottom + space.lg, transform: [{ translateY }] }, shadow.level4]}
        accessibilityViewIsModal={visible}
      >
        <View style={[styles.handle, { backgroundColor: colors.borderStrong }]} />
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <AppText variant="heading">{title}</AppText>
            {subtitle ? (
              <AppText variant="bodySmall" tone="secondary">
                {subtitle}
              </AppText>
            ) : null}
          </View>
          {right}
          <IconButton icon="close" label={`Close ${title}`} size={40} variant="filled" onPress={onClose} />
        </View>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: radii.hero, borderTopRightRadius: radii.hero, paddingHorizontal: space.xl, paddingTop: space.sm },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: space.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.md },
});
