export type Role = "admin" | "producer" | "reviewer" | "viewer";

export interface Project {
  id: string;
  name: string;
  description: string;
  default_language: string;
  visual_style: string;
  default_resolution: string;
  default_fps: number;
}

export interface StorySummary {
  id: string;
  project_id: string;
  title: string;
  original_text: string;
  language: string;
  genre: string | null;
  moral: string | null;
  status: string;
  current_version: number;
  settings_json: Record<string, unknown>;
}

export interface StoryDetail extends StorySummary {
  story_json: StoryDefinition | null;
  analysis_json: Analysis | null;
  versions: { version_number: number; change_summary: string; created_at: string }[];
}

export interface StoryDefinition {
  story_id: string;
  characters: { character_id: string; asset_version: number; voice_id: string | null }[];
  audio: { narrator_voice: string; music: { track_id: string; volume: number } | null };
  output: { width: number; height: number; fps: number };
  scenes: SceneJson[];
  [key: string]: unknown;
}

export interface Analysis {
  language: string;
  title: string | null;
  moral: string | null;
  entities: { key: string; display_name: string; matched_asset_id: string | null; mention_count: number }[];
  scenes: { index: number; title: string; characters: string[]; location_tags: string[]; estimated_duration: number }[];
  warnings: string[];
}

export interface ActionJson {
  action_id: string;
  character_id: string;
  animation: string;
  start_seconds: number;
  duration_seconds: number | null;
  [key: string]: unknown;
}

export interface ShotJson {
  shot_id: string;
  duration_seconds: number;
  description: string;
  camera: { preset: string; target?: string | null; [key: string]: unknown };
  characters: { character_id: string; expression: string; state: string; facing: string; position: Record<string, unknown>; [key: string]: unknown }[];
  actions: ActionJson[];
  dialogue: { line_id: string; speaker: string; text: string; emotion: string }[];
  effects: { effect_id: string; type: string; start_seconds: number; duration_seconds: number }[];
  [key: string]: unknown;
}

export interface SceneJson {
  scene_id: string;
  title: string;
  environment_id: string;
  time_of_day: string;
  weather: string;
  shots: ShotJson[];
  [key: string]: unknown;
}

export interface Scene {
  id: string;
  scene_id: string;
  scene_number: number;
  title: string;
  description: string;
  duration: number;
  environment_id: string;
  time_of_day: string;
  weather: string;
  approval_status: "pending" | "approved" | "rejected";
  shot_count: number;
  characters: string[];
  narration: string[];
  dialogue: { speaker: string; text: string; emotion: string }[];
  scene_json: SceneJson;
}

export interface Asset {
  id: string;
  asset_type: string;
  name: string;
  description: string;
  version: number;
  versions: number[];
  approval_status: string;
  tags: string[];
  aliases: string[];
  licence: string;
  file_count: number;
  thumbnail_url: string | null;
  audio_url: string | null;
  duration_seconds: number | null;
  catalog_code?: string | null;
  category?: string | null;
  subcategory?: string | null;
  related_stories?: string[];
}

export interface Character extends Asset {
  character_code: string;
  display_name: string;
  species: string;
  default_voice: string | null;
  rig_template: string;
  expressions: string[];
  poses: string[];
  states: string[];
  continuity_rules: string[];
  expression_images: { name: string; url: string }[];
  pose_images: { name: string; url: string }[];
  problems: { kind: string; path: string; message: string }[];
  svg_master_count?: number;
}

export interface Environment extends Asset {
  environment_code: string;
  anchors: Record<string, { x: number; y: number; features: string[] }>;
  lighting_presets: string[];
  camera_bounds?: number[];
  compatibility?: { seasons?: string[]; weather?: string[]; scare_levels?: number[]; ambience?: string; habitats?: string[] };
  preview_url?: string;
  composite_url?: string | null;
  layers: { id: string; type: string; parallax: number; order: number; animated: boolean; url: string; scare?: number; tint_group?: string; rect?: number[]; svg_url?: string | null }[];
}

export interface ComponentAsset extends Asset {
  kind: string;
  size: number[];
  image_url: string;
  svg_url: string;
}

export interface LibraryStats {
  by_type: Record<string, number>;
  approval: Record<string, number>;
  environment_categories: Record<string, number>;
  character_categories: Record<string, number>;
  component_kinds: Record<string, number>;
  environment_layers: number;
  png_layers: number;
  duplicate_asset_groups: string[][];
  assets_used_by_several_stories: number;
  stories: { stories: number; implemented: number; fully_covered: number; unmatched_needs: Record<string, string[]> } | null;
  scare_layers: number;
  svg_masters: number;
  not_delivered: string[];
}

export interface AssetReport {
  complete: boolean;
  missing: { kind: string; key: string; needed_for: string; reason: string }[];
  characters: { key: string; name: string; matched: string | null; candidates: string[] }[];
  scenes: { scene_id: string; title: string; environment: { tags: string[]; chosen: string | null; chosen_name: string | null; candidates: { id: string; name: string; score: number; category: string | null }[] }; expressions_missing: string[] }[];
}

export interface Animation {
  code: string;
  name: string;
  category: string;
  rigs: string[];
  duration: number;
  loop: boolean;
  additive: boolean;
  start_states: string[];
  end_state: string | null;
  travels: boolean;
  description: string;
}

export interface RenderOutput {
  id: string;
  type: string;
  scene_id: string | null;
  duration: number;
  resolution: string;
  published: boolean;
  created_at: string;
  url: string;
  download_url?: string;
  story_version?: number;
}

export interface RenderJob {
  id: string;
  story_id: string;
  story_version: number;
  type: string;
  mode: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled" | "interrupted";
  progress: number;
  current_scene: string | null;
  scenes: Record<string, { status: string; progress: number; error?: string | null }>;
  completed_scenes: string[];
  failed_scenes: string[];
  error_message: string | null;
  render_seconds: number;
  created_at: string;
  outputs: RenderOutput[];
}

export interface QCItem {
  category: string;
  check: string;
  severity: "error" | "warning" | "info";
  message: string;
  where: string;
}

export interface QCReport {
  passed: boolean;
  ready_to_publish: boolean;
  checks_run: string[];
  automatic: QCItem[];
  human_review: QCItem[];
  summary: { errors: number; warnings: number; awaiting_approval: number };
  video: (QCReport & { stale: boolean; output_id: string }) | null;
}

export interface Voice {
  id: string;
  name: string;
  language: string;
  description: string;
}

export interface AudioClip {
  id: string;
  type: string;
  voice_id: string;
  line: string;
  duration: number;
  text: string;
  url: string;
}

export interface Completion {
  characters: { total: number; with_svg_masters: number; with_four_views: number; with_15_expressions: number; with_15_poses: number; with_validated_rigs: number; approved: number; pending: number;
    rejected: number; original_nine_fully_upgraded: number; original_total: number; original_nine_upgraded_to_v2: number; without_four_views: string[] };
  environments: { total: number; wide: number; medium: number; closeup: number; with_complete_layer_files: number; with_validated_camera_and_anchors: number; approved: number; pending: number;
    rejected: number; wide_with_all_three_compositions: number; wide_without_variants: number };
  rigs: { rigs: { template: string; label: string; defined: boolean; characters: number; note?: string }[]; rig_test_results: { passed?: number; failed?: number; run_at?: string } };
  story_research: { available: boolean; collections_total?: number; collections_with_a_consulted_source?: number; sources_consulted?: number; source_records?: number; seed_entries?: number; verified?: number;
    cross_verified?: number; unverified?: number; research_pending?: number; documented_overlaps?: number; regions_with_a_consulted_source?: number; regions_total?: number };
}
