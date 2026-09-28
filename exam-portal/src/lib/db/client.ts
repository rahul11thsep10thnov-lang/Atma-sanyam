import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Centralized database access point.
 *
 * Every server-side module that needs the database imports `prisma` from
 * here — never instantiate PrismaClient directly elsewhere, and never run
 * raw queries from inside a UI component or route handler body. This keeps
 * connection pooling correct in serverless/Next.js dev (hot reload would
 * otherwise open a new pool per reload) and gives us one place to add
 * middleware (e.g. audit-log hooks) later.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
