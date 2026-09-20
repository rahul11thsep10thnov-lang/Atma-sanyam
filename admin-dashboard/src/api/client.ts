const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api/v1";
const TOKEN_STORAGE_KEY = "atma_admin_token";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function storeToken(token: string) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText }));
    throw new ApiError(response.status, body.error ?? "Request failed");
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; role: string }>("/admin/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  getStats: () => request<PipelineStats>("/admin/pipeline/stats"),

  listStories: (status?: string) => request<{ stories: MasterStorySummary[] }>(`/admin/stories${status ? `?status=${status}` : ""}`),

  getStory: (id: string) => request<{ story: MasterStoryDetail }>(`/admin/stories/${id}`),

  approveStory: (id: string, notes?: string) => request(`/admin/stories/${id}/approve`, { method: "POST", body: JSON.stringify({ notes }) }),

  rejectStory: (id: string, notes?: string) => request(`/admin/stories/${id}/reject`, { method: "POST", body: JSON.stringify({ notes }) }),

  editStory: (id: string, data: Record<string, unknown>) => request(`/admin/stories/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  regenerateScript: (id: string) => request(`/admin/stories/${id}/regenerate-script`, { method: "POST" }),

  regenerateAudio: (id: string, languageCode: string) =>
    request(`/admin/stories/${id}/regenerate-audio`, { method: "POST", body: JSON.stringify({ languageCode }) }),

  regenerateVideo: (id: string, languageCode: string) =>
    request(`/admin/stories/${id}/regenerate-video`, { method: "POST", body: JSON.stringify({ languageCode }) }),

  listSources: () => request<{ sources: NewsSource[] }>("/admin/sources"),

  createSource: (data: Record<string, unknown>) => request("/admin/sources", { method: "POST", body: JSON.stringify(data) }),

  updateSource: (id: string, data: Record<string, unknown>) => request(`/admin/sources/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  getThresholds: () => request<{ thresholds: Thresholds }>("/admin/config/thresholds"),

  updateThresholds: (data: Partial<Thresholds>) =>
    request<{ thresholds: Thresholds }>("/admin/config/thresholds", { method: "PUT", body: JSON.stringify(data) }),
};

export interface PipelineStats {
  funnel: {
    articlesCollected: number;
    articlesRejected: number;
    storiesPendingReview: number;
    storiesApproved: number;
    videosGenerated: number;
    videosPublished: number;
    videosFailed: number;
  };
  mostViewedStories: { videoAssetId: string; title: string; views: number }[];
  viewsByCategory: { category: string; views: number }[];
  viewsByLanguage: { language: string; views: number }[];
}

export interface MasterStorySummary {
  id: string;
  title: string;
  eventType: string;
  pipelineStatus: string;
  familyRelevanceScore: number;
  suitabilityScore: number;
  qualityScore: number;
  createdAt: string;
  rejectionReason: string | null;
  _count?: { storySources: number };
}

export interface MasterStoryDetail extends MasterStorySummary {
  whatHappened: string;
  background: string | null;
  policeAction: string | null;
  legalStatus: string | null;
  currentStatus: string | null;
  location: { state: string; district: string | null } | null;
  storySources: { id: string; sourceUrl: string; rawArticle: { headline: string }; source: { name: string } }[];
  scripts: { id: string; version: number; status: string; introduction: string; sequence: string; safetyFlags: unknown }[];
  videoAssets: { id: string; languageCode: string; renderStatus: string; storageUrl: string | null; durationSeconds: number | null }[];
  adminReviews: { id: string; action: string; notes: string | null; createdAt: string; adminUser: { email: string } }[];
}

export interface NewsSource {
  id: string;
  name: string;
  homepageUrl: string;
  sourceType: string;
  providerKey: string;
  reliabilityScore: number;
  isBlacklisted: boolean;
  licenseNotes: string | null;
}

export interface Thresholds {
  minFamilyRelevanceScore: number;
  minVideoSuitabilityScore: number;
  minQualityScore: number;
  autoPublishEnabled: boolean;
}
