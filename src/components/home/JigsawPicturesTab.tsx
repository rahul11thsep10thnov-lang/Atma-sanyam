// "Reveal jigsaws": the person's own photo, then the library's India
// collections — Heritage, Nature, Wildlife, Spirituality — each a row of
// photographs. Pick one and it reveals itself tile by tile during the
// session; a session of 30 minutes or more keeps it as a framed jigsaw.
import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { pickPhoto } from '../../collection/photos';
import { useContentCategories } from '../../content/useContentLibrary';
import { listImages, resolveImageUri } from '../../content/repository';
import { RemoteThumb } from '../../content/RemoteThumb';
import { CategoryNode, ContentImage } from '../../content/types';
import { CustomImageRef, RemoteImageRef } from '../../types';
import { AppText } from '../../ui/AppText';
import { Icon } from '../../ui/Icon';
import { Tactile } from '../../ui/Pressable';
import { radii } from '../../theme/radii';
import { space } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import { t } from '../../i18n';

const SECTIONS: { key: 'heritage' | 'nature' | 'wildlife' | 'spirituality'; match: RegExp }[] = [
  { key: 'heritage', match: /heritage/i },
  { key: 'nature', match: /nature|landscape/i },
  { key: 'wildlife', match: /wildlife/i },
  { key: 'spirituality', match: /spiritual/i },
];

export type JigsawPick = RemoteImageRef | CustomImageRef;

export function JigsawPicturesTab({ selected, onPick, onSeeAll }: { selected: JigsawPick | null; onPick: (image: JigsawPick) => void; onSeeAll: (category: CategoryNode | null) => void }) {
  const { colors, shadow } = useTheme();
  const { categories } = useContentCategories();
  const [rows, setRows] = useState<Record<string, ContentImage[]>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const roots = categories.filter((c) => c.parentId === null);
  const sections = SECTIONS.map((s) => ({ ...s, category: roots.find((c) => s.match.test(`${c.id} ${c.name}`)) ?? null }));

  useEffect(() => {
    let alive = true;
    for (const s of sections) {
      if (!s.category || rows[s.key]) continue;
      listImages({ categoryId: s.category.id, sort: 'popular', limit: 12 })
        .then((page) => alive && setRows((r) => ({ ...r, [s.key]: page.items })))
        .catch(() => undefined);
    }
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories.length]);

  const pick = async (image: ContentImage) => {
    if (busy) return;
    setBusy(image.imageId);
    try {
      const uri = await resolveImageUri(image, 'full');
      onPick({ kind: 'remote', uri, imageId: image.imageId, title: image.title, attributionText: image.attributionText ?? null, category: image.category });
    } finally {
      setBusy(null);
    }
  };

  const choosePhoto = async () => {
    if (busy) return;
    setBusy('photo');
    try {
      const photo = await pickPhoto();
      if (photo) onPick(photo);
    } finally {
      setBusy(null);
    }
  };

  const any = sections.some((s) => s.category);
  const ownOn = selected?.kind === 'custom';
  return (
    <View>
      <AppText variant="bodySmall" tone="secondary" style={styles.hint}>
        {t('home.jigsawHint')} {t('home.jigsawSizes')}
      </AppText>
      <Tactile onPress={() => void choosePhoto()} accessibilityRole="button" accessibilityLabel={t('home.yourPhoto')} accessibilityState={{ selected: ownOn }} style={[styles.photo, { borderColor: ownOn ? colors.primary : colors.border, backgroundColor: colors.surfaceRaised }, ownOn && shadow.level2]}>
        <View style={[styles.photoThumb, { backgroundColor: colors.accentSoft }]}>
          {ownOn && selected?.kind === 'custom' ? <Image source={{ uri: selected.uri }} style={styles.photoImg} resizeMode="cover" /> : <Icon name="camera" size="md" color="primary" />}
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong">{ownOn ? t('home.photoPicked') : t('home.yourPhoto')}</AppText>
          <AppText variant="caption" tone="secondary" numberOfLines={2}>
            {t('home.yourPhotoHint')}
          </AppText>
        </View>
        {ownOn ? (
          <View style={[styles.check, { position: 'relative', top: 0, right: 0, backgroundColor: colors.primary }]}>
            <Icon name="check" size={12} color="onAccent" strokeWidth={3} />
          </View>
        ) : (
          <Icon name="chevronRight" size="xs" color="secondary" />
        )}
      </Tactile>
      {!any && (
        <Tactile onPress={() => onSeeAll(null)} accessibilityRole="button" style={[styles.empty, { borderColor: colors.border }]}>
          <Icon name="images" size="md" color="secondary" />
          <AppText variant="bodySmall" tone="secondary" style={{ flex: 1 }}>
            {t('home.libraryEmpty')}
          </AppText>
          <Icon name="chevronRight" size="xs" color="secondary" />
        </Tactile>
      )}
      {sections.map((s) => {
        if (!s.category) return null;
        const images = rows[s.key] ?? [];
        return (
          <View key={s.key} style={styles.section}>
            <View style={styles.sectionHead}>
              <AppText variant="subheading">{t(`home.cat.${s.key}`)}</AppText>
              <Tactile onPress={() => onSeeAll(s.category)} accessibilityRole="button" accessibilityLabel={`${t('home.seeAll')} ${s.category.name}`} style={styles.seeAll}>
                <AppText variant="bodySmallStrong" tone="primary">
                  {t('home.seeAll')}
                </AppText>
                <Icon name="chevronRight" size="xs" color="primary" />
              </Tactile>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stripWrap} contentContainerStyle={styles.strip}>
              {images.map((im) => {
                const on = selected?.kind === 'remote' && selected.imageId === im.imageId;
                return (
                  <View key={im.imageId} style={[styles.tile, { borderColor: on ? colors.primary : colors.border, backgroundColor: colors.surfaceRaised }, on && shadow.level2]}>
                    <RemoteThumb image={im} size={160} onPress={() => void pick(im)} selected={on} />
                    <AppText variant="caption" numberOfLines={1} style={styles.title}>
                      {im.title}
                    </AppText>
                    {on && (
                      <View style={[styles.check, { backgroundColor: colors.primary }]} pointerEvents="none">
                        <Icon name="check" size={12} color="onAccent" strokeWidth={3} />
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { marginBottom: space.sm },
  photo: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderWidth: 2, borderRadius: radii.md, padding: 8, paddingRight: space.md, marginBottom: space.sm },
  photoThumb: { width: 64, height: 64, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photoImg: { width: '100%', height: '100%' },
  empty: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderWidth: 1, borderStyle: 'dashed', borderRadius: radii.md, padding: space.lg },
  section: { marginTop: space.md },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.sm },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 4 },
  stripWrap: { marginHorizontal: -space.screen },
  strip: { paddingHorizontal: space.screen, gap: space.md, paddingVertical: 4 },
  tile: { width: 168, borderRadius: radii.md, borderWidth: 2, padding: 4, gap: 4, overflow: 'hidden' },
  title: { paddingHorizontal: 2 },
  check: { position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
