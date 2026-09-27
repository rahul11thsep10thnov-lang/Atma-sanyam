import "dotenv/config";

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

function csv(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
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

  // --- Video Studio (docs/VIDEO_STUDIO.md §11). Secrets only come from env. ---
  studio: {
    llmModel: optional("STUDIO_LLM_MODEL", optional("SCRIPT_GENERATION_MODEL", "claude-sonnet-5")),
    elevenLabsApiKey: optional("ELEVENLABS_API_KEY"),
    elevenLabsModelId: optional("ELEVENLABS_MODEL_ID", "eleven_multilingual_v2"),
    elevenLabsLanguages: csv(optional("ELEVENLABS_LANGUAGES", "en,hi,ta")),
    chatterboxBaseUrl: optional("CHATTERBOX_BASE_URL"),
    chatterboxApiKey: optional("CHATTERBOX_API_KEY"),
    chatterboxLanguages: csv(optional("CHATTERBOX_LANGUAGES", "en,hi")),
    googleTtsLanguages: csv(optional("GOOGLE_TTS_LANGUAGES", "hi,en,bn,mr,gu,ta,te,kn,ml,pa")),
    googleTranslateApiKey: optional("GOOGLE_TRANSLATE_API_KEY"),
    voiceProviderPriority: csv(optional("VOICE_PROVIDER_PRIORITY", "elevenlabs,chatterbox,google,mock")),
    translationProvider: optional("TRANSLATION_PROVIDER", "llm"),
    imageProvider: optional("IMAGE_PROVIDER", "placeholder"),
    imageProviderApiKey: optional("IMAGE_PROVIDER_API_KEY"),
    imageProviderBaseUrl: optional("IMAGE_PROVIDER_BASE_URL", "https://api.openai.com/v1"),
    imageProviderModel: optional("IMAGE_PROVIDER_MODEL", "gpt-image-1"),
    videoProvider: optional("VIDEO_PROVIDER", "kenburns"),
    videoProviderApiKey: optional("VIDEO_PROVIDER_API_KEY"),
    videoProviderBaseUrl: optional("VIDEO_PROVIDER_BASE_URL"),
    musicProvider: optional("MUSIC_PROVIDER", "library"),
    defaultResolution: optional("STUDIO_DEFAULT_RESOLUTION", "1080p"),
    defaultFps: Number(optional("STUDIO_DEFAULT_FPS", "25")),
    orientation: optional("STUDIO_ORIENTATION", "landscape"),
    workerConcurrency: Number(optional("STUDIO_WORKER_CONCURRENCY", "4")),
    renderConcurrency: Number(optional("STUDIO_RENDER_CONCURRENCY", "1")),
    workerRoles: optional("STUDIO_WORKER_ROLES", "all"),
    inlineJobs: optional("STUDIO_INLINE_JOBS", "false") === "true",
    autoPublishNonSensitive: optional("STUDIO_AUTO_PUBLISH_NON_SENSITIVE", "false") === "true",
    fontDir: optional("STUDIO_FONT_DIR"),
  },

  thresholds: {
    minFamilyRelevanceScore: Number(optional("MIN_FAMILY_RELEVANCE_SCORE", "60")),
    minVideoSuitabilityScore: Number(optional("MIN_VIDEO_SUITABILITY_SCORE", "70")),
    minQualityScore: Number(optional("MIN_QUALITY_SCORE", "70")),
    autoPublishEnabled: optional("AUTO_PUBLISH_ENABLED", "false") === "true",
  },
};

export type Env = typeof env;
