import { PrimaryCategoryKey } from "../../data/categories";

export interface ClassificationInput {
  headline: string;
  summary: string;
}

export interface ClassificationResult {
  primaryCategory: PrimaryCategoryKey;
  /** 0-100, spec §5 */
  familyRelevanceScore: number;
  reasoning: string;
}

export interface FamilyClassifier {
  classify(input: ClassificationInput): Promise<ClassificationResult>;
}
