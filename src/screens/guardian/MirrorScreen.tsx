// The live gameplay mirror: the same game View rendered read-only from the
// state frames the child's device streams. Shows status, duration, last
// activity and the privacy note; when the child is offline it shows the
// last known state with its timestamp, never a stale "live" feed.
import React, { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { AppText, Button, Card, Screen, Badge, EmptyState } from '../../ui';
import { ScreenHeader } from '../../components/ScreenHeader';
import { formatAgo, formatDuration } from '../../components/guardian/LiveBadge';
import { GameMirrorView } from '../../games/shared/GameShell';
import { loadGame, metaFor } from '../../games/registry';
import type { GameDefinition } from '../../games/engine';
import { useGuardian } from '../../context/GuardianContext';
import { useGuardianRealtime } from '../../context/GuardianRealtime';
import { guardianApi, type ChildDetail } from '../../api/guardian';
import { space } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import { t } from '../../i18n';

interface Frame {
  game: string;
  difficulty: string;
  state: unknown;
  elapsed?: number;
  status?: { phase: string; score?: number; hud?: string };
}

export function MirrorScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'Mirror'>) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const g = useGuardian();
  const rt = useGuardianRealtime();
  const id = route.params.childId;
  const child = g.children.find((c) => c.id === id);
  const [detail, setDetail] = useState<ChildDetail | null>(null);
  const [frame, setFrame] = useState<{ frame: Frame; at: string; sessionId: string } | null>(null);
  const [online, setOnline] = useState<boolean | null>(null);
  const [watching, setWatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [def, setDef] = useState<GameDefinition<any, any> | null>(null);
  const [connection, setConnection] = useState(rt.client.state);

  useEffect(() => {
    guardianApi.child(id).then((d) => {
      setDetail(d);
      setOnline(d.live.online);
    }).catch(() => undefined);
  }, [id]);

  useEffect(() => {
    const offState = rt.client.onState((s) => {
      setConnection(s);
      if (s === 'online') rt.client.send({ type: 'watch', childId: id });
    });
    const off = rt.client.on((m) => {
      if (m.childId !== id) return;
      if (m.type === 'watching') setWatching(true);
      else if (m.type === 'mirror_frame') {
        setFrame({ frame: m.state as Frame, at: String(m.at), sessionId: String(m.sessionId) });
        setOnline(true);
      } else if (m.type === 'mirror_ended') {
        setWatching(false);
        if (m.reason === 'offline') setOnline(false);
      } else if (m.type === 'child_status') {
        setOnline(!!m.online);
        if (m.session === null) setFrame(null);
      } else if (m.type === 'error') setError(String(m.message));
    });
    if (rt.client.connected) rt.client.send({ type: 'watch', childId: id });
    return () => {
      off();
      offState();
      rt.client.send({ type: 'unwatch', childId: id });
    };
  }, [rt, id]);

  useEffect(() => {
    if (!frame) return;
    loadGame(frame.frame.game).then(setDef).catch(() => setDef(null));
  }, [frame?.frame.game, frame]);

  const boardW = Math.min(width - space.screen * 2, 520);
  const meta = frame ? metaFor(frame.frame.game) : null;
  const session = detail?.live.currentSession;

  return (
    <Screen scroll>
      <ScreenHeader title={t('mirror.title')} subtitle={child?.displayName} right={<Badge label={watching && online ? t('mirror.watching') : connection === 'online' ? t('dash.offline') : t('mirror.connecting')} color={watching && online ? colors.successSoft : colors.surfaceMuted} icon="eye" />} />
      <Card variant="tinted" padding="md" style={styles.card}>
        <AppText variant="bodySmall" tone="secondary">{t('mirror.privacy')}</AppText>
      </Card>
      {error ? (
        <EmptyState icon="eyeOff" title={error === 'Live mirroring is turned off for this child' ? t('mirror.disabled') : error} action={{ label: t('child.controls'), onPress: () => navigation.navigate('Controls', { childId: id }) }} />
      ) : frame && meta ? (
        <Card variant="raised" padding="lg" style={styles.card}>
          <View style={styles.row}>
            <AppText variant="dashHeading" style={{ flex: 1 }}>{meta.emoji} {meta.name}</AppText>
            <Badge label={online ? t('dash.online') : t('dash.offline')} color={online ? colors.successSoft : colors.warningSoft} />
          </View>
          <AppText variant="caption" tone="muted">
            {frame.frame.status?.hud ?? ''}{frame.frame.status?.score !== undefined ? ` · ${t('games.score')} ${frame.frame.status.score}` : ''}{typeof frame.frame.elapsed === 'number' ? ` · ${formatDuration(frame.frame.elapsed)}` : ''} · {online ? t('dash.lastSeen', { when: formatAgo(frame.at) }) : t('mirror.lastKnown', { when: formatAgo(frame.at) })}
          </AppText>
          <View style={[styles.board, { width: boardW, height: boardW, backgroundColor: colors.surfaceMuted, opacity: online ? 1 : 0.6 }]}>
            {def ? <GameMirrorView def={def} frame={{ state: frame.frame.state, difficulty: frame.frame.difficulty, elapsed: frame.frame.elapsed }} width={boardW} height={boardW} /> : <AppText variant="bodySmall" tone="muted" align="center" style={{ padding: space.lg }}>{t('mirror.gameNotRenderable')}</AppText>}
          </View>
          <View style={[styles.row, { marginTop: space.md }]}>
            <Button label={session?.paused ? t('dash.resume') : t('dash.pause')} size="sm" variant="secondary" onPress={() => (session?.paused ? guardianApi.resumeSession(id) : guardianApi.pauseSession(id)).then(() => guardianApi.child(id).then(setDetail)).catch(() => undefined)} />
            <Button label={t('dash.end')} size="sm" variant="destructive" onPress={() => guardianApi.endSession(id).then(() => navigation.goBack()).catch(() => undefined)} />
          </View>
        </Card>
      ) : (
        <EmptyState icon="eye" title={online === false ? t('mirror.offline', { name: child?.displayName ?? '' }) : t('mirror.waiting', { name: child?.displayName ?? '' })} body={detail?.live.lastActivityAt ? t('dash.lastSeen', { when: formatAgo(detail.live.lastActivityAt) }) : undefined} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  board: { alignSelf: 'center', marginTop: space.md, borderRadius: 16, overflow: 'hidden', justifyContent: 'center' },
});
