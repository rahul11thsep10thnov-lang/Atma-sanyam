import "dotenv/config";

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

function requiredInProd(name: string, fallback: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? fallback;
}

export const env = {
  nodeEnv: optional("NODE_ENV", "development"),
  port: Number(optional("PORT", "4000")),

  databaseUrl: requiredInProd("DATABASE_URL", "postgresql://atma:atma@localhost:5432/atma_sanyam"),
  redisUrl: optional("REDIS_URL", "redis://localhost:6379"),

  jwtSecret: requiredInProd("JWT_SECRET", "dev-only-secret"),
  adminJwtSecret: requiredInProd("ADMIN_JWT_SECRET", "dev-only-admin-secret"),

  newsApiOrgKey: optional("NEWS_API_ORG_KEY"),
  newsApiOrgBaseUrl: optional("NEWS_API_ORG_BASE_URL", "https://newsapi.org/v2"),
  rssFeedUrls: optional("RSS_FEED_URLS")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  anthropicApiKey: optional("ANTHROPIC_API_KEY"),
  classificationModel: optional("CLASSIFICATION_MODEL", "claude-haiku-4-5-20251001"),
  scriptGenerationModel: optional("SCRIPT_GENERATION_MODEL", "claude-sonnet-5"),

  ttsProvider: optional("TTS_PROVIDER", "mock"),
  googleTtsApiKey: optional("GOOGLE_TTS_API_KEY"),

  storage: {
    endpoint: optional("STORAGE_ENDPOINT"),
    bucket: optional("STORAGE_BUCKET", "atma-sanyam-media"),
    accessKeyId: optional("STORAGE_ACCESS_KEY_ID"),
    secretAccessKey: optional("STORAGE_SECRET_ACCESS_KEY"),
    publicBaseUrl: optional("STORAGE_PUBLIC_BASE_URL", "http://localhost:4000/media"),
  },

  fcmServerKey: optional("FCM_SERVER_KEY"),

  thresholds: {
    minFamilyRelevanceScore: Number(optional("MIN_FAMILY_RELEVANCE_SCORE", "60")),
    minVideoSuitabilityScore: Number(optional("MIN_VIDEO_SUITABILITY_SCORE", "70")),
    minQualityScore: Number(optional("MIN_QUALITY_SCORE", "70")),
    autoPublishEnabled: optional("AUTO_PUBLISH_ENABLED", "false") === "true",
  },
};

export type Env = typeof env;
