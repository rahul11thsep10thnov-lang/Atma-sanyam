import type { CompanionType } from "./types";
import { COMPANION_TYPES } from "./types";

/** Session cookie that remembers the "Who's coming along?" choice (no expiry → cleared when the browser closes). */
export const COMPANION_COOKIE = "bt_companion";

export const parseCompanion = (value: string | undefined | null): CompanionType | null =>
  value && (COMPANION_TYPES as string[]).includes(value) ? (value as CompanionType) : null;
