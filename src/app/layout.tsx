import type { Metadata } from "next";
import { Geist, Geist_Mono, Baloo_2 } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";

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
      className={`${geistSans.variable} ${geistMono.variable} ${baloo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col has-mobile-nav">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <MobileNav />
      </body>
    </html>
  );
}
