import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDadu } from '../../state/DaduContext';
import { ui } from '../../i18n';
import { P, FONT } from '../../ui/palette';
import { BigButton, Card, Heading, Body, KeyPad, Row } from '../../ui';
import { hashPin } from '../../state/persistence';
import type { DaduStackParamList } from '../../navigation/types';

/** A grown-up consents (DPDP) and sets the parent PIN before any child profile exists. */
export function ParentSetupScreen() {
  const nav = useNavigation<NativeStackNavigationProp<DaduStackParamList>>();
  const { prefs, parent, setParent } = useDadu();
  const [consent, setConsent] = useState(!!parent.consentAt);
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [stage, setStage] = useState<'pin' | 'confirm'>('pin');
  const [error, setError] = useState<string | null>(null);
  const hi = prefs.primary === 'hi';

  const onKey = (k: string) => {
    const set = stage === 'pin' ? setPin : setConfirm;
    const cur = stage === 'pin' ? pin : confirm;
    if (k === '⌫') set(cur.slice(0, -1)); else if (cur.length < 4) set(cur + k);
    setError(null);
  };
  const canContinue = consent && (stage === 'pin' ? pin.length === 4 : confirm.length === 4);
  const next = async () => {
    if (stage === 'pin') { setStage('confirm'); return; }
    if (confirm !== pin) { setError(hi ? 'दोनों पिन अलग हैं। फिर से।' : 'The PINs differ. Try again.'); setConfirm(''); setPin(''); setStage('pin'); return; }
    setParent({ pinHash: await hashPin(pin), consentAt: parent.consentAt ?? Date.now() });
    nav.navigate('ChildProfile');
  };
  return (
    <ScrollView style={{ flex: 1, backgroundColor: P.paper }} contentContainerStyle={{ paddingVertical: 16, paddingBottom: 40 }} testID="screen-parent-setup">
      <View style={{ paddingHorizontal: 14 }}><Heading>{ui('onboarding.parent', prefs)}</Heading></View>
      <Card>
        <Row style={{ paddingHorizontal: 0, alignItems: 'center', flexWrap: 'nowrap' }}>
          <Switch value={consent} onValueChange={setConsent} testID="consent-switch" accessibilityLabel="consent" />
          <Body style={{ flex: 1 }}>{ui('onboarding.consent', prefs)}</Body>
        </Row>
        <Body tone="soft" size={12} style={{ marginTop: 8 }}>{hi ? 'हम जन्मतिथि नहीं माँगते, केवल आयु वर्ग। फ़ोटो वैकल्पिक और निजी हैं। डेटा कभी भी हटाया जा सकता है।' : 'We never ask for a date of birth, only an age band. Photos are optional and private. You can delete all data at any time.'}</Body>
      </Card>
      <Card>
        <Heading size={18}>{stage === 'pin' ? (hi ? 'अभिभावक पिन (4 अंक)' : 'Parent PIN (4 digits)') : (hi ? 'पिन दोबारा लिखें' : 'Confirm the PIN')}</Heading>
        <Text style={s.dots} accessibilityLabel={`${(stage === 'pin' ? pin : confirm).length} digits entered`}>{'●'.repeat((stage === 'pin' ? pin : confirm).length).padEnd(4, '○')}</Text>
        <KeyPad onKey={onKey} />
        {error ? <Body style={{ color: P.clay, textAlign: 'center', marginTop: 8 }}>{error}</Body> : null}
      </Card>
      <Row style={{ marginTop: 8 }}><BigButton label={ui('common.next', prefs)} onPress={next} disabled={!canContinue} testID="parent-next" /></Row>
    </ScrollView>
  );
}
const s = StyleSheet.create({ dots: { fontFamily: FONT.display, fontSize: 28, letterSpacing: 10, color: P.indigo, textAlign: 'center', marginVertical: 10 } });
