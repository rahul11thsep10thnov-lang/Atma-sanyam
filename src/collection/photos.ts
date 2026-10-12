// A photo from the phone, kept as the app's own copy so it still exists
// after the gallery changes, and revealed as a jigsaw like any picture.
import * as ImagePicker from 'expo-image-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { CustomImageRef } from '../types';

function photosDir(): Directory | null {
  try {
    const dir = new Directory(Paths.document, 'my-photos');
    if (!dir.exists) dir.create({ intermediates: true });
    return dir;
  } catch {
    return null;
  }
}

/** Opens the photo library; resolves to the chosen photo or null. */
export async function pickPhoto(): Promise<CustomImageRef | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, allowsMultipleSelection: false, exif: false });
  if (res.canceled || !res.assets?.[0]) return null;
  const asset = res.assets[0];
  const dir = photosDir();
  if (!dir) return { kind: 'custom', uri: asset.uri };
  try {
    const ext = (asset.fileName ?? asset.uri).split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const dest = new File(dir, `${Date.now().toString(36)}.${ext}`);
    await new File(asset.uri).copy(dest);
    return { kind: 'custom', uri: dest.uri };
  } catch {
    return { kind: 'custom', uri: asset.uri };
  }
}
