import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getMockTest, MOCK_TESTS } from "@/data/mockTests";
import { getState } from "@/data/states";
import Badge from "@/components/ui/Badge";
import { Timer, ListChecks, MinusCircle, Award } from "lucide-react";

export function generateStaticParams() {
  return MOCK_TESTS.map((m) => ({ id: m.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const mock = getMockTest(id);
  if (!mock) return {};
  return {
    title: mock.title,
    description: `${mock.title} — ${mock.questionCount} questions, ${mock.durationMinutes} minute. Timer, question palette aur detailed result analysis ke saath.`,
    alternates: { canonical: `/mock-test/${id}` },
  };
}

export default async function MockTestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const mock = getMockTest(id);
  if (!mock) notFound();
  const state = getState(mock.state)!;

  return (
    <div className="container-page py-8 max-w-xl">
      <Badge tone={mock.exam === "constable" ? "navy" : "gold"}>
        {state.hinglishName} · {mock.exam === "constable" ? "Constable" : "SI"}
      </Badge>
      <h1 className="mt-2 text-2xl font-extrabold text-gray-900">{mock.title}</h1>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Info icon={<ListChecks size={16} />} label="Questions" value={String(mock.questionCount)} />
        <Info icon={<Timer size={16} />} label="Duration" value={`${mock.durationMinutes} min`} />
        <Info icon={<Award size={16} />} label="Marks / Question" value={String(mock.marksPerQuestion)} />
        <Info icon={<MinusCircle size={16} />} label="Negative Marking" value={mock.negativeMarks ? `-${mock.negativeMarks}` : "Nahi hai"} />
      </div>

      <div className="card p-4 mt-5">
        <h2 className="text-sm font-bold text-gray-900 mb-2">Instructions</h2>
        <ul className="text-sm text-gray-600 space-y-1.5 list-disc pl-4">
          <li>Timer start hote hi countdown shuru ho jaayega.</li>
          <li>Question Palette se kisi bhi question par jump kar sakte hain.</li>
          <li>&quot;Mark for Review&quot; use karke question ko baad me revisit karein.</li>
          <li>Time khatam hone par test automatically submit ho jaayega.</li>
        </ul>
      </div>

      <Link href={`/mock-test/${mock.id}/attempt`} className="btn-primary w-full mt-6 py-3 text-sm text-center block">
        Start Test
      </Link>
    </div>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card p-3">
      <div className="flex items-center gap-1.5 text-brand-navy">
        {icon}
        <span className="text-[11px] font-semibold uppercase text-gray-500">{label}</span>
      </div>
      <p className="mt-1 text-sm font-bold text-gray-900">{value}</p>
    </div>
  );
}
