// "Grow plants": every plant that grows with focus, pictured in its
// space. Pick one to focus beside it — the session happens in that
// space, and its plant grows while you focus. The balcony's plants come
// from its photographed pack; the garden's from the 3D garden's sprites.
import React, { useEffect, useState } from 'react';
import { Image, ImageSourcePropType, ScrollView, StyleSheet, View } from 'react-native';
import { SpaceId } from '../../spaces/packTypes';
import { packFor, hasImg, img } from '../../spaces/packs';
import { STORE } from '../../spaces/catalog';
import { SpaceState } from '../../spaces/model';
import { loadSpace, subscribeSpace } from '../../spaces/repository';
import { thumbFor } from '../../spaces/ui/StoreSheet';
import { GardenState } from '../../garden/model';
import { useGarden } from '../../garden/repository';
import { SPRITES, SPRITE_IMAGES } from '../../garden/sprites.generated';
import { gardenThumb } from '../../garden/ui/GardenStoreSheet';
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

type Pick = PlantPick & { thumb: ImageSourcePropType | null; owned: boolean };

function balconyFocusThumb() {
  const pack = packFor('balcony');
  const st = pack.focusPlant.stages[pack.focusPlant.stages.length - 1]?.healthy;
  const f = st?.files?.morning ?? (st ? Object.values(st.files ?? {})[0] : null);
  return f && hasImg('balcony', f.file) ? img('balcony', f.file) : null;
}

function gardenFocusThumb(): ImageSourcePropType | null {
  const ft = SPRITES.focusTree;
  const s = ft?.stages[ft.stages.length - 1]?.healthy;
  const id = s ? SPRITE_IMAGES[s.file] : undefined;
  return id !== undefined ? id : null;
}

function balconyPicks(st: SpaceState | null): Pick[] {
  const pack = packFor('balcony');
  const picks: Pick[] = [{ space: 'balcony', itemId: null, name: pack.focusPlant.name, thumb: balconyFocusThumb(), owned: true }];
  for (const id of Object.keys(pack.items)) {
    if (!pack.items[id].growable || !STORE[id]) continue;
    const owned = !!st && (st.placed.some((p) => p.itemId === id) || st.stored.some((x) => x.itemId === id));
    picks.push({ space: 'balcony', itemId: id, name: pack.items[id].name, thumb: thumbFor('balcony', id), owned });
  }
  return picks;
}

function gardenPicks(g: GardenState | null): Pick[] {
  const picks: Pick[] = [];
  const ft = SPRITES.focusTree;
  if (ft) picks.push({ space: 'garden', itemId: null, name: ft.name, thumb: gardenFocusThumb(), owned: true });
  const ids = Object.keys(SPRITES.items).filter((id) => SPRITES.items[id].growable && STORE[id] && !STORE[id].hidden);
  ids.sort((a, b) => {
    const oa = g ? g.items.some((i) => i.itemId === a) || g.stored.some((s) => s.itemId === a) : false;
    const ob = g ? g.items.some((i) => i.itemId === b) || g.stored.some((s) => s.itemId === b) : false;
    if (oa !== ob) return oa ? -1 : 1;
    return STORE[a].unlockMinutes - STORE[b].unlockMinutes;
  });
  for (const id of ids) {
    const owned = !!g && (g.items.some((i) => i.itemId === id) || g.stored.some((s) => s.itemId === id));
    picks.push({ space: 'garden', itemId: id, name: SPRITES.items[id].name, thumb: gardenThumb(id), owned });
  }
  return picks;
}

export function GrowPlantsTab({ selected, onPick }: { selected: PlantPick | null; onPick: (p: PlantPick) => void }) {
  const { colors, shadow } = useTheme();
  const [balcony, setBalcony] = useState<SpaceState | null>(null);
  const [garden] = useGarden();
  useEffect(() => {
    let alive = true;
    loadSpace('balcony').then((s) => alive && setBalcony(s));
    const unsub = subscribeSpace((id, s) => alive && id === 'balcony' && setBalcony(s));
    return () => {
      alive = false;
      unsub();
    };
  }, []);

  const picks = [...balconyPicks(balcony), ...gardenPicks(garden)];

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
              <View style={styles.thumb}>{p.thumb && <Image source={p.thumb} style={styles.img} resizeMode={p.space === 'garden' ? 'contain' : 'cover'} />}</View>
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
