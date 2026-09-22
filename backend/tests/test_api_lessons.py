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
            import secrets

            user = User(email=email, api_token=secrets.token_urlsafe(16))
            db.add(user)
            db.commit()
            db.refresh(user)
        return user.api_token
    finally:
        db.close()


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_lessons_require_auth(client):
    resp = client.get("/api/lessons")
    assert resp.status_code == 401


def test_lessons_reject_bad_token(client):
    resp = client.get("/api/lessons", headers={"Authorization": "Bearer bogus"})
    assert resp.status_code == 401


def test_create_and_analyze_lesson_via_api(client):
    token = _make_user("api-test-1@studio")
    headers = {"Authorization": f"Bearer {token}"}

    create_resp = client.post(
        "/api/lessons",
        json={"source_text": "A train travels 240 km in 4 hours.", "subject": "Physics"},
        headers=headers,
    )
    assert create_resp.status_code == 200
    lesson_id = create_resp.json()["id"]

    analyze_resp = client.post(f"/api/lessons/{lesson_id}/analyze", headers=headers)
    assert analyze_resp.status_code == 200
    assert analyze_resp.json()["analysis"]["topic"]

    transform_resp = client.post(f"/api/lessons/{lesson_id}/transform", headers=headers)
    assert transform_resp.status_code == 200
    assert transform_resp.json()["verified"] is True


def test_transform_before_analyze_returns_actionable_error(client):
    token = _make_user("api-test-2@studio")
    headers = {"Authorization": f"Bearer {token}"}
    create_resp = client.post("/api/lessons", json={"source_text": "some text"}, headers=headers)
    lesson_id = create_resp.json()["id"]

    resp = client.post(f"/api/lessons/{lesson_id}/transform", headers=headers)
    assert resp.status_code == 409
    body = resp.json()
    assert "error" in body
    assert "code" in body["error"] and "message" in body["error"]


def test_users_cannot_access_each_others_lessons(client):
    token_a = _make_user("owner-a@studio")
    token_b = _make_user("owner-b@studio")

    create_resp = client.post(
        "/api/lessons", json={"source_text": "owner a's private lesson text"}, headers={"Authorization": f"Bearer {token_a}"}
    )
    lesson_id = create_resp.json()["id"]

    resp = client.get(f"/api/lessons/{lesson_id}", headers={"Authorization": f"Bearer {token_b}"})
    assert resp.status_code == 404

    list_resp = client.get("/api/lessons", headers={"Authorization": f"Bearer {token_b}"})
    assert all(lesson["id"] != lesson_id for lesson in list_resp.json())


def test_voice_endpoint_never_returns_api_key(client):
    token = _make_user("voice-test@studio")
    resp = client.get("/api/voices", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    body = resp.json()
    if body is not None:
        assert "api_key" not in body
