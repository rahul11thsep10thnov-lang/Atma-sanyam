// Starts a server-timed play session, loads the game's code and hands it to
// the GameShell. Ends the session with the result on exit, and shows new
// badges on the way out.
import React, { useEffect, useRef, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { GameShell, type GameResult } from '../../games/shared/GameShell';
import { loadGame } from '../../games/registry';
import type { GameDefinition } from '../../games/engine';
import { usePlayer } from '../../context/PlayerContext';
import { ErrorState, LoadingState } from '../../ui';
import { ApiError, friendlyError } from '../../services/apiClient';
import { useAds } from '../../ads/useAds';
import { t } from '../../i18n';

let playedBefore = false;
async function firstOrBetween(): Promise<'first' | 'between'> {
  const trigger = playedBefore ? 'between' : 'first';
  playedBefore = true;
  return trigger;
}

export function GamePlayScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'GamePlay'>) {
  const p = usePlayer();
  const ads = useAds();
  const { gameId, difficulty } = route.params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [def, setDef] = useState<GameDefinition<any, any> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const exiting = useRef(false);
  const saved = p.progress?.games.find((g) => g.gameId === gameId);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = await loadGame(gameId);
        // Ads only ever run here, before a game starts — never during play.
        // The manager returns immediately when the household is ad-free, a
        // cap applies, or the SDK has nothing to show.
        await ads.maybeShow(ads.enabled ? (await firstOrBetween()) : 'between');
        if (!alive) return;
        await p.startSession(gameId, difficulty);
        if (!alive) return;
        setDef(d);
        setStarted(true);
      } catch (e) {
        if (!alive) return;
        if (e instanceof ApiError && e.isSubscriptionRequired) setError(t('home.locked.body'));
        else setError(friendlyError(e));
      }
    })();
    return () => {
      alive = false;
      if (!exiting.current && started) void p.endSession('abandoned');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, difficulty]);

  const exit = async (result: GameResult | null) => {
    exiting.current = true;
    ads.noteGameEnded();
    const r = await p.endSession(result?.outcome ?? 'abandoned', result ?? undefined);
    navigation.goBack();
    if (r?.newAchievements.length) {
      // The home screen celebrates new badges when it regains focus.
      void p.loadProgress();
    }
  };

  if (error) return <ErrorState message={error} onRetry={() => navigation.goBack()} />;
  if (!def || !p.session) return <LoadingState />;
  return (
    <GameShell
      def={def}
      difficulty={difficulty}
      savedProgress={saved ? { data: saved.data, version: saved.version } : null}
      onExit={exit}
      remainingSeconds={p.session.remainingSeconds}
      pausedByGuardian={p.session.pausedByGuardian}
      endedReason={p.session.endedReason}
      endedMessage={p.session.endedMessage}
      sendFrame={p.sendFrame}
    />
  );
}
