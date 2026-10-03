// "Grow plants": every plant that grows with focus, pictured in its
// space. Pick one to focus beside it — the session happens in that
// space, and its plant grows while you focus.
import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { SpaceId } from '../../spaces/packTypes';
import { packFor, hasImg, img } from '../../spaces/packs';
import { SPACES, STORE } from '../../spaces/catalog';
import { SpaceState } from '../../spaces/model';
import { loadAllSpaces, subscribeSpace } from '../../spaces/repository';
import { thumbFor } from '../../spaces/ui/StoreSheet';
import { AppText } from '../../ui/AppText';
import { Icon } from '../../ui/Icon';
import { Tactile } from '../../ui/Pressable';
import { radii } from '../../theme/radii';
import { space } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import { t } from '../../i18n';

export interface PlantPick {
  space: SpaceId;
  itemId: string | null; // null = the space's own focus plant
  name: string;
}

function focusThumb(spaceId: SpaceId) {
  const pack = packFor(spaceId);
  const st = pack.focusPlant.stages[pack.focusPlant.stages.length - 1]?.healthy;
  const f = st?.files?.morning ?? (st ? Object.values(st.files ?? {})[0] : null);
  return f && hasImg(spaceId, f.file) ? img(spaceId, f.file) : null;
}

export function GrowPlantsTab({ selected, onPick }: { selected: PlantPick | null; onPick: (p: PlantPick) => void }) {
  const { colors, shadow } = useTheme();
  const [states, setStates] = useState<Partial<Record<SpaceId, SpaceState>>>({});
  useEffect(() => {
    let alive = true;
    loadAllSpaces().then((all) => alive && setStates(all));
    const unsub = subscribeSpace((id, s) => alive && setStates((prev) => ({ ...prev, [id]: s })));
    return () => {
      alive = false;
      unsub();
    };
  }, []);

  const picks: (PlantPick & { thumb: ReturnType<typeof thumbFor>; owned: boolean })[] = [];
  for (const s of SPACES) {
    const pack = packFor(s);
    picks.push({ space: s, itemId: null, name: pack.focusPlant.name, thumb: focusThumb(s), owned: true });
    for (const id of Object.keys(pack.items)) {
      if (!pack.items[id].growable || !STORE[id]) continue;
      const st = states[s];
      const owned = !!st && (st.placed.some((p) => p.itemId === id) || st.stored.some((x) => x.itemId === id));
      picks.push({ space: s, itemId: id, name: pack.items[id].name, thumb: thumbFor(s, id), owned });
    }
  }

  return (
    <View>
      <AppText variant="bodySmall" tone="secondary" style={styles.hint}>
        {t('home.plantsHint')}
      </AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stripWrap} contentContainerStyle={styles.strip}>
        {picks.map((p) => {
          const on = !!selected && selected.space === p.space && selected.itemId === p.itemId;
          return (
            <Tactile
              key={`${p.space}:${p.itemId ?? 'focus'}`}
              onPress={() => onPick({ space: p.space, itemId: p.itemId, name: p.name })}
              scaleTo={0.96}
              accessibilityRole="button"
              accessibilityLabel={`${p.name}, ${t(`space.${p.space}`)}`}
              accessibilityState={{ selected: on }}
              style={[styles.tile, { backgroundColor: colors.surfaceRaised, borderColor: on ? colors.primary : colors.border }, on && shadow.level2]}
            >
              <View style={styles.thumb}>{p.thumb && <Image source={p.thumb} style={styles.img} resizeMode="cover" />}</View>
              <AppText variant="caption" numberOfLines={1} style={styles.name}>
                {p.name}
              </AppText>
              <AppText variant="caption" tone={p.owned ? 'secondary' : 'muted'} numberOfLines={1} style={styles.sub}>
                {t(`space.${p.space}`)} · {p.owned ? t('home.yourPlant') : t('home.inStore')}
              </AppText>
              {on && (
                <View style={[styles.check, { backgroundColor: colors.primary }]}>
                  <Icon name="check" size={12} color="onAccent" strokeWidth={3} />
                </View>
              )}
            </Tactile>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { marginBottom: space.md },
  stripWrap: { marginHorizontal: -space.screen },
  strip: { paddingHorizontal: space.screen, gap: space.md, paddingVertical: 4 },
  tile: { width: 112, borderRadius: radii.md, borderWidth: 2, padding: 6, gap: 2 },
  thumb: { width: '100%', aspectRatio: 1, borderRadius: radii.sm, backgroundColor: '#E9DFD2', overflow: 'hidden' },
  img: { width: '100%', height: '100%' },
  name: { marginTop: 4 },
  sub: { fontSize: 11 },
  check: { position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
