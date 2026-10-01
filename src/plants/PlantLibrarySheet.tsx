import React, { useMemo, useState } from 'react';
import { FlatList, Image, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography } from '../theme/colors';
import { PLANT_CATEGORY_LABELS, PLANT_LIBRARY, PlantCategory, PlantSpecies, plantImage } from './plantLibrary';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const CATEGORIES: (PlantCategory | 'all')[] = ['all', 'flowering', 'foliage', 'succulent', 'herb', 'specialty'];

/** The collection: all 100 plants of the FOCUS Plant Library on the shared
 * template, filterable by category, with a one-plant detail view. Reads the
 * manifest, so a regenerated library (placeholder → photo) shows up as is. */
export function PlantLibrarySheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [category, setCategory] = useState<PlantCategory | 'all'>('all');
  const [selected, setSelected] = useState<PlantSpecies | null>(null);

  const plants = useMemo(() => (category === 'all' ? PLANT_LIBRARY : PLANT_LIBRARY.filter((p) => p.category === category)), [category]);
  const columns = 3;
  const cell = (width - spacing.screenPadding * 2 - 8 * (columns - 1)) / columns;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <View style={[styles.sheet, { paddingTop: insets.top + 8 }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Plants</Text>
          <Text style={styles.subtitle}>{PLANT_LIBRARY.length} Indian balcony plants</Text>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" style={styles.close}>
            <Text style={styles.closeText}>Done</Text>
          </Pressable>
        </View>

        <FlatList
          horizontal
          data={CATEGORIES}
          keyExtractor={(c) => c}
          showsHorizontalScrollIndicator={false}
          style={styles.filters}
          contentContainerStyle={styles.filtersContent}
          renderItem={({ item }) => (
            <Pressable onPress={() => setCategory(item)} style={[styles.chip, category === item && styles.chipActive]} accessibilityRole="button">
              <Text style={[styles.chipText, category === item && styles.chipTextActive]}>{item === 'all' ? 'All' : PLANT_CATEGORY_LABELS[item].split(' /')[0]}</Text>
            </Pressable>
          )}
        />

        <FlatList
          key={columns}
          data={plants}
          numColumns={columns}
          keyExtractor={(p) => String(p.id)}
          columnWrapperStyle={styles.row}
          contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 24 }]}
          renderItem={({ item }) => (
            <Pressable onPress={() => setSelected(item)} style={[styles.card, { width: cell }]} accessibilityRole="button" accessibilityLabel={item.name}>
              <Image source={plantImage(item.id)} style={{ width: cell, height: cell }} resizeMode="cover" />
              <Text style={styles.cardName} numberOfLines={1}>
                {item.name}
              </Text>
            </Pressable>
          )}
        />

        {selected && (
          <Pressable style={styles.detailBackdrop} onPress={() => setSelected(null)} accessibilityRole="button" accessibilityLabel="Close plant">
            <View style={styles.detail}>
              <Image source={plantImage(selected.id)} style={{ width: width - spacing.screenPadding * 4, height: width - spacing.screenPadding * 4, borderRadius: radius.card }} resizeMode="cover" />
              <Text style={styles.detailName}>{selected.name}</Text>
              <Text style={styles.detailLatin}>{selected.botanicalName}</Text>
              <Text style={styles.detailMeta}>
                {PLANT_CATEGORY_LABELS[selected.category]} · {selected.indoor && selected.outdoor ? 'indoor or outdoor' : selected.indoor ? 'indoor' : 'outdoor'} · {selected.rootType.replace('-', ' ')} roots
              </Text>
              {selected.placeholder && <Text style={styles.placeholderNote}>Placeholder illustration — photo render pending</Text>}
            </View>
          </Pressable>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.screenPadding, flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 6 },
  title: { ...typography.heading, color: colors.text },
  subtitle: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  close: { paddingVertical: 6, paddingHorizontal: 4 },
  closeText: { ...typography.body, color: colors.primary, fontWeight: '700' },
  filters: { flexGrow: 0, marginBottom: 8 },
  filtersContent: { paddingHorizontal: spacing.screenPadding, gap: 8 },
  chip: { backgroundColor: colors.card, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.caption, color: colors.text, fontWeight: '600' },
  chipTextActive: { color: colors.white },
  grid: { paddingHorizontal: spacing.screenPadding },
  row: { gap: 8, marginBottom: 8 },
  card: { backgroundColor: colors.card, borderRadius: radius.card, overflow: 'hidden' },
  cardName: { ...typography.caption, color: colors.text, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 6 },
  detailBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(12,22,18,0.7)', alignItems: 'center', justifyContent: 'center', padding: spacing.screenPadding * 2 },
  detail: { backgroundColor: colors.card, borderRadius: radius.card, padding: spacing.screenPadding, alignItems: 'center', gap: 4 },
  detailName: { ...typography.title, color: colors.text, marginTop: 8 },
  detailLatin: { ...typography.body, color: colors.textSecondary, fontStyle: 'italic' },
  detailMeta: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  placeholderNote: { ...typography.caption, color: colors.textSecondary, marginTop: 6, opacity: 0.8 },
});
