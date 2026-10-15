// A child's avatar: their chosen portrait, or the first letter of their name
// on a coloured disc when they have none. Optional thick rainbow ring.
import React from 'react';
import { Image, ImageStyle, StyleProp, StyleSheet, Text, View } from 'react-native';
import { avatarSource } from '../profile/avatars';
import { fontFamily } from '../theme/typography';
import { rainbow } from '../theme/palette';

export function Avatar({ avatarId, name, size = 40, ring, style }: { avatarId?: string | null; name?: string | null; size?: number; ring?: boolean; style?: StyleProp<ImageStyle> }) {
  const source = avatarSource(avatarId);
  const letter = (name ?? '').trim().charAt(0).toUpperCase() || '·';
  const hue = rainbow[(name ?? '').length % rainbow.length];
  const round = { width: size, height: size, borderRadius: size / 2 };
  const inner = source ? (
    <Image source={source} style={[round, style]} accessibilityIgnoresInvertColors />
  ) : (
    <View style={[styles.disc, round, { backgroundColor: hue }, style]}>
      <Text style={[styles.letter, { fontSize: size * 0.5, lineHeight: size * 0.62 }]}>{letter}</Text>
    </View>
  );
  if (!ring) return inner;
  return (
    <View style={[styles.ring, { width: size + 8, height: size + 8, borderRadius: (size + 8) / 2, borderColor: hue }]}>
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  disc: { alignItems: 'center', justifyContent: 'center' },
  letter: { fontFamily: fontFamily.displayBold, color: '#fff' },
  ring: { borderWidth: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
});
