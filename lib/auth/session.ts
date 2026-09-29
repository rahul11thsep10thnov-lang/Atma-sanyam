import { getServerSession, type Session } from "next-auth";
import { authOptions } from "./authOptions";

/**
 * Session lookup that never throws: with auth unconfigured (no NEXTAUTH_SECRET) NextAuth raises a
 * configuration error, and pages that merely *optionally* show account UI must still render.
 */
export async function safeSession(): Promise<Session | null> {
  try {
    return await getServerSession(authOptions);
  } catch {
    return null;
  }
}
