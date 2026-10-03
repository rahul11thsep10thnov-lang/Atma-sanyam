/**
 * Keeps the CMS store off the client. The `server-only` marker package throws
 * under plain Node (scripts, verify:engine), so this runtime guard is used
 * instead: importing a CMS module in the browser fails loudly, Node is fine.
 */
if (typeof window !== "undefined") {
  throw new Error("lib/cms modules are server-only and must not be imported from a Client Component.");
}
export {};
