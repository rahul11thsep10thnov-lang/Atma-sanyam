import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Reviews" };

export default function AdminReviewsPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-charcoal">Review moderation</h1>
      <p className="mt-1 text-sm text-charcoal-light">
        Reviews are modeled in <code className="rounded bg-forest-100 px-1">prisma/schema.prisma</code> (
        <code className="rounded bg-forest-100 px-1">Review</code>, status PENDING/APPROVED/REJECTED/FLAGGED) and
        accepted for validation by <code className="rounded bg-forest-100 px-1">POST /api/reviews</code>. Connect
        DATABASE_URL to see submitted reviews here and approve, reject or flag them.
      </p>
      <div className="mt-6 card-surface p-8 text-center text-sm text-charcoal-light">
        No reviews yet — none have been persisted because no database is connected in this environment.
      </div>
    </div>
  );
}
