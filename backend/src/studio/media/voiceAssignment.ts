import { AgeGroupKey, GenderKey } from "../types";
import { NARRATOR_SPEAKER_KEY } from "./voiceCatalog";

export interface AssignableVoice {
  code: string;
  gender: GenderKey;
  ageGroup: AgeGroupKey;
  tone: string;
  isActive: boolean;
}

export interface AssignableCharacter {
  key: string;
  gender: GenderKey;
  ageGroup: AgeGroupKey;
  isOfficial: boolean;
  isMinor: boolean;
  speaks: boolean;
}

export interface VoiceAssignmentDecision {
  speakerKey: string;
  characterKey?: string;
  voiceCode: string;
  reason: string;
}

function preferences(c: AssignableCharacter): { codes: string[]; reason: string } {
  const female = c.gender === "FEMALE";
  if (c.isOfficial) return { codes: female ? ["VOICE_08", "VOICE_02"] : ["VOICE_07", "VOICE_01"], reason: "official → authoritative voice" };
  if (c.isMinor || c.ageGroup === "CHILD") return { codes: female ? ["VOICE_06", "VOICE_02"] : ["VOICE_05", "VOICE_01"], reason: "minor → young voice (never named)" };
  if (c.ageGroup === "YOUNG") return { codes: female ? ["VOICE_06", "VOICE_02"] : ["VOICE_05", "VOICE_01"], reason: "young adult" };
  if (c.ageGroup === "ELDERLY") return { codes: female ? ["VOICE_04", "VOICE_02"] : ["VOICE_03", "VOICE_01"], reason: "elderly" };
  if (c.gender === "UNKNOWN") return { codes: ["VOICE_01", "VOICE_02"], reason: "gender not stated → neutral adult voice" };
  return { codes: female ? ["VOICE_02", "VOICE_06", "VOICE_04"] : ["VOICE_01", "VOICE_05", "VOICE_03"], reason: "adult" };
}

/**
 * Stage: VOICE ASSIGNMENT. Maps the narrator and every character to one of
 * the base voices. Rules: the narrator's voice is never given to a
 * character; officials get authoritative voices; age and gender decide the
 * rest; two characters who appear in the same scene never share a voice
 * when an alternative exists. Admin-locked assignments are kept as-is, so
 * a character keeps the same voice for the life of the story.
 */
export function assignVoices(params: {
  characters: AssignableCharacter[];
  voices: AssignableVoice[];
  narratorVoiceCode: string;
  sceneCharacters: string[][];
  locked: { speakerKey: string; voiceCode: string }[];
}): VoiceAssignmentDecision[] {
  const active = params.voices.filter((v) => v.isActive).map((v) => v.code);
  const narrator = active.includes(params.narratorVoiceCode) ? params.narratorVoiceCode : active[0];
  const decisions: VoiceAssignmentDecision[] = [{ speakerKey: NARRATOR_SPEAKER_KEY, voiceCode: narrator, reason: "story narrator" }];
  const lockedMap = new Map(params.locked.map((l) => [l.speakerKey, l.voiceCode]));
  if (lockedMap.has(NARRATOR_SPEAKER_KEY)) decisions[0] = { speakerKey: NARRATOR_SPEAKER_KEY, voiceCode: lockedMap.get(NARRATOR_SPEAKER_KEY)!, reason: "locked by admin" };
  const narratorCode = decisions[0].voiceCode;

  const assigned = new Map<string, string>();
  const coStars = (key: string) => new Set(params.sceneCharacters.filter((s) => s.includes(key)).flat().filter((k) => k !== key));

  // Speaking characters first so they get their best match.
  const ordered = [...params.characters].sort((a, b) => Number(b.speaks) - Number(a.speaks));
  for (const c of ordered) {
    const lockedCode = lockedMap.get(c.key);
    if (lockedCode) {
      assigned.set(c.key, lockedCode);
      decisions.push({ speakerKey: c.key, characterKey: c.key, voiceCode: lockedCode, reason: "locked by admin" });
      continue;
    }
    const { codes, reason } = preferences(c);
    const taken = new Set([...coStars(c.key)].map((k) => assigned.get(k)).filter((v): v is string => !!v));
    const candidates = [...codes, ...active].filter((code, i, arr) => arr.indexOf(code) === i && active.includes(code) && code !== narratorCode);
    const pick = candidates.find((code) => !taken.has(code)) ?? candidates[0] ?? narratorCode;
    assigned.set(c.key, pick);
    decisions.push({ speakerKey: c.key, characterKey: c.key, voiceCode: pick, reason: taken.has(codes[0]) ? `${reason}; first choice used by a co-appearing character` : reason });
  }
  return decisions;
}
