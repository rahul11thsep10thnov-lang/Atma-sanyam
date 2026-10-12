// The group's presence on the session screen: a strip of everyone in it
// (active, left early faded, completed, disconnected), join requests for
// the host, and the chat of fixed messages and smileys in a sheet.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useSocial } from '../../social/SocialContext';
import { group, GroupMessage, GroupParticipant, GroupSessionView } from '../../social/groupApi';
import { GROUP_SMILEYS, GROUP_WORDS, groupMessageText } from '../../social/groupMessages';
import { Sheet } from '../../spaces/ui/Sheet';
import { AppText } from '../../ui/AppText';
import { Avatar } from '../../ui/Avatar';
import { IconButton } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { Tactile } from '../../ui/Pressable';
import { radii } from '../../theme/radii';
import { space } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import { t } from '../../i18n';

interface Props {
  sessionId: string;
  top: number;
  /** The session screen tells the panel when the server ended the session. */
  onEnded: (session: GroupSessionView) => void;
  onHostChanged?: (hostId: string) => void;
}

export function GroupPanel({ sessionId, top, onEnded, onHostChanged }: Props) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { onGroupEvent } = useSocial();
  const [s, setS] = useState<GroupSessionView | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [unseen, setUnseen] = useState(0);
  const endedRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const next = await group.get(sessionId);
      setS(next);
      if (next.status === 'ended' && !endedRef.current) {
        endedRef.current = true;
        onEnded(next);
      }
    } catch {
      // keep what we have
    }
  }, [sessionId, onEnded]);

  useEffect(() => {
    void refresh();
    group.messages(sessionId).then((r) => setMessages(r.items)).catch(() => undefined);
    const off = onGroupEvent((e) => {
      if (e.sessionId !== sessionId) return;
      if (e.event === 'message' && e.data) {
        const m = e.data as unknown as GroupMessage;
        setMessages((cur) => (cur.some((x) => x.id === m.id) ? cur : [...cur, m]));
        if (m.fromUserId !== user?.id) setUnseen((n) => n + 1);
        return;
      }
      if (e.event === 'host_changed' && e.data?.hostId) onHostChanged?.(String(e.data.hostId));
      void refresh();
    });
    const timer = setInterval(() => void refresh(), 15_000);
    return () => {
      off();
      clearInterval(timer);
    };
  }, [sessionId, refresh, onGroupEvent, user?.id, onHostChanged]);

  useEffect(() => {
    if (chatOpen) setUnseen(0);
  }, [chatOpen, messages]);

  if (!s) return null;
  const isHost = s.hostId === user?.id;
  const people = s.participants.filter((p) => !['invited', 'rejected', 'approved', 'ready'].includes(p.status));
  const joinRequests = s.participants.filter((p) => p.status === 'join_requested');
  const byId = new Map(s.participants.map((p) => [p.id, p]));

  return (
    <>
      <View style={[styles.strip, { top }]} pointerEvents="box-none">
        <View style={styles.glass}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.people}>
            {people.map((p) => (
              <ParticipantBadge key={p.id} p={p} me={p.id === user?.id} />
            ))}
          </ScrollView>
          <View style={styles.chatBtn}>
            <IconButton icon="send" label={t('group.chat')} variant="onImage" size={36} onPress={() => setChatOpen(true)} />
            {unseen > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                <AppText variant="caption" style={styles.badgeText}>{unseen}</AppText>
              </View>
            )}
          </View>
        </View>
        {isHost &&
          joinRequests.map((p) => (
            <View key={p.id} style={[styles.joinRow, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
              <Avatar avatarId={p.avatarId} name={p.username ?? p.displayName} size={28} />
              <AppText variant="bodySmallStrong" style={{ flex: 1 }} numberOfLines={1}>{t('group.wantsToJoin', { name: p.username ? `@${p.username}` : p.displayName ?? '' })}</AppText>
              <IconButton icon="close" label={t('friends.decline')} variant="tinted" size={32} onPress={() => void group.answerJoin(sessionId, p.id, false).then(refresh).catch(() => undefined)} />
              <IconButton icon="check" label={t('friends.accept')} variant="filled" size={32} onPress={() => void group.answerJoin(sessionId, p.id, true).then(refresh).catch(() => undefined)} />
            </View>
          ))}
      </View>

      <Sheet visible={chatOpen} title={t('group.chat')} subtitle={t('group.chatBody')} onClose={() => setChatOpen(false)} maxHeight="70%">
        <ScrollView style={styles.feed} contentContainerStyle={{ gap: 6, paddingBottom: space.sm }}>
          {messages.length === 0 && <AppText variant="bodySmall" tone="muted" align="center">{t('group.chatEmpty')}</AppText>}
          {messages.slice(-40).map((m) => {
            const from = byId.get(m.fromUserId);
            const mine = m.fromUserId === user?.id;
            return (
              <View key={m.id} style={[styles.msg, mine && styles.msgMine]}>
                {!mine && <Avatar avatarId={from?.avatarId} name={from?.username ?? from?.displayName} size={24} />}
                <View style={[styles.bubble, { backgroundColor: mine ? colors.primary : colors.primarySoft }]}>
                  <AppText variant="bodySmall" style={{ color: mine ? colors.textOnAccent : colors.text }}>{groupMessageText(m.key)}</AppText>
                </View>
              </View>
            );
          })}
        </ScrollView>
        <View style={styles.smileys}>
          {Object.keys(GROUP_SMILEYS).map((k) => (
            <Tactile key={k} onPress={() => void group.say(sessionId, k).catch(() => undefined)} accessibilityRole="button" accessibilityLabel={k} style={[styles.smiley, { backgroundColor: colors.surfaceMuted }]}>
              <AppText variant="heading">{GROUP_SMILEYS[k]}</AppText>
            </Tactile>
          ))}
        </View>
        <View style={styles.words}>
          {GROUP_WORDS.map((k) => (
            <Tactile key={k} onPress={() => void group.say(sessionId, k).catch(() => undefined)} accessibilityRole="button" style={[styles.word, { borderColor: colors.border, backgroundColor: colors.surfaceRaised }]}>
              <AppText variant="bodySmallStrong">{groupMessageText(k)}</AppText>
            </Tactile>
          ))}
        </View>
      </Sheet>
    </>
  );
}

function ParticipantBadge({ p, me }: { p: GroupParticipant; me: boolean }) {
  const { colors } = useTheme();
  const faded = p.status === 'left_early';
  const ring = p.status === 'completed' ? colors.success : p.status === 'disconnected' ? colors.warning : p.status === 'left_early' ? colors.danger : 'rgba(255,255,255,0.7)';
  const mark = p.status === 'completed' ? 'check' : p.status === 'disconnected' ? 'alert' : p.status === 'left_early' ? 'close' : null;
  return (
    <View style={[styles.person, faded && { opacity: 0.45 }]} accessibilityLabel={`${p.username ?? ''} ${p.status}`}>
      <View style={[styles.ring, { borderColor: ring, borderStyle: p.status === 'disconnected' ? 'dashed' : 'solid' }]}>
        <Avatar avatarId={p.avatarId} name={p.username ?? p.displayName} size={30} />
        {mark && (
          <View style={[styles.mark, { backgroundColor: ring }]}>
            <Icon name={mark} size={10} color="#FFFFFF" strokeWidth={3} />
          </View>
        )}
      </View>
      <AppText variant="caption" numberOfLines={1} style={[styles.personName, me && { fontWeight: '700' }]}>{me ? t('group.you') : p.username ?? p.displayName ?? ''}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { position: 'absolute', left: space.lg, right: space.lg, gap: space.xs },
  glass: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(20,12,8,0.35)', borderRadius: radii.lg, paddingLeft: 8, paddingRight: 4, paddingVertical: 6 },
  people: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  person: { alignItems: 'center', width: 52 },
  ring: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  mark: { position: 'absolute', right: -4, bottom: -4, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  personName: { color: '#FFFFFF', marginTop: 2, maxWidth: 52, textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 3 },
  chatBtn: { marginLeft: 4 },
  badge: { position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { color: '#FFFFFF', fontSize: 10, lineHeight: 12 },
  joinRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: 8, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth },
  feed: { maxHeight: 220 },
  msg: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  msgMine: { justifyContent: 'flex-end' },
  bubble: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: radii.md, maxWidth: '80%' },
  smileys: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: space.sm },
  smiley: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  words: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: space.md },
  word: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: radii.pill, borderWidth: 1 },
});
