// The garden's inventory: everything owned there, out on the lawn or put
// away, with its value; put-away things can come back out or be thrown
// into the dustbin, and penalties cleared for coins.
import React from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { STORE, PENALTY_REMOVAL_COINS, rupeesFor } from '../../spaces/catalog';
import { RewardState } from '../../spaces/rewards';
import { Sheet } from '../../spaces/ui/Sheet';
import { AppText } from '../../ui/AppText';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { radii } from '../../theme/radii';
import { space as sp } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import { t } from '../../i18n';
import { GardenState, binItem, capacity, isFixed, isPenalty, placeStored, planterCount } from '../model';
import { SPRITES } from '../sprites.generated';
import { gardenThumb } from './GardenStoreSheet';

interface Props {
  visible: boolean;
  state: GardenState;
  rewards: RewardState;
  onClose: () => void;
  onState: (next: GardenState) => void;
  onClearPenalty: (uid: string) => void;
  onToast: (text: string) => void;
}

export function GardenInventorySheet({ visible, state, rewards, onClose, onState, onClearPenalty, onToast }: Props) {
  const { colors } = useTheme();
  const placed = state.items.filter((p) => !isFixed(p.itemId) && SPRITES.items[p.itemId]);
  const totalCoins = [...placed, ...state.stored].reduce((s, x) => s + (STORE[x.itemId]?.coins ?? 0), 0);

  const bringOut = (uid: string, itemId: string) => {
    const next = placeStored(state, uid);
    if (next === state) {
      onToast(t('garden.tooMany'));
      return;
    }
    onState(next);
    onToast(t('inventory.backOut', { name: SPRITES.items[itemId].name }));
    onClose();
  };

  const row = (uid: string, itemId: string, status: string, actions: React.ReactNode) => {
    const entry = STORE[itemId];
    const thumb = gardenThumb(itemId);
    return (
      <View key={uid} style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <View style={styles.thumb}>{thumb && <Image source={thumb} style={styles.thumbImg} resizeMode="contain" />}</View>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="bodySmallStrong" numberOfLines={1}>
            {SPRITES.items[itemId]?.name ?? itemId}
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
    <Sheet visible={visible} title={t('inventory.title')} subtitle={`${t('inventory.subtitle', { space: t('space.garden'), coins: totalCoins, rupees: rupeesFor(totalCoins) })} · ${t('garden.capacity', { used: planterCount(state), total: capacity(state) })}`} onClose={onClose}>
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
            : row(p.uid, p.itemId, p.standUid ? t('garden.onStand') : t('inventory.placed'), <Icon name="check" size="xs" color={colors.success} />),
        )}
        {state.stored.length > 0 && (
          <AppText variant="overline" tone="muted" style={styles.section}>
            {t('inventory.putAway').toUpperCase()}
          </AppText>
        )}
        {state.stored.map((s) =>
          row(
            s.uid,
            s.itemId,
            t('inventory.readyToPlace'),
            <View style={styles.actions}>
              <Button label={t('inventory.place')} size="sm" variant="secondary" onPress={() => bringOut(s.uid, s.itemId)} />
              {!isPenalty(s.itemId) && (
                <Button
                  label=""
                  icon="trash"
                  size="sm"
                  variant="tertiary"
                  accessibilityLabel={t('inventory.throwAway')}
                  onPress={() => {
                    onState(binItem(state, s.uid));
                    onToast(t('inventory.thrown', { name: SPRITES.items[s.itemId]?.name ?? s.itemId }));
                  }}
                />
              )}
            </View>,
          ),
        )}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: { gap: sp.sm, paddingBottom: sp.md },
  section: { marginTop: sp.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: sp.md, padding: sp.sm, paddingRight: sp.md, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth },
  thumb: { width: 64, height: 64, borderRadius: radii.sm, backgroundColor: '#E9DFD2', overflow: 'hidden', padding: 4 },
  thumbImg: { width: '100%', height: '100%' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});
