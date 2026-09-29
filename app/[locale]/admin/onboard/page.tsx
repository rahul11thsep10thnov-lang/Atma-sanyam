import type { Metadata } from "next";
import { getDb } from "@/lib/master/repo";
import { NewDestinationForm } from "@/components/admin/NewDestinationForm";

export const metadata: Metadata = { title: "Admin — Add destination" };

export default function OnboardPage() {
  const states = getDb().states.map((s) => ({ code: s.iso_code.replace(/^IN-/, ""), name: s.name })).sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-charcoal">Add a destination</h1>
      <p className="mt-1 max-w-3xl text-sm text-charcoal-light">
        Enter the facts you have; the pipeline validates them, mints a permanent ID, connects the place to its neighbours, drafts the page from stored records and checks it. This form runs a dry run and shows every step — a new record is stored through the database write path, not by editing pages.
      </p>
      <div className="mt-6"><NewDestinationForm states={states} /></div>
    </div>
  );
}
