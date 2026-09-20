export interface NavItem {
  label: string;
  href: string;
}

export const MAIN_NAV: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Exams", href: "/exams" },
  { label: "Practice", href: "/practice" },
  { label: "Mock Test", href: "/mock-test" },
  { label: "PYQ", href: "/pyq" },
  { label: "State GK", href: "/state-gk" },
  { label: "Current Affairs", href: "/current-affairs" },
  { label: "Physical Test", href: "/physical-test" },
  { label: "Exam Updates", href: "/exam-updates" },
  { label: "Study Notes", href: "/study-notes" },
  { label: "Results", href: "/dashboard" },
];

export const MOBILE_NAV: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Exams", href: "/exams" },
  { label: "Practice", href: "/practice" },
  { label: "Mock", href: "/mock-test" },
  { label: "More", href: "/more" },
];

export const MORE_NAV: NavItem[] = [
  { label: "PYQ", href: "/pyq" },
  { label: "State GK", href: "/state-gk" },
  { label: "Daily Quiz", href: "/daily-quiz" },
  { label: "Current Affairs", href: "/current-affairs" },
  { label: "Physical Test", href: "/physical-test" },
  { label: "Study Notes", href: "/study-notes" },
  { label: "Smart Tricks", href: "/tricks" },
  { label: "Exam Updates", href: "/exam-updates" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "My Dashboard", href: "/dashboard" },
  { label: "My Bookmarks", href: "/dashboard/bookmarks" },
  { label: "Meri Mistakes", href: "/dashboard/mistakes" },
  { label: "Search", href: "/search" },
  { label: "Admin Panel", href: "/admin" },
];

export interface NavSection {
  label: string;
  items: NavItem[];
}

// Grouped sections shown in the full-screen mobile menu drawer.
export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Practice",
    items: [
      { label: "Quick Practice", href: "/practice" },
      { label: "Mock Tests", href: "/mock-test" },
      { label: "PYQ", href: "/pyq" },
      { label: "Aaj ka Quiz", href: "/daily-quiz" },
    ],
  },
  {
    label: "Learn",
    items: [
      { label: "State GK", href: "/state-gk" },
      { label: "Study Notes", href: "/study-notes" },
      { label: "Current Affairs", href: "/current-affairs" },
      { label: "Smart Tricks", href: "/tricks" },
      { label: "Physical Test", href: "/physical-test" },
    ],
  },
  {
    label: "Exams",
    items: [
      { label: "All Exams", href: "/exams" },
      { label: "Police Constable", href: "/exams/constable" },
      { label: "Police SI", href: "/exams/si" },
      { label: "Exam Updates", href: "/exam-updates" },
    ],
  },
  {
    label: "My Account",
    items: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "My Bookmarks", href: "/dashboard/bookmarks" },
      { label: "Meri Mistakes", href: "/dashboard/mistakes" },
      { label: "Leaderboard", href: "/leaderboard" },
    ],
  },
];
