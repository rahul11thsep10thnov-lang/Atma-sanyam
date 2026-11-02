'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useApi } from '@/lib/api';
import { fmtDate } from '@/lib/format';
import { statusLabel, type ContentReview, type ContentVersion, type DaduContentItem } from '@/lib/dadu';
import { ErrorAlert, Forbidden, OkAlert, PageHead } from '@/components/ui';
import { useCan } from '@/components/ConsoleShell';
import { DaduContentForm } from '@/components/dadu/DaduContentForm';
import { ReviewPanel } from '@/components/dadu/ReviewPanel';

type Detail = { item: DaduContentItem; versions: ContentVersion[]; reviews: ContentReview[] };

export default function EditDaduContentPage() {
  const { id } = useParams<{ id: string }>();
  const created = useSearchParams().get('created');
  const can = useCan();
  const { data, error, reload } = useApi<Detail>(can('dadu:content:read') ? `dadu/content/${id}` : null);
  if (!can('dadu:content:read')) return <Forbidden />;
  return (
    <div>
      <p className="small"><Link href="/dadu/content">← DADU content</Link></p>
      <PageHead
        title={data?.item.id ?? decodeURIComponent(id)}
        subtitle={data ? `${data.item.kind} · version ${data.item.version} · ${statusLabel(data.item.status)} · updated ${fmtDate(data.item.updatedAt)}` : undefined}
      />
      <ErrorAlert error={error} />
      {created && <OkAlert message="Item created as a draft." />}
      {data && (
        <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', alignItems: 'start' }}>
          <DaduContentForm key={`${data.item.id}:${data.item.version}`} initial={data.item} onSaved={() => reload()} />
          <ReviewPanel item={data.item} versions={data.versions} reviews={data.reviews} onChanged={reload} />
        </div>
      )}
    </div>
  );
}
