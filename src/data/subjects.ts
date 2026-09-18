import { Subject } from "@/types";

export const SUBJECTS: Subject[] = [
  { id: "gk", name: "General Knowledge", hinglishName: "General Knowledge" },
  { id: "science", name: "General Science", hinglishName: "General Science" },
  { id: "history", name: "Indian History", hinglishName: "Indian History" },
  { id: "geography", name: "Geography", hinglishName: "Geography" },
  { id: "polity", name: "Indian Polity", hinglishName: "Indian Polity" },
  { id: "constitution", name: "Constitution", hinglishName: "Constitution" },
  { id: "current-affairs", name: "Current Affairs", hinglishName: "Current Affairs" },
  { id: "maths", name: "Mathematics", hinglishName: "Maths" },
  { id: "reasoning", name: "Reasoning", hinglishName: "Reasoning" },
  { id: "hindi", name: "Hindi", hinglishName: "Hindi" },
  { id: "english", name: "English", hinglishName: "English" },
  { id: "computer", name: "Computer", hinglishName: "Computer" },
  { id: "state-gk", name: "State GK", hinglishName: "State GK" },
  { id: "police-law", name: "Police / Law-related Topics", hinglishName: "Police & Law Basics" },
];

export const SUBJECT_MAP: Record<string, Subject> = SUBJECTS.reduce(
  (acc, s) => {
    acc[s.id] = s;
    return acc;
  },
  {} as Record<string, Subject>
);
