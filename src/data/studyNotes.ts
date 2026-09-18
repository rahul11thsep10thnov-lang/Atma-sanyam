import { StudyNote, StateCode } from "@/types";
import { STATES } from "@/data/states";
import { getStateGkQuestions } from "@/data/questions";

const GENERAL_NOTES: StudyNote[] = [
  {
    id: "note-fundamental-rights",
    slug: "fundamental-rights",
    title: "Fundamental Rights (Maulik Adhikar)",
    subject: "polity",
    quickConcept: "Samvidhan ke Part III (Article 12-35) me Bharat ke nagrikon ko 6 maulik adhikar diye gaye hain.",
    importantFacts: [
      "Right to Equality — Article 14-18",
      "Right to Freedom — Article 19-22",
      "Right against Exploitation — Article 23-24",
      "Right to Freedom of Religion — Article 25-28",
      "Cultural and Educational Rights — Article 29-30",
      "Right to Constitutional Remedies — Article 32",
    ],
    revision: [
      "6 maulik adhikar yaad rakhein: Equality, Freedom, Against Exploitation, Religion, Culture-Education, Constitutional Remedies.",
      "Right to Property ab maulik adhikar nahi hai (44th Amendment ke baad, ab yeh legal right hai).",
      "Article 32 ko Dr. Ambedkar ne 'Heart and Soul' of Constitution kaha tha.",
    ],
    practiceQuestionIds: [],
  },
  {
    id: "note-parliament",
    slug: "parliament-basics",
    title: "Parliament — Ek Nazar Me",
    subject: "polity",
    quickConcept: "Bharatiya sansad me Rashtrapati, Lok Sabha aur Rajya Sabha shamil hain.",
    importantFacts: [
      "Lok Sabha — Jan Pratinidhi Sabha, seedhe janta dwara chuni jaati hai.",
      "Rajya Sabha — Rajyon ki Parishad, sthaayi sadan (permanent house), har 2 saal me 1/3 sadasya retire hote hain.",
      "Money Bill sirf Lok Sabha me pesh ho sakta hai.",
      "Rashtrapati sansad ka hissa hai lekin kisi sadan ka sadasya nahi hota.",
    ],
    revision: [
      "Lok Sabha = Lower House, Rajya Sabha = Upper House.",
      "Rajya Sabha bhang nahi hoti (dissolved nahi hoti).",
      "Sansad ke satra: Budget Session, Monsoon Session, Winter Session.",
    ],
    practiceQuestionIds: [],
  },
  {
    id: "note-president",
    slug: "president-of-india",
    title: "Rashtrapati (President of India)",
    subject: "polity",
    quickConcept: "Rashtrapati Bharat ka sanvaidhanik pramukh (constitutional head) hota hai.",
    importantFacts: [
      "Karyakal: 5 saal, phir se chunav lad sakte hain (koi seema nahi).",
      "Nirvachan: Electoral College dwara (Lok Sabha + Rajya Sabha + Rajya Vidhan Sabhaon ke nirvachit sadasya).",
      "Rashtrapati Bhavan, New Delhi unka aadhikarik nivas hai.",
      "Rashtrapati Teeno Sena (Army, Navy, Air Force) ke Supreme Commander hote hain.",
    ],
    revision: [
      "Rashtrapati ka mahabhiyog (impeachment) Article 61 ke tahat hota hai.",
      "Rashtrapati ko pad ki shapath Chief Justice of India dilate hain.",
    ],
    practiceQuestionIds: [],
  },
];

function buildStateGkNote(state: StateCode, hinglishName: string): StudyNote {
  const qs = getStateGkQuestions(state).slice(0, 6);
  return {
    id: `note-${state}-gk`,
    slug: `${state}-gk-quick-notes`,
    title: `${hinglishName} GK — Quick Revision Notes`,
    subject: "state-gk",
    state,
    quickConcept: `${hinglishName} Police exams me State GK ka bada weightage hota hai — geography, history, rivers, wildlife aur culture par focus karein.`,
    importantFacts: qs.map((q) => q.explanation),
    revision: [
      `${hinglishName} ki rajdhani, high court, jilon ki sankhya yaad rakhein.`,
      "State ke rivers, national parks aur lok nritya (folk dance) ki list bana lein.",
      "Exam se 1 din pehle sirf apne banaye hue short notes revise karein.",
    ],
    practiceQuestionIds: qs.map((q) => q.id),
  };
}

export const STUDY_NOTES: StudyNote[] = [
  ...GENERAL_NOTES,
  ...STATES.map((s) => buildStateGkNote(s.code, s.hinglishName)),
];

export const STUDY_NOTE_MAP: Record<string, StudyNote> = STUDY_NOTES.reduce(
  (acc, n) => {
    acc[n.slug] = n;
    return acc;
  },
  {} as Record<string, StudyNote>
);
