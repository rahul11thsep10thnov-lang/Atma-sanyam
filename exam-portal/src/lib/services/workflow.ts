import type { AdminRole, ContentStatus } from "@/generated/prisma/enums";

/**
 * The DRAFT → IN_REVIEW → APPROVED → PUBLISHED → ARCHIVED workflow
 * (Section 17), shared by every content type (Exam, Job, and — from
 * Phase 6 onward — Result/AdmitCard/AnswerKey/etc.) so the rules live in
 * one place instead of being re-implemented per content type.
 */

type Transition =
  | "SUBMIT_FOR_REVIEW"
  | "APPROVE"
  | "REJECT"
  | "PUBLISH"
  | "ARCHIVE"
  | "REOPEN_AS_DRAFT";

const TRANSITIONS: Record<
  Transition,
  { from: ContentStatus[]; to: ContentStatus; roles: AdminRole[] }
> = {
  SUBMIT_FOR_REVIEW: {
    from: ["DRAFT", "REJECTED"],
    to: "IN_REVIEW",
    roles: ["AUTHOR", "EDITOR", "SUPER_ADMIN"],
  },
  APPROVE: {
    from: ["IN_REVIEW"],
    to: "APPROVED",
    roles: ["REVIEWER", "EDITOR", "SUPER_ADMIN"],
  },
  REJECT: {
    from: ["IN_REVIEW"],
    to: "REJECTED",
    roles: ["REVIEWER", "EDITOR", "SUPER_ADMIN"],
  },
  // Editors/Super Admins can also publish straight from Draft/In Review
  // ("publish where permitted", Section 16) — not every organization
  // requires a separate reviewer sign-off for every content type.
  PUBLISH: {
    from: ["DRAFT", "IN_REVIEW", "APPROVED"],
    to: "PUBLISHED",
    roles: ["EDITOR", "SUPER_ADMIN"],
  },
  ARCHIVE: {
    from: ["PUBLISHED"],
    to: "ARCHIVED",
    roles: ["EDITOR", "SUPER_ADMIN"],
  },
  REOPEN_AS_DRAFT: {
    from: ["ARCHIVED", "REJECTED"],
    to: "DRAFT",
    roles: ["EDITOR", "SUPER_ADMIN"],
  },
};

export class InvalidTransitionError extends Error {}

/** Throws if `role` may not move a record from `from` via `transition`.
 * Returns the resulting status on success — call this before writing. */
export function applyTransition(
  from: ContentStatus,
  transition: Transition,
  role: AdminRole,
): ContentStatus {
  const rule = TRANSITIONS[transition];
  if (!rule.from.includes(from)) {
    throw new InvalidTransitionError(
      `Cannot ${transition} from ${from}.`,
    );
  }
  if (!rule.roles.includes(role)) {
    throw new InvalidTransitionError(
      `${role} is not allowed to ${transition}.`,
    );
  }
  return rule.to;
}

export function availableTransitions(
  from: ContentStatus,
  role: AdminRole,
): Transition[] {
  return (Object.keys(TRANSITIONS) as Transition[]).filter((t) => {
    const rule = TRANSITIONS[t];
    return rule.from.includes(from) && rule.roles.includes(role);
  });
}

export type { Transition };
