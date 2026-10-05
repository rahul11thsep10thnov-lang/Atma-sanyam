import type { Metadata } from "next";
import { Josefin_Sans, Nunito, Tillana, Kalam, Rye, Lobster, Rozha_One } from "next/font/google";
import "./globals.css";
import { SITE_NAME, SITE_DESCRIPTION, SITE_URL } from "@/lib/siteConfig";
import { BackgroundWatermark } from "@/components/layout/BackgroundWatermark";

// Headings everywhere (see globals.css h1–h6 rule).
const josefinSans = Josefin_Sans({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

// Body/content text everywhere (wired to Tailwind's --font-sans).
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

// Sanskrit shloka in the motto band.
const tillana = Tillana({
  variable: "--font-tillana",
  subsets: ["devanagari", "latin"],
  weight: ["400", "500"],
});

// Hindi translation in the motto band.
const kalam = Kalam({
  variable: "--font-kalam",
  subsets: ["devanagari", "latin"],
  weight: ["400"],
});

// "Rahul Heading" — marquee lettering for the site name and the tabs.
const rye = Rye({ variable: "--font-rahul", subsets: ["latin"], weight: ["400"] });

// Funky, curvy celebratory lettering for "FELICITATION BOARD".
// Hero tagline (Devanagari display face).
const rozha = Rozha_One({ variable: "--font-rozha", subsets: ["devanagari", "latin"], weight: ["400"] });

const lobster = Lobster({ variable: "--font-festive", subsets: ["latin"], weight: ["400"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s — ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${josefinSans.variable} ${nunito.variable} ${tillana.variable} ${kalam.variable} ${rye.variable} ${lobster.variable} ${rozha.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <BackgroundWatermark />
        <div className="website-content flex min-h-full flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
