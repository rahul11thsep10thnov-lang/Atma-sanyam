import React, { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRemoteConfig } from '../context/RemoteConfigContext';
import { track } from '../services/analytics';
import { colors, radius, spacing, typography, buttonHeight } from '../theme/colors';
import { gridForDuration } from '../utils/grid';
import { ART_PACK } from '../data/artPacks';
import { QUOTES, paletteForQuote } from '../data/quotes';
import { DialTimerPicker } from '../components/DialTimerPicker';
import { AnimatedWallpaper } from '../components/AnimatedWallpaper';
import { useTabBarInset } from '../ui/TabBar';
import { ImageRef, Quote, RemoteImageRef, SessionConfig } from '../types';
import { RootStackParamList } from '../navigation/types';

type SourceKind = 'art' | 'quote' | 'custom' | 'remote';

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const tabInset = useTabBarInset();
  const { config } = useRemoteConfig();
  const { features } = config;
  const [duration, setDuration] = useState(30);

  const [sourceKind, setSourceKind] = useState<SourceKind>('art');
  const [selectedArtId, setSelectedArtId] = useState(ART_PACK[0].id);
  const [selectedQuote, setSelectedQuote] = useState<Quote>(QUOTES[0]);
  const [customUri, setCustomUri] = useState<string | null>(null);
  const [remoteImage, setRemoteImage] = useState<RemoteImageRef | null>(null);

  const openLibrary = () => {
    navigation.navigate('ContentBrowser', {
      onSelect: (image) => {
        setRemoteImage(image);
        setSourceKind('remote');
      },
    });
  };

  // Uses the system photo picker (PHPicker on iOS, Photo Picker on Android),
  // which needs no photo-library permission: people choose one photo and the
  // app only ever sees that one.
  const pickCustomImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: true,
        aspect: [1, 1],
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setCustomUri(result.assets[0].uri);
        setSourceKind('custom');
      }
    } catch {
      Alert.alert('Couldn’t open your photos', 'Please try again.');
    }
  };

  const handleQuoteTap = () => {
    if (sourceKind === 'quote') {
      const next = QUOTES[Math.floor(Math.random() * QUOTES.length)];
      setSelectedQuote(next);
    } else {
      setSourceKind('quote');
    }
  };

  // If an admin turns a source off remotely, fall back to the art pack.
  const effectiveKind: SourceKind =
    (sourceKind === 'quote' && !features.quoteTiles) ||
    (sourceKind === 'custom' && !features.customPhotos) ||
    (sourceKind === 'remote' && !features.contentLibrary)
      ? 'art'
      : sourceKind;

  const resolveImage = (): ImageRef | null => {
    const sourceKind = effectiveKind;
    if (sourceKind === 'art') {
      return ART_PACK.find((a) => a.id === selectedArtId) ?? ART_PACK[0];
    }
    if (sourceKind === 'quote') {
      const palette = paletteForQuote(selectedQuote.id);
      return { kind: 'quote', quote: selectedQuote, ...palette };
    }
    if (sourceKind === 'remote') {
      return remoteImage;
    }
    if (customUri) {
      return { kind: 'custom', uri: customUri };
    }
    return null;
  };

  const handleStart = () => {
    const image = resolveImage();
    if (!image) {
      Alert.alert('Pick an image', 'Choose a photo from your library to start this session.');
      return;
    }
    const session: SessionConfig = {
      durationMinutes: duration,
      image,
      grid: gridForDuration(duration),
    };
    if (image.kind === 'remote') track('content_view', { contentId: image.imageId });
    navigation.navigate('ActiveSession', { config: session });
  };

  const quotePalette = paletteForQuote(selectedQuote.id);

  return (
    <AnimatedWallpaper style={styles.screen}>
      <View style={[styles.topSection, { paddingTop: insets.top + 16 }]}>
        {!!config.texts.announcement && (
          <View style={styles.announcement} accessibilityRole="summary">
            <Text style={styles.announcementText}>{config.texts.announcement}</Text>
          </View>
        )}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.strip}
        >
          {ART_PACK.map((art) => {
            const active = effectiveKind === 'art' && art.id === selectedArtId;
            return (
              <Pressable
                key={art.id}
                onPress={() => {
                  setSourceKind('art');
                  setSelectedArtId(art.id);
                }}
                style={[styles.tile, active && styles.tileActive]}
                accessibilityRole="button"
                accessibilityLabel={`${art.id} artwork`}
                accessibilityState={{ selected: active }}
              >
                <Image source={art.uri} style={styles.tileImage} />
              </Pressable>
            );
          })}

          {features.quoteTiles && (
            <Pressable
              onPress={handleQuoteTap}
              style={[styles.tile, effectiveKind === 'quote' && styles.tileActive, { backgroundColor: quotePalette.background }]}
              accessibilityRole="button"
              accessibilityLabel="Quote tile"
              accessibilityHint="Tap again for a different quote"
              accessibilityState={{ selected: effectiveKind === 'quote' }}
            >
              <Text style={[styles.quoteGlyph, { color: quotePalette.textColor }]}>&ldquo;</Text>
            </Pressable>
          )}

          {features.customPhotos && (
            <Pressable
              onPress={pickCustomImage}
              style={[styles.tile, effectiveKind === 'custom' && styles.tileActive, styles.customTile]}
              accessibilityRole="button"
              accessibilityLabel="Choose your own photo"
              accessibilityState={{ selected: effectiveKind === 'custom' }}
            >
              {customUri ? (
                <Image source={{ uri: customUri }} style={styles.tileImage} />
              ) : (
                <Text style={styles.customTileGlyph}>+</Text>
              )}
            </Pressable>
          )}

          {features.contentLibrary && (
            <Pressable
              onPress={openLibrary}
              style={[styles.tile, effectiveKind === 'remote' && styles.tileActive, styles.libraryTile]}
              accessibilityRole="button"
              accessibilityLabel="Browse image library"
              accessibilityState={{ selected: effectiveKind === 'remote' }}
            >
              {remoteImage ? (
                <Image source={{ uri: remoteImage.uri }} style={styles.tileImage} />
              ) : (
                <Text style={styles.libraryTileGlyph}>🖼</Text>
              )}
            </Pressable>
          )}
        </ScrollView>
      </View>

      <View style={[styles.bottomSection, { paddingBottom: tabInset }]}>
        <DialTimerPicker value={duration} onChange={setDuration} />
        <Pressable style={styles.startBtn} onPress={handleStart} accessibilityRole="button">
          <Text style={styles.startBtnText}>Start focus session</Text>
        </Pressable>
      </View>
    </AnimatedWallpaper>
  );
}

const TILE_SIZE = 72;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topSection: {},
  announcement: {
    marginHorizontal: spacing.screenPadding,
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: radius.card,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  announcementText: { ...typography.body, color: colors.text, textAlign: 'center' },
  strip: { paddingHorizontal: spacing.screenPadding, gap: 12 },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: radius.card,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileActive: { borderColor: colors.primary },
  tileImage: { width: '100%', height: '100%' },
  quoteGlyph: { fontSize: 40, fontWeight: '700', opacity: 0.85 },
  customTile: { borderStyle: 'dashed', borderColor: colors.border, borderWidth: 2 },
  customTileGlyph: { fontSize: 28, color: colors.textSecondary, fontWeight: '300' },
  libraryTile: { backgroundColor: colors.card },
  libraryTileGlyph: { fontSize: 26 },
  bottomSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: 32,
  },
  startBtn: {
    height: buttonHeight,
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  startBtnText: { ...typography.title, color: colors.card },
});
