import type { Metadata } from "next";
import { Playfair_Display, DM_Sans, Open_Sans } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-playfair",
  display: "swap"
});

const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-open-sans",
  display: "swap"
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Budget Tourism — India travel guides",
    template: "%s | Budget Tourism"
  },
  description:
    "Budget Tourism is India's digital travel encyclopedia — destinations, hotels, restaurants, markets, weather and trip planning for every corner of India."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable} ${openSans.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
