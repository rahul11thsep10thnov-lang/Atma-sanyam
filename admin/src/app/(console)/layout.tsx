import { redirect } from 'next/navigation';
import { ConsoleShell } from '@/components/ConsoleShell';
import { getMe } from '@/lib/server';

// Every console page validates the session against the API before rendering.
export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  if (!me) redirect('/login?expired=1');
  return <ConsoleShell me={me}>{children}</ConsoleShell>;
}
