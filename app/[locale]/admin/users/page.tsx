import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";

export const metadata: Metadata = { title: "Admin — Users" };

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-charcoal">Users</h1>
      <p className="mt-1 text-sm text-charcoal-light">
        Users are modeled by NextAuth&apos;s standard tables plus a <code className="rounded bg-forest-100 px-1">role</code>{" "}
        field (USER/ADMIN/MODERATOR) in <code className="rounded bg-forest-100 px-1">prisma/schema.prisma</code>. Connect
        DATABASE_URL and enable a provider (see .env.example) to see and manage real accounts here.
      </p>
      <div className="mt-6 card-surface p-4">
        <p className="text-sm font-medium text-charcoal">Current session</p>
        <p className="mt-1 text-sm text-charcoal-light">
          {session?.user ? `${session.user.email ?? session.user.name} (role check not yet wired to Prisma)` : "Not signed in"}
        </p>
      </div>
    </div>
  );
}
