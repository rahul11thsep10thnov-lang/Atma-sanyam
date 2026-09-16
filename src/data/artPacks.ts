import { ArtImageRef } from '../types';

export const ART_PACK: ArtImageRef[] = [
  {
    kind: 'art',
    id: 'forest',
    uri: require('../../assets/images/art/forest.png'),
  },
  {
    kind: 'art',
    id: 'ocean',
    uri: require('../../assets/images/art/ocean.png'),
  },
  {
    kind: 'art',
    id: 'mountain',
    uri: require('../../assets/images/art/mountain.png'),
  },
  {
    kind: 'art',
    id: 'sunset',
    uri: require('../../assets/images/art/sunset.png'),
  },
  {
    kind: 'art',
    id: 'meadow',
    uri: require('../../assets/images/art/meadow.png'),
  },
  {
    kind: 'art',
    id: 'aurora',
    uri: require('../../assets/images/art/aurora.png'),
  },
];

export function randomArt(): ArtImageRef {
  return ART_PACK[Math.floor(Math.random() * ART_PACK.length)];
}
