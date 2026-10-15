// The guardian's live socket: child online/offline and session changes,
// and mirror frames while watching. Started when a guardian is signed in.
import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { RealtimeClient, type RealtimeMessage } from '../realtime/client';
import { useGuardian } from './GuardianContext';

interface Ctx {
  client: RealtimeClient;
  onChildStatus: (fn: (msg: RealtimeMessage) => void) => () => void;
}

const GuardianRealtimeContext = createContext<Ctx | null>(null);

export function GuardianRealtimeProvider({ children }: { children: React.ReactNode }) {
  const g = useGuardian();
  const client = useMemo(() => new RealtimeClient('guardian'), []);
  useEffect(() => {
    if (g.status === 'signedIn') client.start();
    else client.stop();
    return () => client.stop();
  }, [g.status, client]);
  const value = useMemo<Ctx>(
    () => ({
      client,
      onChildStatus: (fn) => client.on((m) => m.type === 'child_status' && fn(m)),
    }),
    [client]
  );
  return <GuardianRealtimeContext.Provider value={value}>{children}</GuardianRealtimeContext.Provider>;
}

export function useGuardianRealtime(): Ctx {
  const ctx = useContext(GuardianRealtimeContext);
  if (!ctx) throw new Error('useGuardianRealtime outside provider');
  return ctx;
}
