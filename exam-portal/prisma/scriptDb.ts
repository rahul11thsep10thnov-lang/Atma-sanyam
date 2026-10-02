// A Prisma client for one-off scripts (seedAdmin.ts, seedContent.ts) run
// directly via `tsx`, outside Next.js's bundler.
//
// src/lib/db/client.ts (the client every Server Component/Action/route
// handler uses) starts with `import "server-only"` — a marker package
// that resolves to a no-op under Next.js's "react-server" bundler
// condition, but to a module that unconditionally throws under plain
// Node/tsx, which don't set that condition. A script importing that file
// directly fails every time with "This module cannot be imported from a
// Client Component module," regardless of environment. This file
// duplicates the ~10 lines of client setup without the server-only guard
// so scripts can use Prisma without hitting that.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
export const prisma = new PrismaClient({ adapter });
