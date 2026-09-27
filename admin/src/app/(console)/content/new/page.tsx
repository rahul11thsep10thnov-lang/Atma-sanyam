'use client';

import Link from 'next/link';
import { ContentForm } from '@/components/ContentForm';
import { Forbidden, PageHead } from '@/components/ui';
import { useCan } from '@/components/ConsoleShell';

export default function NewContentPage() {
  const can = useCan();
  if (!can('content:write')) return <Forbidden />;
  return (
    <div>
      <p className="small"><Link href="/content">← Content</Link></p>
      <PageHead title="Add image" subtitle="New images start as drafts unless you publish them." />
      <ContentForm />
    </div>
  );
}
