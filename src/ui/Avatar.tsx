// A person's avatar: their chosen portrait, or the first letter of their
// name on a peach disc (the chips' palette) when they have none.
import React from 'react';
import { Image, ImageStyle, StyleSheet, Text, View, StyleProp } from 'react-native';
import { avatarSource } from '../profile/avatars';
import { CHIP_FONT } from './ModeChips';

const PEACH = '#FBD0AE';
const INK = '#2B2118';

export function Avatar({ avatarId, name, size = 40, style }: { avatarId?: string | null; name?: string | null; size?: number; style?: StyleProp<ImageStyle> }) {
  const source = avatarSource(avatarId);
  const letter = (name ?? '').trim().charAt(0).toUpperCase() || '·';
  const round = { width: size, height: size, borderRadius: size / 2 };
  if (source) return <Image source={source} style={[round, style]} accessibilityIgnoresInvertColors />;
  return (
    <View style={[styles.disc, round, style]}>
      <Text style={[styles.letter, { fontSize: size * 0.56, lineHeight: size * 0.7 }]}>{letter}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  disc: { backgroundColor: PEACH, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E8A878' },
  letter: { fontFamily: CHIP_FONT, color: INK, letterSpacing: 0.5 },
});
