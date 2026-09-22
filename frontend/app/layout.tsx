import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Whiteboard Teacher Studio",
  description: "Turn teaching material into faceless whiteboard lesson videos.",
};

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/lessons", label: "Lessons" },
  { href: "/batches", label: "Batches" },
  { href: "/voices", label: "Voices" },
  { href: "/settings", label: "Settings" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex">
          <aside className="w-56 shrink-0 border-r border-[#e6e4dd] bg-white px-4 py-6">
            <div className="text-base font-semibold text-slate-900 mb-8 px-2">
              Whiteboard Teacher Studio
            </div>
            <nav className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>
          <main className="flex-1 px-8 py-8 max-w-5xl">{children}</main>
        </div>
      </body>
    </html>
  );
}
