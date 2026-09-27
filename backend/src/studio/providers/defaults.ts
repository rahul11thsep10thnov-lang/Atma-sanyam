import { ProviderKind } from "@prisma/client";

/** Default non-secret provider settings seeded into provider_configs. */
export const DEFAULT_PROVIDER_CONFIGS: { kind: ProviderKind; key: string; priority: number; isEnabled: boolean; settings?: object }[] = [
  { kind: "LLM", key: "anthropic", priority: 10, isEnabled: true },
  { kind: "TRANSLATION", key: "llm", priority: 10, isEnabled: true },
  { kind: "TRANSLATION", key: "google-translate", priority: 20, isEnabled: true },
  { kind: "TRANSLATION", key: "passthrough", priority: 99, isEnabled: true },
  { kind: "VOICE", key: "elevenlabs", priority: 10, isEnabled: true },
  { kind: "VOICE", key: "chatterbox", priority: 20, isEnabled: true },
  { kind: "VOICE", key: "google", priority: 30, isEnabled: true },
  { kind: "VOICE", key: "mock", priority: 99, isEnabled: true },
  { kind: "IMAGE", key: "openai-compatible", priority: 10, isEnabled: true },
  { kind: "IMAGE", key: "placeholder", priority: 99, isEnabled: true },
  { kind: "VIDEO", key: "kenburns", priority: 10, isEnabled: true },
  { kind: "VIDEO", key: "http", priority: 20, isEnabled: true },
  { kind: "MUSIC", key: "library", priority: 10, isEnabled: true },
  { kind: "STORAGE", key: "local", priority: 10, isEnabled: true },
];
