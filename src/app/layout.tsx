import type { Metadata, Viewport } from "next";
import { Rubik, Hind } from "next/font/google";
import "./globals.css";
import SiteChrome from "@/components/layout/SiteChrome";

// Rubik: rounded, bold UI/heading face (labels, buttons, titles).
// Hind: clean body face with first-class Devanagari support for Hinglish/Hindi.
const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const hind = Hind({
  variable: "--font-hind",
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "600"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

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
      className={`${rubik.variable} ${hind.variable} h-full antialiased`}
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
