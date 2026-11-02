'use client';

import Link from 'next/link';
import { Forbidden, PageHead } from '@/components/ui';
import { useCan } from '@/components/ConsoleShell';
import { DaduContentForm } from '@/components/dadu/DaduContentForm';

export default function NewDaduContentPage() {
  const can = useCan();
  if (!can('dadu:content:write')) return <Forbidden />;
  return (
    <div>
      <p className="small"><Link href="/dadu/content">← DADU content</Link></p>
      <PageHead title="New DADU item" subtitle="Starts as a draft, version 1. Every item needs a learning objective, age bands, rights and provenance." />
      <DaduContentForm />
    </div>
  );
}
