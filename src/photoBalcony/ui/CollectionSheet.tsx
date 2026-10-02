// The Collection: everything the balcony can hold, shown as the rendered
// object itself (never an icon), with what it costs or when it unlocks, and
// anything put away waiting to come back out.
import React, { useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { PACK } from '../pack.generated';
import { STORE } from '../catalog';
import { addPurchase, BalconyState, freeSlotFor, isUnlocked, owns, placeStored } from '../model';
import { RewardState } from '../rewards';
import { img } from '../scene/images';
import { Sheet } from './Sheet';
import { AppText } from '../../ui/AppText';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { radii } from '../../theme/radii';
import { space } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';

type Filter = 'all' | 'PLANTS' | 'FURNITURE' | 'DECOR';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'PLANTS', label: 'Plants' },
  { id: 'FURNITURE', label: 'Furniture' },
  { id: 'DECOR', label: 'Decor' },
];
const GROUP: Record<string, Filter> = { PLANTS: 'PLANTS', FURNITURE: 'FURNITURE', TABLES: 'FURNITURE', RUGS: 'DECOR', LIGHTING: 'DECOR', DECOR: 'DECOR' };

interface Props {
  visible: boolean;
  state: BalconyState;
  rewards: RewardState;
  onClose: () => void;
  onState: (next: BalconyState) => void;
  onRewards: (next: RewardState) => Promise<void>;
  onToast: (text: string) => void;
}

export function thumbFor(itemId: string) {
  const thumb = PACK.thumbs?.[itemId];
  if (thumb) return img(thumb);
  const variants = PACK.items[itemId]?.variants ?? {};
  const first = Object.values(variants)[0]?.[0];
  return first ? img(first.file) : null;
}

export function CollectionSheet({ visible, state, rewards, onClose, onState, onRewards, onToast }: Props) {
  const { colors } = useTheme();
  const [filter, setFilter] = useState<Filter>('all');
  const ids = useMemo(
    () =>
      Object.keys(STORE)
        .filter((id) => !STORE[id].hidden && PACK.items[id])
        .sort((a, b) => STORE[a].unlockMinutes - STORE[b].unlockMinutes || STORE[a].price - STORE[b].price),
    [],
  );
  const shown = ids.filter((id) => filter === 'all' || GROUP[PACK.items[id].category] === filter);

  const buy = async (itemId: string) => {
    const price = STORE[itemId].price;
    if (rewards.coins < price) return;
    await onRewards({ ...rewards, coins: rewards.coins - price });
    const { state: next, placedAt } = addPurchase(state, itemId);
    onState(next);
    const name = PACK.items[itemId].name;
    if (placedAt) {
      onToast(`${name} · ${PACK.slots[placedAt].label.toLowerCase()}`);
      onClose();
    } else {
      onToast(`${name} is in storage — make room in Customize`);
    }
  };

  const bringOut = (storedUid: string, itemId: string) => {
    const next = placeStored(state, storedUid);
    if (next === state) {
      onToast('No free spot for that — move something first');
      return;
    }
    onState(next);
    onToast(`${PACK.items[itemId].name} is back out`);
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      title="Collection"
      subtitle="Focus earns coins. Coins furnish your balcony."
      onClose={onClose}
      right={
        <View style={[styles.balance, { backgroundColor: colors.accentSoft }]} accessibilityLabel={`${rewards.coins} coins`}>
          <Icon name="coins" size="xs" color={colors.accent} />
          <AppText variant="bodyStrong">{rewards.coins}</AppText>
        </View>
      }
    >
      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <Button key={f.id} label={f.label} size="sm" variant={filter === f.id ? 'primary' : 'secondary'} onPress={() => setFilter(f.id)} />
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {state.stored.length > 0 && filter === 'all' && (
          <>
            <AppText variant="overline" tone="muted" style={styles.section}>
              PUT AWAY
            </AppText>
            {state.stored.map((s) => {
              const fits = !!freeSlotFor(state, s.itemId);
              return (
                <Row key={s.uid} itemId={s.itemId} sub={fits ? 'Ready to bring back out' : 'No free spot right now'}>
                  <Button label="Place" size="sm" variant="secondary" disabled={!fits} onPress={() => bringOut(s.uid, s.itemId)} />
                </Row>
              );
            })}
            <AppText variant="overline" tone="muted" style={styles.section}>
              FOR YOUR BALCONY
            </AppText>
          </>
        )}
        {shown.map((id) => {
          const entry = STORE[id];
          const unlocked = isUnlocked(id, rewards.lifetimeMinutes);
          const count = owns(state, id);
          const affordable = rewards.coins >= entry.price;
          return (
            <Row key={id} itemId={id} sub={entry.blurb} locked={!unlocked} owned={count}>
              {unlocked ? (
                <Button label={`${entry.price}`} icon="coins" size="sm" variant={affordable ? 'primary' : 'secondary'} disabled={!affordable} onPress={() => void buy(id)} accessibilityLabel={`Buy ${PACK.items[id].name} for ${entry.price} coins`} />
              ) : (
                <View style={styles.lock}>
                  <Icon name="lock" size="xs" color={colors.textMuted} />
                  <AppText variant="caption" tone="muted">
                    {formatMinutes(entry.unlockMinutes)} of focus
                  </AppText>
                </View>
              )}
            </Row>
          );
        })}
      </ScrollView>
    </Sheet>
  );
}

function formatMinutes(m: number) {
  return m >= 60 ? `${Math.round((m / 60) * 10) / 10} h` : `${m} min`;
}

function Row({ itemId, sub, locked, owned, children }: { itemId: string; sub: string; locked?: boolean; owned?: number; children: React.ReactNode }) {
  const { colors } = useTheme();
  const thumb = thumbFor(itemId);
  return (
    <View style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <View style={[styles.thumb, locked && styles.locked]}>{thumb && <Image source={thumb} style={styles.thumbImg} resizeMode="cover" />}</View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodySmallStrong" numberOfLines={1}>
          {PACK.items[itemId].name}
          {owned ? <AppText variant="caption" tone="muted">{`  · yours${owned > 1 ? ` ×${owned}` : ''}`}</AppText> : null}
        </AppText>
        <AppText variant="caption" tone="secondary" numberOfLines={2}>
          {sub}
        </AppText>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  balance: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.pill },
  filters: { flexDirection: 'row', gap: space.sm, marginBottom: space.md },
  list: { gap: space.sm, paddingBottom: space.md },
  section: { marginTop: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.sm, paddingRight: space.md, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth },
  thumb: { width: 72, height: 72, borderRadius: radii.sm, backgroundColor: '#E9DFD2', overflow: 'hidden' },
  thumbImg: { width: '100%', height: '100%' },
  locked: { opacity: 0.45 },
  lock: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: 96 },
});
