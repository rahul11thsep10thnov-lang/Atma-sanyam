'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useApi } from '@/lib/api';
import { fmtDate } from '@/lib/format';
import { ContentForm, type ContentItem } from '@/components/ContentForm';
import { ErrorAlert, Forbidden, OkAlert, PageHead, StatusBadge } from '@/components/ui';
import { useCan } from '@/components/ConsoleShell';

export default function EditContentPage() {
  const { id } = useParams<{ id: string }>();
  const created = useSearchParams().get('created');
  const can = useCan();
  const { data, error, setData } = useApi<ContentItem>(can('content:read') ? `content/${id}` : null);
  if (!can('content:read')) return <Forbidden />;
  return (
    <div>
      <p className="small"><Link href="/content">← Content</Link></p>
      <PageHead
        title={data?.title ?? 'Image'}
        subtitle={data ? `Last updated ${fmtDate(data.updatedAt)} · ${data.popularity} picks` : undefined}
        actions={data && <StatusBadge status={data.status} />}
      />
      <ErrorAlert error={error} />
      {created && <OkAlert message="Image created." />}
      {data &&
        (can('content:write') ? (
          <ContentForm key={data.id} initial={data} onSaved={setData} />
        ) : (
          <div className="card">You have read-only access to content.</div>
        ))}
    </div>
  );
}
