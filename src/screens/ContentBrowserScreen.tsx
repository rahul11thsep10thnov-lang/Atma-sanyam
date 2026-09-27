import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography, buttonHeight } from '../theme/colors';
import { RootStackParamList } from '../navigation/types';
import { useContentCategories, useContentLibrary } from '../content/useContentLibrary';
import { RemoteThumb } from '../content/RemoteThumb';
import { resolveImageUri } from '../content/repository';
import { CategoryNode, ContentImage, SortOrder } from '../content/types';

const SORTS: { key: SortOrder; label: string }[] = [
  { key: 'popular', label: 'Popular' },
  { key: 'newest', label: 'Newest' },
  { key: 'title', label: 'A–Z' },
];

const GRID_GAP = 10;
const NUM_COLUMNS = 3;

export function ContentBrowserScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();

  const { categories } = useContentCategories();
  const [path, setPath] = useState<CategoryNode[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const { images, loading, loadingMore, error, hasMore, filters, setSearch, setCategoryId, setSort, loadMore, retry } =
    useContentLibrary();

  useEffect(() => {
    const handle = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(handle);
  }, [searchInput, setSearch]);

  const currentParentId = path.length > 0 ? path[path.length - 1].id : null;
  const visibleCategories = categories.filter((c) => c.parentId === currentParentId);

  const selectCategory = (node: CategoryNode) => {
    setPath((prev) => [...prev, node]);
    setCategoryId(node.id);
  };

  const selectBreadcrumb = (index: number) => {
    if (index < 0) {
      setPath([]);
      setCategoryId(null);
      return;
    }
    setPath((prev) => prev.slice(0, index + 1));
    setCategoryId(path[index].id);
  };

  const handlePick = async (image: ContentImage) => {
    if (resolvingId) return;
    setResolvingId(image.imageId);
    try {
      const uri = await resolveImageUri(image, 'full');
      route.params?.onSelect?.({
        kind: 'remote',
        uri,
        imageId: image.imageId,
        title: image.title,
        attributionText: image.attributionRequired ? image.attributionText : null,
      });
      navigation.goBack();
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕</Text>
        </Pressable>
        <Text style={styles.title}>Browse library</Text>
        <View style={styles.closeBtn} />
      </View>

      <TextInput
        value={searchInput}
        onChangeText={setSearchInput}
        placeholder="Search title, category, or tag"
        placeholderTextColor={colors.textSecondary}
        style={styles.searchInput}
      />

      <View style={styles.breadcrumbRow}>
        <Pressable onPress={() => selectBreadcrumb(-1)}>
          <Text style={[styles.breadcrumb, path.length === 0 && styles.breadcrumbActive]}>All</Text>
        </Pressable>
        {path.map((node, i) => (
          <View key={node.id} style={styles.breadcrumbItem}>
            <Text style={styles.breadcrumbSep}>›</Text>
            <Pressable onPress={() => selectBreadcrumb(i)}>
              <Text style={[styles.breadcrumb, i === path.length - 1 && styles.breadcrumbActive]}>{node.name}</Text>
            </Pressable>
          </View>
        ))}
      </View>

      {visibleCategories.length > 0 && (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={visibleCategories}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.chipRow}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => selectCategory(item)}
              style={[styles.chip, filters.categoryId === item.id && styles.chipActive]}
            >
              <Text style={[styles.chipText, filters.categoryId === item.id && styles.chipTextActive]}>{item.name}</Text>
            </Pressable>
          )}
        />
      )}

      <View style={styles.sortRow}>
        {SORTS.map((s) => (
          <Pressable key={s.key} onPress={() => setSort(s.key)} style={styles.sortBtn}>
            <Text style={[styles.sortText, filters.sort === s.key && styles.sortTextActive]}>{s.label}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : error ? (
        <View style={styles.centerFill}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={retry}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : images.length === 0 ? (
        <View style={styles.centerFill}>
          <Text style={styles.emptyText}>No images match.</Text>
        </View>
      ) : (
        <FlatList
          data={images}
          keyExtractor={(img) => img.imageId}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={{ gap: GRID_GAP }}
          onEndReachedThreshold={0.4}
          onEndReached={() => hasMore && loadMore()}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color={colors.primary} /> : null}
          renderItem={({ item }) => (
            <View style={{ marginBottom: GRID_GAP }}>
              <RemoteThumb
                image={item}
                size={THUMB_SIZE}
                onPress={() => handlePick(item)}
                selected={resolvingId === item.imageId}
              />
            </View>
          )}
        />
      )}
    </View>
  );
}

const THUMB_SIZE = 108;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.screenPadding },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  closeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 18, color: colors.text },
  title: { ...typography.title, color: colors.text },
  searchInput: {
    height: buttonHeight,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    color: colors.text,
    ...typography.body,
    marginBottom: 12,
  },
  breadcrumbRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 },
  breadcrumbItem: { flexDirection: 'row', alignItems: 'center' },
  breadcrumb: { ...typography.caption, color: colors.textSecondary },
  breadcrumbActive: { color: colors.primary, fontWeight: '700' },
  breadcrumbSep: { ...typography.caption, color: colors.textSecondary, marginHorizontal: 4 },
  chipRow: { gap: 8, paddingBottom: 12 },
  chip: {
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.caption, color: colors.text },
  chipTextActive: { color: colors.white, fontWeight: '700' },
  sortRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  sortBtn: { paddingVertical: 4 },
  sortText: { ...typography.caption, color: colors.textSecondary },
  sortTextActive: { color: colors.primary, fontWeight: '700' },
  grid: { paddingBottom: 24 },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { ...typography.body, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 24 },
  emptyText: { ...typography.body, color: colors.textSecondary },
  retryBtn: {
    height: buttonHeight,
    paddingHorizontal: 24,
    borderRadius: radius.card,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtnText: { ...typography.title, color: colors.white },
});
