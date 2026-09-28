import type { Transition } from "@/lib/services/workflow";

const LABELS: Record<Transition, string> = {
  SUBMIT_FOR_REVIEW: "Submit for Review",
  APPROVE: "Approve",
  REJECT: "Reject",
  PUBLISH: "Publish",
  ARCHIVE: "Archive",
  REOPEN_AS_DRAFT: "Reopen as Draft",
};

const DANGER: Transition[] = ["REJECT", "ARCHIVE"];

/**
 * One small `<form>` per available transition (Section 18: Save Draft /
 * Submit for Review / Publish / Archive) — no client JS required. Which
 * buttons appear is decided server-side by `availableTransitions()`
 * (Section 16: enforced server-side, never just hidden in the UI).
 */
export function StatusActions({
  id,
  transitions,
  action,
}: {
  id: string;
  transitions: Transition[];
  action: (formData: FormData) => Promise<void>;
}) {
  if (transitions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {transitions.map((transition) => (
        <form key={transition} action={action}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="transition" value={transition} />
          <button
            type="submit"
            className={
              DANGER.includes(transition)
                ? "rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
                : "rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            }
          >
            {LABELS[transition]}
          </button>
        </form>
      ))}
    </div>
  );
}
