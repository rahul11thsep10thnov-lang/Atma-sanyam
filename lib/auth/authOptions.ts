import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

/**
 * Providers are added only when their env vars are present, so the app
 * boots cleanly with zero auth configured (sign-in simply shows no
 * providers) rather than throwing at startup. Add more OAuth providers
 * here the same way once credentials are available.
 */
function buildProviders() {
  const providers: NextAuthOptions["providers"] = [];

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push(
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET
      })
    );
  }

  return providers;
}

export const authOptions: NextAuthOptions = {
  // A Prisma adapter is intentionally not wired in by default: NextAuth's
  // adapter tables (Account/Session/User/VerificationToken) already exist
  // in prisma/schema.prisma, so add `PrismaAdapter(prisma)` here once
  // DATABASE_URL points at a real, migrated database.
  session: { strategy: "jwt" },
  providers: buildProviders(),
  secret: process.env.NEXTAUTH_SECRET
};
