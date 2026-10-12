// After a session earns something: where should the framed picture hang,
// or where should the new plant go? One choice, then back to the world.
import React from 'react';
import { Image, ImageSourcePropType, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../ui/AppText';
import { Button } from '../../ui/Button';
import { IconName } from '../../ui/Icon';
import { radii } from '../../theme/radii';
import { space } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';

export interface PlacementOption {
  id: string;
  label: string;
  icon: IconName;
  /** Shown instead of acting (e.g. "Needs a planter stand"). */
  disabledReason?: string;
  destructive?: boolean;
}

interface Props {
  title: string;
  body: string;
  image?: ImageSourcePropType | null;
  options: PlacementOption[];
  onChoose: (id: string) => void;
}

export function PlacementSheet({ title, body, image, options, onChoose }: Props) {
  const { colors, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]} />
      <View style={[styles.sheet, { backgroundColor: colors.surfaceRaised, paddingBottom: insets.bottom + space.xl }, shadow.level4]} accessibilityViewIsModal>
        {image ? <Image source={image} style={styles.image} resizeMode="cover" /> : null}
        <AppText variant="heading" align="center">
          {title}
        </AppText>
        <AppText variant="body" tone="secondary" align="center" style={styles.body}>
          {body}
        </AppText>
        <View style={styles.options}>
          {options.map((o) => (
            <View key={o.id} style={styles.option}>
              <Button label={o.label} icon={o.icon} fullWidth variant={o.destructive ? 'tertiary' : o.disabledReason ? 'secondary' : 'primary'} disabled={!!o.disabledReason} onPress={() => onChoose(o.id)} />
              {o.disabledReason ? (
                <AppText variant="caption" tone="muted" align="center">
                  {o.disabledReason}
                </AppText>
              ) : null}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: radii.hero, borderTopRightRadius: radii.hero, paddingHorizontal: space.xl, paddingTop: space.xl, alignItems: 'center', gap: space.sm },
  image: { width: 120, height: 90, borderRadius: radii.sm, marginBottom: space.sm },
  body: { marginBottom: space.sm },
  options: { alignSelf: 'stretch', gap: space.sm },
  option: { gap: 2 },
});
