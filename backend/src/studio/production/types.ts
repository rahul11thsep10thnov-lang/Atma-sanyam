import { LocationCategory, MotionDecision, ShotType } from "@prisma/client";
import { CameraMoveType, Expression, Pose } from "../engine25d/spec";
import { AgeGroupKey, DialogueLine, GenderKey, SafetyLevelKey } from "../types";

export interface DirectorCharacter {
  id?: string;
  key: string;
  displayName: string;
  role: string;
  gender: GenderKey;
  ageGroup: AgeGroupKey;
  isMinor: boolean;
  isOfficial: boolean;
  anonymized: boolean;
  speaks: boolean;
  appearance?: { clothing?: string; hair?: string; build?: string; palette?: string } | null;
}

export interface DirectorContext {
  storyId: string;
  storyTitle: string;
  sensitiveTopics: string[];
  locationLabel: string;
  state?: string | null;
  characters: DirectorCharacter[];
  /** True only when an enabled, licence-cleared I2V model exists. */
  i2vAvailable: boolean;
  styleKey: string;
}

export interface SceneInput {
  id?: string;
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
  onScreenText?: string | null;
  safetyLevel: SafetyLevelKey;
  safetyReasons: string[];
  transition: string;
}

export interface MotionAnalysis {
  decision: MotionDecision;
  reason: string;
  confidence: number;
  selectedRenderer: "engine25d" | "i2v";
  /** Procedural motion the 2.5D engine should add when it handles the shot. */
  walk?: "walk" | "run";
}

export interface ShotPlan {
  shotNumber: number;
  shotType: ShotType;
  durationSeconds: number;
  viewerSees: string;
  emotionalPurpose: string;
  locationCategory: LocationCategory;
  substitute?: { id: string; description: string };
  characterKeys: string[];
  focusCharacterKey?: string;
  expressions: Record<string, Expression>;
  poses: Record<string, Pose>;
  propKeys: string[];
  cameraMovement: CameraMoveType;
  cameraIntensity: number;
  narration: string;
  dialogue: DialogueLine[];
  silhouettes: boolean;
  motion: MotionAnalysis;
  textBasis: string;
}

export interface EpisodePlan {
  title: string;
  synopsis: string;
  emotionalArc: { sceneNumber: number; purpose: string }[];
  scenes: { sceneNumber: number; shots: ShotPlan[] }[];
  provider: string;
}
