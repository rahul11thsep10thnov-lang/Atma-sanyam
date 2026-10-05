import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { ImageRef } from '../types';
import { speciesThumb } from '../paradise/ui/PlantCatalogSheet';
import { colors } from '../theme/colors';

// Still photographs of the spaces for history thumbnails come from each
// space's rendered pack (tools/balcony-render).
import { img, packFor } from '../spaces/packs';
import { SpaceId } from '../spaces/packTypes';

function spacePreview(space: SpaceId) {
  const file = packFor(space).preview;
  return file ? img(space, file) : null;
}

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

  if (image.kind === 'plant') {
    const src = speciesThumb(image.speciesId, 7);
    return (
      <View style={{ width, height: h, backgroundColor: '#E9DFD2', alignItems: 'center', justifyContent: 'center' }}>
        {src ? <Image source={src} style={{ width: width * 0.8, height: h * 0.8 }} resizeMode="contain" /> : null}
      </View>
    );
  }
  if (image.kind === 'balcony' || image.kind === 'space') {
    const src = spacePreview(image.kind === 'space' ? image.space : 'balcony');
    return src ? <Image source={src} style={{ width, height: h }} resizeMode="cover" /> : <View style={{ width, height: h, backgroundColor: '#3a2e26' }} />;
  }
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
