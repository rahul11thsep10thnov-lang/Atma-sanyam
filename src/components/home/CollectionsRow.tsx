// The library's top-level collections (e.g. Hindu Temples & Deities,
// Landscapes of India), one tap away from Home. Comes from the API; shows
// nothing until the catalogue has categories.
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '../../ui/AppText';
import { Icon, IconName } from '../../ui/Icon';
import { Tactile } from '../../ui/Pressable';
import { radii } from '../../theme/radii';
import { space } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import { useContentCategories } from '../../content/useContentLibrary';
import { CategoryNode } from '../../content/types';

function iconFor(c: CategoryNode): IconName {
  const n = `${c.id} ${c.name}`.toLowerCase();
  if (/hindu|islam|sikh|mosque|gurdwara|temple|religion|deit/.test(n)) return 'landmark';
  if (/landscape|nature|mountain|beach|forest/.test(n)) return 'mountain';
  if (/movie|series|anime|film/.test(n)) return 'sparkles';
  return 'images';
}

export function CollectionsRow({ onOpen }: { onOpen: (category: CategoryNode) => void }) {
  const { colors } = useTheme();
  const { categories } = useContentCategories();
  const roots = categories.filter((c) => c.parentId === null);
  if (roots.length === 0) return null;
  return (
    <View style={styles.section}>
      <AppText variant="overline" tone="muted" style={styles.label}>
        COLLECTIONS
      </AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stripWrap} contentContainerStyle={styles.strip}>
        {roots.map((c) => (
          <Tactile
            key={c.id}
            onPress={() => onOpen(c)}
            scaleTo={0.96}
            accessibilityRole="button"
            accessibilityLabel={`${c.name} collection`}
            style={[styles.chip, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}
          >
            <View style={[styles.chipIcon, { backgroundColor: colors.primarySoft }]}>
              <Icon name={iconFor(c)} size="xs" color="primary" />
            </View>
            <AppText variant="bodySmallStrong" numberOfLines={1}>
              {c.name}
            </AppText>
          </Tactile>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: space.xl },
  label: { marginBottom: space.md },
  stripWrap: { marginHorizontal: -space.screen },
  strip: { paddingHorizontal: space.screen, gap: space.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingLeft: 6, paddingRight: 14, height: 40, borderRadius: radii.pill, borderWidth: 1 },
  chipIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
