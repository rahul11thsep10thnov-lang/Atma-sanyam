// The museum store: at most a hundred curated objects, each shown with
// its rarity, price, unlock and the record of why it earns its place.
// Buying places the object in the current section at once (a frame style
// is simply owned, and chosen on any artwork in Edit museum).
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { rupeesFor } from '../../spaces/catalog';
import { RewardState } from '../../spaces/rewards';
import { Sheet } from '../../spaces/ui/Sheet';
import { formatMinutes } from '../../spaces/ui/StoreSheet';
import { ArtworkRecord } from '../../collection/model';
import { AppText } from '../../ui/AppText';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { Tactile } from '../../ui/Pressable';
import { radii } from '../../theme/radii';
import { space as sp } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import { t } from '../../i18n';
import { EYE_HEIGHT, MuseumObject, MuseumState, WALL_HEIGHT, WALL_MIN_H, addFrame, addObject, carriedBy, displayed, firstFreeWall, freeFloorSpot, ownsFrame, ownsItem } from '../model';
import { CATEGORY_ORDER, MUSEUM_STORE, MuseumItem, Rarity, museumWidthOf } from '../store';

interface Props {
  visible: boolean;
  state: MuseumState;
  section: number;
  rewards: RewardState;
  artworkById: (id: string) => ArtworkRecord | null;
  onClose: () => void;
  onState: (next: MuseumState) => void;
  onRewards: (next: RewardState) => Promise<void>;
  onToast: (text: string) => void;
}

const RARITY_COLOR: Record<Rarity, string> = { basic: '#8E9AAF', premium: '#4F86C6', rare: '#7B4FC6', epic: '#C6744F', legendary: '#C9A24A' };

const CARRY_CAPACITY: Record<string, number> = { case_long: 2, shelf_wall: 2 };

/** Place a bought object in the section; null when nothing fits. */
export function placeBought(m: MuseumState, item: MuseumItem, section: number, artworkById: (id: string) => ArtworkRecord | null): { state: MuseumState; object: MuseumObject } | null {
  const widthOf = (o: MuseumObject) => museumWidthOf(o, artworkById);
  const base = { itemId: item.id, sectionId: section, rotation: 0, scale: 1, displayStatus: 'displayed' as const, on: true, intensity: 1 };
  if (item.surfaces.includes('MUSEUM_WALL')) {
    const u = firstFreeWall(m, section, item.size[0], widthOf);
    if (u === null) return null;
    const high = item.render === 'spot' || item.render === 'wash' || item.render === 'camera' || item.render === 'sensor' || item.render === 'sign';
    const low = item.render === 'extinguisher';
    const h = high ? WALL_HEIGHT - 0.4 : low ? WALL_MIN_H : item.render === 'arch' || item.render === 'curtain' ? item.size[2] / 2 : EYE_HEIGHT;
    return addObject(m, { ...base, surfaceId: 'MUSEUM_WALL', u, h });
  }
  if (item.surfaces.includes('MUSEUM_FLOOR')) {
    const spot = freeFloorSpot(m, section, Math.max(item.size[0], item.size[1]), (o) => Math.max(...(MUSEUM_STORE.find((i) => i.id === o.itemId)?.size.slice(0, 2) ?? [0.5])));
    if (!spot) return null;
    return addObject(m, { ...base, surfaceId: 'MUSEUM_FLOOR', u: spot.u, h: spot.h });
  }
  // a small object: find a carrier in this section with room
  const carriers = displayed(m, section).filter((o) => {
    const it = MUSEUM_STORE.find((i) => i.id === o.itemId);
    return it?.carries && item.surfaces.includes(it.carries) && carriedBy(m, o.objectId).length < (CARRY_CAPACITY[o.itemId] ?? 1);
  });
  const c = carriers[0];
  if (!c) return null;
  const cit = MUSEUM_STORE.find((i) => i.id === c.itemId)!;
  const y = cit.carries === 'SHELF' ? c.h + 0.02 : cit.size[2] * c.scale + 0.02;
  return addObject(m, { ...base, surfaceId: cit.carries!, u: c.u, h: c.h, y, carrierId: c.objectId });
}

export function MuseumStoreSheet({ visible, state, section, rewards, artworkById, onClose, onState, onRewards, onToast }: Props) {
  const { colors } = useTheme();
  const [open, setOpen] = useState<string | null>(null);
  const groups = useMemo(() => CATEGORY_ORDER.map((cat) => ({ cat, items: MUSEUM_STORE.filter((i) => i.category === cat) })).filter((g) => g.items.length), []);

  const buy = async (item: MuseumItem) => {
    if (rewards.coins < item.coins) return;
    if (item.render === 'frame') {
      await onRewards({ ...rewards, coins: rewards.coins - item.coins });
      onState(addFrame(state, item.id));
      onToast(t('museum.frameBought', { name: item.name }));
      return;
    }
    const r = placeBought(state, item, section, artworkById);
    if (!r) {
      onToast(item.surfaces.includes('MUSEUM_WALL') || item.surfaces.includes('MUSEUM_FLOOR') ? t('museum.noRoom') : t('museum.needsCarrier'));
      return;
    }
    await onRewards({ ...rewards, coins: rewards.coins - item.coins });
    onState(r.state);
    onToast(t('museum.placed', { name: item.name, n: section }));
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      title={t('museum.store')}
      subtitle={t('museum.storeSubtitle')}
      onClose={onClose}
      maxHeight="90%"
      right={
        <View style={[styles.balance, { backgroundColor: colors.accentSoft }]} accessibilityLabel={`${rewards.coins} coins`}>
          <Icon name="coins" size="xs" color={colors.accent} />
          <AppText variant="bodyStrong">{rewards.coins}</AppText>
        </View>
      }
    >
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {groups.map((g) => (
          <View key={g.cat} style={{ gap: sp.sm }}>
            <AppText variant="overline" tone="muted">
              {t(`museum.cat.${g.cat === 'security' ? 'security' : g.cat}` as never).toUpperCase()}
            </AppText>
            {g.items.map((item) => {
              const unlocked = rewards.lifetimeMinutes >= item.unlockMinutes;
              const affordable = rewards.coins >= item.coins;
              const count = item.render === 'frame' ? (ownsFrame(state, item.id) ? 1 : 0) : ownsItem(state, item.id);
              const expanded = open === item.id;
              return (
                <View key={item.id} style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                  <Tactile onPress={() => setOpen(expanded ? null : item.id)} accessibilityRole="button" accessibilityLabel={item.name} style={styles.rowMain}>
                    <View style={[styles.rarity, { backgroundColor: RARITY_COLOR[item.rarity] }]}>
                      <AppText variant="caption" style={styles.rarityText}>
                        {t(`museum.rarity.${item.rarity}` as never)}
                      </AppText>
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <AppText variant="bodySmallStrong" numberOfLines={1}>
                        {item.name}
                        {count ? <AppText variant="caption" tone="muted">{`  · ${t('store.yours')}${count > 1 ? ` ×${count}` : ''}`}</AppText> : null}
                      </AppText>
                      <AppText variant="caption" tone="secondary" numberOfLines={expanded ? 4 : 2}>
                        {item.blurb}
                      </AppText>
                      <AppText variant="caption" tone="muted">
                        ₹{rupeesFor(item.coins)}
                        {item.heritage ? ` · ${t('museum.theme.heritage')}` : ''}
                      </AppText>
                    </View>
                    {unlocked ? (
                      item.render === 'frame' && count ? (
                        <Icon name="check" size="xs" color={colors.success} />
                      ) : (
                        <Button label={`${item.coins}`} icon="coins" size="sm" variant={affordable ? 'primary' : 'secondary'} disabled={!affordable} onPress={() => void buy(item)} accessibilityLabel={`Buy ${item.name} for ${item.coins} coins`} />
                      )
                    ) : (
                      <View style={styles.lock}>
                        <Icon name="lock" size="xs" color={colors.textMuted} />
                        <AppText variant="caption" tone="muted">
                          {t('store.unlocksAfter', { time: formatMinutes(item.unlockMinutes) })}
                        </AppText>
                      </View>
                    )}
                  </Tactile>
                  {expanded && (
                    <View style={[styles.eval, { borderTopColor: colors.border }]}>
                      <AppText variant="overline" tone="muted">
                        {t('museum.evaluation').toUpperCase()}
                      </AppText>
                      {(['utility', 'placement', 'consequence', 'interaction', 'performance', 'value'] as const).map((k) => (
                        <AppText key={k} variant="caption" tone="secondary">
                          <AppText variant="caption">{t(`museum.ev.${k}` as never)}: </AppText>
                          {item.evaluation[k]}
                        </AppText>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  balance: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.pill },
  list: { gap: sp.lg, paddingBottom: sp.md },
  row: { borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  rowMain: { flexDirection: 'row', alignItems: 'center', gap: sp.md, padding: sp.sm, paddingRight: sp.md },
  rarity: { width: 64, paddingVertical: 10, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  rarityText: { color: '#FFFFFF' },
  lock: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: 96 },
  eval: { borderTopWidth: StyleSheet.hairlineWidth, padding: sp.sm, paddingHorizontal: sp.md, gap: 4 },
});
