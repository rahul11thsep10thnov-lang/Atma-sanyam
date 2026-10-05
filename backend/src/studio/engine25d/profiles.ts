export interface RenderProfileDef {
  key: string;
  name: string;
  width: number;
  height: number;
  fps: number;
  aspectRatio: string;
  crf: number;
  preset: string;
  isDefault: boolean;
  isPreview: boolean;
}

/** Default output is portrait 1080×1920 @ 30 fps (9:16). */
export const DEFAULT_RENDER_PROFILES: RenderProfileDef[] = [
  { key: "portrait-1080x1920-30", name: "Portrait 1080×1920 @ 30 fps", width: 1080, height: 1920, fps: 30, aspectRatio: "9:16", crf: 19, preset: "medium", isDefault: true, isPreview: false },
  { key: "portrait-1080x1920-24", name: "Portrait 1080×1920 @ 24 fps", width: 1080, height: 1920, fps: 24, aspectRatio: "9:16", crf: 19, preset: "medium", isDefault: false, isPreview: false },
  { key: "preview-540x960-30", name: "Preview 540×960 @ 30 fps", width: 540, height: 960, fps: 30, aspectRatio: "9:16", crf: 26, preset: "veryfast", isDefault: false, isPreview: true },
  { key: "landscape-1920x1080-25", name: "Landscape 1920×1080 @ 25 fps (legacy)", width: 1920, height: 1080, fps: 25, aspectRatio: "16:9", crf: 20, preset: "medium", isDefault: false, isPreview: false },
];

export const DEFAULT_RENDER_PROFILE_KEY = "portrait-1080x1920-30";
export const PREVIEW_RENDER_PROFILE_KEY = "preview-540x960-30";

export function findRenderProfile(key: string | null | undefined): RenderProfileDef {
  return DEFAULT_RENDER_PROFILES.find((p) => p.key === key) ?? DEFAULT_RENDER_PROFILES[0];
}
