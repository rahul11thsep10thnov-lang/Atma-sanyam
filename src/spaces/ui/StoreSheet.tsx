// The store: the hundred things the three spaces can hold, each shown as
// the rendered object itself in place, with its coin price, rupee value
// and when it unlocks. Opened from any space; shows what fits that space
// first.
import React, { useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { SpaceId } from '../packTypes';
import { packFor, img, hasImg } from '../packs';
import { STORE, SPACES, rupeesFor } from '../catalog';
import { SpaceState, addItem, isUnlocked, owns } from '../model';
import { RewardState } from '../rewards';
import { Sheet } from './Sheet';
import { AppText } from '../../ui/AppText';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { radii } from '../../theme/radii';
import { space as sp } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import { t } from '../../i18n';

interface Props {
  visible: boolean;
  space: SpaceId;
  state: SpaceState;
  rewards: RewardState;
  onClose: () => void;
  onState: (next: SpaceState) => void;
  onRewards: (next: RewardState) => Promise<void>;
  onToast: (text: string) => void;
}

export function thumbFor(space: SpaceId, itemId: string) {
  const pack = packFor(space);
  const thumb = pack.thumbs?.[itemId];
  if (thumb && hasImg(space, thumb)) return img(space, thumb);
  const item = pack.items[itemId];
  const first = item ? Object.values(item.variants ?? {})[0]?.[0] : null;
  const f = first?.files?.morning ?? (first ? Object.values(first.files ?? {})[0] : null);
  return f && hasImg(space, f.file) ? img(space, f.file) : null;
}

const SPACE_LABEL: Record<SpaceId, string> = { balcony: 'Balcony', garden: 'Garden' };

export function StoreSheet({ visible, space, state, rewards, onClose, onState, onRewards, onToast }: Props) {
  const { colors } = useTheme();
  const [which, setWhich] = useState<SpaceId>(space);
  const pack = packFor(which);
  const ids = useMemo(
    () =>
      Object.keys(STORE)
        .filter((id) => !STORE[id].hidden && STORE[id].spaces.includes(which) && pack.items[id])
        .sort((a, b) => STORE[a].unlockMinutes - STORE[b].unlockMinutes || STORE[a].coins - STORE[b].coins),
    [which, pack],
  );

  const buy = async (itemId: string) => {
    const price = STORE[itemId].coins;
    if (rewards.coins < price) return;
    if (which !== space) {
      onToast(t('store.openSpaceToBuy', { space: t(`space.${which}`) }));
      return;
    }
    await onRewards({ ...rewards, coins: rewards.coins - price });
    const { state: next, placedAt } = addItem(state, itemId);
    onState(next);
    const name = pack.items[itemId].name;
    if (placedAt) {
      onToast(`${name} · ${pack.slots[placedAt].label.toLowerCase()}`);
      onClose();
    } else {
      onToast(t('store.storedNoRoom', { name }));
    }
  };

  return (
    <Sheet
      visible={visible}
      title={t('store.title')}
      subtitle={t('store.subtitle')}
      onClose={onClose}
      right={
        <View style={[styles.balance, { backgroundColor: colors.accentSoft }]} accessibilityLabel={`${rewards.coins} coins`}>
          <Icon name="coins" size="xs" color={colors.accent} />
          <AppText variant="bodyStrong">{rewards.coins}</AppText>
        </View>
      }
    >
      {SPACES.length > 1 && (
        <View style={styles.filters}>
          {SPACES.map((s) => (
            <Button key={s} label={t(`space.${s}`)} size="sm" variant={which === s ? 'primary' : 'secondary'} onPress={() => setWhich(s)} />
          ))}
        </View>
      )}
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {ids.map((id) => {
          const entry = STORE[id];
          const unlocked = isUnlocked(id, rewards.lifetimeMinutes);
          const count = which === space ? owns(state, id) : 0;
          const affordable = rewards.coins >= entry.coins;
          const thumb = thumbFor(which, id);
          return (
            <View key={id} style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <View style={[styles.thumb, !unlocked && styles.locked]}>{thumb && <Image source={thumb} style={styles.thumbImg} resizeMode="cover" />}</View>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="bodySmallStrong" numberOfLines={1}>
                  {pack.items[id].name}
                  {count ? <AppText variant="caption" tone="muted">{`  · ${t('store.yours')}${count > 1 ? ` ×${count}` : ''}`}</AppText> : null}
                </AppText>
                <AppText variant="caption" tone="secondary" numberOfLines={2}>
                  {entry.blurb}
                </AppText>
                <AppText variant="caption" tone="muted">
                  ₹{rupeesFor(entry.coins)} · {SPACE_LABEL[which]}
                </AppText>
              </View>
              {unlocked ? (
                <Button label={`${entry.coins}`} icon="coins" size="sm" variant={affordable ? 'primary' : 'secondary'} disabled={!affordable} onPress={() => void buy(id)} accessibilityLabel={`Buy ${pack.items[id].name} for ${entry.coins} coins`} />
              ) : (
                <View style={styles.lock}>
                  <Icon name="lock" size="xs" color={colors.textMuted} />
                  <AppText variant="caption" tone="muted">
                    {t('store.unlocksAfter', { time: formatMinutes(entry.unlockMinutes) })}
                  </AppText>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </Sheet>
  );
}

export function formatMinutes(m: number) {
  return m >= 60 ? `${Math.round((m / 60) * 10) / 10} h` : `${m} min`;
}

const styles = StyleSheet.create({
  balance: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.pill },
  filters: { flexDirection: 'row', gap: sp.sm, marginBottom: sp.md },
  list: { gap: sp.sm, paddingBottom: sp.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: sp.md, padding: sp.sm, paddingRight: sp.md, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth },
  thumb: { width: 72, height: 72, borderRadius: radii.sm, backgroundColor: '#E9DFD2', overflow: 'hidden' },
  thumbImg: { width: '100%', height: '100%' },
  locked: { opacity: 0.45 },
  lock: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: 96 },
});
