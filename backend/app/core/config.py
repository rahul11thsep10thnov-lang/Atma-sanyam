"""Central application settings, loaded once from environment variables.

This is the ONLY place that reads secret environment variables. No other
module should call ``os.environ`` directly for API keys or credentials.
"""
from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/app/core/config.py -> repo root is 3 parents up. Storage/DB
# defaults are resolved against this absolute path (not cwd) so the API,
# Celery workers, and tests all agree on one /storage directory regardless
# of which directory they were launched from.
PROJECT_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_STORAGE_PATH = str(PROJECT_ROOT / "storage")
DEFAULT_SQLITE_URL = f"sqlite:///{PROJECT_ROOT / 'storage' / 'dev.db'}"


class RetentionDefaults(BaseSettings):
    """Default retention windows (see docs/PRIVACY.md). User-overridable
    per-owner via ProjectSetting; these are only the initial defaults."""

    source_files_days: int = 30
    extracted_text_days: int = 30
    lesson_data_days: int = 90
    audio_days: int = 30
    preview_video_days: int = 7
    final_video_days: int = 90
    thumbnails_days: int = 90
    temp_files_hours: int = 24
    job_logs_days: int = 30
    failed_job_artifacts_days: int = 7


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    secret_key: str = "change-me-to-a-random-secret-in-production"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: str = "http://localhost:3000"

    mock_ai: bool = True
    mock_voice: bool = True

    database_url: str = DEFAULT_SQLITE_URL

    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"

    storage_backend: str = "local"
    storage_path: str = DEFAULT_STORAGE_PATH

    llm_provider: str = "mock"
    llm_api_key: str = Field(default="", repr=False)
    llm_model: str = "claude-sonnet-5"

    elevenlabs_api_key: str = Field(default="", repr=False)
    elevenlabs_voice_id: str = ""
    elevenlabs_model_id: str = "eleven_multilingual_v2"
    elevenlabs_stability: float = 0.5
    elevenlabs_similarity: float = 0.75
    elevenlabs_style: float = 0.0
    elevenlabs_speed: float = 1.0

    retention_source_files_days: int = 30
    retention_extracted_text_days: int = 30
    retention_lesson_data_days: int = 90
    retention_audio_days: int = 30
    retention_preview_video_days: int = 7
    retention_final_video_days: int = 90
    retention_thumbnails_days: int = 90
    retention_temp_files_hours: int = 24
    retention_job_logs_days: int = 30
    retention_failed_job_artifacts_days: int = 7

    renderer_path: str = "../renderer"
    remotion_concurrency: int = 2
    default_video_width: int = 1920
    default_video_height: int = 1080
    default_video_fps: int = 30

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    def __repr__(self) -> str:  # never leak secrets via accidental logging
        return "Settings(...)"


@lru_cache
def get_settings() -> Settings:
    return Settings()
