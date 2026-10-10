// Home: entering a personal world, not a dashboard. A handwritten
// greeting → what to focus on (a plant to grow, or a jigsaw to reveal;
// the spaces themselves live in their own tabs) → the dial and one
// tactile Start.
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRemoteConfig } from '../context/RemoteConfigContext';
import { useAuth } from '../context/AuthContext';
import { track } from '../services/analytics';
import { gridForSession } from '../collection/model';
import { DialTimerPicker } from '../components/DialTimerPicker';
import { AnimatedWallpaper } from '../components/AnimatedWallpaper';
import { Greeting } from '../components/home/Greeting';
import { GrowPlantsTab, PlantPick } from '../components/home/GrowPlantsTab';
import { JigsawPicturesTab, JigsawPick } from '../components/home/JigsawPicturesTab';
import { Button } from '../ui/Button';
import { AppText } from '../ui/AppText';
import { Card } from '../ui/Card';
import { ModeChips } from '../ui/ModeChips';
import { useTabBarInset } from '../ui/TabBar';
import { space } from '../theme/spacing';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { ImageRef, SessionConfig } from '../types';
import { RootStackParamList } from '../navigation/types';
import { t, useLanguage } from '../i18n';

type Mode = 'plants' | 'jigsaw';

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
  const [plant, setPlant] = useState<PlantPick | null>({ kind: 'balcony' });
  const [picture, setPicture] = useState<JigsawPick | null>(null);

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
    if (mode === 'plants') return plant ? (plant.kind === 'balcony' ? { kind: 'plant', speciesId: 'peace_lily', place: 'balcony' } : { kind: 'plant', speciesId: plant.speciesId }) : null;
    return picture;
  };

  const handleStart = () => {
    const image = resolveImage();
    if (!image) {
      Alert.alert(t('home.pickPicture'), t('home.pickPictureBody'));
      return;
    }
    const session: SessionConfig = { durationMinutes: duration, image, grid: gridForSession(duration) };
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

        <View style={styles.modeSection}>
          <ModeChips<Mode>
            value={mode}
            onChange={setMode}
            accessibilityLabel={t('home.focusOnA11y')}
            chips={[
              { value: 'plants', label: t('home.growPlants') },
              { value: 'jigsaw', label: t('home.revealJigsaws') },
            ]}
          />
          <View style={styles.modeBody}>
            {mode === 'plants' ? (
              <GrowPlantsTab selected={plant} onPick={setPlant} onSeeAll={() => navigation.navigate('Tabs', { screen: 'Garden' })} />
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
  modeSection: { marginTop: space.xl },
  modeBody: { marginTop: space.lg },
  timerSection: { alignItems: 'center', marginTop: space.xxl },
  startWrap: { alignSelf: 'stretch', marginTop: space.xxl },
  startHint: { marginTop: space.md },
});
