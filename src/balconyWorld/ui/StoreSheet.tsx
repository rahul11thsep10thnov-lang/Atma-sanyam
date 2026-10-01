// The store (architecture doc section H; design spec 21, 72-73): visual
// cards, coin prices, milestone unlocks. Coins only — real-money packs
// arrive with the monetisation step and never gate focus itself.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../ui/AppText';
import { Button, IconButton } from '../../ui/Button';
import { Icon, IconName } from '../../ui/Icon';
import { Tactile } from '../../ui/Pressable';
import { radii } from '../../theme/radii';
import { space } from '../../theme/spacing';
import { duration, easing } from '../../theme/motion';
import { useTheme } from '../../theme/ThemeContext';
import { ASSET_CATALOG } from '../catalog/AssetCatalog';
import { AssetCategory, AssetDefinition } from '../state/types';
import { isAssetUnlocked, MILESTONES } from '../state/RewardState';

const CATEGORY_ICON: Partial<Record<AssetCategory, IconName>> = {
  FURNITURE: 'armchair',
  TABLES: 'armchair',
  LIGHTING: 'lamp',
  PLANTS: 'sprout',
  POTS: 'flower',
  DECOR: 'sparkles',
  RUGS: 'image',
  WALL_ART: 'image',
};

interface Props {
  visible: boolean;
  coins: number;
  lifetimeMinutes: number;
  objectCount: number;
  maxObjects: number;
  onClose: () => void;
  onBuy: (asset: AssetDefinition) => void;
}

function unlockMinutesFor(asset: AssetDefinition): number | undefined {
  return asset.unlockMinutes ?? MILESTONES.find((m) => m.unlocksAssetId === asset.id)?.minutes;
}

export function StoreSheet({ visible, coins, lifetimeMinutes, objectCount, maxObjects, onClose, onBuy }: Props) {
  const { colors, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useRef(new Animated.Value(0)).current;
  // Mounted only while shown or sliding away: a hidden sheet must never sit
  // over the balcony (on web an invisible scrim would still swallow touches).
  const [mounted, setMounted] = useState(visible);
  useEffect(() => {
    if (visible) setMounted(true);
    Animated.timing(t, { toValue: visible ? 1 : 0, duration: duration.expressive, easing: easing.standard, useNativeDriver: true }).start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
  }, [visible, t]);
  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [1200, 0] });
  const full = objectCount >= maxObjects;
  const items = Object.values(ASSET_CATALOG);
  if (!mounted) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'auto' : 'none'}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim, opacity: t }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close the store" accessibilityRole="button" />
      </Animated.View>
      <Animated.View style={[styles.sheet, { backgroundColor: colors.surfaceRaised, paddingBottom: insets.bottom + space.lg, transform: [{ translateY }] }, shadow.level4]} accessibilityViewIsModal={visible}>
        <View style={[styles.handle, { backgroundColor: colors.borderStrong }]} />
        <View style={styles.header}>
          <View>
            <AppText variant="heading">Store</AppText>
            <AppText variant="bodySmall" tone="secondary">Focus earns coins. Coins furnish your balcony.</AppText>
          </View>
          <View style={[styles.balance, { backgroundColor: colors.accentSoft }]}>
            <Icon name="coins" size="xs" color={colors.accent} />
            <AppText variant="bodyStrong">{coins}</AppText>
          </View>
        </View>
        {full && (
          <AppText variant="caption" tone="warning" style={styles.note}>
            Your balcony is full ({maxObjects} objects). Remove something to make room.
          </AppText>
        )}
        <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
          {items.map((asset) => {
            const unlockAt = unlockMinutesFor(asset);
            const unlocked = isAssetUnlocked(asset.id, lifetimeMinutes, unlockAt);
            const affordable = coins >= asset.price.coins;
            const canBuy = unlocked && affordable && !full;
            return (
              <Tactile
                key={asset.id}
                onPress={() => canBuy && onBuy(asset)}
                disabled={!canBuy}
                haptic={canBuy}
                scaleTo={0.97}
                accessibilityRole="button"
                accessibilityLabel={`${asset.name}, ${asset.price.coins} coins${unlocked ? '' : `, unlocks after ${unlockAt} focused minutes`}`}
                accessibilityState={{ disabled: !canBuy }}
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, !unlocked && styles.locked]}
              >
                <View style={[styles.thumb, { backgroundColor: unlocked ? colors.primarySoft : colors.surfaceMuted }]}>
                  <Icon name={unlocked ? CATEGORY_ICON[asset.category] ?? 'sparkles' : 'lock'} size="lg" color={unlocked ? 'primary' : 'icon'} strokeWidth={1.6} />
                  {asset.placeholder && (
                    <AppText variant="overline" tone="muted" style={styles.placeholderTag}>PLACEHOLDER</AppText>
                  )}
                </View>
                <AppText variant="bodySmallStrong" numberOfLines={1}>{asset.name}</AppText>
                {unlocked ? (
                  <View style={styles.priceRow}>
                    <Icon name="coins" size={12} color={affordable ? colors.accent : colors.textMuted} />
                    <AppText variant="caption" tone={affordable ? 'text' : 'muted'}>{asset.price.coins}</AppText>
                  </View>
                ) : (
                  <AppText variant="caption" tone="muted">Unlocks at {unlockAt} min</AppText>
                )}
              </Tactile>
            );
          })}
        </ScrollView>
        <View style={styles.footer}>
          <Button label="Done" variant="secondary" fullWidth onPress={onClose} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '78%', borderTopLeftRadius: radii.hero, borderTopRightRadius: radii.hero, paddingHorizontal: space.xl, paddingTop: space.sm },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: space.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, marginBottom: space.md },
  balance: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.pill },
  note: { marginBottom: space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, paddingBottom: space.md },
  card: { width: '47%', flexGrow: 1, borderRadius: radii.md, borderWidth: 1, padding: space.md, gap: 6 },
  locked: { opacity: 0.75 },
  thumb: { height: 84, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  placeholderTag: { position: 'absolute', bottom: 6, fontSize: 9 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footer: { paddingTop: space.sm },
});
