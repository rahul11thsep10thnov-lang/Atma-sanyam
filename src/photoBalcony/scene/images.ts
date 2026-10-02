import { ImageSourcePropType } from 'react-native';
import { IMAGES } from '../pack.generated';

export function img(file: string): ImageSourcePropType {
  const src = IMAGES[file];
  if (src === undefined) throw new Error(`Balcony asset missing from the pack: ${file}`);
  return src;
}
