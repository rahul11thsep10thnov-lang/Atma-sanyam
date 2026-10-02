import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { ImageRef } from '../types';
import { colors } from '../theme/colors';

// Still photographs of the spaces for history thumbnails (re-rendered with
// their packs; see tools/balcony-render).
const SPACE_PREVIEW = {
  balcony: require('../../assets/balcony/environment/preview.webp'),
  garden: require('../../assets/garden/environment/preview.webp'),
  room: require('../../assets/room/environment/preview.webp'),
};

interface PuzzleContentProps {
  image: ImageRef;
  width: number;
  height?: number;
}

export function PuzzleContent({ image, width, height }: PuzzleContentProps) {
  const h = height ?? width;
  if (image.kind === 'quote') {
    return (
      <View style={[styles.quoteCard, { width, height: h, backgroundColor: image.background }]}>
        <Text style={[styles.quoteMark, { color: image.textColor }]}>&ldquo;</Text>
        <Text style={[styles.quoteText, { color: image.textColor }]} numberOfLines={6}>
          {image.quote.text}
        </Text>
        <Text style={[styles.quoteAuthor, { color: image.textColor }]}>— {image.quote.author}</Text>
      </View>
    );
  }

  if (image.kind === 'balcony') return <Image source={SPACE_PREVIEW.balcony} style={{ width, height: h }} resizeMode="cover" />;
  if (image.kind === 'space') return <Image source={SPACE_PREVIEW[image.space]} style={{ width, height: h }} resizeMode="cover" />;
  const source = image.kind === 'art' ? image.uri : { uri: image.uri };
  return <Image source={source} style={{ width, height: h }} resizeMode="cover" />;
}

export function attributionFor(image: ImageRef): string | null {
  if (image.kind === 'remote' && image.attributionText) return image.attributionText;
  return null;
}

const styles = StyleSheet.create({
  quoteCard: {
    padding: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quoteMark: {
    fontSize: 48,
    fontWeight: '700',
    marginBottom: -12,
    opacity: 0.6,
  },
  quoteText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 26,
  },
  quoteAuthor: {
    marginTop: 16,
    fontSize: 14,
    fontStyle: 'italic',
    opacity: 0.85,
  },
});

export function backgroundColorFor(image: ImageRef): string {
  if (image.kind === 'quote') return image.background;
  return colors.background;
}
