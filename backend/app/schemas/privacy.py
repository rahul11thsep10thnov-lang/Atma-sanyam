from __future__ import annotations

from pydantic import BaseModel, Field

RETENTION_CHOICES = ("7_days", "30_days", "90_days", "1_year", "never")


class RetentionSettings(BaseModel):
    source_files: str = "30_days"
    generated_lessons: str = "90_days"
    generated_audio: str = "30_days"
    preview_videos: str = "7_days"
    final_videos: str = "90_days"
    job_logs: str = "30_days"
    temporary_files: str = "24_hours"


class StorageBreakdown(BaseModel):
    total_bytes: int
    source_bytes: int
    audio_bytes: int
    video_bytes: int
    other_bytes: int
    file_count: int


class DeleteLessonManifest(BaseModel):
    lesson_id: str
    source_document: bool
    extracted_text: bool
    generated_lesson: bool
    generated_audio_count: int
    preview_video_count: int
    final_video_count: int
    thumbnail_count: int
    temporary_assets: bool


class DeleteAllPreview(BaseModel):
    lesson_count: int
    file_count: int
    audio_asset_count: int
    video_asset_count: int
    storage_bytes: int


class DeleteAllRequest(BaseModel):
    confirmation_phrase: str


class ExportRequest(BaseModel):
    include_media_files: bool = True
