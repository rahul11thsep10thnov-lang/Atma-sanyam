import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useDadu } from '../../state/DaduContext';
import { tx, ui } from '../../i18n';
import { useAudio } from '../../audio/useAudio';
import { catalog } from '../../content';
import { startAssignment, completeAssignment, effectiveTier, statusOf } from '../../engines/assignments';
import { badgeById } from '../../engines/rewards';
import { CharacterSprite } from '../../render';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { P, FONT } from '../../ui/palette';
import { BigButton, Body, Card, Chip, Heading, KeyPad, Row, SpeechBubble, Toast, useLittle } from '../../ui';
import type { DaduStackParamList } from '../../navigation/types';

const TIER: Record<string, [string, string, string]> = { self: ['On your own', 'अकेले', P.peepal], nearby: ['Adult nearby', 'बड़ा पास में', P.monsoon], assist: ['Adult helps', 'बड़ा मदद करे', P.saffron], together: ['Together with an adult', 'बड़े के साथ', P.clay] };

/** Dadaji's Real World Adventure: all eight parts, parent-confirmed completion, optional note and photo. */
export function AssignmentScreen() {
  const nav = useNavigation<NativeStackNavigationProp<DaduStackParamList>>();
  const route = useRoute<RouteProp<DaduStackParamList, 'Assignment'>>();
  const { child, world, prefs, parent, updateWorld, logEvent } = useDadu();
  const { speak } = useAudio(prefs.primary);
  const reduced = useReducedMotion();
  const little = useLittle();
  const a = catalog.assignmentById(route.params.assignmentId);
  const hi = prefs.primary === 'hi';
  const [confirming, setConfirming] = useState(false);
  const [entry, setEntry] = useState('');
  const [wrong, setWrong] = useState(false);
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [x, y] = useMemo(() => [3 + Math.floor(Math.random() * 7), 3 + Math.floor(Math.random() * 7)], []);
  if (!a || !child || !world) return <View style={s.center}><Body>{hi ? 'काम नहीं मिला।' : 'Adventure not found.'}</Body><Row style={{ marginTop: 10 }}><BigButton label={ui('common.back', prefs)} onPress={() => nav.goBack()} /></Row></View>;
  const status = statusOf(world, a.meta.id);
  const tier = effectiveTier(a, child.band);
  const photosAllowed = !!parent.photosAllowed[child.id];
  const badge = badgeById(a.badge);

  const onKey = (k: string) => {
    setWrong(false);
    const max = String(x * y).length;
    const v = k === '⌫' ? entry.slice(0, -1) : entry.length < max ? entry + k : entry;
    setEntry(v);
    if (v.length === max) {
      if (Number(v) === x * y) finish(); else { setWrong(true); setEntry(''); }
    }
  };
  const finish = () => {
    const r = completeAssignment(world, a, { parentConfirmed: true, note: note.trim() || undefined, photoId: photo ?? undefined, photosAllowed, now: Date.now() });
    if (r.error) { setToast(r.error === 'photo-not-allowed' ? (hi ? 'फ़ोटो की अनुमति नहीं है' : 'Photos are not allowed for this child') : r.error); return; }
    updateWorld(() => r.world);
    logEvent('activity');
    setConfirming(false);
    setToast(hi ? `पूरा हुआ! "${badge ? tx(badge.name, prefs) : a.badge}" बैज मिला` : `Done! Badge earned: ${badge ? tx(badge.name, prefs) : a.badge}`);
    void speak(hi ? 'शाबाश! असली दुनिया में सीखा।' : 'Shabash! Learned in the real world.', 'dadaji');
  };
  const attachPhoto = async () => {
    try {
      const Picker = await import('expo-image-picker');
      const res = await Picker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.5 });
      if (!res.canceled && res.assets[0]) setPhoto(res.assets[0].uri);
    } catch { setToast(hi ? 'फ़ोटो नहीं चुनी जा सकी' : 'Could not pick a photo'); }
  };

  const part = (label: string, body: React.ReactNode) => <View style={s.part}><Text style={s.partLabel}>{label}</Text><View style={{ flex: 1 }}>{body}</View></View>;

  return (
    <View style={{ flex: 1, backgroundColor: P.paper }} testID="screen-assignment">
      <ScrollView contentContainerStyle={{ paddingVertical: 12, paddingBottom: 60 }}>
        <View style={s.head}><CharacterSprite characterKey="dadaji" pose="wave" expression="happy" size={96} reducedMotion={reduced} /><View style={{ flex: 1 }}><Heading colour={P.peepal}>{tx(a.title, prefs)}</Heading><Row style={{ paddingHorizontal: 0, marginTop: 4 }}><Chip label={hi ? TIER[tier][1] : TIER[tier][0]} colour={TIER[tier][2]} /><Chip label={`${a.minutes} ${hi ? 'मिनट' : 'min'}`} />{status === 'completed' ? <Chip label={ui('rwa.done', prefs)} colour={P.peepal} /> : null}</Row></View></View>
        <SpeechBubble who="dadaji" text={tx(a.intro, prefs)} />
        <Card accent={P.peepal}>
          {part(hi ? 'लक्ष्य' : 'Objective', <Body>{tx(a.objective, prefs)}</Body>)}
          {part(hi ? 'निर्देश' : 'Instructions', <View>{a.instructions.map((i, k) => <Body key={k}>{k + 1}. {tx(i, prefs)}</Body>)}</View>)}
          {part(hi ? 'सामग्री' : 'Materials', <Body>{a.materials.map((m) => tx(m, prefs)).join(' · ')}</Body>)}
          {part(hi ? 'समय' : 'Duration', <Body>{a.minutes} {hi ? 'मिनट' : 'minutes'}</Body>)}
          {part(hi ? 'निगरानी' : 'Supervision', <Body>{hi ? TIER[tier][1] : TIER[tier][0]}</Body>)}
          {part(hi ? 'सुरक्षा' : 'Safety', <View>{a.safety.map((i, k) => <Body key={k} style={{ color: P.clay }}>• {tx(i, prefs)}</Body>)}</View>)}
          {part(hi ? 'पूरा कब' : 'Complete when', <Body>{tx(a.completion, prefs)}</Body>)}
          {part(hi ? 'सीख' : 'Outcome', <Body>{tx(a.outcome, prefs)}</Body>)}
        </Card>
        {status === 'available' ? <Row><BigButton kind="green" label={hi ? 'शुरू करो' : 'Start the adventure'} onPress={() => { updateWorld((w) => startAssignment(w, a, child.band)); void speak(tx(a.instructions[0], prefs), 'dadaji'); }} testID="assignment-start" /></Row> : null}
        {status === 'started' && !confirming ? (
          <Card>
            <Heading size={16}>{hi ? 'पूरा होने पर' : 'When it is done'}</Heading>
            <TextInput value={note} onChangeText={setNote} placeholder={hi ? 'वैकल्पिक टिप्पणी (अभिभावक)' : 'Optional note (parent)'} style={s.input} maxLength={280} multiline testID="assignment-note" />
            {photosAllowed ? <Row style={{ paddingHorizontal: 0, marginTop: 8 }}><BigButton kind="ghost" label={photo ? (hi ? 'फ़ोटो जुड़ी ✓' : 'Photo attached ✓') : (hi ? 'फ़ोटो जोड़ें (वैकल्पिक)' : 'Attach a photo (optional)')} onPress={() => void attachPhoto()} /></Row> : <Body tone="soft" size={12} style={{ marginTop: 6 }}>{hi ? 'फ़ोटो बंद है (अभिभावक डैशबोर्ड से चालू करें)। कभी चेहरा ज़रूरी नहीं।' : 'Photos are off (enable in the parent dashboard). A face is never required.'}</Body>}
            <Body tone="soft" size={12} style={{ marginTop: 6 }}>{hi ? 'फ़ोटो केवल इसी डिवाइस पर रहती है।' : 'A photo stays only on this device.'}</Body>
            <Row style={{ paddingHorizontal: 0, marginTop: 10 }}><BigButton label={ui('rwa.markDone', prefs)} onPress={() => setConfirming(true)} testID="assignment-complete" /></Row>
          </Card>
        ) : null}
        {confirming ? (
          <Card accent={P.indigo}><View style={{ alignItems: 'center', gap: 6 }}>
            <Heading size={16}>{ui('parent.gate', prefs)}</Heading>
            <Body tone="soft">{ui('parent.gateQuestion', prefs, { a: x, b: y })}</Body>
            <Text style={s.entry}>{entry || ' '}</Text>
            <KeyPad onKey={onKey} />
            {wrong ? <Body style={{ color: P.clay }}>{ui('parent.gateWrong', prefs)}</Body> : null}
            <Row style={{ paddingHorizontal: 0, marginTop: 6 }}><BigButton kind="ghost" label={ui('common.cancel', prefs)} onPress={() => { setConfirming(false); setEntry(''); }} /></Row>
          </View></Card>
        ) : null}
        {status === 'completed' ? (
          <Card accent={P.ok}><View style={{ alignItems: 'center', gap: 6 }}><Heading size={18} colour={P.ok}>{ui('rwa.done', prefs)}</Heading>{badge ? <Body style={{ fontFamily: FONT.bodyBold }}>{tx(badge.name, prefs)}</Body> : null}{world.assignments[a.meta.id]?.note ? <Body tone="soft" size={13}>“{world.assignments[a.meta.id]?.note}”</Body> : null}<Row style={{ paddingHorizontal: 0, marginTop: 6 }}><BigButton kind="ghost" label={ui('common.back', prefs)} onPress={() => nav.goBack()} /></Row></View></Card>
        ) : null}
        {!little && a.lesson && catalog.lessonById(a.lesson) ? <Row style={{ marginTop: 8 }}><BigButton kind="ghost" label={hi ? 'जुड़ा पाठ खोलें' : 'Open the linked lesson'} onPress={() => nav.navigate('Lesson', { lessonId: a.lesson! })} /></Row> : null}
      </ScrollView>
      <Toast text={toast} />
    </View>
  );
}
const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: P.paper, alignItems: 'center', justifyContent: 'center', padding: 20 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  part: { flexDirection: 'row', gap: 10, paddingVertical: 6, borderTopWidth: 1, borderTopColor: P.line },
  partLabel: { fontFamily: FONT.displayHeavy, color: P.indigo, width: 92, fontSize: 13 },
  input: { fontFamily: FONT.body, fontSize: 15, color: P.ink, borderWidth: 2, borderColor: P.line, borderRadius: 14, padding: 10, marginTop: 8, minHeight: 60, backgroundColor: P.paper },
  entry: { fontFamily: FONT.display, fontSize: 30, letterSpacing: 8, color: P.indigo, minHeight: 44 },
});
