export interface LessonDetail {
  id: string;
  title: string;
  status: string;
  source_text: string;
  language: string;
  subject: string;
  analysis: Record<string, unknown> | null;
  example: { generated: Record<string, unknown>; verified: boolean } | null;
  teaching_plan: { lesson_title?: string; scenes?: unknown[] } | null;
  videos: { id: string; kind: string; video_path: string }[];
}
