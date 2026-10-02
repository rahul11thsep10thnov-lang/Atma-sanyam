import "server-only";

/**
 * Centralized database access point for the Next.js app.
 *
 * Every Server Component / Server Action / route handler imports `prisma`
 * from here — never instantiate PrismaClient directly elsewhere, and never
 * run raw queries from inside a UI component. The `server-only` marker
 * makes any accidental import from a Client Component a build error.
 *
 * Code that also runs outside Next's bundler (the pipeline worker,
 * `prisma/*.ts` scripts, vitest) imports `./prisma` instead: the marker
 * package throws unconditionally under plain Node, where there is no
 * client/server distinction to guard.
 */
export { prisma } from "./prisma";
