// The garden's store: every plant, tree and object the 3D garden can hold,
// shown as its own photograph, with coin price, rupee value and unlock.
import React, { useMemo } from 'react';
import { Image, ImageSourcePropType, ScrollView, StyleSheet, View } from 'react-native';
import { STORE, rupeesFor } from '../../spaces/catalog';
import { isUnlocked } from '../../spaces/model';
import { RewardState } from '../../spaces/rewards';
import { Sheet } from '../../spaces/ui/Sheet';
import { formatMinutes } from '../../spaces/ui/StoreSheet';
import { AppText } from '../../ui/AppText';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { radii } from '../../theme/radii';
import { space as sp } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import { t } from '../../i18n';
import { GardenState, addItem, owns } from '../model';
import { SPRITES, SPRITE_IMAGES } from '../sprites.generated';

export function gardenThumb(itemId: string): ImageSourcePropType | null {
  const def = SPRITES.items[itemId];
  if (!def) return null;
  const s = def.sprite ?? def.stages?.[def.stages.length - 1]?.healthy ?? def.stack?.[0];
  const id = s ? SPRITE_IMAGES[s.file] : undefined;
  return id !== undefined ? id : null;
}

interface Props {
  visible: boolean;
  state: GardenState;
  rewards: RewardState;
  onClose: () => void;
  onState: (next: GardenState) => void;
  onRewards: (next: RewardState) => Promise<void>;
  onToast: (text: string) => void;
}

const GROUPS: { key: string; cats: string[] }[] = [
  { key: 'Plants', cats: ['PLANTS'] },
  { key: 'Trees', cats: ['TREES'] },
  { key: 'Furniture & stands', cats: ['FURNITURE', 'STRUCTURE'] },
  { key: 'Lighting', cats: ['LIGHTING'] },
  { key: 'Decor', cats: ['DECOR'] },
];

export function GardenStoreSheet({ visible, state, rewards, onClose, onState, onRewards, onToast }: Props) {
  const { colors } = useTheme();
  const ids = useMemo(
    () =>
      Object.keys(STORE)
        .filter((id) => !STORE[id].hidden && STORE[id].spaces.includes('garden') && SPRITES.items[id])
        .sort((a, b) => STORE[a].unlockMinutes - STORE[b].unlockMinutes || STORE[a].coins - STORE[b].coins),
    [],
  );

  const buy = async (itemId: string) => {
    const price = STORE[itemId].coins;
    if (rewards.coins < price) return;
    await onRewards({ ...rewards, coins: rewards.coins - price });
    const { state: next, placed } = addItem(state, itemId);
    onState(next);
    const name = SPRITES.items[itemId].name;
    if (placed) {
      onToast(name);
      onClose();
    } else onToast(t('store.storedNoRoom', { name }));
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
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {GROUPS.map((g) => {
          const here = ids.filter((id) => g.cats.includes(SPRITES.items[id].category));
          if (!here.length) return null;
          return (
            <View key={g.key} style={{ gap: sp.sm }}>
              <AppText variant="overline" tone="muted">
                {g.key.toUpperCase()}
              </AppText>
              {here.map((id) => {
                const entry = STORE[id];
                const unlocked = isUnlocked(id, rewards.lifetimeMinutes);
                const count = owns(state, id);
                const affordable = rewards.coins >= entry.coins;
                const thumb = gardenThumb(id);
                return (
                  <View key={id} style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                    <View style={[styles.thumb, !unlocked && styles.locked]}>{thumb && <Image source={thumb} style={styles.thumbImg} resizeMode="contain" />}</View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <AppText variant="bodySmallStrong" numberOfLines={1}>
                        {SPRITES.items[id].name}
                        {count ? <AppText variant="caption" tone="muted">{`  · ${t('store.yours')}${count > 1 ? ` ×${count}` : ''}`}</AppText> : null}
                      </AppText>
                      <AppText variant="caption" tone="secondary" numberOfLines={2}>
                        {entry.blurb}
                      </AppText>
                      <AppText variant="caption" tone="muted">
                        ₹{rupeesFor(entry.coins)} · {t('space.garden')}
                      </AppText>
                    </View>
                    {unlocked ? (
                      <Button label={`${entry.coins}`} icon="coins" size="sm" variant={affordable ? 'primary' : 'secondary'} disabled={!affordable} onPress={() => void buy(id)} accessibilityLabel={`Buy ${SPRITES.items[id].name} for ${entry.coins} coins`} />
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
            </View>
          );
        })}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  balance: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.pill },
  list: { gap: sp.lg, paddingBottom: sp.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: sp.md, padding: sp.sm, paddingRight: sp.md, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth },
  thumb: { width: 72, height: 72, borderRadius: radii.sm, backgroundColor: '#E9DFD2', overflow: 'hidden', padding: 4 },
  thumbImg: { width: '100%', height: '100%' },
  locked: { opacity: 0.45 },
  lock: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: 96 },
});
