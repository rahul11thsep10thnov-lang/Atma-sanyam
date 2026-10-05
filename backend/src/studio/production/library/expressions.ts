import { Expression } from "../../engine25d/spec";

/** Face parameters used by the procedural rig painter (and as prompt words for AI variants). */
export interface FaceParams {
  browTilt: number; // -1 (sad, inner up) … +1 (angry, inner down)
  browRaise: number; // 0 … 1
  eyeOpen: number; // 0.2 … 1.3
  mouthCurve: number; // -1 frown … +1 smile
  mouthOpen: number; // 0 … 1
  tears: boolean;
  prompt: string;
}

export const EXPRESSION_LIBRARY: Record<Expression, FaceParams> = {
  neutral: { browTilt: 0, browRaise: 0.2, eyeOpen: 1, mouthCurve: 0, mouthOpen: 0, tears: false, prompt: "neutral calm expression" },
  happy: { browTilt: 0, browRaise: 0.35, eyeOpen: 0.85, mouthCurve: 0.9, mouthOpen: 0.2, tears: false, prompt: "gentle smile" },
  sad: { browTilt: -0.8, browRaise: 0.4, eyeOpen: 0.7, mouthCurve: -0.6, mouthOpen: 0, tears: false, prompt: "sad expression, downcast eyes" },
  angry: { browTilt: 0.9, browRaise: 0, eyeOpen: 0.9, mouthCurve: -0.5, mouthOpen: 0.15, tears: false, prompt: "angry frown" },
  fearful: { browTilt: -0.6, browRaise: 0.9, eyeOpen: 1.25, mouthCurve: -0.3, mouthOpen: 0.35, tears: false, prompt: "fearful wide eyes" },
  surprised: { browTilt: 0, browRaise: 1, eyeOpen: 1.3, mouthCurve: 0, mouthOpen: 0.6, tears: false, prompt: "surprised raised eyebrows" },
  confused: { browTilt: 0.4, browRaise: 0.6, eyeOpen: 1, mouthCurve: -0.15, mouthOpen: 0.05, tears: false, prompt: "confused expression" },
  worried: { browTilt: -0.7, browRaise: 0.6, eyeOpen: 0.95, mouthCurve: -0.35, mouthOpen: 0, tears: false, prompt: "worried furrowed brow" },
  suspicious: { browTilt: 0.6, browRaise: 0.1, eyeOpen: 0.6, mouthCurve: -0.1, mouthOpen: 0, tears: false, prompt: "suspicious narrowed eyes" },
  determined: { browTilt: 0.5, browRaise: 0.1, eyeOpen: 0.9, mouthCurve: -0.1, mouthOpen: 0, tears: false, prompt: "determined firm expression" },
  crying: { browTilt: -0.9, browRaise: 0.5, eyeOpen: 0.4, mouthCurve: -0.8, mouthOpen: 0.3, tears: true, prompt: "crying, tears" },
  shocked: { browTilt: -0.2, browRaise: 1, eyeOpen: 1.3, mouthCurve: -0.2, mouthOpen: 0.8, tears: false, prompt: "shocked open mouth" },
  disappointed: { browTilt: -0.5, browRaise: 0.2, eyeOpen: 0.75, mouthCurve: -0.5, mouthOpen: 0, tears: false, prompt: "disappointed expression" },
  relieved: { browTilt: -0.2, browRaise: 0.3, eyeOpen: 0.8, mouthCurve: 0.5, mouthOpen: 0.05, tears: false, prompt: "relieved soft smile" },
  excited: { browTilt: 0, browRaise: 0.8, eyeOpen: 1.15, mouthCurve: 1, mouthOpen: 0.5, tears: false, prompt: "excited expression" },
};

const TONE_TO_EXPRESSION: [RegExp, Expression][] = [
  [/\b(cried|crying|weep|tears|sobbing)\b/i, "crying"],
  [/\b(shock|stunned|horrified)\b/i, "shocked"],
  [/\b(afraid|scared|fear|terrified|threat)\b/i, "fearful"],
  [/\b(angry|furious|quarrel|argument|harass)/i, "angry"],
  [/\b(worried|anxious|missing|waiting|concern)/i, "worried"],
  [/\b(suspect|suspicious|doubt)/i, "suspicious"],
  [/\b(relieved|safe|found safe|reunited)\b/i, "relieved"],
  [/\b(determined|vowed|insisted|demanded justice)\b/i, "determined"],
  [/\b(disappointed|let down)\b/i, "disappointed"],
  [/\b(confused|unclear)\b/i, "confused"],
  [/\b(happy|celebrat|smil)/i, "happy"],
  [/\b(sad|grief|mourn|somber|died|death)\b/i, "sad"],
];

/** Chooses a restrained expression from the scene tone and text (news context: never exaggerated). */
export function chooseExpression(text: string, tone: string): Expression {
  for (const [re, expr] of TONE_TO_EXPRESSION) if (re.test(text)) return expr;
  if (tone === "somber") return "sad";
  if (tone === "serious") return "worried";
  return "neutral";
}
