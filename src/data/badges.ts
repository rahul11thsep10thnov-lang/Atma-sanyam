export interface BadgeDef {
  code: string;
  name: string;
  description: string;
  icon: string;
}

export const BADGES: BadgeDef[] = [
  { code: "streak-7", name: "7 Day Streak", description: "Lagatar 7 din Daily Quiz khela", icon: "flame" },
  { code: "questions-100", name: "100 Questions", description: "100 questions attempt kiye", icon: "target" },
  { code: "questions-500", name: "500 Questions", description: "500 questions attempt kiye", icon: "target" },
  { code: "questions-1000", name: "1000 Questions", description: "1000 questions attempt kiye", icon: "target" },
  { code: "state-gk-master", name: "State GK Master", description: "State GK me 90%+ accuracy", icon: "map" },
  { code: "mock-master", name: "Mock Master", description: "5 Full Mock Tests complete kiye", icon: "trophy" },
  { code: "consistency-star", name: "Consistency Star", description: "30 din me kam se kam 20 baar practice ki", icon: "star" },
];
