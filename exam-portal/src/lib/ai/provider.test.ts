import { describe, it, expect, afterEach } from "vitest";
import { getAIProvider, AIProviderNotConfiguredError } from "./provider";

describe("getAIProvider", () => {
  const original = process.env.AI_EXTRACTION_PROVIDER;
  afterEach(() => {
    if (original === undefined) delete process.env.AI_EXTRACTION_PROVIDER;
    else process.env.AI_EXTRACTION_PROVIDER = original;
  });

  it("defaults to the mock provider when unset", () => {
    delete process.env.AI_EXTRACTION_PROVIDER;
    expect(getAIProvider().modelName).toBe("mock-extraction-v1");
  });

  it("throws for any provider name it doesn't recognize, rather than silently using mock data", () => {
    process.env.AI_EXTRACTION_PROVIDER = "claude-pdf-vision";
    expect(() => getAIProvider()).toThrow(AIProviderNotConfiguredError);
  });
});

describe("MockAIExtractionProvider.extractFields", () => {
  it("returns a field set scoped to the document type, not a generic one", async () => {
    const provider = getAIProvider();
    const jobFields = await provider.extractFields({
      documentType: "JOB_NOTIFICATION",
      filename: "notice.pdf",
      storageUrl: "https://example.test/notice.pdf",
      sourceUrl: null,
    });
    expect(jobFields.map((f) => f.fieldPath)).toContain("vacancies");

    const syllabusFields = await provider.extractFields({
      documentType: "SYLLABUS",
      filename: "syllabus.pdf",
      storageUrl: "https://example.test/syllabus.pdf",
      sourceUrl: null,
    });
    expect(syllabusFields.map((f) => f.fieldPath)).not.toContain("vacancies");
  });

  it("always includes a title field, matching REQUIRED_FIELDS in extraction.ts", async () => {
    const provider = getAIProvider();
    for (const documentType of [
      "JOB_NOTIFICATION",
      "RESULT",
      "ADMIT_CARD",
      "ANSWER_KEY",
      "SYLLABUS",
      "ADMISSION",
      "SCHOLARSHIP",
      "OTHER",
    ] as const) {
      const fields = await provider.extractFields({
        documentType,
        filename: "x.pdf",
        storageUrl: "https://example.test/x.pdf",
        sourceUrl: null,
      });
      const title = fields.find((f) => f.fieldPath === "title");
      expect(title?.value, `${documentType} should have a non-null title`).not.toBeNull();
    }
  });
});
