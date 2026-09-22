"""Test-only environment setup. Must run BEFORE any `app.*` import so the
process picks up an isolated, disposable SQLite DB and storage directory
instead of the developer's real dev.db (see docs/ARCHITECTURE.md "Decisions
made where the spec was ambiguous / Database for local sandboxed testing").
"""
import os
import tempfile

_TEST_ROOT = tempfile.mkdtemp(prefix="whiteboard_studio_test_")
os.environ.setdefault("DATABASE_URL", f"sqlite:///{_TEST_ROOT}/test.db")
os.environ.setdefault("STORAGE_PATH", f"{_TEST_ROOT}/storage")
os.environ.setdefault("MOCK_AI", "true")
os.environ.setdefault("MOCK_VOICE", "true")

import pytest  # noqa: E402

from app.core.database import engine  # noqa: E402
from app.models import Base  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _create_tables():
    Base.metadata.create_all(engine)
    yield


@pytest.fixture
def db_session():
    from app.core.database import SessionLocal

    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
