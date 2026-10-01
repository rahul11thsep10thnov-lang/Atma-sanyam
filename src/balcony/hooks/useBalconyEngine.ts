import { useEffect, useRef, useState } from 'react';
import { BalconyEngine } from '../engine/BalconyEngine';
import { BalconyState } from '../types';
import { createInitialState, loadBalconyState, saveBalconyState } from '../repository/BalconyRepository';

/** Owns one BalconyEngine for the lifetime of the screen, loads its persisted
 * state on mount, and saves every subsequent change. `ready` stays false
 * for one tick while the saved state loads, so the scene can render the
 * fresh-install default without a flash of the wrong balcony. */
export function useBalconyEngine() {
  const engineRef = useRef<BalconyEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new BalconyEngine(createInitialState());
  }
  const engine = engineRef.current;
  const [state, setState] = useState<BalconyState>(engine.getState());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    loadBalconyState().then((loaded) => {
      if (!active) return;
      engine.reset(loaded);
      setState(loaded);
      setReady(true);
    });
    const unsubscribe = engine.subscribe((next) => {
      setState(next);
      saveBalconyState(next);
    });
    return () => {
      active = false;
      unsubscribe();
    };
    // engine is a ref-held singleton for this screen's lifetime — deliberately
    // excluded so this effect never re-subscribes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { engine, state, ready };
}
