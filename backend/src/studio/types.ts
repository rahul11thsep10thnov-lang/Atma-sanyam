// Shared domain types for the Video Studio. These are the in-memory shapes
// passed between layers; Prisma models persist them (see schema.prisma).

export type FactTypeKey =
  | "PERSON_NAME"
  | "DATE"
  | "TIME"
  | "LOCATION"
  | "NUMBER"
  | "AGE"
  | "MONEY"
  | "ORGANIZATION"
  | "QUOTE"
  | "CLAIM"
  | "ALLEGATION"
  | "OFFICIAL_STATEMENT"
  | "EVENT";

export type VerificationStatusKey = "VERIFIED" | "UNVERIFIED" | "REPORTED" | "ALLEGED" | "UNKNOWN";

export type StatementTypeKey = "DIRECT_QUOTE" | "REPORTED_STATEMENT" | "AI_NARRATION" | "RECONSTRUCTED_DIALOGUE";

export interface ExtractedFact {
  type: FactTypeKey;
  value: string;
  normalizedValue?: string;
  sourceSentence?: string;
  attributedTo?: string;
  statementType?: StatementTypeKey;
  verificationStatus: VerificationStatusKey;
  isKeyFact: boolean;
  timelineOrder?: number;
}

export interface TimelineEvent {
  order: number;
  when?: string; // human-readable ("On Monday night", "12 March 2026") when stated
  event: string; // one factual sentence, hedged where it is an allegation
  sourceSentence: string;
  isAllegation: boolean;
}

export type GenderKey = "MALE" | "FEMALE" | "UNKNOWN";
export type AgeGroupKey = "CHILD" | "YOUNG" | "ADULT" | "ELDERLY" | "UNKNOWN";

export interface ExtractedCharacter {
  key: string; // CHAR_01…
  displayName: string;
  realName?: string;
  role: string;
  gender: GenderKey;
  ageGroup: AgeGroupKey;
  isMinor: boolean;
  isOfficial: boolean;
  isRealPerson: boolean;
  anonymized: boolean;
  speaks: boolean;
  appearance: CharacterAppearance;
  /** In-memory only: a name that must be redacted from all text (minors, survivors). Never persisted. */
  protectedName?: string;
}

export interface CharacterAppearance {
  clothing: string;
  build: string;
  hair: string;
  accessories: string;
  palette: string;
}

export interface ExtractedLocation {
  label: string; // "a house in Jaipur, Rajasthan"
  state?: string;
  district?: string;
  settings: string[]; // distinct visual settings mentioned: "home", "police station", "court"…
}

export interface ArticleAnalysis {
  cleanedText: string;
  facts: ExtractedFact[];
  timeline: TimelineEvent[];
  characters: ExtractedCharacter[];
  location: ExtractedLocation;
  sensitiveTopics: string[];
  isSensitive: boolean;
  warnings: string[];
  provider: string;
}

export type SafetyLevelKey = "SAFE" | "SENSITIVE" | "RESTRICTED";

export interface DialogueLine {
  speakerKey: string; // character key
  text: string;
  statementType: StatementTypeKey;
  factId?: string;
}

/** One structured master-script scene (brief §12). */
export interface MasterScene {
  sceneNumber: number;
  durationSeconds: number;
  location: string;
  timeOfDay: "morning" | "afternoon" | "evening" | "night" | "unspecified";
  characters: string[];
  narratorText: string;
  dialogue: DialogueLine[];
  emotionalTone: string;
  cameraDirection: string;
  background: string;
  props: string[];
  animationRequirements: string;
  audioRequirements: { ambient: string; sfx: string[] };
  contentRestrictions: string[];
  transition: "cut" | "fade" | "dissolve" | "slide";
  onScreenText?: string;
  // Set by the safety layer
  safetyLevel?: SafetyLevelKey;
  safetyReasons?: string[];
}

export interface MasterScript {
  title: string;
  language: string;
  scenes: MasterScene[];
  provider: string;
}

/** Per-language lines for one master scene. */
export interface LanguageSceneLines {
  sceneNumber: number;
  narratorText: string;
  dialogue: { speakerKey: string; text: string; statementType: StatementTypeKey }[];
  onScreenText?: string;
  /** Hash of the master scene text this was localised from (per-scene reuse). */
  sourceHash?: string;
  /** True when an editor changed this scene's lines by hand. */
  edited?: boolean;
}

export interface LanguageScriptContent {
  title: string;
  languageCode: string;
  scenes: LanguageSceneLines[];
  untranslated?: boolean; // true when produced by the passthrough fallback
}

export interface LintFlag {
  rule: string;
  severity: "BLOCKING" | "WARNING";
  sceneNumber?: number;
  excerpt?: string;
  suggestion?: string;
}

export interface QcIssue {
  check: string;
  severity: "BLOCKING" | "WARNING";
  message: string;
  languageCode?: string;
  sceneNumber?: number;
}

export interface QcReport {
  status: "PASSED" | "NEEDS_REVIEW";
  checkedAt: string;
  issues: QcIssue[];
  checks: { name: string; passed: boolean }[];
}
