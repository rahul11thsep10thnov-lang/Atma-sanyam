import React, { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, radius, spacing, typography, buttonHeight } from '../theme/colors';
import { gridForDuration } from '../utils/grid';
import { ART_PACK } from '../data/artPacks';
import { QUOTES, paletteForQuote } from '../data/quotes';
import { DialTimerPicker } from '../components/DialTimerPicker';
import { ImageRef, Quote, RemoteImageRef, SessionConfig } from '../types';
import { RootStackParamList } from '../navigation/types';

type SourceKind = 'art' | 'quote' | 'custom' | 'remote';

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
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

  const pickCustomImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to choose your own puzzle image.');
      return;
    }
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
  };

  const handleQuoteTap = () => {
    if (sourceKind === 'quote') {
      const next = QUOTES[Math.floor(Math.random() * QUOTES.length)];
      setSelectedQuote(next);
    } else {
      setSourceKind('quote');
    }
  };

  const resolveImage = (): ImageRef | null => {
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
    const config: SessionConfig = {
      durationMinutes: duration,
      image,
      grid: gridForDuration(duration),
    };
    navigation.navigate('ActiveSession', { config });
  };

  const quotePalette = paletteForQuote(selectedQuote.id);

  return (
    <View style={styles.screen}>
      <View style={styles.topSection}>
        <Text style={styles.title}>FOCUS</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.strip}
        >
          {ART_PACK.map((art) => {
            const active = sourceKind === 'art' && art.id === selectedArtId;
            return (
              <Pressable
                key={art.id}
                onPress={() => {
                  setSourceKind('art');
                  setSelectedArtId(art.id);
                }}
                style={[styles.tile, active && styles.tileActive]}
              >
                <Image source={art.uri} style={styles.tileImage} />
              </Pressable>
            );
          })}

          <Pressable
            onPress={handleQuoteTap}
            style={[styles.tile, sourceKind === 'quote' && styles.tileActive, { backgroundColor: quotePalette.background }]}
          >
            <Text style={[styles.quoteGlyph, { color: quotePalette.textColor }]}>&ldquo;</Text>
          </Pressable>

          <Pressable
            onPress={pickCustomImage}
            style={[styles.tile, sourceKind === 'custom' && styles.tileActive, styles.customTile]}
          >
            {customUri ? (
              <Image source={{ uri: customUri }} style={styles.tileImage} />
            ) : (
              <Text style={styles.customTileGlyph}>+</Text>
            )}
          </Pressable>

          <Pressable
            onPress={openLibrary}
            style={[styles.tile, sourceKind === 'remote' && styles.tileActive, styles.libraryTile]}
          >
            {remoteImage ? (
              <Image source={{ uri: remoteImage.uri }} style={styles.tileImage} />
            ) : (
              <Text style={styles.libraryTileGlyph}>🖼</Text>
            )}
          </Pressable>
        </ScrollView>
      </View>

      <View style={styles.bottomSection}>
        <DialTimerPicker value={duration} onChange={setDuration} />
        <Pressable style={styles.startBtn} onPress={handleStart}>
          <Text style={styles.startBtnText}>Start focus session</Text>
        </Pressable>
      </View>
    </View>
  );
}

const TILE_SIZE = 72;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topSection: { paddingTop: 20 },
  title: {
    ...typography.heading,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 1,
  },
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
