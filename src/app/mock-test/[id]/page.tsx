import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getMockTest, MOCK_TESTS } from "@/data/mockTests";
import { getQuestion } from "@/data/questions";
import { getState } from "@/data/states";
import { SUBJECT_MAP } from "@/data/subjects";
import Badge from "@/components/ui/Badge";
import {
  Timer,
  ListChecks,
  MinusCircle,
  Award,
  Navigation,
  BookMarked,
  Info,
  ArrowLeft,
} from "lucide-react";

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

  const subjects = Array.from(
    new Set(mock.questionIds.map((qid) => getQuestion(qid)?.subject).filter((s): s is string => Boolean(s)))
  );

  return (
    <div className="exam-shell container-page py-8 max-w-2xl">
      <Link href="/mock-test" className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 mb-3">
        <ArrowLeft size={13} /> Back to Tests
      </Link>

      <Badge tone={mock.exam === "constable" ? "navy" : "gold"}>
        {state.hinglishName} · {mock.exam === "constable" ? "Constable" : "SI"}
      </Badge>
      <h1 className="mt-2 text-2xl font-bold text-gray-900">{mock.title}</h1>

      {/* 1. Test Overview */}
      <SectionCard icon={<ListChecks size={16} />} title="Test Overview">
        <div className="grid grid-cols-2 gap-3">
          <Info2 icon={<ListChecks size={15} />} label="Questions" value={String(mock.questionCount)} />
          <Info2 icon={<Timer size={15} />} label="Duration" value={`${mock.durationMinutes} min`} />
          <Info2 icon={<Award size={15} />} label="Marks / Question" value={String(mock.marksPerQuestion)} />
          <Info2
            icon={<MinusCircle size={15} />}
            label="Negative Marking"
            value={mock.negativeMarks ? `−${mock.negativeMarks} per wrong` : "None"}
          />
        </div>
      </SectionCard>

      {/* 2. Navigation */}
      <SectionCard icon={<Navigation size={16} />} title="Navigation">
        <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-700">
          <li>
            <span className="font-semibold">Save &amp; Next</span> — answer aur next question par jaayein
          </li>
          <li>
            <span className="font-semibold">Previous</span> — pichhle question par wapas jaayein
          </li>
          <li>
            <span className="font-semibold">Mark for Review</span> — baad me revisit karne ke liye
          </li>
          <li>
            <span className="font-semibold">Question Palette</span> — kisi bhi question par seedhe jump karein
          </li>
        </ul>
      </SectionCard>

      {/* 3. Marking Scheme */}
      <SectionCard icon={<Award size={16} />} title="Marking Scheme">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg bg-brand-green-light p-3">
            <p className="text-lg font-extrabold text-brand-green">+{mock.marksPerQuestion}</p>
            <p className="text-xs text-gray-600 mt-0.5">Correct</p>
          </div>
          <div className="rounded-lg bg-brand-red-light p-3">
            <p className="text-lg font-extrabold text-brand-red">
              {mock.negativeMarks ? `−${mock.negativeMarks}` : "0"}
            </p>
            <p className="text-xs text-gray-600 mt-0.5">Incorrect</p>
          </div>
          <div className="rounded-lg bg-gray-100 p-3">
            <p className="text-lg font-extrabold text-gray-500">0</p>
            <p className="text-xs text-gray-600 mt-0.5">Unattempted</p>
          </div>
        </div>
      </SectionCard>

      {/* 4. Sections/Subjects */}
      {subjects.length > 0 && (
        <SectionCard icon={<BookMarked size={16} />} title="Subjects Covered">
          <div className="flex flex-wrap gap-2">
            {subjects.map((s) => (
              <Badge key={s} tone="navy">
                {SUBJECT_MAP[s]?.hinglishName ?? s}
              </Badge>
            ))}
          </div>
        </SectionCard>
      )}

      {/* 5. Important Instructions */}
      <SectionCard icon={<Info size={16} />} title="Important Instructions">
        <ul className="text-sm text-gray-600 space-y-1.5 list-disc pl-4">
          <li>Timer start hote hi countdown shuru ho jaayega — pause nahi hoga.</li>
          <li>Time khatam hone par test automatically submit ho jaayega.</li>
          <li>Ek baar submit karne ke baad answers change nahi kar sakte.</li>
          <li>Internet connection stable rakhein — progress is browser me save hoti hai.</li>
        </ul>
      </SectionCard>

      <div className="flex gap-3 mt-6 pb-4">
        <Link href="/mock-test" className="exam-btn exam-btn-secondary flex-1 py-3 text-sm text-center">
          ← Back to Tests
        </Link>
        <Link href={`/mock-test/${mock.id}/attempt`} className="exam-btn exam-btn-primary flex-1 py-3 text-sm text-center">
          I am Ready to Begin →
        </Link>
      </div>
    </div>
  );
}

function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="card p-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-orange-50 text-brand-orange">{icon}</span>
        <h2 className="text-sm font-bold text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Info2({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-100 p-2.5">
      <div className="flex items-center gap-1.5 text-gray-500">
        {icon}
        <span className="text-[11px] font-semibold uppercase">{label}</span>
      </div>
      <p className="mt-1 text-sm font-bold text-gray-900">{value}</p>
    </div>
  );
}
