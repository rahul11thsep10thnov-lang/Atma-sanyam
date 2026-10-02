// Home (PHASE 7): entering a personal world, not a dashboard. Greeting →
// the person's balcony, alive → today's picture → collections → the dial
// and one tactile Start. The wallpaper's own curves keep breathing behind.
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, ScrollView, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRemoteConfig } from '../context/RemoteConfigContext';
import { useAuth } from '../context/AuthContext';
import { track } from '../services/analytics';
import { gridForDuration } from '../utils/grid';
import { ART_PACK } from '../data/artPacks';
import { QUOTES, paletteForQuote } from '../data/quotes';
import { DialTimerPicker } from '../components/DialTimerPicker';
import { AnimatedWallpaper } from '../components/AnimatedWallpaper';
import { Greeting } from '../components/home/Greeting';
import { BalconyHero } from '../components/home/BalconyHero';
import { PuzzlePicker, SourceKind } from '../components/home/PuzzlePicker';
import { CollectionsRow } from '../components/home/CollectionsRow';
import { Button } from '../ui/Button';
import { AppText } from '../ui/AppText';
import { Card } from '../ui/Card';
import { useTabBarInset } from '../ui/TabBar';
import { space } from '../theme/spacing';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { ImageRef, Quote, RemoteImageRef, SessionConfig } from '../types';
import { RootStackParamList } from '../navigation/types';

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const tabInset = useTabBarInset();
  const reduced = useReducedMotion();
  const { config } = useRemoteConfig();
  const { user } = useAuth();
  const { features } = config;
  const [duration, setDuration] = useState(30);

  const [sourceKind, setSourceKind] = useState<SourceKind>('balcony');
  const [selectedArtId, setSelectedArtId] = useState(ART_PACK[0].id);
  const [selectedQuote, setSelectedQuote] = useState<Quote>(QUOTES[0]);
  const [customUri, setCustomUri] = useState<string | null>(null);
  const [remoteImage, setRemoteImage] = useState<RemoteImageRef | null>(null);

  // The Start button breathes, very slowly, so it reads as alive — not as a
  // notification. Still under reduced motion.
  const breath = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 2600, useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: 2600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breath, reduced]);
  const breathScale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.015] });

  const openLibrary = (initialCategoryId?: string) => {
    navigation.navigate('ContentBrowser', {
      initialCategoryId,
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
      setSelectedQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
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
    if (effectiveKind === 'balcony') return { kind: 'balcony' };
    if (effectiveKind === 'art') return ART_PACK.find((a) => a.id === selectedArtId) ?? ART_PACK[0];
    if (effectiveKind === 'quote') return { kind: 'quote', quote: selectedQuote, ...paletteForQuote(selectedQuote.id) };
    if (effectiveKind === 'remote') return remoteImage;
    if (customUri) return { kind: 'custom', uri: customUri };
    return null;
  };

  const handleStart = () => {
    const image = resolveImage();
    if (!image) {
      Alert.alert('Pick a picture', 'Choose a photo from your library to start this session.');
      return;
    }
    const session: SessionConfig = { durationMinutes: duration, image, grid: gridForDuration(duration) };
    if (image.kind === 'remote') track('content_view', { contentId: image.imageId });
    navigation.navigate('ActiveSession', { config: session });
  };

  const quotePalette = paletteForQuote(selectedQuote.id);

  return (
    <AnimatedWallpaper style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + space.lg, paddingBottom: tabInset + space.lg, paddingHorizontal: space.screen }}
        showsVerticalScrollIndicator={false}
      >
        {!!config.texts.announcement && (
          <Card variant="tinted" padding="md" style={styles.announcement} accessibilityRole="summary">
            <AppText variant="bodySmall" align="center">
              {config.texts.announcement}
            </AppText>
          </Card>
        )}

        <Greeting name={user?.displayName} />

        <BalconyHero height={208} onPress={() => navigation.navigate('Tabs', { screen: 'History' })} />

        <PuzzlePicker
          kind={effectiveKind}
          selectedArtId={selectedArtId}
          customUri={customUri}
          remoteUri={remoteImage?.uri ?? null}
          quoteBackground={quotePalette.background}
          quoteTextColor={quotePalette.textColor}
          features={features}
          onPickBalcony={() => setSourceKind('balcony')}
          onPickArt={(id) => {
            setSourceKind('art');
            setSelectedArtId(id);
          }}
          onPickQuote={handleQuoteTap}
          onPickCustom={pickCustomImage}
          onOpenLibrary={() => openLibrary()}
        />

        {features.contentLibrary && <CollectionsRow onOpen={(c) => openLibrary(c.id)} />}

        <View style={styles.timerSection}>
          <DialTimerPicker value={duration} onChange={setDuration} size={208} />
          <Animated.View style={[styles.startWrap, { transform: [{ scale: breathScale }] }]}>
            <Button label="Start focus" icon="play" size="lg" fullWidth onPress={handleStart} />
          </Animated.View>
          <AppText variant="caption" tone="muted" align="center" style={styles.startHint}>
            Your world is waiting.
          </AppText>
        </View>
      </ScrollView>
    </AnimatedWallpaper>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  announcement: { marginBottom: space.lg },
  timerSection: { alignItems: 'center', marginTop: space.xxl },
  startWrap: { alignSelf: 'stretch', marginTop: space.xxl },
  startHint: { marginTop: space.md },
});
