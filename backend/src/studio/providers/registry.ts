import { PrismaClient, ProviderConfig, ProviderKind } from "@prisma/client";
import { env } from "../../config/env";
import { STUDIO_LANGUAGE_CODES } from "../language/languageProfiles";
import { LLMProvider } from "./llm/LLMProvider";
import { AnthropicLLMProvider } from "./llm/AnthropicLLMProvider";
import { TranslationProvider } from "./translation/TranslationProvider";
import { LLMTranslationProvider } from "./translation/LLMTranslationProvider";
import { GoogleTranslateProvider } from "./translation/GoogleTranslateProvider";
import { PassthroughTranslationProvider } from "./translation/PassthroughTranslationProvider";
import { VoiceProvider } from "./voice/VoiceProvider";
import { ElevenLabsVoiceProvider } from "./voice/ElevenLabsVoiceProvider";
import { ChatterboxVoiceProvider } from "./voice/ChatterboxVoiceProvider";
import { GoogleVoiceProvider } from "./voice/GoogleVoiceProvider";
import { MockVoiceProvider } from "./voice/MockVoiceProvider";
import { VoiceRouter } from "./voice/VoiceRouter";
import { ImageProvider } from "./image/ImageProvider";
import { OpenAICompatibleImageProvider } from "./image/OpenAICompatibleImageProvider";
import { PlaceholderImageProvider } from "./image/PlaceholderImageProvider";
import { VideoProvider } from "./video/VideoProvider";
import { KenBurnsVideoProvider } from "./video/KenBurnsVideoProvider";
import { HttpVideoProvider } from "./video/HttpVideoProvider";
import { MusicProvider } from "./music/MusicProvider";
import { LibraryMusicProvider } from "./music/LibraryMusicProvider";
import { StorageProvider } from "./storage/StorageProvider";
import { LocalStorageProvider } from "./storage/LocalStorageProvider";

export interface StudioProviders {
  llm: LLMProvider;
  translation: TranslationProvider;
  voices: VoiceRouter;
  image: ImageProvider;
  video: VideoProvider;
  music: MusicProvider;
  storage: StorageProvider;
}

const CACHE_TTL_MS = 30_000;
let cached: { at: number; providers: StudioProviders } | null = null;

function settingsLanguages(config: ProviderConfig | undefined): string[] | undefined {
  const langs = (config?.settings as { languages?: unknown } | null)?.languages;
  return Array.isArray(langs) ? langs.filter((l): l is string => typeof l === "string") : undefined;
}

function isEnabled(configs: ProviderConfig[], kind: ProviderKind, key: string): boolean {
  const row = configs.find((c) => c.kind === kind && c.key === key);
  return row ? row.isEnabled : true;
}

function byKey(configs: ProviderConfig[], kind: ProviderKind, key: string) {
  return configs.find((c) => c.kind === kind && c.key === key);
}

/** Pure construction from config rows — exported for tests and the providers page. */
export function buildProviders(prisma: PrismaClient, configs: ProviderConfig[]): StudioProviders {
  const llm = new AnthropicLLMProvider();

  // Translation: explicit TRANSLATION_PROVIDER choice, falling back to passthrough.
  const translationCandidates: Record<string, TranslationProvider> = {
    llm: new LLMTranslationProvider(llm),
    google: new GoogleTranslateProvider(),
    "google-translate": new GoogleTranslateProvider(),
    passthrough: new PassthroughTranslationProvider(),
  };
  const chosenTranslation = translationCandidates[env.studio.translationProvider] ?? translationCandidates.llm;
  const translationKey = chosenTranslation instanceof LLMTranslationProvider ? "llm" : chosenTranslation.key;
  const translation =
    chosenTranslation.isConfigured() && isEnabled(configs, "TRANSLATION", translationKey) ? chosenTranslation : translationCandidates.passthrough;

  // Voices: every provider, ordered by DB priority (else env order), disabled ones removed.
  const allVoices: VoiceProvider[] = [
    new ElevenLabsVoiceProvider(settingsLanguages(byKey(configs, "VOICE", "elevenlabs")) ?? env.studio.elevenLabsLanguages),
    new ChatterboxVoiceProvider(settingsLanguages(byKey(configs, "VOICE", "chatterbox")) ?? env.studio.chatterboxLanguages),
    new GoogleVoiceProvider(settingsLanguages(byKey(configs, "VOICE", "google")) ?? env.studio.googleTtsLanguages),
    new MockVoiceProvider(),
  ];
  const envOrder = env.studio.voiceProviderPriority;
  const priorityOf = (key: string) => byKey(configs, "VOICE", key)?.priority ?? (envOrder.indexOf(key) === -1 ? 1000 : envOrder.indexOf(key));
  const voiceProviders = allVoices.filter((p) => isEnabled(configs, "VOICE", p.key)).sort((a, b) => priorityOf(a.key) - priorityOf(b.key));

  const imageCandidate = env.studio.imageProvider === "openai-compatible" ? new OpenAICompatibleImageProvider() : null;
  const image =
    imageCandidate && imageCandidate.isConfigured() && isEnabled(configs, "IMAGE", imageCandidate.key) ? imageCandidate : new PlaceholderImageProvider();

  const videoCandidate = env.studio.videoProvider === "http" ? new HttpVideoProvider() : null;
  const video = videoCandidate && videoCandidate.isConfigured() && isEnabled(configs, "VIDEO", "http") ? videoCandidate : new KenBurnsVideoProvider();

  return {
    llm,
    translation,
    voices: new VoiceRouter(voiceProviders),
    image,
    video,
    music: new LibraryMusicProvider(prisma),
    storage: new LocalStorageProvider(),
  };
}

export async function getStudioProviders(prisma: PrismaClient): Promise<StudioProviders> {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.providers;
  const configs = await prisma.providerConfig.findMany().catch(() => [] as ProviderConfig[]);
  const providers = buildProviders(prisma, configs);
  cached = { at: Date.now(), providers };
  return providers;
}

export function invalidateProviderCache() {
  cached = null;
}

export interface ProviderStatus {
  kind: ProviderKind;
  key: string;
  configured: boolean;
  enabled: boolean;
  active: boolean;
  priority: number;
  languages?: string[];
  requiredEnv: string[];
  notes: string;
  settings: unknown;
}

/** For the admin Providers page. Reports which env vars are set — never their values. */
export async function describeProviders(prisma: PrismaClient): Promise<ProviderStatus[]> {
  const configs = await prisma.providerConfig.findMany();
  const active = buildProviders(prisma, configs);
  const row = (kind: ProviderKind, key: string) => byKey(configs, kind, key);
  const entry = (
    kind: ProviderKind,
    key: string,
    configured: boolean,
    isActive: boolean,
    requiredEnv: string[],
    notes: string,
    languages?: string[]
  ): ProviderStatus => ({
    kind,
    key,
    configured,
    enabled: row(kind, key)?.isEnabled ?? true,
    active: isActive,
    priority: row(kind, key)?.priority ?? 100,
    languages,
    requiredEnv,
    notes,
    settings: row(kind, key)?.settings ?? null,
  });
  const voiceKeys = active.voices.describe();

  return [
    entry("LLM", "anthropic", active.llm.isConfigured(), active.llm.isConfigured(), ["ANTHROPIC_API_KEY"], `Model ${active.llm.model}. Without it, rule-based analysis and template scripts are used.`),
    entry("TRANSLATION", "llm", active.llm.isConfigured(), active.translation.key.startsWith("llm"), ["ANTHROPIC_API_KEY", "TRANSLATION_PROVIDER=llm"], "Natural localisation (not literal).", STUDIO_LANGUAGE_CODES),
    entry("TRANSLATION", "google-translate", new GoogleTranslateProvider().isConfigured(), active.translation.key === "google-translate", ["GOOGLE_TRANSLATE_API_KEY", "TRANSLATION_PROVIDER=google"], "Closer to literal; always reviewed."),
    entry("TRANSLATION", "passthrough", true, active.translation.key === "passthrough", [], "Offline fallback — copies master text, QC flags it."),
    entry("VOICE", "elevenlabs", new ElevenLabsVoiceProvider().isConfigured(), voiceKeys.includes("elevenlabs"), ["ELEVENLABS_API_KEY"], `Model ${env.studio.elevenLabsModelId}. Same voice ID across languages.`, settingsLanguages(row("VOICE", "elevenlabs")) ?? env.studio.elevenLabsLanguages),
    entry("VOICE", "chatterbox", new ChatterboxVoiceProvider().isConfigured(), voiceKeys.includes("chatterbox"), ["CHATTERBOX_BASE_URL", "CHATTERBOX_API_KEY (optional)"], "Self-hosted, OpenAI-compatible /v1/audio/speech.", settingsLanguages(row("VOICE", "chatterbox")) ?? env.studio.chatterboxLanguages),
    entry("VOICE", "google", new GoogleVoiceProvider().isConfigured(), voiceKeys.includes("google"), ["GOOGLE_TTS_API_KEY"], "Per-language voices; identity approximated by gender/age/tone.", settingsLanguages(row("VOICE", "google")) ?? env.studio.googleTtsLanguages),
    entry("VOICE", "mock", true, voiceKeys.includes("mock"), [], "Silent placeholder audio with realistic timing (QC flags it).", STUDIO_LANGUAGE_CODES),
    entry("IMAGE", "openai-compatible", new OpenAICompatibleImageProvider().isConfigured(), active.image.key === "openai-compatible", ["IMAGE_PROVIDER=openai-compatible", "IMAGE_PROVIDER_API_KEY", "IMAGE_PROVIDER_BASE_URL", "IMAGE_PROVIDER_MODEL"], `Model ${env.studio.imageProviderModel}.`),
    entry("IMAGE", "placeholder", true, active.image.key === "placeholder", [], "Offline abstract establishing shots, consistent palette, no people."),
    entry("VIDEO", "kenburns", true, active.video.key === "kenburns", ["ffmpeg on the render host"], "Local slow pan/zoom animation applied at render time."),
    entry("VIDEO", "http", new HttpVideoProvider().isConfigured(), active.video.key === "http", ["VIDEO_PROVIDER=http", "VIDEO_PROVIDER_BASE_URL", "VIDEO_PROVIDER_API_KEY"], "Generic async image-to-video adapter."),
    entry("MUSIC", "library", true, true, [], "Licensed tracks uploaded to the music library; ducked under speech."),
    entry("STORAGE", "local", true, true, ["STORAGE_PUBLIC_BASE_URL"], "Local disk served at /media. Swap for S3/R2 in production."),
  ];
}
