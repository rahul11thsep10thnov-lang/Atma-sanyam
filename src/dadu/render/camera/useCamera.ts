// Camera state shared by the world screen: which view is showing and which
// activity (if any) is open. The world state itself lives in DaduContext;
// the camera only decides how it is drawn.
import { useCallback, useMemo, useState } from 'react';
import type { CameraKind } from '../../core/locations';

export interface CameraState {
  kind: CameraKind;
  locationId: string;
  /** Activity key while the side view is open (e.g. 'water', 'feed', a lesson id). */
  activity: string | null;
  /** Object that opened the activity, if any. */
  objectId: string | null;
}

export interface CameraApi extends CameraState {
  enterActivity: (locationId: string, activityKey: string, objectId?: string) => void;
  exitActivity: () => void;
  /** Manual switch between the two views of the current location. */
  toggle: () => void;
  goTo: (locationId: string, kind?: CameraKind) => void;
}

export function useCamera(initialLocation: string, initialKind: CameraKind = 'iso'): CameraApi {
  const [state, setState] = useState<CameraState>({ kind: initialKind, locationId: initialLocation, activity: null, objectId: null });
  const enterActivity = useCallback((locationId: string, activityKey: string, objectId?: string) => {
    setState({ kind: 'side', locationId, activity: activityKey, objectId: objectId ?? null });
  }, []);
  const exitActivity = useCallback(() => setState((s) => ({ ...s, kind: 'iso', activity: null, objectId: null })), []);
  const toggle = useCallback(() => setState((s) => ({ ...s, kind: s.kind === 'iso' ? 'side' : 'iso' })), []);
  const goTo = useCallback((locationId: string, kind: CameraKind = 'iso') => setState({ kind, locationId, activity: null, objectId: null }), []);
  return useMemo(() => ({ ...state, enterActivity, exitActivity, toggle, goTo }), [state, enterActivity, exitActivity, toggle, goTo]);
}
