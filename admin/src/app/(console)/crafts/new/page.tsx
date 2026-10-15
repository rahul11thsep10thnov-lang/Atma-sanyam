'use client';

import Link from 'next/link';
import { PageHead } from '@/components/ui';
import { CraftForm } from '@/components/CraftForm';

export default function NewCraftPage() {
  return (
    <div>
      <p className="small"><Link href="/crafts">← Art & Craft</Link></p>
      <PageHead title="New tutorial" subtitle="Start as a draft; publish once the steps have been folded through with real paper." />
      <CraftForm />
    </div>
  );
}
