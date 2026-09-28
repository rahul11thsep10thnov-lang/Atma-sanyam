import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

/**
 * Wraps every public-facing page (homepage, search, and every content
 * page added from Phase 5 onward) with the shared Header/Footer shell.
 * `/admin/*` and `/api/*` are outside this route group and unaffected.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
