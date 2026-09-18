import { ExamUpdate, StateCode, ExamType } from "@/types";
import { STATES } from "@/data/states";

// Sample/demo placeholders — no real notification data is fabricated here.
// Replace with verified entries (with source links) via the admin panel as
// each state's recruitment board publishes real updates.
function buildUpdatesForProfile(state: StateCode, exam: ExamType): ExamUpdate[] {
  return [
    {
      id: `${state}-${exam}-update-notification`,
      state,
      exam,
      type: "notification",
      title: `${exam === "constable" ? "Constable" : "SI"} bharti notification ka status`,
      date: "2026-01-01",
      status: "Official notification ka wait karein",
      source: "Demo/Sample placeholder",
      isSample: true,
    },
    {
      id: `${state}-${exam}-update-admit-card`,
      state,
      exam,
      type: "admit_card",
      title: `${exam === "constable" ? "Constable" : "SI"} admit card update`,
      date: "2026-01-01",
      status: "Data abhi available nahi hai",
      source: "Demo/Sample placeholder",
      isSample: true,
    },
    {
      id: `${state}-${exam}-update-result`,
      state,
      exam,
      type: "result",
      title: `${exam === "constable" ? "Constable" : "SI"} result update`,
      date: "2026-01-01",
      status: "Data abhi available nahi hai",
      source: "Demo/Sample placeholder",
      isSample: true,
    },
  ];
}

export const EXAM_UPDATES: ExamUpdate[] = STATES.flatMap((s) => [
  ...buildUpdatesForProfile(s.code, "constable"),
  ...buildUpdatesForProfile(s.code, "si"),
]);

export function getUpdatesForProfile(state: StateCode, exam: ExamType): ExamUpdate[] {
  return EXAM_UPDATES.filter((u) => u.state === state && u.exam === exam);
}

export function getRecentUpdates(limit = 10): ExamUpdate[] {
  return EXAM_UPDATES.slice(0, limit);
}
