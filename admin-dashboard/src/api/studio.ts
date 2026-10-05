import { API_BASE_URL, ApiError, getStoredToken, request } from "./client";

// ---- Types (mirror the backend Studio models; only fields the UI uses) ----

export type StudioStatus = "DRAFT" | "AI_REVIEW" | "ADMIN_REVIEW" | "APPROVED" | "RENDERED" | "PUBLISHED" | "REJECTED";
export type JobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "RETRYING";

export interface StudioOptions {
  languages: { code: string; englishName: string; nativeName: string }[];
  animationStyles: string[];
  voices: { code: string; label: string; gender: string; ageGroup: string; tone: string; isNarratorEligible: boolean }[];
  formats: { key: "SHORT" | "LONG"; label: string }[];
}

export interface StudioStorySummary {
  id: string;
  title: string;
  status: StudioStatus;
  format: "SHORT" | "LONG";
  languages: string[];
  isSensitive: boolean;
  qcStatus: "NOT_RUN" | "PASSED" | "NEEDS_REVIEW";
  updatedAt: string;
  renderedLanguages: string[];
  activeJobs: number;
  failedJobs: number;
}

export interface QcIssue {
  check: string;
  severity: "BLOCKING" | "WARNING";
  message: string;
  languageCode?: string;
  sceneNumber?: number;
}
export interface QcReport {
  status: "PASSED" | "NEEDS_REVIEW";
  phase?: "text" | "final";
  checkedAt: string;
  issues: QcIssue[];
  checks: { name: string; passed: boolean }[];
}

export interface StudioStory extends Omit<StudioStorySummary, "renderedLanguages" | "activeJobs" | "failedJobs"> {
  targetDurationSeconds: number;
  animationStyle: string;
  masterLanguage: string;
  narratorVoiceCode: string;
  sourceName: string | null;
  sourceUrl: string | null;
  locationText: string | null;
  state: string | null;
  district: string | null;
  contentWarnings: string[];
  allowDramatizedReconstruction: boolean;
  sensitiveTopics: string[];
  qcReport: QcReport | null;
  analysisSummary: { provider?: string; warnings?: string[] } | null;
  rejectionReason: string | null;
  masterStoryId: string | null;
  publishedAt: string | null;
}

export interface StudioFact {
  id: string;
  type: string;
  value: string;
  sourceSentence: string | null;
  attributedTo: string | null;
  statementType: string | null;
  verificationStatus: "VERIFIED" | "UNVERIFIED" | "REPORTED" | "ALLEGED" | "UNKNOWN";
  isKeyFact: boolean;
  adminEdited: boolean;
}

export interface StudioCharacter {
  id: string;
  key: string;
  displayName: string;
  realName: string | null;
  role: string;
  gender: string;
  ageGroup: string;
  isMinor: boolean;
  isOfficial: boolean;
  anonymized: boolean;
  speaks: boolean;
  appearance: Record<string, string> | null;
}

export interface DialogueLine {
  speakerKey: string;
  text: string;
  statementType: string;
}

export interface StudioScene {
  id: string;
  sceneNumber: number;
  durationSeconds: number;
  location: string;
  timeOfDay: string;
  characters: string[];
  narratorText: string;
  dialogue: DialogueLine[];
  emotionalTone: string;
  cameraDirection: string;
  background: string;
  props: string[];
  animationRequirements: string;
  audioRequirements: { ambient: string; sfx: string[] };
  contentRestrictions: string[];
  transition: string;
  onScreenText: string | null;
  safetyLevel: "SAFE" | "SENSITIVE" | "RESTRICTED";
  safetyReasons: string[];
  visualPrompt: { prompt: string; negativePrompt: string; isSubstitute: boolean; substituteReason: string | null } | null;
  asset: { url: string | null; isPlaceholder: boolean; provider: string } | null;
}

export interface LanguageScene {
  sceneNumber: number;
  narratorText: string;
  dialogue: DialogueLine[];
  onScreenText?: string;
  edited?: boolean;
}

export interface LintFlag {
  rule: string;
  severity: "BLOCKING" | "WARNING";
  sceneNumber?: number;
  excerpt?: string;
  suggestion?: string;
}

export interface VideoRender {
  id: string;
  languageCode: string | null;
  kind: string;
  version: number;
  status: string;
  url: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  width: number;
  height: number;
  fps: number;
  renderer: string | null;
  failureReason: string | null;
  createdAt: string;
}

export interface LanguageWorkspace {
  languageCode: string;
  script: {
    id: string;
    version: number;
    status: string;
    provider: string;
    estimatedDurationSeconds: number;
    content: { title: string; scenes: LanguageScene[]; untranslated?: boolean };
    lintFlags: LintFlag[] | null;
  } | null;
  segments: { id: string; sceneNumber: number; lineIndex: number; speakerKey: string; voiceCode: string; provider: string; url: string; durationSeconds: number; isPlaceholder: boolean }[];
  render: VideoRender | null;
  subtitles: { format: string; url: string }[];
  tracks: { trackType: string; url: string }[];
}

export interface GenerationJob {
  id: string;
  type: string;
  status: JobStatus;
  languageCode: string | null;
  sceneId: string | null;
  error: string | null;
  attempts: number;
  maxAttempts: number;
  requestedBy: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  logs: { id: string; level: string; message: string; createdAt: string }[];
}

export interface Workspace {
  story: StudioStory;
  article: { version: number; title: string; rawText: string; cleanedText: string | null; characterNotes: string | null; sceneNotes: string | null } | null;
  facts: StudioFact[];
  characters: StudioCharacter[];
  assignments: { speakerKey: string; lockedByAdmin: boolean; reason: string | null; voice: { code: string; label: string } }[];
  project: { width: number; height: number; fps: number; burnSubtitles: boolean; multiAudioPackage: boolean } | null;
  master: { id: string; version: number; provider: string; estimatedDurationSeconds: number; status: string } | null;
  scenes: StudioScene[];
  languages: LanguageWorkspace[];
  packageRender: VideoRender | null;
  jobs: GenerationJob[];
  versions: { id: string; entityType: string; languageCode: string | null; version: number; reason: string | null; createdAt: string }[];
  safety: { id: string; sceneId: string | null; level: string; reasons: string[]; substitution: string | null; source: string; createdAt: string }[];
  voices: { code: string; label: string; gender: string; ageGroup: string; tone: string }[];
}

export interface Voice {
  id: string;
  code: string;
  label: string;
  gender: string;
  ageGroup: string;
  tone: string;
  description: string | null;
  providerVoiceIds: { elevenlabs?: string; chatterbox?: string; google?: Record<string, string> };
  settings: Record<string, number> | null;
  isNarratorEligible: boolean;
  isActive: boolean;
  _count: { assignments: number };
}

export interface ProviderStatus {
  kind: string;
  key: string;
  configured: boolean;
  enabled: boolean;
  active: boolean;
  priority: number;
  languages?: string[];
  requiredEnv: string[];
  notes: string;
}

export interface CreateStudioStory {
  title: string;
  articleText: string;
  sourceName?: string;
  sourceUrl?: string;
  locationText?: string;
  state?: string;
  district?: string;
  languages: string[];
  format?: "SHORT" | "LONG";
  targetDurationSeconds?: number;
  animationStyle?: string;
  narratorVoiceCode?: string;
  contentWarnings?: string[];
  characterNotes?: string;
  sceneNotes?: string;
  pronunciationGuide?: { term: string; pronunciation: string; languageCode?: string }[];
  allowDramatizedReconstruction?: boolean;
  burnSubtitles?: boolean;
  multiAudioPackage?: boolean;
  resolution?: "720p" | "1080p";
  fps?: 24 | 25 | 30;
  /** CINEMATIC_25D (default): directed shots rendered by the 2.5D engine. CLASSIC: one still per scene. */
  productionMode?: "CLASSIC" | "CINEMATIC_25D";
  renderProfileKey?: string;
}

const post = <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) });
const put = <T>(path: string, body: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(body) });
const S = "/admin/studio";

export const studioApi = {
  options: () => request<StudioOptions>(`${S}/options`),
  list: (status?: string) => request<{ stories: StudioStorySummary[] }>(`${S}/stories${status ? `?status=${status}` : ""}`),
  create: (data: CreateStudioStory) => post<{ story: { id: string } }>(`${S}/stories`, data),
  importFromMaster: (masterStoryId: string, languages: string[]) => post<{ story: { id: string } }>(`${S}/stories/from-master/${masterStoryId}`, { languages }),
  workspace: (id: string) => request<Workspace>(`${S}/stories/${id}`),
  updateSettings: (id: string, data: Record<string, unknown>) => put(`${S}/stories/${id}`, data),
  updateArticle: (id: string, data: Record<string, unknown>) => put(`${S}/stories/${id}/article`, data),
  reanalyze: (id: string) => post(`${S}/stories/${id}/analyze`),
  updateFact: (id: string, factId: string, data: Record<string, unknown>) => put(`${S}/stories/${id}/facts/${factId}`, data),
  updateCharacter: (id: string, characterId: string, data: Record<string, unknown>) => put(`${S}/stories/${id}/characters/${characterId}`, data),
  assignVoice: (id: string, speakerKey: string, voiceCode: string) => put(`${S}/stories/${id}/voices`, { speakerKey, voiceCode }),
  regenerateMaster: (id: string) => post(`${S}/stories/${id}/master-script`),
  editScene: (id: string, sceneId: string, data: Record<string, unknown>) => put(`${S}/stories/${id}/scenes/${sceneId}`, data),
  regenerateVisual: (id: string, sceneId: string) => post(`${S}/stories/${id}/scenes/${sceneId}/regenerate-visual`),
  regenerateLanguage: (id: string, lang: string, force = false) => post(`${S}/stories/${id}/languages/${lang}/script`, { force }),
  editLanguageScene: (id: string, lang: string, sceneNumber: number, data: { narratorText?: string; dialogue?: string[]; onScreenText?: string }) =>
    put(`${S}/stories/${id}/languages/${lang}/scenes/${sceneNumber}`, data),
  regenerateVoice: (id: string, lang: string, force = false) => post(`${S}/stories/${id}/languages/${lang}/voice`, { force }),
  rerender: (id: string, lang: string) => post(`${S}/stories/${id}/languages/${lang}/render`),
  submitReview: (id: string) => post(`${S}/stories/${id}/submit-review`),
  approve: (id: string, notes?: string) => post(`${S}/stories/${id}/approve`, { notes }),
  reject: (id: string, notes?: string) => post(`${S}/stories/${id}/reject`, { notes }),
  publish: (id: string, overrideNote?: string) => post<{ masterStoryId: string; languages: string[] }>(`${S}/stories/${id}/publish`, { overrideNote }),
  retryJob: (jobId: string) => post(`${S}/jobs/${jobId}/retry`),
  version: (id: string, versionId: string) => request<{ version: { snapshot: unknown; entityType: string; version: number } }>(`${S}/stories/${id}/versions/${versionId}`),

  voices: () => request<{ voices: Voice[]; routing: { code: string; languages: Record<string, string> }[] }>("/admin/voices"),
  updateVoice: (id: string, data: Record<string, unknown>) => put(`/admin/voices/${id}`, data),
  previewVoice: (id: string, languageCode: string) =>
    post<{ url: string; provider: string; isPlaceholder: boolean; reason?: string; durationSeconds: number }>(`/admin/voices/${id}/preview`, { languageCode }),

  providers: () => request<{ providers: ProviderStatus[]; ffmpegAvailable: boolean }>("/admin/providers"),
  updateProvider: (kind: string, key: string, data: Record<string, unknown>) => put(`/admin/providers/${kind}/${key}`, data),

  library: () =>
    request<{
      music: { id: string; title: string; mood: string; url: string; durationSeconds: number; license: string; isActive: boolean }[];
      soundEffects: { id: string; tag: string; title: string; url: string; durationSeconds: number; license: string; isActive: boolean }[];
    }>(`${S}/library`),

  /** Uploads a licensed audio file as a raw body (music or sound effect). */
  uploadLibrary: async (kind: "music" | "sfx", file: File, meta: { title: string; license: string; mood?: string; tag?: string }) => {
    const ext = (file.name.split(".").pop() ?? "mp3").toLowerCase();
    const params = new URLSearchParams({ ...meta, ext } as Record<string, string>);
    const response = await fetch(`${API_BASE_URL}${S}/library/${kind}?${params}`, {
      method: "POST",
      headers: { "Content-Type": file.type || "application/octet-stream", Authorization: `Bearer ${getStoredToken() ?? ""}` },
      body: file,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: response.statusText }));
      throw new ApiError(response.status, body.error ?? "Upload failed");
    }
    return response.json();
  },
  setLibraryActive: (kind: "music" | "sfx", id: string, isActive: boolean) => put(`${S}/library/${kind}/${id}`, { isActive }),
};
