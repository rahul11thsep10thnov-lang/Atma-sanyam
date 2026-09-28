import { formatDate } from "@/lib/format";

export interface FaqItem {
  question: string;
  answer: string;
}

/**
 * Deterministic FAQ generation from verified stored fields only (Section
 * 21A Step 7: "Never create an answer that is not supported by verified
 * data"). This is the non-AI version — once Phase 14's extraction
 * pipeline exists, AI-suggested FAQs still go through the same rule and
 * still require human approval before publishing; this function is what
 * that approved data flows through either way.
 */
export function buildJobFaq(job: {
  applicationEndDate: Date | null;
  qualification: string | null;
  applicationFee: unknown;
  ageLimitMin: number | null;
  ageLimitMax: number | null;
  exam: { examDate: Date | null };
  officialWebsite: string | null;
}): FaqItem[] {
  const items: FaqItem[] = [];

  if (job.applicationEndDate) {
    items.push({
      question: "What is the last date to apply?",
      answer: `The application window closes on ${formatDate(job.applicationEndDate)}.`,
    });
  }
  if (job.qualification) {
    items.push({
      question: "What is the educational qualification required?",
      answer: job.qualification,
    });
  }
  if (job.applicationFee != null) {
    items.push({
      question: "What is the application fee?",
      answer: `₹${job.applicationFee}. Category-wise fee, where it differs, is listed in the notification.`,
    });
  }
  if (job.ageLimitMin != null || job.ageLimitMax != null) {
    const parts = [
      job.ageLimitMin != null ? `minimum ${job.ageLimitMin} years` : null,
      job.ageLimitMax != null ? `maximum ${job.ageLimitMax} years` : null,
    ].filter(Boolean);
    items.push({
      question: "What is the age limit?",
      answer: `${parts.join(", ")}, as per the official notification (age relaxation rules for reserved categories may apply).`,
    });
  }
  if (job.exam.examDate) {
    items.push({
      question: "When will the examination be conducted?",
      answer: `The exam is scheduled for ${formatDate(job.exam.examDate)}.`,
    });
  }
  if (job.officialWebsite) {
    items.push({
      question: "Where can I find the official notification?",
      answer: `On the organization's official website: ${job.officialWebsite}`,
    });
  }

  return items;
}
