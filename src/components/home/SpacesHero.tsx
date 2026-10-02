// The Home hero: the person's three spaces, each composited live from
// its photographic layers, side by side. Tap one to open its tab.
import React from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SpaceId } from '../../spaces/packTypes';
import { SPACES } from '../../spaces/catalog';
import { SpacePreview } from '../../spaces/ui/SpacePreview';
import { AppText } from '../../ui/AppText';
import { Icon } from '../../ui/Icon';
import { Tactile } from '../../ui/Pressable';
import { radii } from '../../theme/radii';
import { space } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import { t } from '../../i18n';

const FOCUS: Record<SpaceId, [number, number]> = { balcony: [0.42, 0.6], garden: [0.5, 0.58], room: [0.5, 0.55] };

export function SpacesHero({ onOpen }: { onOpen: (space: SpaceId) => void }) {
  const { colors, shadow } = useTheme();
  const { width } = useWindowDimensions();
  const cardW = Math.min(240, (width - space.screen * 2) * 0.68);
  return (
    <View style={styles.section}>
      <AppText variant="overline" tone="muted" style={styles.label}>
        {t('home.mySpaces')}
      </AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stripWrap} contentContainerStyle={styles.strip}>
        {SPACES.map((s) => (
          <Tactile key={s} onPress={() => onOpen(s)} scaleTo={0.985} accessibilityRole="button" accessibilityLabel={t(`space.${s}`)} style={[styles.card, { width: cardW, borderRadius: radii.hero, backgroundColor: colors.surfaceMuted }, shadow.level3]}>
            <SpacePreview space={s} width="100%" height="100%" focus={FOCUS[s]} />
            <LinearGradient colors={['rgba(30,18,12,0)', 'rgba(30,18,12,0.55)']} locations={[0.45, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
            <View style={styles.bottomRow} pointerEvents="none">
              <AppText variant="subheading" style={styles.white}>
                {t(`space.${s}`)}
              </AppText>
              <View style={styles.exploreRow}>
                <AppText variant="bodySmallStrong" style={styles.white}>
                  {t('home.explore')}
                </AppText>
                <Icon name="chevronRight" size="xs" color="#FFFFFF" />
              </View>
            </View>
          </Tactile>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: space.lg },
  label: { marginBottom: space.md },
  stripWrap: { marginHorizontal: -space.screen },
  strip: { paddingHorizontal: space.screen, gap: space.md, paddingVertical: 4 },
  card: { height: 220, overflow: 'hidden' },
  bottomRow: { position: 'absolute', left: space.lg, right: space.lg, bottom: space.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  exploreRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  white: { color: '#FFFFFF' },
});
