'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api, errorMessage, useApi } from '@/lib/api';
import { fmtDate } from '@/lib/format';
import { ConfirmButton, ErrorAlert, Forbidden, PageHead, StatusBadge } from '@/components/ui';
import { useCan } from '@/components/ConsoleShell';
import { CraftForm, type Craft } from '@/components/CraftForm';

export default function CraftDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const can = useCan();
  const { data, error } = useApi<Craft>(can('content:read') ? `crafts/${id}` : null);
  if (!can('content:read')) return <Forbidden />;
  return (
    <div>
      <p className="small"><Link href="/crafts">← Art & Craft</Link></p>
      <PageHead title={data?.title ?? 'Tutorial'} subtitle={data ? `${data.id} · updated ${fmtDate(data.updatedAt)}` : undefined} actions={data && (
        <>
          <StatusBadge status={data.status} />
          {can('content:delete') && <ConfirmButton label="Delete" confirm={`Delete "${data.title}"? Children's progress on it is removed too.`} onConfirm={async () => { try { await api(`crafts/${id}`, { method: 'DELETE' }); router.push('/crafts'); } catch (e) { window.alert(errorMessage(e)); } }} />}
        </>
      )} />
      <ErrorAlert error={error} />
      {data && <CraftForm key={data.updatedAt} initial={data} />}
    </div>
  );
}
