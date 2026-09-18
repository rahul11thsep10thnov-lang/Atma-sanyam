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
