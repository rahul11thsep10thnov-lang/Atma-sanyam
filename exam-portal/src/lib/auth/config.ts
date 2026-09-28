import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";
import { z } from "zod";
import { authenticateAdmin } from "@/lib/services/adminAuth";
import { env } from "@/lib/env";

const credentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
});

/**
 * NextAuth (Auth.js) v4 configuration for the admin CMS only. Public site
 * visitors don't need to sign in to browse/search — this is exclusively
 * for `/admin/*`.
 *
 * Session is a signed JWT cookie (no server-side session table): the
 * token carries the admin's id and role so every request can check
 * authorization without a database round trip, and `session()` copies
 * those onto `session.user` for Server Components/Server Actions to read.
 */
export const authConfig: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 12 * 60 * 60 }, // 12 hours
  secret: env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/admin/login",
  },
  providers: [
    CredentialsProvider({
      name: "Admin credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const result = await authenticateAdmin(
          parsed.data.email,
          parsed.data.password,
        );
        if (!result.ok) {
          // NextAuth's credentials flow only supports a single generic
          // failure signal per attempt — returning null here is that
          // signal. We deliberately don't leak *why* it failed (unknown
          // email vs. wrong password vs. locked) to the client beyond
          // what the login form already shows for every failure case.
          return null;
        }

        return {
          id: result.admin.id,
          email: result.admin.email,
          name: result.admin.name,
          role: result.admin.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.adminId = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.adminId;
      session.user.role = token.role;
      return session;
    },
  },
};
