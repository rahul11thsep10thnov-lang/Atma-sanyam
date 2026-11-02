import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDadu } from '../../state/DaduContext';
import { LANGS, ui } from '../../i18n';
import { P, FONT } from '../../ui/palette';
import { CharacterSprite } from '../../render';
import type { DaduStackParamList } from '../../navigation/types';

/** The first screen after install: fourteen languages in their own script. */
export function LanguageScreen() {
  const nav = useNavigation<NativeStackNavigationProp<DaduStackParamList>>();
  const { prefs, setPrefs, profiles } = useDadu();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: P.paper }} contentContainerStyle={s.wrap} testID="screen-language">
      <View style={{ alignItems: 'center' }}>
        <CharacterSprite characterKey="dadaji" view="front" pose="wave" expression="happy" size={150} />
        <Text style={s.h} accessibilityRole="header">{ui('onboarding.language', prefs)}</Text>
        <Text style={s.hint}>{ui('onboarding.languageHint', prefs)}</Text>
      </View>
      <View style={s.grid}>
        {LANGS.map((l) => (
          <Pressable key={l.id} accessibilityRole="button" accessibilityState={{ selected: prefs.primary === l.id }} testID={`lang-${l.id}`}
            onPress={() => { setPrefs({ ...prefs, primary: l.id }); nav.navigate(profiles.length ? 'Tabs' : 'ParentSetup'); }}
            style={[s.lang, prefs.primary === l.id && s.langOn]}>
            <Text style={s.native}>{l.native}</Text>
            <Text style={s.name}>{l.name}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 40 },
  h: { fontFamily: FONT.displayHeavy, fontSize: 24, color: P.indigo, marginTop: 6 },
  hint: { fontFamily: FONT.body, color: P.inkSoft, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  lang: { width: '47%', flexGrow: 1, borderWidth: 3, borderColor: P.line, backgroundColor: P.card, borderRadius: 20, paddingVertical: 12, alignItems: 'center', minHeight: 72 },
  langOn: { borderColor: P.saffron, backgroundColor: '#FFF3D6' },
  native: { fontFamily: FONT.displayHeavy, fontSize: 20, color: P.indigo },
  name: { fontFamily: FONT.bodyBold, fontSize: 12, color: P.inkSoft },
});
