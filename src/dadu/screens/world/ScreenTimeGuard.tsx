// Screen-time guard: wind-down banner, break reminder, time-up and bedtime
// cards. It overlays; it never unmounts what is underneath, so a lesson in
// progress keeps its state and the provider keeps saving.
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDadu } from '../../state/DaduContext';
import { ui } from '../../i18n';
import { decide, DEFAULT_RULES } from '../../engines';
import type { ScreenDecision } from '../../engines';
import { CharacterSprite } from '../../render';
import { P, FONT } from '../../ui/palette';
import { BigButton, Body, Heading, Row } from '../../ui';
import type { DaduStackParamList } from '../../navigation/types';

export function ScreenTimeGuard({ children }: { children: React.ReactNode }) {
  const nav = useNavigation<NativeStackNavigationProp<DaduStackParamList>>();
  const { child, parent, prefs, minutesToday } = useDadu();
  const [decision, setDecision] = useState<ScreenDecision | null>(null);
  const [breakLeft, setBreakLeft] = useState<number | null>(null);
  const [override, setOverride] = useState(0);
  const lastBreak = useRef(Date.now());
  const hi = prefs.primary === 'hi';

  useEffect(() => {
    if (!child) return;
    const tick = () => {
      const stored = parent.limits[child.id];
      const base = DEFAULT_RULES[child.band];
      const rules = stored ? { dailyMinutes: stored.dailyMinutes, bedtime: stored.bedtime, breakEveryMinutes: stored.breakEveryMinutes } : base;
      const used = Math.max(0, minutesToday() - override);
      setDecision(decide(rules, used, (Date.now() - lastBreak.current) / 60_000, Date.now()));
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [child, parent.limits, minutesToday, override]);

  useEffect(() => {
    if (breakLeft === null) return;
    if (breakLeft <= 0) { lastBreak.current = Date.now(); setBreakLeft(null); setDecision((d) => (d ? { ...d, breakDue: false } : d)); return; }
    const t = setTimeout(() => setBreakLeft(breakLeft - 1), 1000);
    return () => clearTimeout(t);
  }, [breakLeft]);

  const blocked = decision && (decision.timeUp || decision.bedtime);
  return (
    <View style={{ flex: 1 }}>
      {children}
      {decision?.windDown && !blocked && (
        <View style={s.banner} accessibilityLiveRegion="polite"><Text style={s.bannerText}>{ui('parent.windDown', prefs, { m: decision.remainingMinutes ?? 0 })}</Text></View>
      )}
      {decision?.breakDue && !blocked && (
        <View style={s.cardWrap} testID="break-reminder">
          <View style={s.card}>
            <CharacterSprite characterKey="dadaji" size={120} pose="wave" expression="happy" />
            <Heading size={20}>{ui('parent.breakReminder', prefs)}</Heading>
            {breakLeft !== null ? <Text style={s.count}>{breakLeft}</Text> : <Row style={{ paddingHorizontal: 0, marginTop: 10 }}><BigButton label={hi ? 'एक मिनट का ब्रेक' : 'One-minute stretch'} onPress={() => setBreakLeft(60)} testID="break-start" /></Row>}
          </View>
        </View>
      )}
      {blocked && (
        <View style={[s.cardWrap, { backgroundColor: decision.bedtime ? 'rgba(27,33,66,.92)' : 'rgba(58,46,42,.75)' }]} testID="time-up">
          <View style={s.card}>
            <CharacterSprite characterKey="dadaji" size={140} pose={decision.bedtime ? 'sleep' : 'sit'} expression={decision.bedtime ? 'sleepy' : 'happy'} />
            <Heading size={20}>{decision.bedtime ? (hi ? 'सोने का समय, बेटा। कल सुबह मिलते हैं।' : 'Bedtime, beta. See you in the morning.') : ui('parent.timeUp', prefs)}</Heading>
            <Body tone="soft" style={{ textAlign: 'center' }}>{hi ? 'सारी प्रगति सहेज ली गई है।' : 'All your progress is saved.'}</Body>
            <Row style={{ paddingHorizontal: 0, marginTop: 10 }}><BigButton kind="ghost" label={hi ? 'अभिभावक: 15 मिनट और' : 'Parent: 15 more minutes'} onPress={() => { nav.navigate('ParentGate', { next: 'Tabs' }); setOverride((o) => o + 15); }} testID="parent-override" /></Row>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  banner: { position: 'absolute', top: 40, left: 14, right: 14, backgroundColor: P.saffron, borderRadius: 18, padding: 10, alignItems: 'center' },
  bannerText: { fontFamily: FONT.display, fontSize: 14, color: '#2A1A05' },
  cardWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(58,46,42,.55)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: P.paper, borderRadius: 28, padding: 20, alignItems: 'center', gap: 8, width: '100%', maxWidth: 420 },
  count: { fontFamily: FONT.displayHeavy, fontSize: 56, color: P.indigo },
});
