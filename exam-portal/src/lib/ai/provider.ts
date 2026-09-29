import type { DocumentType } from "@/generated/prisma/enums";

export interface ExtractionInput {
  documentType: DocumentType;
  filename: string;
  storageUrl: string;
  sourceUrl: string | null;
}

export interface ExtractedField {
  fieldPath: string;
  value: unknown;
  confidence: number;
  sourcePage?: number;
  isUncertain: boolean;
}

export interface AIExtractionProvider {
  readonly modelName: string;
  extractFields(input: ExtractionInput): Promise<ExtractedField[]>;
}

export class AIProviderNotConfiguredError extends Error {}

/// One canned field set per document type, standing in for a real
/// document-understanding model. This environment has no AI API key
/// configured, so this is the only provider available — it exists to
/// prove the pipeline's plumbing (job lifecycle, field-by-field
/// storage, validation, never-auto-publish) end to end without
/// depending on an external service. A real provider (e.g. one backed
/// by the Claude API's PDF support) implements the same
/// `AIExtractionProvider` interface and is selected by
/// `getAIProvider()` below — nothing else in the codebase needs to
/// change.
const MOCK_FIELD_SETS: Record<DocumentType, Array<Omit<ExtractedField, "sourcePage">>> = {
  JOB_NOTIFICATION: [
    { fieldPath: "title", value: "(mock) Extracted job title — review against source", confidence: 0.4, isUncertain: true },
    { fieldPath: "vacancies", value: null, confidence: 0, isUncertain: true },
    { fieldPath: "applicationEndDate", value: null, confidence: 0, isUncertain: true },
  ],
  RESULT: [
    { fieldPath: "title", value: "(mock) Extracted result title — review against source", confidence: 0.4, isUncertain: true },
    { fieldPath: "resultDate", value: null, confidence: 0, isUncertain: true },
  ],
  ADMIT_CARD: [
    { fieldPath: "title", value: "(mock) Extracted admit card title — review against source", confidence: 0.4, isUncertain: true },
    { fieldPath: "examDate", value: null, confidence: 0, isUncertain: true },
  ],
  ANSWER_KEY: [
    { fieldPath: "title", value: "(mock) Extracted answer key title — review against source", confidence: 0.4, isUncertain: true },
    { fieldPath: "objectionDeadline", value: null, confidence: 0, isUncertain: true },
  ],
  SYLLABUS: [
    { fieldPath: "title", value: "(mock) Extracted syllabus title — review against source", confidence: 0.4, isUncertain: true },
  ],
  ADMISSION: [
    { fieldPath: "title", value: "(mock) Extracted admission title — review against source", confidence: 0.4, isUncertain: true },
    { fieldPath: "applicationEndDate", value: null, confidence: 0, isUncertain: true },
  ],
  SCHOLARSHIP: [
    { fieldPath: "title", value: "(mock) Extracted scholarship title — review against source", confidence: 0.4, isUncertain: true },
    { fieldPath: "amount", value: null, confidence: 0, isUncertain: true },
  ],
  OTHER: [{ fieldPath: "title", value: "(mock) Extracted title — review against source", confidence: 0.4, isUncertain: true }],
};

class MockAIExtractionProvider implements AIExtractionProvider {
  readonly modelName = "mock-extraction-v1";

  async extractFields(input: ExtractionInput): Promise<ExtractedField[]> {
    const fields = MOCK_FIELD_SETS[input.documentType] ?? MOCK_FIELD_SETS.OTHER;
    return fields.map((f) => ({ ...f, sourcePage: 1 }));
  }
}

export function getAIProvider(): AIExtractionProvider {
  const configured = process.env.AI_EXTRACTION_PROVIDER ?? "mock";
  if (configured === "mock") return new MockAIExtractionProvider();
  throw new AIProviderNotConfiguredError(
    `AI_EXTRACTION_PROVIDER="${configured}" has no implementation yet. Only "mock" ` +
      `is wired up — implement AIExtractionProvider for a real model and select it here.`,
  );
}
