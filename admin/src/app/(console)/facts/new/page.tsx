'use client';

import Link from 'next/link';
import { PageHead } from '@/components/ui';
import { FactForm } from '@/components/FactForm';

export default function NewFactPage() {
  return (
    <div>
      <p className="small"><Link href="/facts">← Did You Know?</Link></p>
      <PageHead title="New fact" subtitle="Write it for the youngest bracket you tick. Add the source now so a fact checker can verify it." />
      <FactForm />
    </div>
  );
}
