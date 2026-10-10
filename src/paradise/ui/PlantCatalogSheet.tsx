// Choosing what to grow next: a segment's species, each as its own card
// with the plant at full size, its rarity and whether the garden has
// earned it yet. Picking one opens its preview; nothing is planted here.
import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { Sheet } from '../../spaces/ui/Sheet';
import { AppText } from '../../ui/AppText';
import { Icon } from '../../ui/Icon';
import { Tactile } from '../../ui/Pressable';
import { radii } from '../../theme/radii';
import { space as sp } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import { t } from '../../i18n';
import { RARITY_UNLOCK, SEGMENTS, SegmentId, Species, plantName, speciesOf, unlocked } from '../catalog';
import { hasArt, spriteFor } from '../model';
import { PARADISE_IMAGES } from '../sprites.generated';

interface Props {
  visible: boolean;
  segment: SegmentId;
  grownInSegment: number;
  onClose: () => void;
  onPick: (species: Species) => void;
  /** Show the five segments as chips to choose from (the balcony's catalog). */
  grownBy?: (segment: SegmentId) => number;
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

export function PlantCatalogSheet({ visible, segment: initialSegment, grownInSegment: initialGrown, onClose, onPick, grownBy }: Props) {
  const { colors } = useTheme();
  const [chosen, setChosen] = useState<SegmentId>(initialSegment);
  useEffect(() => setChosen(initialSegment), [initialSegment, visible]);
  const segment = grownBy ? chosen : initialSegment;
  const grownInSegment = grownBy ? grownBy(segment) : initialGrown;
  const list = speciesOf(segment).filter((s) => hasArt(s.id));
  const sorted = [...list].sort((a, b) => (unlocked(a, grownInSegment) === unlocked(b, grownInSegment) ? 0 : unlocked(a, grownInSegment) ? -1 : 1));
  return (
    <Sheet visible={visible} title={t('paradise.chooseTitle')} subtitle={t('paradise.chooseSubtitle', { segment: t(`paradise.segment.${segment}` as never) })} onClose={onClose} maxHeight="86%">
      {grownBy && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.segWrap} contentContainerStyle={styles.segs}>
          {SEGMENTS.map((sg) => {
            const on = sg === segment;
            return (
              <Tactile key={sg} onPress={() => setChosen(sg)} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.seg, { backgroundColor: on ? colors.primary : colors.surfaceRaised, borderColor: on ? colors.primary : colors.border }]}>
                <AppText variant="bodySmallStrong" style={{ color: on ? colors.textOnAccent : colors.text }}>
                  {t(`paradise.segment.${sg}` as never)}
                </AppText>
              </Tactile>
            );
          })}
        </ScrollView>
      )}
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
              accessibilityLabel={open ? plantName(s.id) : t('paradise.lockedA11y', { name: plantName(s.id), count: RARITY_UNLOCK[s.rarity] - grownInSegment })}
              accessibilityState={{ disabled: !open }}
              style={[styles.card, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }, !open && styles.locked]}
            >
              <View style={styles.thumbWrap}>{thumb && <Image source={thumb} style={styles.thumb} resizeMode="contain" />}</View>
              <AppText variant="bodySmallStrong" numberOfLines={1}>
                {plantName(s.id)}
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
  segWrap: { flexGrow: 0, flexShrink: 0, height: 44, marginBottom: sp.md },
  segs: { gap: sp.sm, alignItems: 'center', paddingRight: sp.md },
  seg: { paddingHorizontal: sp.md, paddingVertical: 8, borderRadius: radii.pill, borderWidth: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: sp.md, paddingBottom: sp.lg },
  card: { width: '47%', flexGrow: 0, borderWidth: 1, borderRadius: radii.md, padding: sp.sm, gap: 2 },
  locked: { opacity: 0.55 },
  thumbWrap: { width: '100%', aspectRatio: 1, borderRadius: radii.sm, backgroundColor: '#EEE6D6', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 4 },
  thumb: { width: '88%', height: '88%' },
  rarityRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
