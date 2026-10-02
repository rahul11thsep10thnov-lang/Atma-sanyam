// Home (PHASE 7): entering a personal world, not a dashboard. Greeting →
// the person's spaces, alive → what to focus on (a plant to grow, or a
// jigsaw picture) → the dial and one tactile Start.
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRemoteConfig } from '../context/RemoteConfigContext';
import { useAuth } from '../context/AuthContext';
import { track } from '../services/analytics';
import { gridForDuration } from '../utils/grid';
import { DialTimerPicker } from '../components/DialTimerPicker';
import { AnimatedWallpaper } from '../components/AnimatedWallpaper';
import { Greeting } from '../components/home/Greeting';
import { SpacesHero } from '../components/home/SpacesHero';
import { GrowPlantsTab, PlantPick } from '../components/home/GrowPlantsTab';
import { JigsawPicturesTab } from '../components/home/JigsawPicturesTab';
import { Button } from '../ui/Button';
import { AppText } from '../ui/AppText';
import { Card } from '../ui/Card';
import { SegmentedControl } from '../ui/SegmentedControl';
import { useTabBarInset } from '../ui/TabBar';
import { space } from '../theme/spacing';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { ImageRef, RemoteImageRef, SessionConfig } from '../types';
import { RootStackParamList, RootTabParamList } from '../navigation/types';
import { SpaceId } from '../spaces/packTypes';
import { t, useLanguage } from '../i18n';

type Mode = 'plants' | 'jigsaw';
const TAB: Record<SpaceId, keyof RootTabParamList> = { balcony: 'History', garden: 'Garden', room: 'Room' };

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const tabInset = useTabBarInset();
  const reduced = useReducedMotion();
  const { config } = useRemoteConfig();
  const { user } = useAuth();
  useLanguage();
  const [duration, setDuration] = useState(30);
  const [mode, setMode] = useState<Mode>('plants');
  const [plant, setPlant] = useState<PlantPick | null>({ space: 'balcony', itemId: null, name: '' });
  const [picture, setPicture] = useState<RemoteImageRef | null>(null);

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
        setPicture(image);
        setMode('jigsaw');
      },
    });
  };

  const resolveImage = (): ImageRef | null => {
    if (mode === 'plants') return plant ? { kind: 'space', space: plant.space } : null;
    return picture;
  };

  const handleStart = () => {
    const image = resolveImage();
    if (!image) {
      Alert.alert(t('home.pickPicture'), t('home.pickPictureBody'));
      return;
    }
    const session: SessionConfig = { durationMinutes: duration, image, grid: gridForDuration(duration) };
    if (image.kind === 'remote') track('content_view', { contentId: image.imageId });
    navigation.navigate('ActiveSession', { config: session });
  };

  return (
    <AnimatedWallpaper style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + space.lg, paddingBottom: tabInset + space.lg, paddingHorizontal: space.screen }} showsVerticalScrollIndicator={false}>
        {!!config.texts.announcement && (
          <Card variant="tinted" padding="md" style={styles.announcement} accessibilityRole="summary">
            <AppText variant="bodySmall" align="center">
              {config.texts.announcement}
            </AppText>
          </Card>
        )}

        <Greeting name={user?.displayName} />

        <SpacesHero onOpen={(s) => navigation.navigate('Tabs', { screen: TAB[s] })} />

        <View style={styles.modeSection}>
          <SegmentedControl<Mode>
            value={mode}
            onChange={setMode}
            accessibilityLabel="What to focus on"
            segments={[
              { value: 'plants', label: t('home.growPlants') },
              { value: 'jigsaw', label: t('home.jigsawPictures') },
            ]}
          />
          <View style={styles.modeBody}>
            {mode === 'plants' ? (
              <GrowPlantsTab selected={plant} onPick={setPlant} />
            ) : (
              <JigsawPicturesTab selected={picture} onPick={setPicture} onSeeAll={(c) => openLibrary(c?.id)} />
            )}
          </View>
        </View>

        <View style={styles.timerSection}>
          <DialTimerPicker value={duration} onChange={setDuration} size={208} />
          <Animated.View style={[styles.startWrap, { transform: [{ scale: breathScale }] }]}>
            <Button label={t('home.start')} icon="play" size="lg" fullWidth onPress={handleStart} />
          </Animated.View>
          <AppText variant="caption" tone="muted" align="center" style={styles.startHint}>
            {t('home.tagline')}
          </AppText>
        </View>
      </ScrollView>
    </AnimatedWallpaper>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  announcement: { marginBottom: space.lg },
  modeSection: { marginTop: space.xxl },
  modeBody: { marginTop: space.lg },
  timerSection: { alignItems: 'center', marginTop: space.xxl },
  startWrap: { alignSelf: 'stretch', marginTop: space.xxl },
  startHint: { marginTop: space.md },
});
