import { AgeGroupKey, GenderKey } from "../types";

export type VoiceToneKey = "NEUTRAL" | "WARM" | "AUTHORITATIVE";

export interface BaseVoiceDefinition {
  code: string;
  label: string;
  gender: Exclude<GenderKey, "UNKNOWN">;
  ageGroup: Exclude<AgeGroupKey, "UNKNOWN" | "CHILD">;
  tone: VoiceToneKey;
  description: string;
  isNarratorEligible: boolean;
}

/**
 * The fixed set of reusable base voices (brief §9). Every story and every
 * language draws from these, so the audience hears consistent identities
 * across the channel. Provider voice IDs are configured per voice in the
 * admin console (Voices page) and stored in the `voices` table.
 */
export const BASE_VOICES: BaseVoiceDefinition[] = [
  { code: "VOICE_01", label: "Adult male", gender: "MALE", ageGroup: "ADULT", tone: "NEUTRAL", description: "Calm adult male, 30–50 years", isNarratorEligible: true },
  { code: "VOICE_02", label: "Adult female", gender: "FEMALE", ageGroup: "ADULT", tone: "NEUTRAL", description: "Calm adult female, 30–50 years", isNarratorEligible: true },
  { code: "VOICE_03", label: "Elderly male", gender: "MALE", ageGroup: "ELDERLY", tone: "WARM", description: "Older male, 60+ years, measured pace", isNarratorEligible: false },
  { code: "VOICE_04", label: "Elderly female", gender: "FEMALE", ageGroup: "ELDERLY", tone: "WARM", description: "Older female, 60+ years, measured pace", isNarratorEligible: false },
  { code: "VOICE_05", label: "Young male", gender: "MALE", ageGroup: "YOUNG", tone: "NEUTRAL", description: "Young male, 18–28 years (also used for minors, never named)", isNarratorEligible: false },
  { code: "VOICE_06", label: "Young female", gender: "FEMALE", ageGroup: "YOUNG", tone: "NEUTRAL", description: "Young female, 18–28 years (also used for minors, never named)", isNarratorEligible: false },
  { code: "VOICE_07", label: "Authoritative male", gender: "MALE", ageGroup: "ADULT", tone: "AUTHORITATIVE", description: "Officials, police, lawyers — formal and steady", isNarratorEligible: true },
  { code: "VOICE_08", label: "Authoritative female", gender: "FEMALE", ageGroup: "ADULT", tone: "AUTHORITATIVE", description: "Default news narrator — formal, clear, unhurried", isNarratorEligible: true },
];

export const DEFAULT_NARRATOR_VOICE = "VOICE_08";
export const NARRATOR_SPEAKER_KEY = "NARRATOR";
