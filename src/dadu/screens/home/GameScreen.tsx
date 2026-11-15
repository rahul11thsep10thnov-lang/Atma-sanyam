// A stand-alone game: the painted stage on top, the game below, a star when it is solved.
import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useDadu } from '../../state/DaduContext';
import { catalog } from '../../content';
import { tx, ui } from '../../i18n';
import { evaluate } from '../../engines/activities';
import type { ActivityAnswer, ActivityResult } from '../../engines/activities';
import { grant } from '../../engines/rewards';
import { backgroundForLocation } from '../../render';
import { canonicalLocation } from '../../core/locations';
import { EpisodeStage } from '../../episode/EpisodeStage';
import { activityOf, gamesFor } from '../../episode/games';
import { ActivityView } from '../activities';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { P } from '../../ui/palette';
import { BigButton, Body, Row, SpeechBubble } from '../../ui';
import type { DaduStackParamList } from '../../navigation/types';

export function GameScreen() {
  const nav = useNavigation<NativeStackNavigationProp<DaduStackParamList>>();
  const route = useRoute<RouteProp<DaduStackParamList, 'Game'>>();
  const { child, level, prefs, updateWorld, logEvent } = useDadu();
  const reduced = useReducedMotion();
  const lesson = catalog.lessonById(route.params.lessonId);
  const spec = lesson ? activityOf(lesson, level) : null;
  const [result, setResult] = useState<ActivityResult | null>(null);
  const [round, setRound] = useState(0);
  const [rewarded, setRewarded] = useState(false);
  const hi = prefs.primary === 'hi';
  const nextGame = useMemo(() => { const g = gamesFor(child?.band ?? 'A3', level); const i = g.findIndex((x) => x.lessonId === route.params.lessonId); return g[(i + 1) % Math.max(1, g.length)]; }, [child?.band, level, route.params.lessonId]);
  if (!lesson || !spec) return <View style={{ flex: 1, backgroundColor: P.paper, padding: 20 }}><Body>{hi ? 'खेल नहीं मिला।' : 'Game not found.'}</Body><Row><BigButton label={ui('common.back', prefs)} onPress={() => nav.goBack()} /></Row></View>;
  const room = backgroundForLocation(canonicalLocation(lesson.host));
  const answer = (a: ActivityAnswer) => {
    const r = evaluate(spec, a);
    setResult(r);
    if (r.ok && !rewarded) { setRewarded(true); updateWorld((w) => grant(w, { stars: 1 })); logEvent('activity'); }
  };
  return (
    <View style={{ flex: 1, backgroundColor: P.paper }} testID="screen-game">
      <EpisodeStage room={room} fallbackBackground={room} height={250} reducedMotion={reduced} motion="still" caption={tx(spec.prompt, prefs)}
        cast={[{ key: 'dadaji', slot: 'left', talking: !result, expression: 'idle' }, { key: 'chintu', slot: 'right', expression: result?.ok ? 'happy' : 'idle' }]} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40, paddingTop: 8 }}>
        <ActivityView key={`${round}`} spec={spec} level={level} prefs={prefs} result={result} disabled={!!result?.ok} onAnswer={answer} />
        {result ? <SpeechBubble who="dadaji" text={tx(result.feedback, prefs)} /> : null}
        <Row style={{ marginTop: 8 }}>
          {result && !result.ok ? <BigButton kind="ghost" label={ui('common.tryAgain', prefs)} onPress={() => { setResult(null); setRound(round + 1); }} testID="game-retry" /> : null}
          {result?.ok ? <BigButton kind="green" label={hi ? 'और खेलो' : 'Play another'} onPress={() => nav.replace('Game', { lessonId: nextGame.lessonId })} testID="game-next" /> : null}
          <BigButton kind="ghost" label={hi ? 'घर' : 'Home'} onPress={() => nav.navigate('Tabs')} testID="game-home" />
        </Row>
      </ScrollView>
    </View>
  );
}
