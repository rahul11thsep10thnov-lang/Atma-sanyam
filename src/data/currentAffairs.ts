import { CurrentAffairItem } from "@/types";

// NOTE: We deliberately do not fabricate dated "breaking news" items (rule:
// never present unverified news as fact). These are a handful of clearly
// labelled sample entries so the Current Affairs UI has something to render
// out of the box. Real, time-sensitive current affairs should be added by
// the admin panel with a verified source and date.
export const CURRENT_AFFAIRS: CurrentAffairItem[] = [
  {
    id: "ca-sample-1",
    date: "2026-01-01",
    category: "police",
    title: "[Sample] Police bharti exams me CBT mode ka vistaar",
    summary:
      "Kai states apne Police Constable/SI exams ko dheere-dheere Computer Based Test (CBT) mode me shift kar rahe hain. Yeh ek sample/demo entry hai — apne state ka latest update 'Exam Updates' section me dekhein.",
    source: "Demo/Sample entry — verify from official board website",
  },
  {
    id: "ca-sample-2",
    date: "2026-01-01",
    category: "daily",
    title: "[Sample] Daily Current Affairs yahan dikhega",
    summary:
      "Admin panel se roz ke verified current affairs items yahan publish honge. Abhi yeh ek placeholder/sample entry hai.",
    source: "Demo/Sample entry",
  },
  {
    id: "ca-sample-3",
    date: "2026-01-01",
    category: "state",
    title: "[Sample] State-wise Current Affairs section",
    summary:
      "Har state ke liye alag current affairs feed yahan available hoga — government schemes, appointments, state-level events.",
    source: "Demo/Sample entry",
  },
];
