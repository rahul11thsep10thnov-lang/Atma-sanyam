// "Today's picture": the image the session will reveal. Six bundled
// artworks, a quote tile, the person's own photo, and the library.
import React from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '../../ui/AppText';
import { Icon, IconName } from '../../ui/Icon';
import { Tactile } from '../../ui/Pressable';
import { radii } from '../../theme/radii';
import { space } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import { ART_PACK } from '../../data/artPacks';
import { BalconyPreview } from '../../photoBalcony/ui/BalconyPreview';

export type SourceKind = 'balcony' | 'art' | 'quote' | 'custom' | 'remote';

interface Props {
  kind: SourceKind;
  selectedArtId: string;
  customUri: string | null;
  remoteUri: string | null;
  quoteBackground: string;
  quoteTextColor: string;
  features: { quoteTiles: boolean; customPhotos: boolean; contentLibrary: boolean };
  onPickBalcony: () => void;
  onPickArt: (id: string) => void;
  onPickQuote: () => void;
  onPickCustom: () => void;
  onOpenLibrary: () => void;
}

const TILE = 84;

function Tile({ selected, onPress, label, hint, children, dashed }: { selected: boolean; onPress: () => void; label: string; hint?: string; children: React.ReactNode; dashed?: boolean }) {
  const { colors, shadow } = useTheme();
  return (
    <Tactile
      onPress={onPress}
      scaleTo={0.95}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ selected }}
      style={[
        styles.tile,
        { backgroundColor: colors.surfaceRaised, borderColor: selected ? colors.primary : dashed ? colors.borderStrong : colors.border },
        dashed && styles.dashed,
        selected && shadow.level2,
      ]}
    >
      {children}
      {selected && (
        <View style={[styles.check, { backgroundColor: colors.primary }]}>
          <Icon name="check" size={12} color="onAccent" strokeWidth={3} />
        </View>
      )}
    </Tactile>
  );
}

function GlyphTile({ icon, label, selected, onPress, hint, bg, tint, dashed }: { icon: IconName; label: string; selected: boolean; onPress: () => void; hint?: string; bg?: string; tint?: string; dashed?: boolean }) {
  const { colors } = useTheme();
  return (
    <Tile selected={selected} onPress={onPress} label={label} hint={hint} dashed={dashed}>
      <View style={[styles.glyph, bg ? { backgroundColor: bg } : null]}>
        <Icon name={icon} size="md" color={tint ?? (selected ? colors.primary : colors.textSecondary)} />
        <AppText variant="caption" style={{ color: tint ?? (selected ? colors.primary : colors.textSecondary), marginTop: 4 }}>
          {label}
        </AppText>
      </View>
    </Tile>
  );
}

export function PuzzlePicker(p: Props) {
  return (
    <View style={styles.section}>
      <AppText variant="overline" tone="muted" style={styles.label}>
        TODAY'S PICTURE
      </AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip} style={styles.stripWrap}>
        <Tile selected={p.kind === 'balcony'} onPress={p.onPickBalcony} label="My balcony" hint="Focus on your balcony; its plant grows while you focus">
          <BalconyPreview width={TILE} height={TILE} focus={[0.62, 0.68]} />
        </Tile>
        {ART_PACK.map((art) => (
          <Tile key={art.id} selected={p.kind === 'art' && art.id === p.selectedArtId} onPress={() => p.onPickArt(art.id)} label={`${art.id} artwork`}>
            <Image source={art.uri} style={styles.image} />
          </Tile>
        ))}
        {p.features.quoteTiles && (
          <GlyphTile icon="quote" label="Quote" selected={p.kind === 'quote'} onPress={p.onPickQuote} hint="Tap again for a different quote" bg={p.quoteBackground} tint={p.quoteTextColor} />
        )}
        {p.features.customPhotos && (
          p.customUri ? (
            <Tile selected={p.kind === 'custom'} onPress={p.onPickCustom} label="Your photo">
              <Image source={{ uri: p.customUri }} style={styles.image} />
            </Tile>
          ) : (
            <GlyphTile icon="camera" label="Yours" selected={false} onPress={p.onPickCustom} hint="Choose a photo from your library" dashed />
          )
        )}
        {p.features.contentLibrary && (
          p.remoteUri ? (
            <Tile selected={p.kind === 'remote'} onPress={p.onOpenLibrary} label="Library picture">
              <Image source={{ uri: p.remoteUri }} style={styles.image} />
            </Tile>
          ) : (
            <GlyphTile icon="images" label="Library" selected={false} onPress={p.onOpenLibrary} hint="Browse the picture library" />
          )
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: space.xxl },
  label: { marginBottom: space.md },
  stripWrap: { marginHorizontal: -space.screen },
  strip: { paddingHorizontal: space.screen, gap: space.md, paddingVertical: 4 },
  tile: { width: TILE, height: TILE, borderRadius: radii.md, overflow: 'hidden', borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dashed: { borderStyle: 'dashed' },
  image: { width: '100%', height: '100%' },
  glyph: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  check: { position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
