// Cache-aware image tile for the content library: shows a spinner while the
// thumbnail downloads, a tap-to-retry state on failure, and renders instantly
// from disk on remount (no spinner flash) once cached.
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme/colors';
import { ContentImage } from './types';
import { ImageVariant, peekCachedImageUri, resolveImageUri } from './repository';

interface RemoteThumbProps {
  image: ContentImage;
  variant?: ImageVariant;
  size: number;
  onPress?: () => void;
  selected?: boolean;
}

export function RemoteThumb({ image, variant = 'thumbnail', size, onPress, selected }: RemoteThumbProps) {
  const [uri, setUri] = useState<string | null>(() => peekCachedImageUri(image, variant));
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>(uri ? 'idle' : 'loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (uri) return;
    let cancelled = false;
    setStatus('loading');
    resolveImageUri(image, variant)
      .then((resolved) => {
        if (cancelled) return;
        setUri(resolved);
        setStatus('idle');
      })
      .catch(() => {
        if (cancelled) return;
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [image, variant, uri, attempt]);

  const containerStyle = [
    styles.container,
    { width: size, height: size, borderColor: selected ? colors.primary : colors.border, borderWidth: selected ? 2 : 1 },
  ];

  return (
    <Pressable
      style={containerStyle}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={image.title}
    >
      {uri && <Image source={{ uri }} style={styles.image} resizeMode="cover" />}
      {status === 'loading' && !uri && (
        <View style={styles.overlay}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}
      {status === 'error' && (
        <Pressable style={styles.overlay} onPress={() => setAttempt((a) => a + 1)}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.card,
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  image: { width: '100%', height: '100%' },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
});
