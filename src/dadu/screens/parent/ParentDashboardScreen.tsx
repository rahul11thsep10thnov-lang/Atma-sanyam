import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import { useDadu } from '../../state/DaduContext';
import { ui } from '../../i18n';
import { SECTIONS } from '../../core/worlds';
import { AGE_BANDS } from '../../core/ageBands';
import type { Difficulty } from '../../core/ageBands';
import { masteryState } from '../../engines/mastery';
import { catalog } from '../../content';
import { P, FONT } from '../../ui/palette';
import { BigButton, Body, Card, Chip, Heading, Progress, Row } from '../../ui';
import type { DaduStackParamList } from '../../navigation/types';
import { useAuth } from '../../../context/AuthContext';
import { isBackendConfigured } from '../../../config/env';
import { daduApi } from '../../api/client';
import { persistence } from '../../state/persistence';

const LIMITS: (number | 'none')[] = [15, 30, 45, 60, 'none'];

export function ParentDashboardScreen() {
  const nav = useNavigation<NativeStackNavigationProp<DaduStackParamList>>();
  const { prefs, profiles, child, world, usage, parent, setParent, selectChild, updateProfile, removeProfile, wipeAll, minutesToday } = useDadu();
  const auth = useAuth();
  const hi = prefs.primary === 'hi';
  const [confirmDelete, setConfirmDelete] = useState<null | 'child' | 'all'>(null);
  const [busy, setBusy] = useState(false);
  if (!child || !world) {
    return <View style={s.empty}><Heading>{ui('parent.dashboard', prefs)}</Heading><Row style={{ marginTop: 12 }}><BigButton label={hi ? 'बच्चा जोड़ें' : 'Add a child'} onPress={() => nav.navigate('ChildProfile')} /></Row></View>;
  }
  const limit = parent.limits[child.id] ?? { dailyMinutes: 30, bedtime: '20:30', breakEveryMinutes: 20 };
  const setLimit = (patch: Partial<typeof limit>) => setParent({ limits: { ...parent.limits, [child.id]: { ...limit, ...patch } } });
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; return { key, label: (hi ? ['र', 'सो', 'मं', 'बु', 'गु', 'शु', 'श'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S'])[d.getDay()], minutes: usage.days[key] ?? 0 }; });
  const max = Math.max(30, ...days.map((d) => d.minutes));
  const mastery = Object.values(world.mastery);
  const buckets = { mastered: mastery.filter((m) => masteryState(m.score) === 'mastered').length, practising: mastery.filter((m) => ['developing', 'secure'].includes(masteryState(m.score))).length, revise: mastery.filter((m) => ['emerging', 'fading', 'new'].includes(masteryState(m.score))).length };
  const sessions = usage.sessions.slice(-7);
  const todayMin = minutesToday();

  const deleteChild = async () => { setBusy(true); if (isBackendConfigured && auth.status === 'signedIn') { try { await daduApi.children.remove(child.id); } catch { /* offline: local delete still happens */ } } await removeProfile(child.id); setBusy(false); setConfirmDelete(null); };
  const deleteAll = async () => { setBusy(true); if (isBackendConfigured && auth.status === 'signedIn') { try { await daduApi.deleteAllData(); } catch { /* ignore */ } } await wipeAll(); setBusy(false); setConfirmDelete(null); nav.reset({ index: 0, routes: [{ name: 'Language' }] }); };
  const exportData = async () => {
    const payload = { exportedAt: new Date().toISOString(), child: { ...child }, world, usage: await persistence.loadUsage(child.id) };
    const text = JSON.stringify(payload, null, 2);
    const { Share } = await import('react-native');
    try { await Share.share({ message: text, title: `DADU export ${child.name}` }); } catch { /* user cancelled */ }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: P.paper }} contentContainerStyle={{ paddingVertical: 14, paddingBottom: 60 }} testID="screen-parent-dashboard">
      <View style={{ paddingHorizontal: 14 }}><Heading>{ui('parent.dashboard', prefs)}</Heading></View>
      <Row style={{ marginTop: 6 }}>{profiles.map((p) => <Chip key={p.id} label={`${p.name} · ${AGE_BANDS.find((b) => b.key === p.band)?.label[hi ? 'hi' : 'en']}`} selected={p.id === child.id} onPress={() => void selectChild(p.id)} testID={`child-${p.id}`} />)}{profiles.length < 5 && <Chip label={hi ? '+ बच्चा जोड़ें' : '+ Add child'} onPress={() => nav.navigate('ChildProfile')} />}</Row>

      <Card><Heading size={17}>{ui('parent.screenTime', prefs)}</Heading>
        <Row style={{ paddingHorizontal: 0, alignItems: 'center', marginVertical: 6, flexWrap: 'nowrap' }}><Body style={{ fontFamily: FONT.bodyBold }}>{todayMin} / {limit.dailyMinutes === 'none' ? '∞' : limit.dailyMinutes} {hi ? 'मिनट' : 'min'}</Body><View style={{ flex: 1 }}><Progress value={limit.dailyMinutes === 'none' ? 0 : todayMin / limit.dailyMinutes} colour={P.saffron} /></View></Row>
        <Row style={{ paddingHorizontal: 0 }}>{LIMITS.map((m) => <Chip key={String(m)} label={m === 'none' ? (hi ? 'कोई सीमा नहीं' : 'No limit') : `${m} ${hi ? 'मि' : 'min'}`} selected={limit.dailyMinutes === m} onPress={() => setLimit({ dailyMinutes: m })} testID={`limit-${m}`} />)}</Row>
        <Body tone="soft" size={12} style={{ marginTop: 6 }}>{hi ? 'सीमा से 5 मिनट पहले दादाजी समेटना शुरू करते हैं; प्रगति हमेशा सहेजी जाती है। समय कभी पुरस्कार या दंड नहीं है।' : 'Dadaji starts winding down 5 minutes before the limit; progress is always saved. Time is never a reward or a punishment.'}</Body>
        <Row style={{ paddingHorizontal: 0, marginTop: 8, alignItems: 'center' }}><Body style={{ fontFamily: FONT.bodyBold }}>{ui('parent.bedtime', prefs)}</Body>{['19:30', '20:00', '20:30', '21:00', null].map((b) => <Chip key={String(b)} label={b ?? (hi ? 'बंद' : 'Off')} selected={limit.bedtime === b} onPress={() => setLimit({ bedtime: b })} />)}</Row>
        <Row style={{ paddingHorizontal: 0, marginTop: 8, alignItems: 'center' }}><Body style={{ fontFamily: FONT.bodyBold }}>{hi ? 'ब्रेक हर' : 'Break every'}</Body>{[15, 20, 30].map((b) => <Chip key={b} label={`${b} ${hi ? 'मि' : 'min'}`} selected={limit.breakEveryMinutes === b} onPress={() => setLimit({ breakEveryMinutes: b })} />)}</Row>
      </Card>

      <Card><Heading size={17}>{hi ? 'इस हफ़्ते' : 'This week'}</Heading>
        <Svg viewBox="0 0 300 90" width="100%" height={100} accessibilityLabel="screen time by day">
          {days.map((d, i) => <Rect key={d.key} x={12 + i * 42} y={70 - (d.minutes / max) * 60} width={24} height={(d.minutes / max) * 60} rx={4} fill={P.peepal} />)}
          {days.map((d, i) => <SvgText key={d.key + 'l'} x={24 + i * 42} y={84} fontSize={10} fill={P.inkSoft} textAnchor="middle">{d.label}</SvgText>)}
          <Line x1={8} y1={70} x2={292} y2={70} stroke={P.line} />
        </Svg>
        <Body tone="soft" size={12}>{hi ? `${sessions.reduce((a, x) => a + x.lessons, 0)} पाठ · ${sessions.reduce((a, x) => a + x.stories, 0)} कहानियाँ · ${sessions.reduce((a, x) => a + x.activities, 0)} गतिविधियाँ (हाल के सत्र)` : `${sessions.reduce((a, x) => a + x.lessons, 0)} lessons · ${sessions.reduce((a, x) => a + x.stories, 0)} stories · ${sessions.reduce((a, x) => a + x.activities, 0)} activities (recent sessions)`}</Body></Card>

      <Card><Heading size={17}>{hi ? 'विषयवार प्रगति' : 'Progress by section'}</Heading>
        {SECTIONS.map((sec) => { const total = catalog.lessonsBySection(sec.key).length; const done = world.lessonsCompleted.filter((id) => catalog.lessonById(id)?.meta.section === sec.key).length; return (
          <View key={sec.key} style={{ marginTop: 8 }}><Row style={{ paddingHorizontal: 0, justifyContent: 'space-between' }}><Body style={{ fontFamily: FONT.bodyBold }}>{hi ? sec.name.hi : sec.name.en}</Body><Body tone="soft">{done}/{total}</Body></Row><Progress value={total ? done / total : 0} colour={sec.colour} /></View>); })}
        <Row style={{ paddingHorizontal: 0, marginTop: 10 }}><Chip label={`${hi ? 'महारत' : 'Mastered'} ${buckets.mastered}`} colour={P.peepal} /><Chip label={`${hi ? 'अभ्यास' : 'Practising'} ${buckets.practising}`} colour={P.saffron} /><Chip label={`${hi ? 'दोहराव चाहिए' : 'Needs revision'} ${buckets.revise}`} colour={P.clay} /></Row>
        <Body tone="soft" size={12} style={{ marginTop: 6 }}>{hi ? `${world.storiesRead.length} कहानियाँ पढ़ीं · ${Object.values(world.assignments).filter((a) => a.status === 'completed').length} असली दुनिया के काम पूरे` : `${world.storiesRead.length} stories read · ${Object.values(world.assignments).filter((a) => a.status === 'completed').length} real-world adventures completed`}</Body></Card>

      <Card><Heading size={17}>{hi ? 'सेटिंग' : 'Settings for'} {child.name}</Heading>
        <Row style={{ paddingHorizontal: 0, marginTop: 8, alignItems: 'center' }}><Body style={{ fontFamily: FONT.bodyBold }}>{ui('onboarding.difficulty', prefs)}</Body>{(['gentle', 'steady', 'stretch'] as Difficulty[]).map((d) => <Chip key={d} label={ui(`difficulty.${d}`, prefs)} selected={child.difficulty === d} onPress={() => updateProfile(child.id, { difficulty: d })} />)}</Row>
        <Row style={{ paddingHorizontal: 0, marginTop: 8, alignItems: 'center' }}><Body style={{ fontFamily: FONT.bodyBold }}>{hi ? 'ज्ञान मंदिर' : 'Wisdom Temple'}</Body><Chip label={ui('common.yes', prefs)} selected={child.templeEnabled} onPress={() => updateProfile(child.id, { templeEnabled: true })} /><Chip label={ui('common.no', prefs)} selected={!child.templeEnabled} onPress={() => updateProfile(child.id, { templeEnabled: false })} /></Row>
        <Row style={{ paddingHorizontal: 0, marginTop: 8, alignItems: 'center' }}><Body style={{ fontFamily: FONT.bodyBold }}>{hi ? 'कामों में फ़ोटो' : 'Photos in adventures'}</Body><Chip label={ui('common.yes', prefs)} selected={!!parent.photosAllowed[child.id]} onPress={() => setParent({ photosAllowed: { ...parent.photosAllowed, [child.id]: true } })} /><Chip label={ui('common.no', prefs)} selected={!parent.photosAllowed[child.id]} onPress={() => setParent({ photosAllowed: { ...parent.photosAllowed, [child.id]: false } })} /></Row>
        <Row style={{ marginTop: 10, paddingHorizontal: 0 }}><BigButton kind="ghost" label={hi ? 'प्रोफ़ाइल बदलें' : 'Edit profile'} onPress={() => nav.navigate('ChildProfile', { editId: child.id })} /><BigButton kind="ghost" label={hi ? 'भाषा और ऑडियो' : 'Language and audio'} onPress={() => nav.navigate('Settings')} /></Row></Card>

      <Card accent={P.clay}><Heading size={17} colour={P.clay}>{hi ? 'निजता और डेटा' : 'Privacy and data'}</Heading>
        <Body tone="soft" size={12}>{hi ? `सहमति दी गई: ${parent.consentAt ? new Date(parent.consentAt).toLocaleDateString() : '—'} (संस्करण ${parent.consentVersion}). ${isBackendConfigured ? (auth.status === 'signedIn' ? 'खाते से समन्वय चालू।' : 'साइन-इन नहीं: सब कुछ इसी डिवाइस पर।') : 'कोई सर्वर नहीं: सब कुछ इसी डिवाइस पर।'}` : `Consent given: ${parent.consentAt ? new Date(parent.consentAt).toLocaleDateString() : '—'} (version ${parent.consentVersion}). ${isBackendConfigured ? (auth.status === 'signedIn' ? 'Sync with your account is on.' : 'Not signed in: everything stays on this device.') : 'No server: everything stays on this device.'}`}</Body>
        <Row style={{ paddingHorizontal: 0, marginTop: 10 }}><BigButton kind="ghost" label={hi ? 'डेटा निर्यात' : 'Export data'} onPress={() => void exportData()} /><BigButton kind="ghost" label={hi ? 'यह बच्चा हटाएँ' : 'Delete this child'} onPress={() => setConfirmDelete('child')} /></Row>
        <Row style={{ paddingHorizontal: 0, marginTop: 10 }}><BigButton kind="danger" label={hi ? 'सारा DADU डेटा हटाएँ' : 'Delete all DADU data'} onPress={() => setConfirmDelete('all')} /></Row>
        {confirmDelete && <View style={{ marginTop: 10 }}><Body style={{ fontFamily: FONT.bodyBold }}>{confirmDelete === 'child' ? (hi ? `${child.name} की सारी प्रगति हटेगी। पक्का?` : `All of ${child.name}'s progress will be deleted. Are you sure?`) : (hi ? 'सभी प्रोफ़ाइल, प्रगति और सेटिंग हटेंगी। पक्का?' : 'Every profile, all progress and settings will be deleted. Are you sure?')}</Body>
          <Row style={{ paddingHorizontal: 0, marginTop: 8 }}><BigButton kind="ghost" label={ui('common.cancel', prefs)} onPress={() => setConfirmDelete(null)} /><BigButton kind="danger" label={ui('common.yes', prefs)} disabled={busy} onPress={() => void (confirmDelete === 'child' ? deleteChild() : deleteAll())} testID="confirm-delete" /></Row></View>}
      </Card>
      {parent.legacyTameVisible || true ? <Card><Text style={{ fontFamily: FONT.body, color: P.inkSoft, fontSize: 12 }}>{hi ? 'पुराना Tame फ़ोकस टाइमर इस ऐप में सुरक्षित रखा गया है और Settings से खोला जा सकता है।' : 'The earlier Tame focus timer is preserved inside this app and can be opened from Settings.'}</Text></Card> : null}
    </ScrollView>
  );
}
const s = StyleSheet.create({ empty: { flex: 1, backgroundColor: P.paper, padding: 20, justifyContent: 'center' } });
