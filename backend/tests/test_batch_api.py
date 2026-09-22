import secrets

import pytest
from fastapi.testclient import TestClient

from app.core.database import SessionLocal
from app.main import app
from app.models.user import User


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def _make_user(email: str) -> str:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user is None:
            user = User(email=email, api_token=secrets.token_urlsafe(16))
            db.add(user)
            db.commit()
            db.refresh(user)
        return user.api_token
    finally:
        db.close()


def test_batch_start_without_confirmation_returns_estimate(client):
    token = _make_user("batch-test-1@studio")
    headers = {"Authorization": f"Bearer {token}"}

    lesson_resp = client.post("/api/lessons", json={"source_text": "some lesson text"}, headers=headers)
    lesson_id = lesson_resp.json()["id"]

    batch_resp = client.post("/api/batches", json={"name": "Test batch", "lesson_ids": [lesson_id]}, headers=headers)
    batch_id = batch_resp.json()["id"]

    start_resp = client.post(f"/api/batches/{batch_id}/start", json={"confirm": False}, headers=headers)
    body = start_resp.json()
    assert body["requires_confirmation"] is True
    assert body["estimate"]["lesson_count"] == 1


def test_batch_start_rejects_source_validation_failure(client):
    token = _make_user("batch-test-2@studio")
    headers = {"Authorization": f"Bearer {token}"}

    # A lesson created with only whitespace source text should fail the
    # batch safety gate's source-validation check.
    lesson_resp = client.post("/api/lessons", json={"source_text": "text that will be blanked"}, headers=headers)
    lesson_id = lesson_resp.json()["id"]

    db = SessionLocal()
    try:
        from app.models.lesson import Lesson

        lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
        lesson.source_text = ""
        db.commit()
    finally:
        db.close()

    batch_resp = client.post("/api/batches", json={"name": "Bad batch", "lesson_ids": [lesson_id]}, headers=headers)
    batch_id = batch_resp.json()["id"]

    start_resp = client.post(f"/api/batches/{batch_id}/start", json={"confirm": True}, headers=headers)
    assert start_resp.status_code == 409
    assert start_resp.json()["error"]["code"] == "SOURCE_VALIDATION_FAILED"


def test_batch_start_confirmed_with_matching_count_succeeds(client):
    token = _make_user("batch-test-3@studio")
    headers = {"Authorization": f"Bearer {token}"}

    lesson_resp = client.post("/api/lessons", json={"source_text": "valid lesson text"}, headers=headers)
    lesson_id = lesson_resp.json()["id"]
    batch_resp = client.post("/api/batches", json={"name": "Good batch", "lesson_ids": [lesson_id]}, headers=headers)
    batch_id = batch_resp.json()["id"]

    start_resp = client.post(
        f"/api/batches/{batch_id}/start",
        json={"confirm": True, "expected_lesson_count": 1},
        headers=headers,
    )
    assert start_resp.status_code == 200
    assert start_resp.json()["status"] == "RUNNING"
