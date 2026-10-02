// The inventory of one space: everything owned there, placed or put away,
// with its value in coins and rupees. Put-away things can be brought back
// out, thrown into the garden's dustbin, and penalties cleared for coins.
import React from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { SpaceId } from '../packTypes';
import { packFor } from '../packs';
import { STORE, PENALTY_REMOVAL_COINS, rupeesFor } from '../catalog';
import { SpaceState, binItem, freeSlotFor, isFixed, isPenalty, placeStored } from '../model';
import { RewardState } from '../rewards';
import { Sheet } from './Sheet';
import { thumbFor } from './StoreSheet';
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
  onClearPenalty: (uid: string) => void;
  onToast: (text: string) => void;
}

export function InventorySheet({ visible, space, state, rewards, onClose, onState, onClearPenalty, onToast }: Props) {
  const { colors } = useTheme();
  const pack = packFor(space);
  const placed = state.placed.filter((p) => !isFixed(space, p.itemId) && pack.items[p.itemId]);
  const totalCoins = [...placed, ...state.stored].reduce((s, x) => s + (STORE[x.itemId]?.coins ?? 0), 0);

  const bringOut = (uid: string, itemId: string) => {
    const next = placeStored(state, uid);
    if (next === state) {
      onToast(t('inventory.noSpot'));
      return;
    }
    onState(next);
    onToast(t('inventory.backOut', { name: pack.items[itemId].name }));
    onClose();
  };

  const row = (uid: string, itemId: string, status: string, actions: React.ReactNode) => {
    const entry = STORE[itemId];
    const thumb = thumbFor(space, itemId);
    return (
      <View key={uid} style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <View style={styles.thumb}>{thumb && <Image source={thumb} style={styles.thumbImg} resizeMode="cover" />}</View>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="bodySmallStrong" numberOfLines={1}>
            {pack.items[itemId]?.name ?? itemId}
          </AppText>
          <AppText variant="caption" tone="secondary" numberOfLines={1}>
            {status}
          </AppText>
          {entry && !entry.hidden ? (
            <AppText variant="caption" tone="muted">
              {entry.coins} {t('coins')} · ₹{rupeesFor(entry.coins)}
            </AppText>
          ) : null}
        </View>
        {actions}
      </View>
    );
  };

  return (
    <Sheet
      visible={visible}
      title={t('inventory.title')}
      subtitle={t('inventory.subtitle', { space: t(`space.${space}`), coins: totalCoins, rupees: rupeesFor(totalCoins) })}
      onClose={onClose}
    >
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {placed.length === 0 && state.stored.length === 0 && (
          <AppText variant="bodySmall" tone="secondary" align="center" style={{ paddingVertical: sp.xl }}>
            {t('inventory.empty')}
          </AppText>
        )}
        {placed.map((p) =>
          isPenalty(p.itemId)
            ? row(
                p.uid,
                p.itemId,
                t('inventory.penaltyStatus'),
                <Button
                  label={`${PENALTY_REMOVAL_COINS}`}
                  icon="coins"
                  size="sm"
                  variant={rewards.coins >= PENALTY_REMOVAL_COINS ? 'destructive' : 'secondary'}
                  disabled={rewards.coins < PENALTY_REMOVAL_COINS}
                  onPress={() => onClearPenalty(p.uid)}
                  accessibilityLabel={t('inventory.clearFor', { coins: PENALTY_REMOVAL_COINS })}
                />,
              )
            : row(p.uid, p.itemId, pack.slots[p.slot]?.label ?? t('inventory.placed'), <Icon name="check" size="xs" color={colors.success} />),
        )}
        {state.stored.length > 0 && (
          <AppText variant="overline" tone="muted" style={styles.section}>
            {t('inventory.putAway').toUpperCase()}
          </AppText>
        )}
        {state.stored.map((s) => {
          const fits = !!freeSlotFor(state, s.itemId);
          return row(
            s.uid,
            s.itemId,
            fits ? t('inventory.readyToPlace') : t('inventory.noSpotNow'),
            <View style={styles.actions}>
              <Button label={t('inventory.place')} size="sm" variant="secondary" disabled={!fits} onPress={() => bringOut(s.uid, s.itemId)} />
              {!isPenalty(s.itemId) && (
                <Button
                  label=""
                  icon="trash"
                  size="sm"
                  variant="tertiary"
                  accessibilityLabel={t('inventory.throwAway')}
                  onPress={() => {
                    onState(binItem(state, s.uid));
                    onToast(t('inventory.thrown', { name: pack.items[s.itemId]?.name ?? s.itemId }));
                  }}
                />
              )}
            </View>,
          );
        })}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: { gap: sp.sm, paddingBottom: sp.md },
  section: { marginTop: sp.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: sp.md, padding: sp.sm, paddingRight: sp.md, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth },
  thumb: { width: 64, height: 64, borderRadius: radii.sm, backgroundColor: '#E9DFD2', overflow: 'hidden' },
  thumbImg: { width: '100%', height: '100%' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});
