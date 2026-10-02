import "dotenv/config";
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // The pipeline integration test spins up a loopback server and hits
    // the real database; give it room.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
