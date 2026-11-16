from __future__ import annotations

import os
import shutil
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
TEST_DB = os.environ.get("CSAE_TEST_DATABASE_URL", "postgresql+psycopg://csae:csae-dev@localhost:5432/csae_test")


def _db_available() -> bool:
    try:
        from sqlalchemy import create_engine, text
        eng = create_engine(TEST_DB)
        with eng.connect() as c:
            c.execute(text("select 1"))
        eng.dispose()
        return True
    except Exception:
        return False


def pytest_collection_modifyitems(config, items):
    have_db = None
    have_bpy = None
    for item in items:
        if "db" in item.keywords:
            if have_db is None:
                have_db = _db_available()
            if not have_db:
                item.add_marker(pytest.mark.skip(reason="PostgreSQL test database is not reachable"))
        if "render" in item.keywords:
            if have_bpy is None:
                import importlib.util
                have_bpy = importlib.util.find_spec("bpy") is not None and shutil.which("ffmpeg") is not None
            if not have_bpy:
                item.add_marker(pytest.mark.skip(reason="Blender (bpy) or FFmpeg is not installed"))
        if "tts" in item.keywords and shutil.which("espeak-ng") is None:
            item.add_marker(pytest.mark.skip(reason="espeak-ng is not installed"))


@pytest.fixture(scope="session")
def project_root() -> Path:
    return ROOT


@pytest.fixture(scope="session")
def migrated_db():
    """A freshly migrated PostgreSQL database, built by Alembic exactly as in production."""
    from alembic import command
    from alembic.config import Config
    from sqlalchemy import create_engine, text

    eng = create_engine(TEST_DB, isolation_level="AUTOCOMMIT")
    with eng.connect() as c:
        c.execute(text("DROP SCHEMA public CASCADE"))
        c.execute(text("CREATE SCHEMA public"))
    eng.dispose()
    cfg = Config(str(ROOT / "alembic.ini"))
    cfg.set_main_option("script_location", str(ROOT / "backend" / "migrations"))
    cfg.set_main_option("sqlalchemy.url", TEST_DB)
    command.upgrade(cfg, "head")
    return TEST_DB


@pytest.fixture(scope="session")
def data_root(tmp_path_factory) -> Path:
    return tmp_path_factory.mktemp("csae_data")


@pytest.fixture(scope="session")
def app(migrated_db, data_root):
    from backend.app import create_app
    from backend.settings import Settings

    library_copy = data_root / "asset_library"          # API tests upload and approve assets: never touch the shipped library
    if not library_copy.exists():
        shutil.copytree(ROOT / "asset_library", library_copy)
    settings = Settings(env="test", database_url=migrated_db, data_root=data_root, asset_library=library_copy, log_level="WARNING",
                        voice_provider="espeak" if shutil.which("espeak-ng") else "tone", llm_provider="none")
    return create_app(settings)


@pytest.fixture(scope="session")
def client(app):
    from fastapi.testclient import TestClient

    with TestClient(app) as c:
        yield c


def _login(client, app, email: str, role: str) -> dict[str, str]:
    from backend.services import auth
    ctx = app.state.ctx
    with ctx.db.transaction() as s:
        from backend.repositories import UserRepo
        if not UserRepo(s).by_email(email):
            auth.create_user(s, email, "correct-horse-battery", role)
    r = client.post("/api/v1/auth/login", json={"email": email, "password": "correct-horse-battery"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture(scope="session")
def auth(client, app) -> dict[str, str]:
    return _login(client, app, "producer@example.com", "producer")


@pytest.fixture(scope="session")
def admin_auth(client, app) -> dict[str, str]:
    return _login(client, app, "admin@example.com", "admin")


@pytest.fixture(scope="session")
def viewer_auth(client, app) -> dict[str, str]:
    return _login(client, app, "viewer@example.com", "viewer")


@pytest.fixture(scope="session")
def reviewer_auth(client, app) -> dict[str, str]:
    return _login(client, app, "reviewer@example.com", "reviewer")


# ------------------------------------------------------------------ engine fixtures
@pytest.fixture(scope="session")
def library():
    """The real asset library shipped in the repository."""
    from engine.asset_manager.library import AssetLibrary
    return AssetLibrary(ROOT / "asset_library")


@pytest.fixture(scope="session")
def composer(library):
    from engine.composition.composer import SceneComposer
    return SceneComposer(library)


@pytest.fixture(scope="session")
def engine_paths(tmp_path_factory, library):
    from engine.common.paths import EnginePaths
    base = EnginePaths.under(tmp_path_factory.mktemp("engine_data"))
    return EnginePaths(library.root, base.stories, base.renders, base.cache).ensure()


@pytest.fixture(scope="session")
def render_service(library, engine_paths):
    from engine.rendering.service import RenderService
    return RenderService(library, engine_paths, timeout=600, retries=1)


@pytest.fixture(scope="session")
def artifacts() -> Path:
    """Where tests leave the renders and audio they produce, for a human to look at."""
    out = Path(os.environ.get("CSAE_TEST_ARTIFACTS", ROOT / "renders" / "test_artifacts"))
    out.mkdir(parents=True, exist_ok=True)
    return out
