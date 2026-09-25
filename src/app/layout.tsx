import type { Metadata } from "next";
import { Geist, Geist_Mono, Baloo_2, Inter } from "next/font/google";
import "./globals.css";
import SiteChrome from "@/components/layout/SiteChrome";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Bold, rounded, friendly display face for headings/logo — gives the site a
// warmer "exam-prep app" feel for headings, distinct from our body text font.
const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

// Clean, neutral face used specifically inside exam-taking screens (mock
// test / question palette / timer) — deliberately NOT the rounded display
// font, since exam UI needs to read as serious/professional rather than
// playful. See `.exam-shell` in globals.css.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const SITE_URL = "https://policeexams.example.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "PoliceExams — Police Constable & SI ki taiyari",
    template: "%s | PoliceExams",
  },
  description:
    "UP, MP, Rajasthan, Bihar, Jharkhand, Uttarakhand, Haryana, Punjab aur Chhattisgarh Police Constable & SI exams ke liye simple practice, mock tests, PYQs aur state-wise preparation.",
  openGraph: {
    title: "PoliceExams — Police Constable & SI ki taiyari",
    description:
      "Simple, Smart aur State-wise Police Constable & SI exam preparation — practice, mock tests, PYQs, state GK aur bahut kuch.",
    siteName: "PoliceExams",
    type: "website",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "PoliceExams — Police Constable & SI ki taiyari",
    description:
      "Simple, Smart aur State-wise Police Constable & SI exam preparation.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "PoliceExams",
  url: SITE_URL,
  description:
    "Police Constable & SI ki taiyari — Simple, Smart aur State-wise exam preparation platform for UP, MP, Rajasthan, Bihar, Jharkhand, Uttarakhand, Haryana, Punjab aur Chhattisgarh.",
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/search?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${baloo.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
