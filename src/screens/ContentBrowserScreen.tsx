// The picture library: search, collections as chips, sort, and a grid of
// cached thumbnails. Opened from Home (optionally inside one collection).
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/types';
import { useContentCategories, useContentLibrary } from '../content/useContentLibrary';
import { RemoteThumb } from '../content/RemoteThumb';
import { resolveImageUri } from '../content/repository';
import { CategoryNode, ContentImage, SortOrder } from '../content/types';
import { AppText } from '../ui/AppText';
import { Button, IconButton } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Tactile } from '../ui/Pressable';
import { SegmentedControl } from '../ui/SegmentedControl';
import { TextField } from '../ui/TextField';
import { radii } from '../theme/radii';
import { space } from '../theme/spacing';
import { useTheme } from '../theme/ThemeContext';
import { categoryLabel, StringKey, t } from '../i18n';

const SORTS: { value: SortOrder; label: string }[] = [
  { value: 'popular', label: 'library.popular' },
  { value: 'newest', label: 'library.newest' },
  { value: 'title', label: 'library.az' },
];

const GRID_GAP = space.md;
const NUM_COLUMNS = 3;

export function ContentBrowserScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const { categories } = useContentCategories();
  const initialCategoryId: string | undefined = route.params?.initialCategoryId;
  const [path, setPath] = useState<CategoryNode[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [gridWidth, setGridWidth] = useState(0);

  const { images, loading, loadingMore, error, hasMore, filters, setSearch, setCategoryId, setSort, loadMore, retry } =
    useContentLibrary(initialCategoryId ? { categoryId: initialCategoryId } : {});

  useEffect(() => {
    const handle = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(handle);
  }, [searchInput, setSearch]);

  // Opened from a Home collection chip: land inside that category.
  useEffect(() => {
    if (!initialCategoryId || path.length > 0) return;
    const node = categories.find((c) => c.id === initialCategoryId);
    if (node) setPath([node]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCategoryId, categories]);

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
        category: image.category,
      });
      navigation.goBack();
    } finally {
      setResolvingId(null);
    }
  };

  const thumb = gridWidth > 0 ? (gridWidth - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS : 100;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top + space.md }]}>
      <View style={styles.headerRow}>
        <IconButton icon="close" label={t('library.close')} variant="filled" size={40} onPress={() => navigation.goBack()} />
        <AppText variant="subheading">{t('library.title')}</AppText>
        <View style={{ width: 40 }} />
      </View>

      <TextField icon="search" value={searchInput} onChangeText={setSearchInput} placeholder={t('library.search')} returnKeyType="search" accessibilityLabel={t('library.searchA11y')} />

      <View style={styles.breadcrumbRow}>
        <Tactile onPress={() => selectBreadcrumb(-1)} haptic={false} accessibilityRole="button" accessibilityLabel={t('library.allA11y')}>
          <AppText variant="bodySmallStrong" tone={path.length === 0 ? 'primary' : 'muted'}>{t('library.all')}</AppText>
        </Tactile>
        {path.map((node, i) => (
          <View key={node.id} style={styles.breadcrumbItem}>
            <Icon name="chevronRight" size="xs" color="icon" />
            <Tactile onPress={() => selectBreadcrumb(i)} haptic={false} accessibilityRole="button" accessibilityLabel={categoryLabel(node)}>
              <AppText variant="bodySmallStrong" tone={i === path.length - 1 ? 'primary' : 'muted'}>{categoryLabel(node)}</AppText>
            </Tactile>
          </View>
        ))}
      </View>

      {visibleCategories.length > 0 && (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={visibleCategories}
          keyExtractor={(c) => c.id}
          style={styles.chipStrip}
          contentContainerStyle={styles.chipRow}
          renderItem={({ item }) => {
            const active = filters.categoryId === item.id;
            return (
              <Tactile
                onPress={() => selectCategory(item)}
                scaleTo={0.96}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.chip, { backgroundColor: active ? colors.primary : colors.surfaceRaised, borderColor: active ? colors.primary : colors.border }]}
              >
                <AppText variant="bodySmallStrong" style={{ color: active ? colors.textOnAccent : colors.text }}>{categoryLabel(item)}</AppText>
              </Tactile>
            );
          }}
        />
      )}

      <View style={styles.sortRow}>
        <SegmentedControl<SortOrder> segments={SORTS.map((x) => ({ ...x, label: t(x.label as StringKey) }))} value={filters.sort} onChange={setSort} accessibilityLabel={t('library.sort')} />
      </View>

      <View style={styles.gridWrap} onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}>
        {loading ? (
          <View style={styles.centerFill}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : error ? (
          <View style={styles.centerFill}>
            <Icon name="alert" size="lg" color="warning" />
            <AppText variant="body" tone="secondary" align="center" style={styles.stateText}>
              {t('library.error')}
            </AppText>
            <Button label={t('tryAgain')} icon="reset" variant="secondary" onPress={retry} />
          </View>
        ) : images.length === 0 ? (
          <View style={styles.centerFill}>
            <Icon name="images" size="lg" color="icon" />
            <AppText variant="body" tone="secondary" align="center" style={styles.stateText}>
              {t('library.none')}
            </AppText>
          </View>
        ) : (
          <FlatList
            data={images}
            keyExtractor={(img) => img.imageId}
            numColumns={NUM_COLUMNS}
            contentContainerStyle={{ paddingBottom: insets.bottom + space.xxl }}
            columnWrapperStyle={{ gap: GRID_GAP }}
            showsVerticalScrollIndicator={false}
            onEndReachedThreshold={0.4}
            onEndReached={() => hasMore && loadMore()}
            ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: space.lg }} color={colors.primary} /> : null}
            renderItem={({ item }) => (
              <View style={{ marginBottom: GRID_GAP }}>
                <RemoteThumb image={item} size={thumb} onPress={() => handlePick(item)} selected={resolvingId === item.imageId} />
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: space.screen },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.xs },
  breadcrumbRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: space.md, marginBottom: space.sm },
  breadcrumbItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chipStrip: { flexGrow: 0, marginHorizontal: -space.screen },
  chipRow: { gap: space.sm, paddingHorizontal: space.screen, paddingVertical: 4 },
  chip: { paddingHorizontal: 14, height: 36, borderRadius: radii.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sortRow: { marginTop: space.md, marginBottom: space.md },
  gridWrap: { flex: 1 },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, paddingHorizontal: space.xxl },
  stateText: { marginBottom: space.xs },
});
