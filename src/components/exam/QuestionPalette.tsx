"use client";

import { cn } from "@/lib/utils";
import { Check, Flag, Minus } from "lucide-react";

export type QuestionStatus = "not-visited" | "skipped" | "answered" | "marked" | "answered-marked";

export interface PaletteEntry {
  id: string;
  status: QuestionStatus;
}

const STATUS_LABEL: Record<QuestionStatus, string> = {
  "not-visited": "Not visited",
  skipped: "Skipped (visited, not answered)",
  answered: "Answered",
  marked: "Marked for review",
  "answered-marked": "Answered and marked for review",
};

// Each state is distinguishable by more than color alone: fill vs outline,
// solid vs dashed border, and a small glyph — so the palette still reads
// correctly for colorblind users or in grayscale, not just by hue.
function stateClasses(status: QuestionStatus): string {
  switch (status) {
    case "answered":
      return "bg-brand-green border border-brand-green text-white";
    case "skipped":
      return "bg-white border-2 border-dashed border-brand-gold text-[#8a5a00]";
    case "marked":
      return "bg-brand-purple border border-brand-purple text-white";
    case "answered-marked":
      return "bg-brand-green border-2 border-brand-purple text-white";
    default:
      return "bg-white border border-gray-300 text-gray-600";
  }
}

function StatusGlyph({ status }: { status: QuestionStatus }) {
  if (status === "answered") return <Check size={10} strokeWidth={3} className="absolute -top-1 -right-1 bg-white text-brand-green rounded-full" />;
  if (status === "marked") return <Flag size={9} strokeWidth={3} className="absolute -top-1 -right-1 bg-white text-brand-purple rounded-full p-[1px]" />;
  if (status === "answered-marked") return <Flag size={9} strokeWidth={3} className="absolute -top-1 -right-1 bg-white text-brand-purple rounded-full p-[1px]" />;
  if (status === "skipped") return <Minus size={9} strokeWidth={3} className="absolute -top-1 -right-1 bg-white text-[#8a5a00] rounded-full" />;
  return null;
}

export default function QuestionPalette({
  entries,
  currentIndex,
  onJump,
  answeredCount,
  markedCount,
  totalCount,
}: {
  entries: PaletteEntry[];
  currentIndex: number;
  onJump: (index: number) => void;
  answeredCount: number;
  markedCount: number;
  totalCount: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Question Palette</p>
        <p className="text-xs font-semibold text-gray-500">
          {answeredCount}/{totalCount} answered
        </p>
      </div>

      <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-5 gap-2" role="group" aria-label="Question palette">
        {entries.map((entry, i) => (
          <button
            key={entry.id}
            onClick={() => onJump(i)}
            aria-label={`Question ${i + 1}, ${STATUS_LABEL[entry.status]}${i === currentIndex ? ", current question" : ""}`}
            aria-current={i === currentIndex ? "true" : undefined}
            className={cn(
              "exam-btn relative h-9 w-9 rounded-md text-xs font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange",
              stateClasses(entry.status),
              i === currentIndex && "ring-2 ring-brand-navy ring-offset-1"
            )}
          >
            {i + 1}
            <StatusGlyph status={entry.status} />
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-1.5 text-xs text-gray-600">
        <LegendRow status="not-visited" />
        <LegendRow status="skipped" />
        <LegendRow status="answered" />
        <LegendRow status="marked" />
        <LegendRow status="answered-marked" />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px] text-gray-500 border-t border-gray-100 pt-3">
        <div>
          <p className="text-sm font-bold text-brand-green">{answeredCount}</p>
          <p>Answered</p>
        </div>
        <div>
          <p className="text-sm font-bold text-brand-purple">{markedCount}</p>
          <p>Marked</p>
        </div>
        <div>
          <p className="text-sm font-bold text-gray-700">{totalCount - answeredCount}</p>
          <p>Remaining</p>
        </div>
      </div>
    </div>
  );
}

function LegendRow({ status }: { status: QuestionStatus }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn("relative flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-bold", stateClasses(status))}>
        <StatusGlyph status={status} />
      </span>
      <span>{STATUS_LABEL[status]}</span>
    </div>
  );
}
