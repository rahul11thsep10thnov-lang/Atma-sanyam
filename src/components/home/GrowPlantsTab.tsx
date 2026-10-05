// "Grow plants": what the next session can grow. The balcony's peace lily
// first, then the paradise garden's species a person has earned, by
// segment. Picking one starts the session with that plant.
import React from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { packFor, hasImg, img } from '../../spaces/packs';
import { SEGMENTS, SegmentId, speciesOf, unlocked } from '../../paradise/catalog';
import { grownIn, hasArt } from '../../paradise/model';
import { useParadise } from '../../paradise/repository';
import { speciesThumb } from '../../paradise/ui/PlantCatalogSheet';
import { AppText } from '../../ui/AppText';
import { Icon } from '../../ui/Icon';
import { Tactile } from '../../ui/Pressable';
import { radii } from '../../theme/radii';
import { space } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import { t } from '../../i18n';

export type PlantPick = { kind: 'balcony' } | { kind: 'species'; speciesId: string; segment: SegmentId };

function balconyThumb() {
  const pack = packFor('balcony');
  const st = pack.focusPlant.stages[pack.focusPlant.stages.length - 1]?.healthy;
  const f = st?.files?.morning ?? (st ? Object.values(st.files ?? {})[0] : null);
  return f && hasImg('balcony', f.file) ? img('balcony', f.file) : null;
}

export function GrowPlantsTab({ selected, onPick, onSeeAll }: { selected: PlantPick | null; onPick: (p: PlantPick) => void; onSeeAll: () => void }) {
  const { colors, shadow } = useTheme();
  const [paradise] = useParadise();
  const balconyOn = selected?.kind === 'balcony';
  const balconyName = packFor('balcony').focusPlant.name;
  return (
    <View>
      <AppText variant="bodySmall" tone="secondary" style={styles.hint}>
        {t('home.plantsHint')}
      </AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stripWrap} contentContainerStyle={styles.strip}>
        <Tactile onPress={() => onPick({ kind: 'balcony' })} scaleTo={0.96} accessibilityRole="button" accessibilityLabel={`${balconyName}, ${t('space.balcony')}`} accessibilityState={{ selected: balconyOn }} style={[styles.tile, { backgroundColor: colors.surfaceRaised, borderColor: balconyOn ? colors.primary : colors.border }, balconyOn && shadow.level2]}>
          <View style={styles.thumb}>{balconyThumb() && <Image source={balconyThumb()!} style={styles.img} resizeMode="cover" />}</View>
          <AppText variant="caption" numberOfLines={1} style={styles.name}>
            {balconyName}
          </AppText>
          <AppText variant="caption" tone="secondary" numberOfLines={1} style={styles.sub}>
            {t('space.balcony')}
          </AppText>
          {balconyOn && (
            <View style={[styles.check, { backgroundColor: colors.primary }]}>
              <Icon name="check" size={12} color="onAccent" strokeWidth={3} />
            </View>
          )}
        </Tactile>
        {SEGMENTS.flatMap((seg) => {
          const grown = paradise ? grownIn(paradise, seg) : 0;
          return speciesOf(seg)
            .filter((s) => hasArt(s.id) && unlocked(s, grown))
            .slice(0, 5)
            .map((s) => {
              const on = selected?.kind === 'species' && selected.speciesId === s.id;
              const thumb = speciesThumb(s.id, 7);
              return (
                <Tactile key={s.id} onPress={() => onPick({ kind: 'species', speciesId: s.id, segment: seg })} scaleTo={0.96} accessibilityRole="button" accessibilityLabel={`${s.name}, ${t(`paradise.segment.${seg}` as never)}`} accessibilityState={{ selected: on }} style={[styles.tile, { backgroundColor: colors.surfaceRaised, borderColor: on ? colors.primary : colors.border }, on && shadow.level2]}>
                  <View style={styles.thumb}>{thumb && <Image source={thumb} style={styles.img} resizeMode="contain" />}</View>
                  <AppText variant="caption" numberOfLines={1} style={styles.name}>
                    {s.name}
                  </AppText>
                  <AppText variant="caption" tone="secondary" numberOfLines={1} style={styles.sub}>
                    {t(`paradise.segment.${seg}` as never)}
                  </AppText>
                  {on && (
                    <View style={[styles.check, { backgroundColor: colors.primary }]}>
                      <Icon name="check" size={12} color="onAccent" strokeWidth={3} />
                    </View>
                  )}
                </Tactile>
              );
            });
        })}
        <Tactile onPress={onSeeAll} scaleTo={0.96} accessibilityRole="button" accessibilityLabel={t('paradise.seeAll')} style={[styles.tile, styles.more, { borderColor: colors.border }]}>
          <Icon name="trees" size="md" color="primary" />
          <AppText variant="caption" tone="primary" align="center">
            {t('paradise.seeAll')}
          </AppText>
        </Tactile>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { marginBottom: space.md },
  stripWrap: { marginHorizontal: -space.screen },
  strip: { paddingHorizontal: space.screen, gap: space.md, paddingVertical: 4 },
  tile: { width: 112, borderRadius: radii.md, borderWidth: 2, padding: 6, gap: 2 },
  more: { alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', gap: 6 },
  thumb: { width: '100%', aspectRatio: 1, borderRadius: radii.sm, backgroundColor: '#E9DFD2', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  img: { width: '100%', height: '100%' },
  name: { marginTop: 4 },
  sub: { fontSize: 11 },
  check: { position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
