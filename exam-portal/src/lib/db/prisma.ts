import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * The one PrismaClient instance, importable from anywhere that runs on
 * Node: Next.js server code (via `./client`, which adds the `server-only`
 * guard), the pipeline worker, one-off scripts and tests. Cached on
 * `globalThis` outside production so dev hot-reloads don't open a new
 * pool per reload.
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
