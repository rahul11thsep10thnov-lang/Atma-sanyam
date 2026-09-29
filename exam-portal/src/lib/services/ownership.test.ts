import { describe, it, expect } from "vitest";
import { canCreateContent, canEditContent } from "./ownership";

describe("canCreateContent", () => {
  it("allows AUTHOR, EDITOR, and SUPER_ADMIN", () => {
    expect(canCreateContent("AUTHOR")).toBe(true);
    expect(canCreateContent("EDITOR")).toBe(true);
    expect(canCreateContent("SUPER_ADMIN")).toBe(true);
  });

  it("refuses REVIEWER — reviewers approve/reject, they don't author content", () => {
    expect(canCreateContent("REVIEWER")).toBe(false);
  });
});

describe("canEditContent", () => {
  const authorId = "author-1";
  const otherAuthorId = "author-2";

  it("lets EDITOR and SUPER_ADMIN edit anything regardless of ownership or status", () => {
    const content = { createdBy: otherAuthorId, status: "PUBLISHED" as const };
    expect(canEditContent(content, { id: "editor-1", role: "EDITOR" })).toBe(true);
    expect(canEditContent(content, { id: "admin-1", role: "SUPER_ADMIN" })).toBe(true);
  });

  it("lets an AUTHOR edit only their own DRAFT", () => {
    const ownDraft = { createdBy: authorId, status: "DRAFT" as const };
    expect(canEditContent(ownDraft, { id: authorId, role: "AUTHOR" })).toBe(true);
  });

  it("refuses an AUTHOR editing someone else's draft", () => {
    const othersDraft = { createdBy: otherAuthorId, status: "DRAFT" as const };
    expect(canEditContent(othersDraft, { id: authorId, role: "AUTHOR" })).toBe(false);
  });

  it("refuses an AUTHOR editing their own content once it's past DRAFT", () => {
    const ownPublished = { createdBy: authorId, status: "PUBLISHED" as const };
    expect(canEditContent(ownPublished, { id: authorId, role: "AUTHOR" })).toBe(false);
  });

  it("refuses REVIEWER editing anything directly", () => {
    const ownDraft = { createdBy: "reviewer-1", status: "DRAFT" as const };
    expect(canEditContent(ownDraft, { id: "reviewer-1", role: "REVIEWER" })).toBe(false);
  });
});
