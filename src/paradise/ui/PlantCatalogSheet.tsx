// Choosing what to grow next: a segment's species, each as its own card
// with the plant at full size, its rarity and whether the garden has
// earned it yet. Picking one opens its preview; nothing is planted here.
import React from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { Sheet } from '../../spaces/ui/Sheet';
import { AppText } from '../../ui/AppText';
import { Icon } from '../../ui/Icon';
import { Tactile } from '../../ui/Pressable';
import { radii } from '../../theme/radii';
import { space as sp } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import { t } from '../../i18n';
import { RARITY_UNLOCK, SEGMENT_NAME, SegmentId, Species, speciesOf, unlocked } from '../catalog';
import { hasArt, spriteFor } from '../model';
import { PARADISE_IMAGES } from '../sprites.generated';

interface Props {
  visible: boolean;
  segment: SegmentId;
  grownInSegment: number;
  onClose: () => void;
  onPick: (species: Species) => void;
}

/** The full-resolution sprite, for large pictures (the preview's hero). */
export function speciesImage(speciesId: string, stage = 7): number | null {
  const sp = spriteFor(speciesId, stage);
  if (!sp) return null;
  return PARADISE_IMAGES[sp.sprite.file] ?? null;
}

export function speciesThumb(speciesId: string, stage = 7): number | null {
  const sp = spriteFor(speciesId, stage);
  if (!sp) return null;
  const file = sp.sprite.thumb ?? sp.sprite.file;
  return PARADISE_IMAGES[file] ?? PARADISE_IMAGES[sp.sprite.file] ?? null;
}

const RARITY_COLOR: Record<Species['rarity'], string> = { common: '#8FA56B', uncommon: '#5B8DC9', rare: '#B5744A' };

export function PlantCatalogSheet({ visible, segment, grownInSegment, onClose, onPick }: Props) {
  const { colors } = useTheme();
  const list = speciesOf(segment).filter((s) => hasArt(s.id));
  const sorted = [...list].sort((a, b) => (unlocked(a, grownInSegment) === unlocked(b, grownInSegment) ? 0 : unlocked(a, grownInSegment) ? -1 : 1));
  return (
    <Sheet visible={visible} title={t('paradise.chooseTitle')} subtitle={t('paradise.chooseSubtitle', { segment: SEGMENT_NAME[segment] })} onClose={onClose} maxHeight="86%">
      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {sorted.map((s) => {
          const open = unlocked(s, grownInSegment);
          const thumb = speciesThumb(s.id);
          return (
            <Tactile
              key={s.id}
              onPress={() => open && onPick(s)}
              scaleTo={0.96}
              accessibilityRole="button"
              accessibilityLabel={open ? s.name : t('paradise.lockedA11y', { name: s.name, count: RARITY_UNLOCK[s.rarity] - grownInSegment })}
              accessibilityState={{ disabled: !open }}
              style={[styles.card, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }, !open && styles.locked]}
            >
              <View style={styles.thumbWrap}>{thumb && <Image source={thumb} style={styles.thumb} resizeMode="contain" />}</View>
              <AppText variant="bodySmallStrong" numberOfLines={1}>
                {s.name}
              </AppText>
              <AppText variant="caption" tone="muted" numberOfLines={1} style={{ fontStyle: 'italic' }}>
                {s.scientificName}
              </AppText>
              <View style={styles.rarityRow}>
                <View style={[styles.dot, { backgroundColor: RARITY_COLOR[s.rarity] }]} />
                <AppText variant="caption" tone="secondary">
                  {t(`paradise.rarity.${s.rarity}` as never)}
                </AppText>
                {!open && (
                  <>
                    <Icon name="lock" size={12} color={colors.textMuted} />
                    <AppText variant="caption" tone="muted" numberOfLines={1} style={{ flexShrink: 1 }}>
                      {t('paradise.growMore', { count: RARITY_UNLOCK[s.rarity] - grownInSegment })}
                    </AppText>
                  </>
                )}
              </View>
            </Tactile>
          );
        })}
        {list.length === 0 && (
          <AppText variant="bodySmall" tone="secondary" align="center" style={{ padding: sp.xl }}>
            {t('paradise.noArtYet')}
          </AppText>
        )}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: sp.md, paddingBottom: sp.lg },
  card: { width: '47%', flexGrow: 0, borderWidth: 1, borderRadius: radii.md, padding: sp.sm, gap: 2 },
  locked: { opacity: 0.55 },
  thumbWrap: { width: '100%', aspectRatio: 1, borderRadius: radii.sm, backgroundColor: '#EEE6D6', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 4 },
  thumb: { width: '88%', height: '88%' },
  rarityRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
