// A short silent looping clip behind the story subtitles. The painted page stays underneath as the poster,
// so the page shows at once and the clip fades in when it is ready. The app narrates; clips carry no sound.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useEventListener } from 'expo';
import { VideoView, useVideoPlayer } from 'expo-video';

export function StageVideo({ source, paused }: { source: number; paused?: boolean }) {
  const [ready, setReady] = useState(false);
  const player = useVideoPlayer(source, (p) => { p.loop = true; p.muted = true; if (!paused) p.play(); });
  useEventListener(player, 'statusChange', ({ status }) => { if (status === 'readyToPlay') setReady(true); });
  React.useEffect(() => { if (paused) player.pause(); else player.play(); }, [paused, player]);
  return (
    <View style={[StyleSheet.absoluteFill, { opacity: ready ? 1 : 0 }]} pointerEvents="none">
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} allowsPictureInPicture={false} />
    </View>
  );
}
