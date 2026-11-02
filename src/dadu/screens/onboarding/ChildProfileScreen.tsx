import React, { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useDadu } from '../../state/DaduContext';
import { ui, LANGS } from '../../i18n';
import type { LanguageMode } from '../../i18n';
import { AGE_BANDS } from '../../core/ageBands';
import type { AgeBand, Difficulty } from '../../core/ageBands';
import { P, FONT } from '../../ui/palette';
import { BigButton, Card, Chip, Heading, Body, Row } from '../../ui';
import type { DaduStackParamList } from '../../navigation/types';

const MODES: { key: LanguageMode; en: string; hi: string }[] = [
  { key: 'single', en: 'Single language', hi: 'एक भाषा' }, { key: 'bilingual', en: 'Bilingual', hi: 'द्विभाषी' }, { key: 'compare', en: 'Compare', hi: 'तुलना' },
  { key: 'en-with-hi', en: 'English with Hindi help', hi: 'अंग्रेज़ी, हिंदी समझ के साथ' }, { key: 'hi-with-en', en: 'Hindi with English help', hi: 'हिंदी, अंग्रेज़ी समझ के साथ' },
];

/** The parent creates or edits a child profile. Age band, never a date of birth. */
export function ChildProfileScreen() {
  const nav = useNavigation<NativeStackNavigationProp<DaduStackParamList>>();
  const route = useRoute<RouteProp<DaduStackParamList, 'ChildProfile'>>();
  const { prefs, setPrefs, profiles, addProfile, updateProfile } = useDadu();
  const editing = profiles.find((p) => p.id === route.params?.editId);
  const hi = prefs.primary === 'hi';
  const [name, setName] = useState(editing?.name ?? '');
  const [band, setBand] = useState<AgeBand>(editing?.band ?? 'A2');
  const [difficulty, setDifficulty] = useState<Difficulty>(editing?.difficulty ?? 'steady');
  const [mode, setMode] = useState<LanguageMode>(prefs.mode);
  const [helper, setHelper] = useState(prefs.helper ?? (prefs.primary === 'hi' ? 'en' : 'hi'));
  const [temple, setTemple] = useState(editing?.templeEnabled ?? false);
  const save = async () => {
    const nm = name.trim() || (hi ? 'चिंटू' : 'Chintu');
    setPrefs({ ...prefs, mode, helper: mode === 'single' ? undefined : helper });
    if (editing) updateProfile(editing.id, { name: nm, band, difficulty, templeEnabled: temple, language: prefs.primary });
    else await addProfile({ name: nm, band, difficulty, language: prefs.primary, helperLanguage: mode === 'single' ? undefined : helper, avatar: { skin: 'tan', hair: 'messy', top: 'yellow' }, templeEnabled: temple });
    nav.reset({ index: 0, routes: [{ name: 'Tabs' }] });
  };
  return (
    <ScrollView style={{ flex: 1, backgroundColor: P.paper }} contentContainerStyle={{ paddingVertical: 16, paddingBottom: 40 }} testID="screen-child-profile">
      <View style={{ paddingHorizontal: 14 }}><Heading>{hi ? 'बच्चे की प्रोफ़ाइल' : 'Child profile'}</Heading></View>
      <Card><Heading size={16}>{ui('onboarding.childName', prefs)}</Heading>
        <TextInput value={name} onChangeText={setName} placeholder={hi ? 'जैसे चिंटू' : 'for example Chintu'} style={s.input} maxLength={24} testID="child-name" accessibilityLabel="child name" /></Card>
      <Card><Heading size={16}>{ui('onboarding.ageBand', prefs)}</Heading>
        <Row style={{ paddingHorizontal: 0, marginTop: 8 }}>{AGE_BANDS.map((b) => <Chip key={b.key} label={hi ? b.label.hi : b.label.en} selected={band === b.key} onPress={() => setBand(b.key)} testID={`band-${b.key}`} />)}</Row>
        <Body tone="soft" size={12} style={{ marginTop: 6 }}>{hi ? '0–2: गोद मोड · 2–6: लिटिल मोड · 6–12: एक्सप्लोरर मोड। आयु अकेले क्षमता तय नहीं करती।' : '0–2 opens Lap mode, 2–6 Little mode, 6–12 Explorer mode. Age never judges ability on its own.'}</Body></Card>
      <Card><Heading size={16}>{ui('onboarding.difficulty', prefs)}</Heading>
        <Row style={{ paddingHorizontal: 0, marginTop: 8 }}>{(['gentle', 'steady', 'stretch'] as Difficulty[]).map((d) => <Chip key={d} label={ui(`difficulty.${d}`, prefs)} selected={difficulty === d} onPress={() => setDifficulty(d)} testID={`difficulty-${d}`} />)}</Row></Card>
      <Card><Heading size={16}>{hi ? 'भाषा मोड' : 'Language mode'}</Heading>
        <Row style={{ paddingHorizontal: 0, marginTop: 8 }}>{MODES.map((m) => <Chip key={m.key} label={hi ? m.hi : m.en} selected={mode === m.key} onPress={() => setMode(m.key)} />)}</Row>
        {(mode === 'bilingual' || mode === 'compare') && <Row style={{ paddingHorizontal: 0, marginTop: 8 }}>{LANGS.filter((l) => l.id !== prefs.primary).map((l) => <Chip key={l.id} label={l.native} selected={helper === l.id} onPress={() => setHelper(l.id)} />)}</Row>}</Card>
      <Card><Heading size={16}>{hi ? 'ज्ञान मंदिर (वैकल्पिक)' : 'Wisdom Temple (optional)'}</Heading>
        <Row style={{ paddingHorizontal: 0, marginTop: 8 }}><Chip label={ui('common.yes', prefs)} selected={temple} onPress={() => setTemple(true)} /><Chip label={ui('common.no', prefs)} selected={!temple} onPress={() => setTemple(false)} /></Row>
        <Body tone="soft" size={12} style={{ marginTop: 6 }}>{hi ? 'कथा, इतिहास और मान्यता अलग-अलग लेबल के साथ। 4 वर्ष से कम के लिए बंद रहता है।' : 'Stories, history and belief with separate labels. Stays off below age 4.'}</Body></Card>
      <Row style={{ marginTop: 8 }}><BigButton label={editing ? ui('common.save', prefs) : ui('onboarding.meet', prefs)} onPress={() => void save()} testID="child-save" /></Row>
    </ScrollView>
  );
}
const s = StyleSheet.create({ input: { fontFamily: FONT.display, fontSize: 20, color: P.indigo, borderWidth: 2, borderColor: P.line, borderRadius: 14, padding: 10, marginTop: 8, backgroundColor: P.paper } });
