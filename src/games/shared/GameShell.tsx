// Runs a game definition: holds the state, dispatches actions, drives ticks,
// draws the HUD (timer, restart, pause, quit), handles guardian pause/end
// and the time limit, shows the completion screen, and streams state frames
// to the Guardian Console while someone is watching.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { GameContext, GameDefinition, GameStatus } from '../engine';
import { newSeed } from '../engine';
import { metaFor } from '../registry';
import { AppText, BigButton, Confetti, PopIn, RoundButton, Stars, PlayfulBackdrop, Badge } from '../../ui';
import { usePlayer } from '../../context/PlayerContext';
import { useSettings } from '../../context/SettingsContext';
import { playSfx, speak, stopSpeaking } from './audio';
import { space } from '../../theme/spacing';
import { palette } from '../../theme/palette';
import { useTheme } from '../../theme/ThemeContext';
import { t } from '../../i18n';

export interface GameResult {
  outcome: 'completed' | 'abandoned' | 'failed';
  score: number | null;
  stars: number;
  progress?: { data: Record<string, unknown>; version: number };
}

interface Props<S, A> {
  def: GameDefinition<S, A>;
  difficulty: string;
  savedProgress?: { data: Record<string, unknown>; version: number } | null;
  onExit: (result: GameResult | null) => void;
  remainingSeconds?: number | null;
  pausedByGuardian?: boolean;
  endedReason?: string | null;
  endedMessage?: string | null;
  sendFrame?: (state: unknown) => void;
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export function GameShell<S, A>({ def, difficulty, savedProgress, onExit, remainingSeconds, pausedByGuardian, endedReason, endedMessage, sendFrame }: Props<S, A>) {
  const { colors } = useTheme();
  const p = usePlayer();
  const { settings } = useSettings();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const meta = metaFor(def.id);
  const sound = settings.soundEnabled && (p.me?.controls.soundEnabled ?? true);
  const narration = settings.narrationEnabled && (p.me?.controls.narrationEnabled ?? true);
  const [seed, setSeed] = useState(newSeed);
  const ctx = useMemo<GameContext>(() => ({ difficulty, bracket: p.child?.effectiveBracket ?? 'B', seed, sound, narration }), [difficulty, p.child?.effectiveBracket, seed, sound, narration]);
  const [state, setState] = useState<S>(() => def.init(ctx));
  const stateRef = useRef(state);
  stateRef.current = state;
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState<GameStatus | null>(null);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const startedAt = useRef(Date.now());
  const status = useMemo(() => def.status(state, ctx), [def, state, ctx]);
  const effectivePause = paused || !!pausedByGuardian || !!endedReason || !!finished;

  const sfx = useCallback((kind: Parameters<typeof playSfx>[0]) => playSfx(kind, sound), [sound]);
  const say = useCallback((text: string) => speak(text, narration), [narration]);

  const dispatch = useCallback(
    (action: A) => {
      if (effectivePause) return;
      setState((s) => def.reduce(s, action, ctx));
    },
    [def, ctx, effectivePause]
  );

  // Game-driven ticks (arcade physics).
  useEffect(() => {
    if (!def.tick || effectivePause) return;
    const id = setInterval(() => setState((s) => def.reduce(s, def.tick!.action, ctx)), def.tick.intervalMs);
    return () => clearInterval(id);
  }, [def, ctx, effectivePause]);

  // Elapsed clock.
  useEffect(() => {
    if (effectivePause) return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [effectivePause]);

  // Mirror frames: send on state change, throttled.
  const lastFrame = useRef(0);
  useEffect(() => {
    if (!sendFrame) return;
    const now = Date.now();
    const wait = Math.max(0, 200 - (now - lastFrame.current));
    const id = setTimeout(() => {
      lastFrame.current = Date.now();
      sendFrame({ game: def.id, difficulty, state, elapsed, status: def.status(state, ctx) });
    }, wait);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, sendFrame]);

  // Win / loss.
  useEffect(() => {
    if (finished || status.phase === 'playing') return;
    setFinished(status);
    sfx(status.phase === 'won' ? 'win' : 'bad');
    say(status.phase === 'won' ? t('games.youWin') : t('games.gameOver'));
  }, [status, finished, sfx, say]);

  useEffect(() => () => stopSpeaking(), []);

  const restart = () => {
    const s = newSeed();
    setSeed(s);
    setState(def.init({ ...ctx, seed: s }));
    setElapsed(0);
    setFinished(null);
    setPaused(false);
    startedAt.current = Date.now();
  };

  const finish = (outcome: GameResult['outcome']) => {
    const st = finished ?? status;
    const progress = def.persist ? { data: def.persist(stateRef.current, savedProgress?.data ?? {}), version: savedProgress?.version ?? 0 } : undefined;
    onExit({ outcome, score: st.score ?? null, stars: st.stars ?? 0, progress });
  };

  const quit = () => {
    if (finished) return finish(finished.phase === 'won' ? 'completed' : 'failed');
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(t('games.quitConfirm'))) finish('abandoned');
      return;
    }
    setConfirmQuit(true);
  };

  const square = def.layout !== 'full';
  const boardW = Math.min(width - space.lg * 2, 560);
  const hudH = 72 + insets.top;
  const boardH = square ? boardW : height - hudH - insets.bottom - space.lg;

  return (
    <PlayfulBackdrop shapes={false} colors={[palette.vanilla, '#FFFFFF']}>
      <View style={[styles.hud, { paddingTop: insets.top + space.sm }]}>
        <RoundButton icon="close" label={t('games.quit')} onPress={quit} color={palette.cherry} size={46} />
        <View style={styles.hudMid}>
          <Text style={styles.hudEmoji}>{meta.emoji}</Text>
          <View>
            <AppText variant="subheading" numberOfLines={1}>{meta.name}</AppText>
            <AppText variant="caption" tone="secondary" numberOfLines={1}>
              {fmt(elapsed)}{status.hud ? ` · ${status.hud}` : ''}{status.score !== undefined ? ` · ${t('games.score')} ${status.score}` : ''}
            </AppText>
          </View>
        </View>
        {typeof remainingSeconds === 'number' && <Badge label={fmt(Math.max(0, remainingSeconds - elapsed))} icon="timer" color={remainingSeconds - elapsed < 120 ? colors.warningSoft : colors.surfaceMuted} />}
        <RoundButton icon="reset" label={t('games.restart')} onPress={restart} color={palette.sunshine} size={46} />
        <RoundButton icon={paused ? 'play' : 'pause'} label={paused ? t('games.resume') : t('games.pause')} onPress={() => setPaused((x) => !x)} color={palette.sky} size={46} />
      </View>
      {typeof status.progress === 'number' && (
        <View style={[styles.progressTrack, { backgroundColor: colors.surfaceMuted }]}>
          <View style={[styles.progressFill, { width: `${Math.round(status.progress * 100)}%`, backgroundColor: meta.color }]} />
        </View>
      )}
      <View style={[styles.boardWrap, square && { alignItems: 'center' }]}>
        <View style={{ width: square ? boardW : width, height: boardH }}>
          <def.View state={state} dispatch={dispatch} ctx={ctx} width={square ? boardW : width} height={boardH} say={say} sfx={sfx} />
        </View>
      </View>
      {p.watchers > 0 && (
        <View style={[styles.watching, { backgroundColor: colors.accentSoft, bottom: insets.bottom + space.sm }]} accessibilityRole="alert">
          <Text>👀</Text>
          <AppText variant="caption">{t('home.watching')}</AppText>
        </View>
      )}

      {(paused || pausedByGuardian) && !finished && !endedReason && (
        <View style={[styles.overlay, { backgroundColor: colors.scrim }]}>
          <PopIn style={[styles.sheet, { backgroundColor: colors.surfaceRaised }]}>
            <Text style={styles.bigEmoji}>{pausedByGuardian ? '🛡️' : '⏸️'}</Text>
            <AppText variant="display" align="center">{t('games.paused')}</AppText>
            {pausedByGuardian ? (
              <AppText variant="body" tone="secondary" align="center">{t('games.pausedByGuardian')}</AppText>
            ) : (
              <BigButton label={t('games.resume')} emoji="▶️" onPress={() => setPaused(false)} color={palette.lime} />
            )}
            <BigButton label={t('games.quit')} emoji="🏠" onPress={quit} color={palette.sky} size="md" />
          </PopIn>
        </View>
      )}

      {endedReason && !finished && (
        <View style={[styles.overlay, { backgroundColor: colors.scrim }]}>
          <PopIn style={[styles.sheet, { backgroundColor: colors.surfaceRaised }]}>
            <Text style={styles.bigEmoji}>{endedReason === 'ended_by_guardian' ? '🛡️' : '⏰'}</Text>
            <AppText variant="display" align="center">{t('games.timeUp')}</AppText>
            <AppText variant="body" tone="secondary" align="center">{endedMessage ?? (endedReason === 'ended_by_guardian' ? t('games.ended') : t('games.timeUpBody'))}</AppText>
            <BigButton label={t('games.quit')} emoji="🏠" onPress={() => finish('abandoned')} color={palette.sky} />
          </PopIn>
        </View>
      )}

      {finished && (
        <View style={[styles.overlay, { backgroundColor: colors.scrim }]}>
          <Confetti play={finished.phase === 'won'} />
          <PopIn style={[styles.sheet, { backgroundColor: colors.surfaceRaised }]}>
            <Text style={styles.bigEmoji}>{finished.phase === 'won' ? '🎉' : '💪'}</Text>
            <AppText variant="display" align="center">{finished.phase === 'won' ? t('games.youWin') : t('games.gameOver')}</AppText>
            {finished.phase === 'won' && <Stars count={finished.stars ?? 0} size={40} />}
            <View style={styles.resultRow}>
              {finished.score !== undefined && (
                <View style={styles.resultStat}>
                  <AppText variant="caption" tone="muted">{t('games.score')}</AppText>
                  <AppText variant="numeralSmall">{finished.score}</AppText>
                </View>
              )}
              <View style={styles.resultStat}>
                <AppText variant="caption" tone="muted">{t('games.time')}</AppText>
                <AppText variant="numeralSmall">{fmt(elapsed)}</AppText>
              </View>
            </View>
            <BigButton label={finished.phase === 'won' ? t('games.play') : t('games.tryAgain')} emoji="🔁" onPress={restart} color={palette.lime} />
            <BigButton label={t('games.quit')} emoji="🏠" onPress={() => finish(finished.phase === 'won' ? 'completed' : 'failed')} color={palette.sky} size="md" />
          </PopIn>
        </View>
      )}

      {confirmQuit && (
        <View style={[styles.overlay, { backgroundColor: colors.scrim }]}>
          <PopIn style={[styles.sheet, { backgroundColor: colors.surfaceRaised }]}>
            <Text style={styles.bigEmoji}>🤔</Text>
            <AppText variant="heading" align="center">{t('games.quitConfirm')}</AppText>
            <BigButton label={t('common.yes')} onPress={() => finish('abandoned')} color={palette.cherry} size="md" />
            <BigButton label={t('common.no')} onPress={() => setConfirmQuit(false)} color={palette.lime} size="md" />
          </PopIn>
        </View>
      )}
    </PlayfulBackdrop>
  );
}

/** Read-only rendering of a mirrored frame for the Guardian Console. */
export function GameMirrorView<S, A>({ def, frame, width, height }: { def: GameDefinition<S, A>; frame: { state: S; difficulty: string; elapsed?: number }; width: number; height: number }) {
  const ctx = useMemo<GameContext>(() => ({ difficulty: frame.difficulty, bracket: 'B', seed: 0, sound: false, narration: false }), [frame.difficulty]);
  const noop = useCallback(() => undefined, []);
  return (
    <View pointerEvents="none" style={{ width, height }}>
      <def.View state={frame.state} dispatch={noop} ctx={ctx} readOnly width={width} height={height} say={noop} sfx={noop} />
    </View>
  );
}

const styles = StyleSheet.create({
  hud: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingBottom: space.sm },
  hudMid: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm, minWidth: 0 },
  hudEmoji: { fontSize: 28 },
  progressTrack: { height: 8, marginHorizontal: space.lg, borderRadius: 4, overflow: 'hidden', marginBottom: space.sm },
  progressFill: { height: 8, borderRadius: 4 },
  boardWrap: { flex: 1, justifyContent: 'center' },
  overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  sheet: { width: '100%', maxWidth: 420, borderRadius: 32, padding: space.xxl, alignItems: 'center', gap: space.md },
  bigEmoji: { fontSize: 64 },
  resultRow: { flexDirection: 'row', gap: space.xxl },
  resultStat: { alignItems: 'center' },
  watching: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
});
