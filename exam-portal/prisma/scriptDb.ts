// Prisma client for one-off scripts (seedAdmin.ts, seedContent.ts,
// seedSources.ts) run directly via `tsx`, outside Next.js's bundler.
//
// src/lib/db/client.ts starts with `import "server-only"` — a marker that
// is a no-op under Next's "react-server" bundler condition but throws
// unconditionally under plain Node/tsx. The underlying client lives in
// src/lib/db/prisma.ts without the guard, so scripts share the exact same
// setup instead of duplicating it.
export { prisma } from "../src/lib/db/prisma";
