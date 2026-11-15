"""Backend configuration. Everything comes from the environment (prefix CSAE_) or a .env file."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

from engine.common.paths import PROJECT_ROOT, EnginePaths


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="CSAE_", env_file=".env", extra="ignore")

    env: str = "development"
    database_url: str = "postgresql+psycopg://csae:csae-dev@localhost:5432/csae_dev"
    jwt_secret: str = Field("", description="HS256 signing key; required outside development/test")
    token_ttl_minutes: int = 12 * 60
    data_root: Path = PROJECT_ROOT
    asset_library: Path | None = None
    cors_origins: str = "http://localhost:5173"
    log_level: str = "INFO"
    max_upload_bytes: int = 25 * 1024 * 1024
    render_timeout_seconds: int = 3600
    render_retries: int = 1
    render_workers: int = 1
    voice_provider: str = "espeak"
    llm_provider: str = "none"
    sarvam_api_key: str = ""
    anthropic_api_key: str = Field("", validation_alias="ANTHROPIC_API_KEY")
    frontend_dist: Path | None = None

    def secret(self) -> str:
        if self.jwt_secret:
            return self.jwt_secret
        if self.env in ("development", "test"):
            return "csae-development-only-secret-do-not-deploy"
        raise RuntimeError("CSAE_JWT_SECRET must be set when CSAE_ENV is not development or test")

    def paths(self) -> EnginePaths:
        base = EnginePaths.under(self.data_root)
        if self.asset_library:
            base = EnginePaths(self.asset_library, base.stories, base.renders, base.cache)
        return base.ensure()


@lru_cache
def get_settings() -> Settings:
    return Settings()
