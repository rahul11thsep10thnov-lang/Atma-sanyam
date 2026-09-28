import "server-only";
import { z } from "zod";

/**
 * Single source of truth for required environment variables.
 *
 * Importing this module throws immediately with a clear message if a
 * required variable is missing/malformed, instead of failing later with a
 * confusing runtime error deep inside some unrelated code path.
 */
const envSchema = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  NEXTAUTH_SECRET: z
    .string()
    .min(32, "NEXTAUTH_SECRET must be at least 32 characters — generate one with `openssl rand -base64 32`"),
  NEXTAUTH_URL: z.url().optional(),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Invalid/missing environment variables:\n${issues}\n\nCopy .env.example to .env and fill in the required values.`,
    );
  }
  return parsed.data;
}

export const env = loadEnv();
