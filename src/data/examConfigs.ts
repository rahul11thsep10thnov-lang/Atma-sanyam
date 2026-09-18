import { ExamConfig, OfficialFact, StateCode, ExamType } from "@/types";
import { STATE_MAP } from "@/data/states";

const UNAVAILABLE = "Official notification ka wait karein.";
const INDICATIVE_NOTE =
  "Indicative hai — pichhle recruitment cycles ke pattern par based. Latest official notification se zaroor verify karein.";

function unavailable<T>(): OfficialFact<T> {
  return { value: null, sourceNote: UNAVAILABLE };
}

function indicative<T>(value: T, note = INDICATIVE_NOTE): OfficialFact<T> {
  return { value, sourceNote: note };
}

const COMMON_SELECTION_CONSTABLE = [
  "Written / Computer Based Exam",
  "Physical Efficiency Test (PET)",
  "Physical Standard Test (PST)",
  "Document Verification",
  "Medical Examination",
];

const COMMON_SELECTION_SI = [
  "Written / Computer Based Exam",
  "Physical Efficiency Test (PET)",
  "Physical Standard Test (PST)",
  "Interview / Personality Test (kahin-kahin applicable)",
  "Document Verification",
  "Medical Examination",
];

const CONSTABLE_SYLLABUS = (stateName: string) => [
  { subject: "General Knowledge & Current Affairs", topics: ["India GK", "Current Affairs", "Sports", "Awards"] },
  { subject: "General Hindi", topics: ["Vyakaran", "Sandhi", "Samas", "Muhavare"] },
  { subject: "Numerical & Mental Ability (Maths)", topics: ["Percentage", "Average", "Profit-Loss", "Simplification", "Time-Speed-Distance"] },
  { subject: "Mental Aptitude / Reasoning", topics: ["Series", "Coding-Decoding", "Blood Relation", "Direction Sense", "Analogy"] },
  { subject: `${stateName} GK`, topics: ["History", "Geography", "Culture", "Government Schemes"] },
];

const SI_SYLLABUS = (stateName: string) => [
  { subject: "General Knowledge & Current Affairs", topics: ["India GK", "Current Affairs", "Static GK"] },
  { subject: "General Hindi", topics: ["Vyakaran", "Sandhi", "Samas", "Muhavare", "Apathit Gadyansh"] },
  { subject: "Numerical Ability (Maths)", topics: ["Percentage", "Average", "Profit-Loss", "Simplification", "Ratio-Proportion", "Data Interpretation"] },
  { subject: "Reasoning / Mental Aptitude", topics: ["Series", "Coding-Decoding", "Syllogism", "Blood Relation", "Analytical Reasoning"] },
  { subject: "General Science", topics: ["Physics Basics", "Chemistry Basics", "Biology Basics"] },
  { subject: "Indian Polity & Constitution", topics: ["Fundamental Rights", "Parliament", "President", "Judiciary"] },
  { subject: `${stateName} GK`, topics: ["History", "Geography", "Culture", "Administration"] },
];

interface Blueprint {
  state: StateCode;
  malePET: string;
  femalePET: string;
  heightMaleGeneral: string;
  heightFemaleGeneral: string;
  chestMaleGeneral: string;
}

const BLUEPRINTS: Record<StateCode, Blueprint> = {
  up: {
    state: "up",
    malePET: "4.8 km daud 25 minute me (indicative)",
    femalePET: "2.4 km daud 14 minute me (indicative)",
    heightMaleGeneral: "168 cm (indicative)",
    heightFemaleGeneral: "152 cm (indicative)",
    chestMaleGeneral: "79-84 cm (indicative)",
  },
  mp: {
    state: "mp",
    malePET: "800 meter daud (indicative)",
    femalePET: "800 meter daud, kam time limit (indicative)",
    heightMaleGeneral: "168 cm (indicative)",
    heightFemaleGeneral: "155 cm (indicative)",
    chestMaleGeneral: "81-86 cm (indicative)",
  },
  rajasthan: {
    state: "rajasthan",
    malePET: "5 km daud 25 minute me (indicative)",
    femalePET: "5 km daud, zyada time limit (indicative)",
    heightMaleGeneral: "168 cm (indicative)",
    heightFemaleGeneral: "158 cm (indicative)",
    chestMaleGeneral: "81-86 cm (indicative)",
  },
  bihar: {
    state: "bihar",
    malePET: "1.6 km daud time-bound (indicative)",
    femalePET: "1 km daud time-bound (indicative)",
    heightMaleGeneral: "165 cm (indicative)",
    heightFemaleGeneral: "155 cm (indicative)",
    chestMaleGeneral: "81-86 cm (indicative)",
  },
  jharkhand: {
    state: "jharkhand",
    malePET: "daud + long jump + high jump (indicative)",
    femalePET: "daud + long jump + high jump, relaxed standard (indicative)",
    heightMaleGeneral: "165-168 cm (indicative)",
    heightFemaleGeneral: "155 cm (indicative)",
    chestMaleGeneral: "81-86 cm (indicative)",
  },
  uttarakhand: {
    state: "uttarakhand",
    malePET: "4.8 km daud time-bound (indicative)",
    femalePET: "2.4 km daud time-bound (indicative)",
    heightMaleGeneral: "168 cm (indicative)",
    heightFemaleGeneral: "152 cm (indicative)",
    chestMaleGeneral: "79-84 cm (indicative)",
  },
  haryana: {
    state: "haryana",
    malePET: "2.5 km daud time-bound (indicative)",
    femalePET: "1 km daud time-bound (indicative)",
    heightMaleGeneral: "170 cm (indicative)",
    heightFemaleGeneral: "158 cm (indicative)",
    chestMaleGeneral: "83-87 cm (indicative)",
  },
  punjab: {
    state: "punjab",
    malePET: "2.5 km daud time-bound (indicative)",
    femalePET: "1 km daud time-bound (indicative)",
    heightMaleGeneral: "168-170 cm (indicative)",
    heightFemaleGeneral: "155-158 cm (indicative)",
    chestMaleGeneral: "81-86 cm (indicative)",
  },
  chhattisgarh: {
    state: "chhattisgarh",
    malePET: "800 meter daud time-bound (indicative)",
    femalePET: "800 meter daud, relaxed time (indicative)",
    heightMaleGeneral: "168 cm (indicative)",
    heightFemaleGeneral: "155 cm (indicative)",
    chestMaleGeneral: "81-86 cm (indicative)",
  },
};

function buildConfig(state: StateCode, exam: ExamType): ExamConfig {
  const s = STATE_MAP[state];
  const bp = BLUEPRINTS[state];
  const isConstable = exam === "constable";
  const examLabel = isConstable ? "Constable" : "Sub-Inspector (SI)";
  const slug = `${state}-police-${exam}`;

  return {
    state,
    exam,
    slug,
    title: `${s.hinglishName} Police ${examLabel}`,
    overview: `${s.hinglishName} Police ${examLabel} bharti ${s.policeBoardName} (${s.policeBoardShort}) dwara conduct ki jaati hai. Ismein written exam, physical test aur document/medical verification hota hai. Is page par aapko syllabus, pattern, PYQ, mock tests aur state GK ek hi jagah milega.`,
    eligibility: isConstable
      ? `Bharatiya nagrik, ${s.hinglishName} domicile requirement kahin-kahin applicable (official notification me confirm karein), sharirik evam medical standards poore karne honge.`
      : `Bharatiya nagrik, graduate hona zaroori (general requirement), sharirik evam medical standards poore karne honge. Domicile requirement official notification se verify karein.`,
    ageLimit: indicative(
      isConstable ? "18 - 22/23 saal (category-wise relaxation possible)" : "21 - 30 saal (category-wise relaxation possible)"
    ),
    educationalQualification: indicative(
      isConstable ? "10+2 (Intermediate) ya equivalent" : "Graduation (kisi bhi stream se)"
    ),
    vacancy: unavailable<number>(),
    applicationStart: unavailable<string>(),
    applicationEnd: unavailable<string>(),
    examDate: unavailable<string>(),
    pattern: {
      mode: "Computer Based Test (CBT) / OMR — state ke notification ke anusar",
      totalQuestions: indicative(isConstable ? 150 : 200),
      totalMarks: indicative(isConstable ? 300 : 200),
      durationMinutes: indicative(isConstable ? 120 : 120),
      negativeMarking: indicative(isConstable ? "Kai states me nahi hoti — apne state ka notification check karein" : "Kahin-kahin 0.25 se 0.5 marks tak — apne state ka notification check karein"),
      sections: [],
    },
    syllabus: isConstable ? CONSTABLE_SYLLABUS(s.hinglishName) : SI_SYLLABUS(s.hinglishName),
    physicalStandards: [
      { category: "Male (General)", height: bp.heightMaleGeneral, chest: bp.chestMaleGeneral },
      { category: "Female (General)", height: bp.heightFemaleGeneral },
      { category: "SC/ST/OBC/Reserved categories", height: "Category-wise relaxation applicable — official notification dekhein" },
    ],
    physicalEfficiency: [
      { event: "Running (Male)", standard: bp.malePET },
      { event: "Running (Female)", standard: bp.femalePET },
      { event: "Long Jump / High Jump", standard: "State-specific — official notification me detail milega" },
    ],
    medicalRequirements:
      "Aankhon ki roshni, sunne ki shakti, general fitness aur koi bhi disqualifying medical condition na hona zaroori hai. Exact medical standards ke liye official notification zaroor dekhein.",
    selectionProcess: isConstable ? COMMON_SELECTION_CONSTABLE : COMMON_SELECTION_SI,
    cutoffNote: UNAVAILABLE,
    admitCardNote:
      "Admit card official website par recruitment board dwara release hone ke baad hi download hoga. Yahan hum aapko update ka status dikhayenge.",
    resultNote: UNAVAILABLE,
    officialNotificationUrl: undefined,
    lastVerified: "2026-01",
  };
}

export const EXAM_CONFIGS: ExamConfig[] = (Object.keys(STATE_MAP) as StateCode[]).flatMap((state) => [
  buildConfig(state, "constable"),
  buildConfig(state, "si"),
]);

export const EXAM_CONFIG_MAP: Record<string, ExamConfig> = EXAM_CONFIGS.reduce(
  (acc, c) => {
    acc[c.slug] = c;
    return acc;
  },
  {} as Record<string, ExamConfig>
);

export function getExamConfig(slug: string): ExamConfig | undefined {
  return EXAM_CONFIG_MAP[slug];
}

export function getExamConfigsForState(state: StateCode): ExamConfig[] {
  return EXAM_CONFIGS.filter((c) => c.state === state);
}
