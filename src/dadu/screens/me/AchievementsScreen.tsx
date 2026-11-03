import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDadu } from '../../state/DaduContext';
import { tx, ui } from '../../i18n';
import { SECTIONS } from '../../core/worlds';
import { LOCATION_BY_ID } from '../../core/locations';
import { BADGES, DECORATIONS, canAfford, certificateFor, purchaseDecoration } from '../../engines';
import { catalog } from '../../content';
import { P, FONT } from '../../ui/palette';
import { BigButton, Body, Card, Chip, Heading, Row, Toast } from '../../ui';
import type { DaduStackParamList } from '../../navigation/types';

export function AchievementsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<DaduStackParamList>>();
  const { child, world, prefs, updateWorld } = useDadu();
  const [toast, setToast] = useState<string | null>(null);
  const hi = prefs.primary === 'hi';
  if (!child || !world) return null;
  const certs = SECTIONS.map((sec) => { const all = catalog.lessonsForBand(child.band, sec.key); const done = all.filter((l) => world.lessonsCompleted.includes(l.meta.id)).length; return { sec, cert: certificateFor(sec.key, done, all.length), done, total: all.length }; });
  const buy = (id: string) => { if (!canAfford(world, id)) { setToast(hi ? 'अभी इतने सिक्के नहीं। पाठ और काम से सिक्के मिलते हैं।' : 'Not enough coins yet. Lessons and adventures earn coins.'); } else { updateWorld((w) => purchaseDecoration(w, id)); setToast(hi ? 'खरीदा! अपनी दुनिया में देखो।' : 'Bought! Look for it in your world.'); } setTimeout(() => setToast(null), 2200); };
  return (
    <View style={{ flex: 1, backgroundColor: P.paper }}>
      <ScrollView contentContainerStyle={{ paddingTop: 44, paddingBottom: 30 }} testID="screen-achievements">
        <View style={{ paddingHorizontal: 14 }}><Heading>{hi ? 'मेरी उपलब्धियाँ' : 'My Achievements'}</Heading></View>
        <Row style={{ marginTop: 6 }}><Chip label={`★ ${world.rewards.stars}`} /><Chip label={`◎ ${world.rewards.coins}`} /></Row>
        <Card><Body style={{ fontFamily: FONT.bodyBold }}>{ui('rewards.badges', prefs)}</Body>
          <View style={s.grid}>{BADGES.map((b) => { const on = world.rewards.badges.includes(b.id); return <View key={b.id} style={[s.badge, !on && s.locked]} accessibilityLabel={`${tx(b.name, prefs)}: ${tx(b.how, prefs)}`}><Body style={{ fontFamily: FONT.bodyBold, textAlign: 'center' }} size={13}>{on ? '🏅 ' : ''}{tx(b.name, prefs)}</Body><Body tone="soft" size={11} style={{ textAlign: 'center' }}>{tx(b.how, prefs)}</Body></View>; })}</View></Card>
        <Card><Body style={{ fontFamily: FONT.bodyBold }}>{hi ? 'प्रमाणपत्र' : 'Certificates'}</Body>
          {certs.map((c) => <Row key={c.sec.key} style={{ paddingHorizontal: 0, marginTop: 8, justifyContent: 'space-between', alignItems: 'center' }}><Body>{hi ? c.sec.name.hi : c.sec.name.en}</Body><Chip label={c.cert ? (hi ? 'प्राप्त' : 'Earned') : `${c.done}/${c.total}`} colour={c.cert ? P.peepal : undefined} /></Row>)}</Card>
        <Card><Body style={{ fontFamily: FONT.bodyBold }}>{hi ? 'अपनी दुनिया सजाओ' : 'Decorate your world'}</Body><Body tone="soft" size={12}>{hi ? 'सिक्के सीखने और कोशिश से मिलते हैं; कोई भाग्य-यंत्र नहीं।' : 'Coins come from learning and effort; nothing is left to chance.'}</Body>
          {DECORATIONS.map((d) => { const owned = world.decorations.includes(d.id); return (
            <Row key={d.id} style={{ paddingHorizontal: 0, marginTop: 8, alignItems: 'center', flexWrap: 'nowrap' }}>
              <View style={{ flex: 1 }}><Body style={{ fontFamily: FONT.bodyBold }}>{tx(d.name, prefs)}</Body><Body tone="soft" size={11}>{d.place === 'avatar' ? (hi ? 'अवतार' : 'Avatar') : d.place === 'app' ? (hi ? 'थीम' : 'Theme') : (LOCATION_BY_ID[d.place] ? (hi ? LOCATION_BY_ID[d.place].name.hi : LOCATION_BY_ID[d.place].name.en) : d.place)}</Body></View>
              {owned ? <Chip label={hi ? 'तुम्हारा' : 'Yours'} colour={P.peepal} /> : <Chip label={`◎ ${d.price}`} onPress={() => buy(d.id)} testID={`buy-${d.id}`} />}
            </Row>); })}</Card>
        <Row style={{ marginTop: 10 }}><BigButton kind="ghost" label={ui('common.back', prefs)} onPress={() => nav.goBack()} /></Row>
      </ScrollView>
      <Toast text={toast} />
    </View>
  );
}
const s = StyleSheet.create({ grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }, badge: { width: '47%', flexGrow: 1, backgroundColor: P.card, borderWidth: 2, borderColor: P.line, borderRadius: 16, padding: 8 }, locked: { opacity: 0.45 } });
