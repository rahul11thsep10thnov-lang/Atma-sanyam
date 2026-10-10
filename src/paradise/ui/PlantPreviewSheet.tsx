// The preview of a plant about to be grown: the plant at full size, its
// story, the seven sizes it can reach and the minutes each one asks for,
// a duration to choose, and Start focus. Nothing is planted until the
// session completes.
import React, { useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { Sheet } from '../../spaces/ui/Sheet';
import { AppText } from '../../ui/AppText';
import { Button } from '../../ui/Button';
import { Tactile } from '../../ui/Pressable';
import { radii } from '../../theme/radii';
import { space as sp } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import { t } from '../../i18n';
import { PlantGrowthSize, SIZE_MINUTES, minutesRange, sizeForMinutes } from '../../growth/size';
import { PREVIEW_SIZES, Species, plantName, plantText } from '../catalog';
import { PlantPlace } from '../model';
import { speciesImage, speciesThumb } from './PlantCatalogSheet';

interface Props {
  visible: boolean;
  species: Species | null;
  onClose: () => void;
  onStart: (species: Species, minutes: number, place: PlantPlace) => void;
}

const DURATIONS = [15, 25, 30, 45, 60, 90, 120, 150, 180];

export function PlantPreviewSheet({ visible, species, onClose, onStart }: Props) {
  const { colors } = useTheme();
  const [minutes, setMinutes] = useState(30);
  const [place, setPlace] = useState<PlantPlace>('garden');
  const size = sizeForMinutes(minutes) ?? 1;
  const hero = useMemo(() => (species ? speciesImage(species.id, 7) : null), [species]);
  const current = useMemo(() => (species ? speciesImage(species.id, size) : null), [species, size]);
  if (!species) return null;
  return (
    <Sheet visible={visible} title={plantName(species.id)} subtitle={`${species.scientificName} · ${t(`paradise.segment.${species.segment}` as never)}`} onClose={onClose} maxHeight="92%">
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: '#EEE6D6' }]}>{(current ?? hero) && <Image source={(current ?? hero)!} style={styles.heroImg} resizeMode="contain" />}</View>
        <AppText variant="bodySmall" tone="secondary">
          {plantText(species.id).description}
        </AppText>
        <AppText variant="caption" tone="muted">
          {plantText(species.id).progression}
        </AppText>

        <AppText variant="overline" tone="muted" style={{ marginTop: sp.sm }}>
          {t('paradise.sevenSizes').toUpperCase()}
        </AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sizes}>
          {PREVIEW_SIZES.map((s: PlantGrowthSize) => {
            const th = speciesThumb(species.id, s);
            const r = minutesRange(s);
            const on = s === size;
            return (
              <Tactile key={s} onPress={() => setMinutes(SIZE_MINUTES[s])} accessibilityRole="button" accessibilityLabel={t('paradise.sizeA11y', { size: s, minutes: r.from })} style={[styles.sizeCard, { borderColor: on ? colors.primary : colors.border, backgroundColor: on ? colors.accentSoft : colors.surface }]}>
                <View style={styles.sizeThumb}>{th && <Image source={th} style={{ width: '90%', height: '90%' }} resizeMode="contain" />}</View>
                <AppText variant="caption" tone={on ? 'primary' : 'text'}>
                  {t('paradise.size', { size: s })}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {r.to === null ? t('paradise.minutesPlus', { from: r.from }) : t('paradise.minutesRange', { from: r.from, to: r.to })}
                </AppText>
              </Tactile>
            );
          })}
        </ScrollView>

        <AppText variant="overline" tone="muted">
          {t('paradise.howLong').toUpperCase()}
        </AppText>
        <View style={styles.durations}>
          {DURATIONS.map((m) => (
            <Tactile key={m} onPress={() => setMinutes(m)} accessibilityRole="button" accessibilityLabel={t('focusCard.forMinutes', { minutes: m })} accessibilityState={{ selected: m === minutes }} style={[styles.duration, { backgroundColor: m === minutes ? colors.primary : colors.surfaceTinted }]}>
              <AppText variant="bodySmallStrong" style={{ color: m === minutes ? '#FFFFFF' : colors.text }}>
                {m}
              </AppText>
            </Tactile>
          ))}
        </View>
        <AppText variant="caption" tone="secondary" align="center">
          {t('paradise.willReach', { minutes, size })}
        </AppText>
        <AppText variant="overline" tone="muted" style={{ marginTop: sp.sm }}>
          {t('paradise.growWhere').toUpperCase()}
        </AppText>
        <View style={styles.places}>
          {(['garden', 'balcony'] as PlantPlace[]).map((p) => (
            <Tactile key={p} onPress={() => setPlace(p)} accessibilityRole="radio" accessibilityState={{ selected: p === place }} accessibilityLabel={t(p === 'garden' ? 'tabs.garden' : 'tabs.balcony')} style={[styles.place, { borderColor: p === place ? colors.primary : colors.border, backgroundColor: p === place ? colors.accentSoft : colors.surface }]}>
              <AppText variant="bodySmallStrong" tone={p === place ? 'primary' : 'text'}>
                {t(p === 'garden' ? 'tabs.garden' : 'tabs.balcony')}
              </AppText>
            </Tactile>
          ))}
        </View>
        <Button label={t('paradise.startFocus')} icon="sprout" size="lg" fullWidth onPress={() => onStart(species, minutes, place)} style={{ marginTop: sp.sm }} />
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: sp.sm, paddingBottom: sp.lg },
  hero: { width: '100%', height: 220, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  heroImg: { width: '80%', height: '92%' },
  sizes: { gap: sp.sm, paddingVertical: 4 },
  sizeCard: { width: 96, borderWidth: 1.5, borderRadius: radii.md, padding: 6, alignItems: 'center', gap: 2 },
  sizeThumb: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  durations: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  places: { flexDirection: 'row', gap: sp.sm },
  place: { flex: 1, height: 44, borderWidth: 1.5, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  duration: { paddingHorizontal: 14, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', minWidth: 56 },
});
