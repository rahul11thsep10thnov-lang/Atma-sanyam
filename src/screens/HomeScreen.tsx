import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { DURATION_PRESETS, gridForDuration } from '../utils/grid';
import { ART_PACK } from '../data/artPacks';
import { QUOTES, paletteForQuote } from '../data/quotes';
import { ImageRef, Quote, SessionConfig } from '../types';
import { RootStackParamList } from '../navigation/types';

type SourceKind = 'art' | 'quote' | 'custom';

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [duration, setDuration] = useState<number>(15);
  const [customText, setCustomText] = useState('15');
  const [isCustomDuration, setIsCustomDuration] = useState(false);

  const [sourceKind, setSourceKind] = useState<SourceKind>('art');
  const [selectedArtId, setSelectedArtId] = useState(ART_PACK[0].id);
  const [selectedQuote, setSelectedQuote] = useState<Quote>(QUOTES[0]);
  const [customUri, setCustomUri] = useState<string | null>(null);

  const effectiveDuration = useMemo(() => {
    if (!isCustomDuration) return duration;
    const parsed = parseInt(customText, 10);
    if (Number.isNaN(parsed) || parsed <= 0) return duration;
    return Math.min(180, parsed);
  }, [isCustomDuration, customText, duration]);

  const grid = useMemo(() => gridForDuration(effectiveDuration), [effectiveDuration]);

  const pickCustomImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to choose your own puzzle image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setCustomUri(result.assets[0].uri);
    }
  };

  const shuffleQuote = () => {
    const next = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    setSelectedQuote(next);
  };

  const resolveImage = (): ImageRef | null => {
    if (sourceKind === 'art') {
      const art = ART_PACK.find((a) => a.id === selectedArtId) ?? ART_PACK[0];
      return art;
    }
    if (sourceKind === 'quote') {
      const palette = paletteForQuote(selectedQuote.id);
      return { kind: 'quote', quote: selectedQuote, ...palette };
    }
    if (sourceKind === 'custom') {
      if (!customUri) return null;
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
      durationMinutes: effectiveDuration,
      image,
      grid,
    };
    navigation.navigate('ActiveSession', { config });
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>PuzzleFocus</Text>
      <Text style={styles.subtitle}>Stay on task. Watch the picture come together.</Text>

      <Text style={styles.sectionLabel}>Session length</Text>
      <View style={styles.chipRow}>
        {DURATION_PRESETS.map((d) => {
          const active = !isCustomDuration && duration === d;
          return (
            <Pressable
              key={d}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => {
                setIsCustomDuration(false);
                setDuration(d);
              }}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{d}m</Text>
            </Pressable>
          );
        })}
        <Pressable
          style={[styles.chip, isCustomDuration && styles.chipActive]}
          onPress={() => setIsCustomDuration(true)}
        >
          <Text style={[styles.chipText, isCustomDuration && styles.chipTextActive]}>Custom</Text>
        </Pressable>
      </View>

      {isCustomDuration && (
        <View style={styles.customDurationRow}>
          <TextInput
            style={styles.customInput}
            keyboardType="number-pad"
            placeholder="Minutes"
            placeholderTextColor={colors.textFaint}
            value={customText}
            onChangeText={setCustomText}
          />
          <Text style={styles.customDurationHint}>{effectiveDuration} min selected</Text>
        </View>
      )}

      <Text style={styles.gridHint}>
        {grid.rows}×{grid.cols} puzzle ({grid.rows * grid.cols} pieces)
      </Text>

      <Text style={styles.sectionLabel}>Puzzle image</Text>
      <View style={styles.chipRow}>
        {(['art', 'quote', 'custom'] as SourceKind[]).map((kind) => {
          const active = sourceKind === kind;
          const label = kind === 'art' ? 'Art pack' : kind === 'quote' ? 'Quote tile' : 'My photo';
          return (
            <Pressable
              key={kind}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setSourceKind(kind)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {sourceKind === 'art' && (
        <View style={styles.artRow}>
          {ART_PACK.map((art) => {
            const active = art.id === selectedArtId;
            return (
              <Pressable
                key={art.id}
                onPress={() => setSelectedArtId(art.id)}
                style={[styles.artThumbWrap, active && styles.artThumbWrapActive]}
              >
                <Image source={art.uri} style={styles.artThumb} />
              </Pressable>
            );
          })}
        </View>
      )}

      {sourceKind === 'quote' && (
        <View
          style={[
            styles.quotePreview,
            { backgroundColor: paletteForQuote(selectedQuote.id).background },
          ]}
        >
          <Text
            style={[styles.quotePreviewText, { color: paletteForQuote(selectedQuote.id).textColor }]}
          >
            "{selectedQuote.text}"
          </Text>
          <Text
            style={[styles.quotePreviewAuthor, { color: paletteForQuote(selectedQuote.id).textColor }]}
          >
            — {selectedQuote.author}
          </Text>
          <Pressable style={styles.shuffleBtn} onPress={shuffleQuote}>
            <Text style={styles.shuffleBtnText}>Shuffle quote</Text>
          </Pressable>
        </View>
      )}

      {sourceKind === 'custom' && (
        <View style={styles.customImageBox}>
          {customUri ? (
            <Image source={{ uri: customUri }} style={styles.customImagePreview} />
          ) : (
            <Text style={styles.customImageHint}>No photo selected yet</Text>
          )}
          <Pressable style={styles.pickBtn} onPress={pickCustomImage}>
            <Text style={styles.pickBtnText}>{customUri ? 'Choose a different photo' : 'Choose photo'}</Text>
          </Pressable>
        </View>
      )}

      <Pressable style={styles.startBtn} onPress={handleStart}>
        <Text style={styles.startBtnText}>Start focus session</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 48 },
  title: { fontSize: 30, fontWeight: '800', color: colors.text, marginTop: 12 },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: 4, marginBottom: 24 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontWeight: '600' },
  chipTextActive: { color: colors.background },
  customDurationRow: { marginTop: 10, marginBottom: 4 },
  customInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.text,
  },
  customDurationHint: { color: colors.textFaint, marginTop: 6, fontSize: 12 },
  gridHint: { color: colors.textFaint, fontSize: 12, marginTop: 4, marginBottom: 24 },
  artRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  artThumbWrap: {
    width: 84,
    height: 84,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  artThumbWrapActive: { borderColor: colors.primary },
  artThumb: { width: '100%', height: '100%' },
  quotePreview: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  quotePreviewText: { fontSize: 15, fontWeight: '600', textAlign: 'center', lineHeight: 22 },
  quotePreviewAuthor: { marginTop: 10, fontSize: 13, fontStyle: 'italic', opacity: 0.85 },
  shuffleBtn: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  shuffleBtnText: { color: colors.white, fontWeight: '600', fontSize: 12 },
  customImageBox: { marginBottom: 24, alignItems: 'center' },
  customImagePreview: { width: 140, height: 140, borderRadius: 16, marginBottom: 14 },
  customImageHint: { color: colors.textFaint, marginBottom: 14 },
  pickBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickBtnText: { color: colors.text, fontWeight: '600' },
  startBtn: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  startBtnText: { color: colors.background, fontWeight: '800', fontSize: 16 },
});
