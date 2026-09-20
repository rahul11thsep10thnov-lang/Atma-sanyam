import type { Metadata } from "next";
import { NewDestinationForm } from "@/components/admin/NewDestinationForm";

export const metadata: Metadata = { title: "Admin — Add Destination" };

export default function NewDestinationPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-charcoal">Add destination</h1>
      <p className="mt-1 text-sm text-charcoal-light">
        This form validates input and posts to /api/admin/destinations. Connect DATABASE_URL and admin auth to persist.
      </p>
      <div className="mt-4">
        <NewDestinationForm />
      </div>
    </div>
  );
}
