// The collection as seen from a space or the museum: every artwork a
// completed session earned, where it hangs, and the choice to hang it
// here, store it, or throw it away for good.
import React from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { Sheet } from '../../spaces/ui/Sheet';
import { AppText } from '../../ui/AppText';
import { Button } from '../../ui/Button';
import { radii } from '../../theme/radii';
import { space as sp } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import { t } from '../../i18n';
import { ArtworkRecord, CollectionState, artworkImage, counts, owned, setHome } from '../model';

interface Props {
  visible: boolean;
  /** Where the sheet was opened: hanging goes there. */
  here: 'balcony' | 'museum';
  collection: CollectionState;
  onClose: () => void;
  onCollection: (next: CollectionState) => void;
  /** Hang in this place; returns false when there is no room. */
  onHangHere: (a: ArtworkRecord) => boolean;
  /** Take it down from this place. */
  onTakeDown: (a: ArtworkRecord) => void;
  /** Only throwing away is offered (the museum arranges itself). */
  binOnly?: boolean;
  onToast: (text: string) => void;
}

const HOME_LABEL: Record<string, string> = { balcony: 'space.balcony', garden: 'space.garden', museum: 'tabs.museum' };

export function CollectionSheet({ visible, here, collection, onClose, onCollection, onHangHere, onTakeDown, onToast, binOnly }: Props) {
  const { colors } = useTheme();
  const list = owned(collection).slice().reverse();
  const c = counts(collection);
  return (
    <Sheet visible={visible} title={t('gallery.title')} subtitle={t('museum.owned', { owned: c.owned, displayed: c.displayed, stored: c.stored })} onClose={onClose} maxHeight="88%">
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {list.length === 0 && (
          <View style={[styles.empty, { borderColor: colors.border }]}>
            <AppText variant="subheading" align="center">
              {t('gallery.firstOnWay')}
            </AppText>
            <AppText variant="bodySmall" tone="secondary" align="center">
              {t('home.jigsawSizes')}
            </AppText>
          </View>
        )}
        <View style={styles.grid}>
          {list.map((a) => {
            const hereNow = a.home === here;
            const elsewhere = !hereNow && a.home !== 'collection' ? a.home : null;
            return (
              <View key={a.id} style={[styles.tile, { borderColor: hereNow ? colors.primary : colors.border }]}>
                <Image source={artworkImage(a)} style={{ width: '100%', aspectRatio: a.aspect, borderRadius: radii.sm - 4 }} resizeMode="cover" />
                <AppText variant="caption" numberOfLines={1}>
                  {a.title}
                </AppText>
                <AppText variant="caption" tone={hereNow ? 'primary' : 'muted'} numberOfLines={1}>
                  {hereNow ? t('gallery.hungHere') : elsewhere ? t('gallery.hungIn', { space: t(HOME_LABEL[elsewhere] as never) }) : t('museum.stored')} · {t('museum.jigsawSize', { tier: a.tier })}
                </AppText>
                <View style={styles.actions}>
                  {binOnly ? null : hereNow ? (
                    <Button label={t('museum.storeAway')} size="sm" variant="secondary" onPress={() => { onTakeDown(a); onCollection(setHome(collection, a.id, 'collection')); }} />
                  ) : (
                    <Button
                      label={t('museum.display')}
                      size="sm"
                      variant="primary"
                      onPress={() => {
                        if (onHangHere(a)) {
                          onCollection(setHome(collection, a.id, here));
                          onToast(t('gallery.nowHangs', { title: a.title }));
                        } else onToast(t('placement.noRoom'));
                      }}
                    />
                  )}
                  {(binOnly || (!hereNow && !elsewhere)) && (
                    <Button
                      label={binOnly ? t('museum.bin') : ''}
                      icon="trash"
                      size="sm"
                      variant={binOnly ? 'secondary' : 'tertiary'}
                      accessibilityLabel={t('gallery.throwAway', { title: a.title })}
                      onPress={() => {
                        // off whatever wall it hangs on, then gone for good
                        if (a.home !== 'collection') onTakeDown(a);
                        onCollection(setHome(collection, a.id, 'binned'));
                        onToast(t('gallery.thrown', { title: a.title }));
                      }}
                    />
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: sp.lg, paddingBottom: sp.lg },
  empty: { alignSelf: 'stretch', borderWidth: 1, borderStyle: 'dashed', borderRadius: radii.lg, padding: sp.xl, gap: sp.sm },
  grid: { alignSelf: 'stretch', flexDirection: 'row', flexWrap: 'wrap', gap: sp.md },
  tile: { width: '47%', flexGrow: 0, borderWidth: 1.5, borderRadius: radii.sm, padding: 6, gap: 4 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
});
