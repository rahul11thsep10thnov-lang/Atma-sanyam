export type PrimaryCategoryKey =
  | "FAMILY_DISPUTE"
  | "HUSBAND_WIFE"
  | "IN_LAWS"
  | "SIBLING_DISPUTE"
  | "PARENT_CHILD"
  | "PROPERTY_INHERITANCE"
  | "DOMESTIC_CONFLICT"
  | "FAMILY_CRIME"
  | "FAMILY_MURDER"
  | "FAMILY_MISSING_PERSON"
  | "FAMILY_KIDNAPPING"
  | "FAMILY_FRAUD"
  | "NEIGHBOUR_DISPUTE"
  | "OTHER_HUMAN_INTEREST"
  | "NOT_RELEVANT";

export interface CategoryDefinition {
  key: PrimaryCategoryKey;
  label: string;
  /** Shown as a home-screen filter chip (spec §18). NOT_RELEVANT never is. */
  isFeedFilter: boolean;
  /** Extra moderation gates apply (spec §11). */
  isSensitive: boolean;
}

export const CATEGORIES: CategoryDefinition[] = [
  { key: "FAMILY_DISPUTE", label: "Family Disputes", isFeedFilter: true, isSensitive: false },
  { key: "HUSBAND_WIFE", label: "Husband-Wife", isFeedFilter: true, isSensitive: false },
  { key: "IN_LAWS", label: "In-Law Disputes", isFeedFilter: true, isSensitive: false },
  { key: "SIBLING_DISPUTE", label: "Sibling Disputes", isFeedFilter: true, isSensitive: false },
  { key: "PARENT_CHILD", label: "Parent-Child Disputes", isFeedFilter: true, isSensitive: false },
  { key: "PROPERTY_INHERITANCE", label: "Property Disputes", isFeedFilter: true, isSensitive: false },
  { key: "DOMESTIC_CONFLICT", label: "Domestic Conflict", isFeedFilter: true, isSensitive: true },
  { key: "FAMILY_CRIME", label: "Family Crime", isFeedFilter: true, isSensitive: true },
  { key: "FAMILY_MURDER", label: "Family Murder", isFeedFilter: true, isSensitive: true },
  { key: "FAMILY_MISSING_PERSON", label: "Missing Persons", isFeedFilter: true, isSensitive: true },
  { key: "FAMILY_KIDNAPPING", label: "Kidnapping", isFeedFilter: true, isSensitive: true },
  { key: "FAMILY_FRAUD", label: "Family Fraud", isFeedFilter: true, isSensitive: false },
  { key: "NEIGHBOUR_DISPUTE", label: "Neighbour Disputes", isFeedFilter: true, isSensitive: false },
  { key: "OTHER_HUMAN_INTEREST", label: "Human Stories", isFeedFilter: true, isSensitive: false },
  { key: "NOT_RELEVANT", label: "Not Relevant", isFeedFilter: false, isSensitive: false },
];

export const FEED_FILTER_CATEGORIES = CATEGORIES.filter((c) => c.isFeedFilter);
export const SENSITIVE_CATEGORIES = new Set(
  CATEGORIES.filter((c) => c.isSensitive).map((c) => c.key)
);
