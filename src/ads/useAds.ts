// Keeps the ad manager in sync with the remote config and the household's
// entitlement, and exposes the two placements the app uses.
import { useCallback, useEffect } from 'react';
import { adManager, type AdTrigger } from './AdManager';
import { useRemoteConfig } from '../context/RemoteConfigContext';
import { usePlayer } from '../context/PlayerContext';

export function useAds() {
  const { config } = useRemoteConfig();
  const p = usePlayer();
  const adFree = p.entitlement.adFree ?? p.entitlement.active;
  useEffect(() => {
    adManager.configure(config.ads, adFree);
  }, [config.ads, adFree]);
  const maybeShow = useCallback((trigger: AdTrigger) => adManager.maybeShow(trigger), []);
  return { maybeShow, noteGameEnded: () => adManager.noteGameEnded(), adFree, enabled: config.ads.enabled && !adFree, diagnostics: () => adManager.diagnostics() };
}
