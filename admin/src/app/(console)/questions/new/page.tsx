'use client';

import { useRouter } from 'next/navigation';
import { useCan } from '@/components/ConsoleShell';
import { QuestionEditor } from '@/components/QuestionEditor';
import { Forbidden, PageHead } from '@/components/ui';

export default function NewQuestionPage() {
  const router = useRouter();
  const can = useCan();
  if (!can('questions:write')) return <Forbidden />;
  return (
    <>
      <PageHead title="Add question" subtitle="Checked by the same validator as AI output. It starts as a DRAFT until approved." />
      <div className="card">
        <QuestionEditor onSaved={(q) => router.push(`/questions/${q.id}`)} onCancel={() => router.back()} />
      </div>
    </>
  );
}
