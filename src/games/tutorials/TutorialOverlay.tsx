// Renders a TutorialDefinition as a five-step pictorial walkthrough: emoji
// boards with glowing targets, animated demo frames, a try-it hotspot the
// child must tap, and a "Let's play" finish that reports completion once.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Badge, BigButton, Confetti, PopIn, RoundButton, Tactile } from '../../ui';
import { playSfx, speak, stopSpeaking } from '../shared/audio';
import { metaFor } from '../registry';
import { palette, rainbow } from '../../theme/palette';
import { space } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import type { AgeBracket } from '../../types';
import type { GridScene, Scene, TutorialDefinition, TutorialStep } from './types';
import { t } from '../../i18n';

const STEP_EMOJI: Record<TutorialStep['kind'], string> = { meet: '👋', controls: '🕹️', demo: '👀', tryIt: '🙌', play: '🚀' };
const STEP_KEY: Record<TutorialStep['kind'], 'tutorial.meet' | 'tutorial.controls' | 'tutorial.demo' | 'tutorial.tryIt' | 'tutorial.play'> = { meet: 'tutorial.meet', controls: 'tutorial.controls', demo: 'tutorial.demo', tryIt: 'tutorial.tryIt', play: 'tutorial.play' };

interface Props {
  tutorial: TutorialDefinition;
  bracket: AgeBracket;
  visible: boolean;
  sound: boolean;
  narration: boolean;
  /** Called once when the child reaches the last step (the server pays coins once per game). */
  onComplete: () => Promise<{ coins?: { awarded: number } } | null | void> | void;
  onClose: (reason: 'done' | 'skip') => void;
  /** Label of the final button, e.g. "Let's play!" or "Back to game". */
  finishLabel?: string;
  allowSkip?: boolean;
}

function Pulse({ children, on }: { children: React.ReactNode; on: boolean }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!on) return;
    const loop = Animated.loop(Animated.sequence([Animated.timing(v, { toValue: 1, duration: 500, useNativeDriver: true }), Animated.timing(v, { toValue: 0, duration: 500, useNativeDriver: true })]));
    loop.start();
    return () => loop.stop();
  }, [on, v]);
  return <Animated.View style={{ transform: [{ scale: on ? v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) : 1 }] }}>{children}</Animated.View>;
}

function GridView({ scene, width, onCellTap, hotspots }: { scene: GridScene; width: number; onCellTap?: (r: number, c: number) => void; hotspots?: Set<string> }) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!scene.frames?.length) return;
    setFrame(0);
    const id = setInterval(() => setFrame((f) => (f + 1) % scene.frames!.length), 900);
    return () => clearInterval(id);
  }, [scene]);
  const rows = scene.frames?.length ? scene.frames[frame]! : scene.rows;
  const cols = Math.max(...rows.map((r) => r.length));
  const cell = Math.min(72, (width - 32) / cols);
  const highlight = new Set((scene.highlight ?? []).map(([r, c]) => `${r}-${c}`));
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={[styles.board, { backgroundColor: '#FFF8EC' }]}>
        {rows.map((row, r) => (
          <View key={r} style={{ flexDirection: 'row' }}>
            {Array.from({ length: cols }, (_, c) => {
              const v = row[c] ?? '';
              const key = `${r}-${c}`;
              const hot = hotspots ? hotspots.has(key) : highlight.has(key);
              const isArrowFrom = scene.arrow && scene.arrow.from[0] === r && scene.arrow.from[1] === c;
              const isArrowTo = scene.arrow && scene.arrow.to[0] === r && scene.arrow.to[1] === c;
              return (
                <Tactile key={key} disabled={!onCellTap} onPress={() => onCellTap?.(r, c)} accessibilityRole={onCellTap ? 'button' : undefined} accessibilityLabel={v || `cell ${r + 1} ${c + 1}`}>
                  <Pulse on={hot}>
                    <View style={[styles.cell, { width: cell, height: cell }, hot && styles.cellHot, isArrowTo && { borderColor: palette.cherry, borderStyle: 'dashed' }]}>
                      <Text style={{ fontSize: v.length > 2 ? Math.max(10, cell * 0.22) : cell * 0.5, textAlign: 'center', fontFamily: v.length > 2 ? 'Nunito_700Bold' : undefined }} numberOfLines={2}>{v}</Text>
                      {isArrowFrom && <Text style={styles.arrowFrom}>👉</Text>}
                    </View>
                  </Pulse>
                </Tactile>
              );
            })}
          </View>
        ))}
      </View>
      {scene.caption && <AppText variant="caption" tone="secondary" align="center" style={{ marginTop: 6 }}>{scene.caption}</AppText>}
    </View>
  );
}

function GestureView({ gesture, emoji, caption }: { gesture: 'tap' | 'drag' | 'swipe' | 'hold'; emoji: string; caption?: string }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(Animated.sequence([Animated.timing(v, { toValue: 1, duration: gesture === 'tap' ? 450 : 900, useNativeDriver: true }), Animated.timing(v, { toValue: 0, duration: gesture === 'tap' ? 450 : 300, useNativeDriver: true })]));
    anim.start();
    return () => anim.stop();
  }, [gesture, v]);
  const translateX = v.interpolate({ inputRange: [0, 1], outputRange: [0, gesture === 'drag' || gesture === 'swipe' ? 90 : 0] });
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [1, gesture === 'tap' ? 0.8 : 1] });
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <View style={styles.gestureBox}>
        <Text style={{ fontSize: 52 }}>{emoji}</Text>
        <Animated.Text style={{ fontSize: 44, position: 'absolute', bottom: 8, left: 40, transform: [{ translateX }, { scale }] }}>👆</Animated.Text>
      </View>
      <Badge label={gesture === 'tap' ? 'Tap' : gesture === 'drag' ? 'Press and drag' : gesture === 'swipe' ? 'Swipe' : 'Hold'} emoji={gesture === 'tap' ? '👆' : '↔️'} />
      {caption && <AppText variant="caption" tone="secondary" align="center">{caption}</AppText>}
    </View>
  );
}

function SceneView({ scene, width, onCellTap, hotspots }: { scene: Scene; width: number; onCellTap?: (r: number, c: number) => void; hotspots?: Set<string> }) {
  if (scene.kind === 'grid') return <GridView scene={scene} width={width} onCellTap={onCellTap} hotspots={hotspots} />;
  if (scene.kind === 'gesture') return <GestureView gesture={scene.gesture} emoji={scene.emoji} caption={scene.caption} />;
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <View style={styles.iconRow}>
        {scene.items.map((it, i) => (
          <View key={i} style={[styles.icon, { backgroundColor: rainbow[i % rainbow.length] + '33' }]}>
            <Text style={{ fontSize: 34 }}>{it.emoji}</Text>
            {it.label ? <AppText variant="caption" align="center">{it.label}</AppText> : null}
          </View>
        ))}
      </View>
      {scene.caption && <AppText variant="caption" tone="secondary" align="center">{scene.caption}</AppText>}
    </View>
  );
}

export function TutorialOverlay({ tutorial, bracket, visible, sound, narration, onComplete, onClose, finishLabel, allowSkip = true }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [tried, setTried] = useState(false);
  const [hint, setHint] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [coins, setCoins] = useState<number | null>(null);
  const completed = useRef(false);
  const meta = metaFor(tutorial.gameId);
  const step = tutorial.steps[index]!;
  const text = step.textByBracket?.[bracket] ?? step.text;
  const sceneWidth = Math.min(width - 48, 420);
  const hotspots = useMemo(() => (step.kind === 'tryIt' && step.scene.kind === 'grid' ? new Set((step.scene.highlight ?? []).map(([r, c]) => `${r}-${c}`)) : undefined), [step]);

  useEffect(() => {
    if (!visible) return;
    setIndex(0);
    setTried(false);
    setCoins(null);
    completed.current = false;
  }, [visible, tutorial.gameId]);
  useEffect(() => {
    if (!visible) return;
    speak(`${t(STEP_KEY[step.kind])}. ${text}${step.target ? `. ${step.target.prompt}` : ''}`, narration);
    return () => stopSpeaking();
  }, [visible, index, text, narration, step]);
  useEffect(() => {
    if (!visible || step.kind !== 'play' || completed.current) return;
    completed.current = true;
    setCelebrate(true);
    playSfx('win', sound);
    Promise.resolve(onComplete()).then((r) => { if (r && 'coins' in r && r.coins) setCoins(r.coins.awarded); }).catch(() => undefined);
    const id = setTimeout(() => setCelebrate(false), 2200);
    return () => clearTimeout(id);
  }, [visible, step.kind, onComplete, sound]);

  const next = () => {
    stopSpeaking();
    playSfx('tap', sound);
    if (index < tutorial.steps.length - 1) {
      setIndex(index + 1);
      setTried(false);
      setHint(false);
    } else onClose('done');
  };
  const onCellTap = (r: number, c: number) => {
    if (step.kind !== 'tryIt') return;
    if (hotspots?.has(`${r}-${c}`)) {
      setTried(true);
      setHint(false);
      playSfx('good', sound);
      speak(t('tutorial.greatJob'), narration);
      setTimeout(next, 700);
    } else {
      setHint(true);
      playSfx('bad', sound);
    }
  };
  const canNext = step.kind !== 'tryIt' || tried || !hotspots || hotspots.size === 0;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={() => onClose('skip')}>
      <View style={[styles.scrim, { backgroundColor: colors.scrim }]}>
        <View style={[styles.sheet, { backgroundColor: colors.surfaceRaised, marginTop: insets.top + space.md, marginBottom: insets.bottom + space.md }]}>
          <Confetti play={celebrate} />
          <View style={styles.head}>
            <Text style={{ fontSize: 30 }}>{meta.emoji}</Text>
            <View style={{ flex: 1 }}>
              <AppText variant="heading" numberOfLines={1}>{meta.name} · {t('tutorial.howToPlay')}</AppText>
              <AppText variant="caption" tone="secondary">{t('tutorial.stepOf', { n: index + 1, total: tutorial.steps.length })} · {t(STEP_KEY[step.kind])}</AppText>
            </View>
            {allowSkip && <RoundButton icon="close" label={t('tutorial.skip')} onPress={() => onClose('skip')} color={palette.cherry} size={40} />}
          </View>
          <View style={styles.rail}>
            {tutorial.steps.map((s, i) => (
              <Tactile key={s.kind} disabled={i > index} onPress={() => { setIndex(i); setTried(false); }} accessibilityRole="button" accessibilityLabel={t(STEP_KEY[s.kind])} accessibilityState={{ selected: i === index }}>
                <View style={[styles.dot, { backgroundColor: i < index ? palette.lime : i === index ? palette.sunshine : colors.surfaceMuted }]}><Text style={{ fontSize: 14 }}>{STEP_EMOJI[s.kind]}</Text></View>
              </Tactile>
            ))}
          </View>
          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <PopIn key={index} style={{ gap: space.md, alignItems: 'center' }}>
              <SceneView scene={step.scene} width={sceneWidth} onCellTap={step.kind === 'tryIt' ? onCellTap : undefined} hotspots={hotspots} />
              <AppText variant={bracket === 'A' ? 'subheading' : 'body'} align="center">{text}</AppText>
              {step.kind === 'tryIt' && step.target && !tried && <Badge label={step.target.prompt} emoji="👆" color="#FFF4CC" />}
              {hint && <AppText variant="caption" tone="warning" align="center">{t('tutorial.tapHere')}</AppText>}
              {tried && <AppText variant="heading" align="center">✅ {t('tutorial.greatJob')}</AppText>}
              {step.kind === 'play' && coins !== null && coins > 0 && <Badge label={t('tutorial.coins', { n: coins })} emoji="🪙" color="#FFF4CC" />}
            </PopIn>
          </ScrollView>
          <View style={styles.foot}>
            <BigButton label={t('common.back')} icon="arrowLeft" color={palette.sky} size="md" onPress={() => { setIndex(Math.max(0, index - 1)); setTried(false); }} disabled={index === 0} />
            <BigButton label={step.kind === 'play' ? finishLabel ?? t('tutorial.play') : t('common.next')} icon={step.kind === 'play' ? 'play' : 'arrowRight'} color={palette.lime} size="md" onPress={next} disabled={!canNext} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'center', padding: space.md },
  sheet: { flex: 1, maxWidth: 560, width: '100%', alignSelf: 'center', borderRadius: 28, padding: space.md, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  rail: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginVertical: space.sm },
  dot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  body: { paddingVertical: space.md, paddingHorizontal: 4, flexGrow: 1, justifyContent: 'center' },
  board: { borderRadius: 16, padding: 8, borderWidth: 3, borderColor: palette.ink },
  cell: { alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#E5E0F0', backgroundColor: '#fff', margin: 2 },
  cellHot: { backgroundColor: '#FFF4CC', borderColor: palette.sunshineDeep, borderWidth: 3 },
  arrowFrom: { position: 'absolute', right: -6, bottom: -6, fontSize: 18 },
  gestureBox: { width: 220, height: 130, borderRadius: 24, backgroundColor: '#FFF8EC', borderWidth: 3, borderColor: palette.ink, alignItems: 'center', justifyContent: 'center' },
  iconRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  icon: { width: 84, padding: 8, borderRadius: 16, alignItems: 'center', gap: 2 },
  foot: { flexDirection: 'row', gap: space.sm, paddingTop: space.sm },
});
