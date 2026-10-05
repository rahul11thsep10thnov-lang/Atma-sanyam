import { API_BASE_URL, ApiError, getStoredToken, request } from "./client";

// Cinematic 2.5D production API (backend: /admin/production). Only the fields the UI uses.

export type ProductionState =
  | "DRAFT"
  | "PLANNED"
  | "ASSETS_REQUIRED"
  | "GENERATING_ASSETS"
  | "ASSETS_READY"
  | "DEPTH_READY"
  | "SHOT_READY"
  | "RENDERING"
  | "RENDERED"
  | "QC_PENDING"
  | "QC_FAILED"
  | "APPROVED"
  | "PUBLISHED"
  | "FAILED";

export const CAMERA_MOVES = ["static", "dolly_in", "dolly_out", "pan_left", "pan_right", "tilt_up", "tilt_down", "orbit", "tracking", "push_in", "pull_out", "handheld", "rack_focus", "whip_pan", "slow_zoom"] as const;
export const PARTICLE_TYPES = ["rain", "snow", "fog", "mist", "smoke", "dust", "steam", "fire", "sparks", "leaves", "water", "crowds", "traffic", "birds", "insects"] as const;

export interface ShotSummary {
  id: string;
  globalNumber: number;
  shotNumber: number;
  shotType: string;
  cameraMovement: string;
  viewerSees: string;
  durationSeconds: number;
  renderDurationSeconds: number | null;
  status: ProductionState;
  motionDecision: string;
  selectedRenderer: string;
  safetyLevel: string;
  hasOverrides: boolean;
  render: { id: string; url: string | null; thumbnailUrl: string | null; renderer: string; qcStatus: "PASSED" | "FAILED" | null } | null;
  placeholders: number;
}

export interface ProductionView {
  story: { id: string; title: string; productionMode: "CLASSIC" | "CINEMATIC_25D"; status: string };
  episode: null | {
    id: string;
    title: string;
    synopsis: string | null;
    status: ProductionState;
    durationSeconds: number | null;
    masterVisualUrl: string | null;
    directorProvider: string;
    renderProfile: { key: string; name: string; width: number; height: number; fps: number };
  };
  scenes: { id: string; sceneNumber: number; location: string; timeOfDay: string; safetyLevel: string; narratorText: string; shots: ShotSummary[] }[];
}

export interface LicenceVerdict {
  status: "CLEARED" | "OVERRIDDEN" | "BLOCKED_NON_COMMERCIAL" | "BLOCKED_NOT_APPROVED";
  productionAllowed: boolean;
  reason: string;
}

export interface InspectorLayer {
  id: string;
  layerKey: string;
  kind: string;
  name: string;
  zIndex: number;
  depth: number;
  reuseDecision: string | null;
  expression: string | null;
  pose: string | null;
  silhouette: boolean;
  asset: null | { id: string; kind: string; role: string; name: string; status: string; isPlaceholder: boolean; url: string | null; width: number | null; height: number | null; hasAlpha: boolean; reuseKey: string; failureReason: string | null; approvedAt: string | null };
  version: null | { version: number; generator: string; modelId: string; license: string; commercialUse: boolean; seed: number; prompt: string; durationMs: number | null; licenceVerdict: LicenceVerdict | null };
  depthUrl: string | null;
}

export interface QcItem {
  check: string;
  severity: "BLOCKING" | "WARNING";
  message: string;
}

export interface ShotRenderRow {
  id: string;
  version: number;
  renderer: string;
  status: string;
  url: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  renderMs: number | null;
  isCurrent: boolean;
  failureReason: string | null;
  qcReport: null | { status: "PASSED" | "FAILED"; issues: QcItem[]; metrics: Record<string, unknown> };
  createdAt: string;
}

export interface JobRow {
  id: string;
  type: string;
  status: string;
  queue: string | null;
  progress: number;
  attempts: number;
  maxAttempts: number;
  error: string | null;
  provider: string | null;
  model: string | null;
  gpuWorkerId: string | null;
  durationMs: number | null;
  createdAt: string;
  story?: { title: string };
  storyId: string;
}

export interface TimelineSample {
  t: number;
  camera: { x: number; y: number; zoom: number; roll: number; orbit: number };
  focusDepth: number;
  lights: Record<string, number>;
  characters: Record<string, { blink: number; speech: number; headTurn: number; breath: number; travelX: number }>;
}

export interface ShotOverrides {
  camera?: { type?: string; intensity?: number; focalLength?: number };
  focus?: { aperture?: number; focusLayerKey?: string };
  lighting?: { ambientIntensity?: number };
  effects?: { grain?: number; vignette?: number; bloomIntensity?: number; saturation?: number; contrast?: number };
  environment?: { disableParticles?: string[] };
  layers?: Record<string, { depth?: number; extraBlur?: number; silhouette?: boolean; placement?: { x?: number; y?: number; height?: number } }>;
  renderer?: "auto" | "engine25d" | "i2v";
}

export interface ShotDetail {
  shot: {
    id: string;
    storyId: string;
    globalNumber: number;
    shotNumber: number;
    shotType: string;
    cameraMovement: string;
    viewerSees: string;
    emotionalPurpose: string;
    narration: string;
    dialogue: { speakerKey: string; text: string }[];
    durationSeconds: number;
    renderDurationSeconds: number | null;
    status: ProductionState;
    motionDecision: string;
    motionReason: string;
    motionConfidence: number;
    selectedRenderer: string;
    safetyLevel: string;
    disclosure: string;
    seed: number;
    overrides: ShotOverrides | null;
    camera: { type: string; intensity: number; focalLength: number };
    focusProfile: { aperture: number; focusDepth: number; focusLayerKey?: string };
    lightingProfile: { ambient: { intensity: number } };
    effectsProfile: { grain: number; vignette: number; bloom: { intensity: number }; grade: { saturation: number; contrast: number } };
    environmentProfile: { particles: { type: string }[] };
    scene: { sceneNumber: number; location: string };
  };
  layers: InspectorLayer[];
  package: null | { id: string; version: number; contentHash: string; storagePrefix: string; createdAt: string };
  manifest: unknown;
  timeline: TimelineSample[] | null;
  renders: ShotRenderRow[];
  jobs: JobRow[];
}

export interface AssetRow {
  id: string;
  kind: string;
  role: string;
  name: string;
  status: string;
  isPlaceholder: boolean;
  url: string | null;
  width: number | null;
  height: number | null;
  reuseKey: string;
  failureReason: string | null;
  updatedAt: string;
  _count: { layers: number };
}

export interface ModelRow {
  id: string;
  modelId: string;
  name: string;
  provider: string;
  task: string;
  version: string;
  license: string;
  licenseUrl: string | null;
  licenseNotes: string | null;
  licenseVerifiedAt: string | null;
  commercialUseAllowed: boolean;
  productionApproved: boolean;
  attributionRequired: boolean;
  attributionText: string | null;
  enabled: boolean;
  isDefault: boolean;
  endpoint: string | null;
  workflow: string | null;
  recommendedVramGb: number;
  qualityScore: number;
  overrideApproved: boolean;
  overrideReason: string | null;
  overrideBy: string | null;
  verdict: LicenceVerdict;
}

export interface Metrics {
  since: string;
  queues: { queue: string; pending: number; processing: number; failed: number; cancelled: number; completed: number }[];
  stages: { type: string; jobs: number; failureRate: number; p50Ms: number | null; p95Ms: number | null }[];
  rendering: {
    shotsRendered: number;
    shotsReusedFromCache: number;
    framesRendered: number;
    averageFps: number | null;
    primaryProfile: string | null;
    renderSecondsPerVideoSecond: number | null;
    estimatedMonthlyCapacityPerRenderHost: number | null;
    byProfile: { profile: string; shots: number; averageFps: number | null; renderSecondsPerVideoSecond: number | null; estimatedMonthlyCapacityPerRenderHost: number | null }[];
    renderers: Record<string, number>;
  };
  assetReuse: Record<string, number>;
  gpu: {
    workers: { workerId: string; hostname: string; gpuName: string; vramTotalGb: number; vramFreeGb: number; queues: string[]; status: string; runningJobs: number; maxConcurrentJobs: number; lastHeartbeatAt: string | null }[];
    queues: { queue: string; waiting: number; running: number; onlineWorkers: number; slots: number; warning?: string }[];
  };
}

const P = "/admin/production";
const post = <T,>(path: string, body?: unknown) => request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });
const put = <T,>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(body ?? {}) });

export const productionApi = {
  production: (storyId: string) => request<ProductionView>(`${P}/stories/${storyId}`),
  shot: (shotId: string) => request<ShotDetail>(`${P}/shots/${shotId}`),
  saveOverrides: (shotId: string, overrides: ShotOverrides) => put<ShotDetail>(`${P}/shots/${shotId}/overrides`, overrides),
  rerender: (shotId: string) => post<{ job: JobRow }>(`${P}/shots/${shotId}/rerender`),
  /** Renders a preview still (PNG) with unsaved overrides; returns an object URL. */
  preview: async (shotId: string, overrides: ShotOverrides, t?: number): Promise<string> => {
    const res = await fetch(`${API_BASE_URL}${P}/shots/${shotId}/preview`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getStoredToken() ?? ""}` }, body: JSON.stringify({ overrides, t }) });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new ApiError(res.status, body.error ?? "Preview failed");
    }
    return URL.createObjectURL(await res.blob());
  },

  assets: (filter: { role?: string; status?: string; placeholder?: boolean; storyId?: string }) => {
    const q = new URLSearchParams(Object.entries(filter).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)]));
    return request<{ assets: AssetRow[] }>(`${P}/assets?${q}`);
  },
  approveAsset: (id: string) => post(`${P}/assets/${id}/approve`),
  rejectAsset: (id: string, reason: string) => post(`${P}/assets/${id}/reject`, { reason }),
  regenerateAsset: (id: string, prompt?: string) => post(`${P}/assets/${id}/regenerate`, prompt ? { prompt } : {}),
  replaceAsset: async (id: string, file: File, license: string, commercialUse: boolean) => {
    const q = new URLSearchParams({ license, commercialUse: String(commercialUse) });
    const res = await fetch(`${API_BASE_URL}${P}/assets/${id}/replace?${q}`, { method: "POST", headers: { "Content-Type": file.type || "image/png", Authorization: `Bearer ${getStoredToken() ?? ""}` }, body: file });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new ApiError(res.status, body.error ?? "Upload failed");
    }
    return res.json();
  },

  models: () => request<{ models: ModelRow[] }>(`${P}/models`),
  updateModel: (modelId: string, patch: { enabled?: boolean; isDefault?: boolean; endpoint?: string | null }) => put(`${P}/models/${encodeURIComponent(modelId)}`, patch),
  overrideModel: (modelId: string, approved: boolean, reason: string) => post(`${P}/models/${encodeURIComponent(modelId)}/override`, { approved, reason }),

  jobs: (filter: { queue?: string; status?: string; type?: string; storyId?: string }) => {
    const q = new URLSearchParams(Object.entries(filter).filter(([, v]) => !!v) as [string, string][]);
    return request<{ jobs: JobRow[] }>(`${P}/jobs?${q}`);
  },
  cancelJob: (id: string) => post(`${P}/jobs/${id}/cancel`),
  retryJob: (id: string) => post(`${P}/jobs/${id}/retry`),
  metrics: (hours = 24) => request<Metrics>(`${P}/metrics?hours=${hours}`),
};
