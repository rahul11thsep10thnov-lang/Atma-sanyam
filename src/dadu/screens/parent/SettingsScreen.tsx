import React from 'react';
import { ScrollView, Switch, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDadu } from '../../state/DaduContext';
import { LANGS, ui, coverage } from '../../i18n';
import type { LanguageMode } from '../../i18n';
import { useAudio } from '../../audio/useAudio';
import { allowedSpeeds } from '../../audio/mixer';
import type { Speed } from '../../audio/mixer';
import { P, FONT } from '../../ui/palette';
import { BigButton, Body, Card, Chip, Heading, Row } from '../../ui';
import type { DaduStackParamList } from '../../navigation/types';
import { useSettings } from '../../../context/SettingsContext';

const MODES: LanguageMode[] = ['single', 'bilingual', 'compare', 'en-with-hi', 'hi-with-en'];
const SPEED_LABEL: Record<Speed, { en: string; hi: string }> = { verySlow: { en: 'Very slow', hi: 'बहुत धीमा' }, slow: { en: 'Slow', hi: 'धीमा' }, normal: { en: 'Normal', hi: 'सामान्य' }, fast: { en: 'Fast', hi: 'तेज़' }, veryFast: { en: 'Very fast', hi: 'बहुत तेज़' } };

/** Language, audio and accessibility. Behind the parental gate. */
export function SettingsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<DaduStackParamList>>();
  const { prefs, setPrefs, child, parent, setParent } = useDadu();
  const { mixer, update, speak } = useAudio(prefs.primary);
  const { settings, updateSettings } = useSettings();
  const hi = prefs.primary === 'hi';
  const cov = coverage();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: P.paper }} contentContainerStyle={{ paddingVertical: 14, paddingBottom: 60 }} testID="screen-settings">
      <View style={{ paddingHorizontal: 14 }}><Heading>{hi ? 'भाषा, ऑडियो और सुगम्यता' : 'Language, audio and accessibility'}</Heading></View>
      <Card><Heading size={16}>{hi ? 'भाषा' : 'Language'}</Heading>
        <Row style={{ paddingHorizontal: 0, marginTop: 8 }}>{LANGS.map((l) => <Chip key={l.id} label={`${l.native}${cov[l.id] < 1 ? ` · ${Math.round(cov[l.id] * 100)}%` : ''}`} selected={prefs.primary === l.id} onPress={() => setPrefs({ ...prefs, primary: l.id })} />)}</Row>
        <Body tone="soft" size={12} style={{ marginTop: 6 }}>{hi ? 'प्रतिशत बताता है कि उस भाषा का कितना अनुवाद तैयार है; बाकी अंग्रेज़ी में दिखेगा।' : 'The percentage is how much of that language is translated; the rest shows in English.'}</Body>
        <Row style={{ paddingHorizontal: 0, marginTop: 8 }}>{MODES.map((m) => <Chip key={m} label={{ single: hi ? 'एक भाषा' : 'Single', bilingual: hi ? 'द्विभाषी' : 'Bilingual', compare: hi ? 'तुलना' : 'Compare', 'en-with-hi': hi ? 'अंग्रेज़ी + हिंदी समझ' : 'English with Hindi help', 'hi-with-en': hi ? 'हिंदी + अंग्रेज़ी समझ' : 'Hindi with English help' }[m]} selected={prefs.mode === m} onPress={() => setPrefs({ ...prefs, mode: m, helper: m === 'single' ? undefined : prefs.helper ?? (prefs.primary === 'hi' ? 'en' : 'hi') })} />)}</Row></Card>
      <Card><Heading size={16}>{hi ? 'आवाज़ और संगीत' : 'Voice and music'}</Heading>
        <Row style={{ paddingHorizontal: 0, marginTop: 8, alignItems: 'center' }}><Body style={{ fontFamily: FONT.bodyBold }}>{hi ? 'म्यूट' : 'Mute'}</Body><Switch value={mixer.muted} onValueChange={(v) => update({ muted: v })} /></Row>
        <Row style={{ paddingHorizontal: 0, marginTop: 8, alignItems: 'center' }}><Body style={{ fontFamily: FONT.bodyBold }}>{hi ? 'कथन की गति' : 'Narration speed'}</Body>{allowedSpeeds(child?.band ?? 'A5').map((sp) => <Chip key={sp} label={SPEED_LABEL[sp][hi ? 'hi' : 'en']} selected={mixer.narrationSpeed === sp} onPress={() => update({ narrationSpeed: sp })} />)}</Row>
        {(['voice', 'music', 'ambience', 'sfx'] as const).map((bus) => <Row key={bus} style={{ paddingHorizontal: 0, marginTop: 8, alignItems: 'center' }}><Body style={{ fontFamily: FONT.bodyBold, width: 90 }}>{{ voice: hi ? 'आवाज़' : 'Voice', music: hi ? 'संगीत' : 'Music', ambience: hi ? 'परिवेश' : 'Ambience', sfx: hi ? 'प्रभाव' : 'Effects' }[bus]}</Body>{[0, 0.25, 0.5, 0.75, 1].map((v) => <Chip key={v} label={`${v * 100}%`} selected={mixer.volumes[bus] === v} onPress={() => update({ volumes: { ...mixer.volumes, [bus]: v } })} />)}</Row>)}
        <Row style={{ paddingHorizontal: 0, marginTop: 10 }}><BigButton kind="ghost" label={hi ? 'दादाजी की आवाज़ सुनें' : "Hear Dadaji's voice"} onPress={() => void speak(hi ? 'नमस्ते बेटा! मैं दादाजी हूँ।' : 'Namaste beta! I am Dadaji.', 'dadaji')} /></Row>
        <Body tone="soft" size={12} style={{ marginTop: 6 }}>{hi ? 'अभी डिवाइस की टेक्स्ट-टू-स्पीच आवाज़ पढ़ती है; रिकॉर्ड की हुई पात्र-आवाज़ें ऑडियो पैक के साथ आएँगी।' : 'The device text-to-speech reads lines for now; recorded character voices arrive with the audio packs.'}</Body></Card>
      <Card><Heading size={16}>{hi ? 'सुगम्यता' : 'Accessibility'}</Heading>
        <Row style={{ paddingHorizontal: 0, marginTop: 8, alignItems: 'center' }}><Body style={{ fontFamily: FONT.bodyBold }}>{hi ? 'कैप्शन' : 'Captions'}</Body><Switch value={mixer.captions} onValueChange={(v) => update({ captions: v })} /></Row>
        <Row style={{ paddingHorizontal: 0, marginTop: 8, alignItems: 'center' }}><Body style={{ fontFamily: FONT.bodyBold }}>{hi ? 'परिवेश ध्वनि बंद' : 'No ambient sound'}</Body><Switch value={mixer.reducedAudio} onValueChange={(v) => update({ reducedAudio: v })} /></Row>
        <Body tone="soft" size={12} style={{ marginTop: 6 }}>{hi ? 'कम एनिमेशन, बड़ा फ़ॉन्ट और उच्च कंट्रास्ट डिवाइस की सेटिंग से लिए जाते हैं।' : 'Reduced motion, larger text and high contrast follow the device settings.'}</Body></Card>
      <Card><Heading size={16}>{hi ? 'विश्लेषण' : 'Analytics'}</Heading>
        <Row style={{ paddingHorizontal: 0, marginTop: 8, alignItems: 'center' }}><Body style={{ flex: 1 }}>{hi ? 'गुमनाम उपयोग-आँकड़े (कोई नाम, फ़ोटो या सामग्री नहीं)' : 'Anonymous usage statistics (no names, photos or content)'}</Body><Switch value={settings.analyticsEnabled} onValueChange={(v) => void updateSettings({ analyticsEnabled: v })} /></Row></Card>
      <Card><Heading size={16}>Tame</Heading>
        <Row style={{ paddingHorizontal: 0, marginTop: 8, alignItems: 'center' }}><Body style={{ flex: 1 }}>{hi ? 'पुराना Tame फ़ोकस टाइमर दिखाएँ (केवल बड़ों के लिए)' : 'Show the earlier Tame focus timer (adults only)'}</Body><Switch value={parent.legacyTameVisible} onValueChange={(v) => setParent({ legacyTameVisible: v })} /></Row></Card>
      <Row style={{ marginTop: 8 }}><BigButton kind="ghost" label={ui('common.back', prefs)} onPress={() => nav.goBack()} /></Row>
    </ScrollView>
  );
}
