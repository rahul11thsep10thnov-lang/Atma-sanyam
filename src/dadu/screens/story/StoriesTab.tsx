import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDadu } from '../../state/DaduContext';
import { tx, ui } from '../../i18n';
import { catalog } from '../../content';
import { isBedtimeHour } from '../../engines/stories';
import { P, FONT } from '../../ui/palette';
import { BigButton, Card, Chip, Heading, Body, Row, SpeechBubble, useLittle } from '../../ui';
import { CharacterSprite } from '../../render';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import type { DaduStackParamList } from '../../navigation/types';

const RIGHTS_LABEL: Record<string, [string, string, string]> = {
  traditional: ['Traditional', 'पारंपरिक', P.peepal], 'public-domain': ['Public domain', 'सार्वजनिक', P.peepal], original: ['DADU original', 'DADU मूल', P.monsoon], pending: ['Licence pending', 'लाइसेंस लंबित', P.saffron],
};

/** Dadaji's Story Corner. */
export function StoriesTab() {
  const nav = useNavigation<NativeStackNavigationProp<DaduStackParamList>>();
  const { child, world, prefs } = useDadu();
  const little = useLittle();
  const reduced = useReducedMotion();
  const hi = prefs.primary === 'hi';
  const band = child?.band ?? 'A3';
  const stories = catalog.storiesForBand(band);
  const bedtime = isBedtimeHour(Date.now());
  return (
    <ScrollView style={{ flex: 1, backgroundColor: P.paper }} contentContainerStyle={{ paddingVertical: 12, paddingBottom: 40 }} testID="screen-stories">
      <View style={s.head}><CharacterSprite characterKey="dadaji" pose="sit" expression="happy" size={96} reducedMotion={reduced} /><View style={{ flex: 1 }}><Heading>{hi ? 'दादाजी की कहानियाँ' : "Dadaji's Story Corner"}</Heading><Body tone="soft" size={13}>{hi ? `${world?.storiesRead.length ?? 0} कहानियाँ पढ़ीं` : `${world?.storiesRead.length ?? 0} stories read`}</Body></View></View>
      <SpeechBubble who="dadaji" text={bedtime ? (hi ? 'रात हो गई, बेटा। एक सोने की कहानी?' : 'It is night, beta. A bedtime story?') : (hi ? 'कौन-सी कहानी सुनें आज?' : 'Which story shall we read today?')} />
      {stories.map((st) => {
        const read = world?.storiesRead.includes(st.meta.id);
        const coll = catalog.COLLECTIONS.find((c) => c.key === st.collection);
        return (
          <Card key={st.meta.id} accent={read ? P.ok : undefined}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1 }}><Text style={s.title}>{read ? '✓ ' : ''}{tx(st.title, prefs)}</Text><Body tone="soft" size={12}>{coll ? tx(coll.name, prefs) : st.collection} · {st.pages.length} {hi ? 'पन्ने' : 'pages'}</Body></View>
            </View>
            <Row style={{ paddingHorizontal: 0, marginTop: 8 }}>
              <BigButton label={hi ? 'पढ़ो' : 'Read'} onPress={() => nav.navigate('Story', { storyId: st.meta.id })} testID={`story-read-${st.meta.id}`} />
              <BigButton kind="ghost" label={hi ? 'सोने की कहानी' : 'Bedtime'} onPress={() => nav.navigate('Story', { storyId: st.meta.id, bedtime: true })} testID="story-bedtime" />
            </Row>
          </Card>
        );
      })}
      {!little ? (
        <>
          <View style={{ paddingHorizontal: 14, marginTop: 10 }}><Heading size={17}>{hi ? 'संग्रह' : 'Collections'}</Heading></View>
          <Card>
            {catalog.COLLECTIONS.map((c) => { const r = RIGHTS_LABEL[c.rights]; const n = catalog.STORIES.filter((x) => x.collection === c.key).length; return (
              <View key={c.key} style={s.row}><View style={{ flex: 1 }}><Text style={s.collName}>{tx(c.name, prefs)}</Text><Body tone="soft" size={12}>{tx(c.note, prefs)}{n ? ` · ${n}` : ''}</Body></View><Chip label={hi ? r[1] : r[0]} colour={r[2]} /></View>); })}
          </Card>
        </>
      ) : null}
      <Body tone="soft" size={12} style={{ paddingHorizontal: 18, marginTop: 6 }}>{(hi ? 'पढ़ते समय वाक्य हाइलाइट होता है। सोने की कहानी में सवाल नहीं पूछे जाते।' : 'The sentence being read is highlighted. Bedtime stories ask no questions.')}</Body>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  title: { fontFamily: FONT.displayHeavy, fontSize: 16, color: P.indigo },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: P.line },
  collName: { fontFamily: FONT.display, fontSize: 14, color: P.ink },
});
