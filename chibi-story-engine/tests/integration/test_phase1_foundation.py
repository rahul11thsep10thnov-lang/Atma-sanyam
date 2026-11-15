"""Phase 1 acceptance: migrations, project/story APIs, validation, constraints, docs."""
from __future__ import annotations

import uuid

import pytest
from sqlalchemy import inspect, text
from sqlalchemy.exc import IntegrityError

pytestmark = pytest.mark.db

EXPECTED_TABLES = {"users", "projects", "stories", "story_versions", "scenes", "shots", "characters", "character_assets",
                   "environments", "environment_assets", "props", "animations", "audio_assets", "render_jobs",
                   "render_outputs", "asset_versions", "assets", "audit_log"}


def test_migrations_create_every_table(app):
    tables = set(inspect(app.state.ctx.db.engine).get_table_names())
    assert EXPECTED_TABLES <= tables


def test_primary_keys_are_uuids(app):
    insp = inspect(app.state.ctx.db.engine)
    for table in EXPECTED_TABLES:
        pk = insp.get_pk_constraint(table)["constrained_columns"]
        col = next(c for c in insp.get_columns(table) if c["name"] == pk[0])
        assert str(col["type"]) == "UUID", table


def test_project_and_story_lifecycle(client, auth):
    r = client.post("/api/v1/projects", json={"name": "Panchatantra " + uuid.uuid4().hex[:6]}, headers=auth)
    assert r.status_code == 201, r.text
    project = r.json()
    assert project["default_fps"] == 24 and project["default_resolution"] == "1920x1080"
    assert any(p["id"] == project["id"] for p in client.get("/api/v1/projects", headers=auth).json())

    r = client.post("/api/v1/stories", headers=auth, json={
        "project_id": project["id"], "title": "बंदर और मगरमच्छ", "original_text": "एक नदी के किनारे जामुन का पेड़ था।", "genre": "panchatantra"})
    assert r.status_code == 201, r.text
    story = r.json()
    assert story["status"] == "draft" and story["current_version"] == 0

    got = client.get(f"/api/v1/stories/{story['id']}", headers=auth)
    assert got.status_code == 200
    assert got.json()["original_text"] == "एक नदी के किनारे जामुन का पेड़ था।"
    assert got.json()["story_json"] is None

    r = client.patch(f"/api/v1/stories/{story['id']}", headers=auth, json={"moral": "बुद्धि बल से बड़ी है"})
    assert r.status_code == 200 and r.json()["moral"] == "बुद्धि बल से बड़ी है"


@pytest.mark.parametrize("payload, where", [
    ({"name": ""}, "name"),
    ({"name": "x", "default_fps": 0}, "default_fps"),
    ({"name": "x", "default_resolution": "big"}, "default_resolution"),
    ({"name": "x", "unknown": 1}, "unknown"),
])
def test_invalid_project_is_rejected(client, auth, payload, where):
    r = client.post("/api/v1/projects", json=payload, headers=auth)
    assert r.status_code == 422
    err = r.json()["error"]
    assert err["code"] == "validation_failed"
    assert any(where in i["path"] for i in err["details"]["issues"])


def test_invalid_story_is_rejected(client, auth):
    r = client.post("/api/v1/stories", headers=auth, json={"project_id": str(uuid.uuid4()), "title": "t", "original_text": "x"})
    assert r.status_code == 404 and r.json()["error"]["code"] == "not_found"
    r = client.post("/api/v1/stories", headers=auth, json={"project_id": "nope", "title": "", "original_text": "   "})
    assert r.status_code == 422
    r = client.get(f"/api/v1/stories/{uuid.uuid4()}", headers=auth)
    assert r.status_code == 404


def test_invalid_story_definition_is_rejected_with_readable_issues(client, auth):
    pid = client.post("/api/v1/projects", json={"name": "P " + uuid.uuid4().hex[:6]}, headers=auth).json()["id"]
    sid = client.post("/api/v1/stories", headers=auth, json={"project_id": pid, "title": "t", "original_text": "x"}).json()["id"]
    bad = {"story_id": "s", "scenes": [{"scene_id": "a", "environment_id": "e", "shots": [
        {"shot_id": "s1", "duration_seconds": 2, "actions": [{"action_id": "a1", "character_id": "ghost_001", "animation": "idle"}]}]}]}
    r = client.patch(f"/api/v1/stories/{sid}", headers=auth, json={"story_json": bad})
    assert r.status_code == 422
    assert "ghost_001" in str(r.json()["error"]["details"]["issues"])
    assert client.get(f"/api/v1/stories/{sid}", headers=auth).json()["current_version"] == 0


def test_authentication_and_roles(client, auth, viewer_auth):
    assert client.get("/api/v1/projects").status_code == 401
    assert client.get("/api/v1/projects", headers={"Authorization": "Bearer nonsense"}).status_code == 401
    assert client.get("/api/v1/projects", headers=viewer_auth).status_code == 200
    r = client.post("/api/v1/projects", json={"name": "viewer may not"}, headers=viewer_auth)
    assert r.status_code == 403 and r.json()["error"]["code"] == "forbidden"
    r = client.post("/api/v1/auth/login", json={"email": "producer@example.com", "password": "wrong"})
    assert r.status_code == 401 and r.json()["error"]["code"] == "invalid_credentials"
    assert client.post("/api/v1/auth/users", headers=auth, json={"email": "a@b.co", "password": "long-enough-pass"}).status_code == 403


def test_database_constraints(app, client, auth):
    db = app.state.ctx.db
    name = "Unique " + uuid.uuid4().hex[:6]
    assert client.post("/api/v1/projects", json={"name": name}, headers=auth).status_code == 201
    r = client.post("/api/v1/projects", json={"name": name}, headers=auth)
    assert r.status_code == 409 and r.json()["error"]["code"] == "conflict"

    def fails(sql: str, **params):
        with pytest.raises(IntegrityError):
            with db.transaction() as s:
                s.execute(text(sql), params)

    fails("insert into stories (id, project_id, title, original_text, language, status, current_version, settings_json) "
          "values (gen_random_uuid(), :p, 't', 'x', 'hi-IN', 'draft', 0, '{}')", p=str(uuid.uuid4()))   # foreign key
    pid = client.post("/api/v1/projects", json={"name": "C " + uuid.uuid4().hex[:6]}, headers=auth).json()["id"]
    fails("insert into stories (id, project_id, title, original_text, language, status, current_version, settings_json) "
          "values (gen_random_uuid(), :p, 't', 'x', 'hi-IN', 'bogus', 0, '{}')", p=pid)                # check constraint
    fails("insert into users (id, email, role, is_active) values (gen_random_uuid(), 'producer@example.com', 'viewer', true)")
    fails("insert into projects (id, name, description, default_language, visual_style, default_resolution, default_fps) "
          "values (gen_random_uuid(), :n, '', 'hi-IN', 's', '1920x1080', 0)", n="fps " + uuid.uuid4().hex[:6])
    with db.transaction() as s:   # character codes are unique per project (and among shared assets)
        s.execute(text("insert into assets (id, asset_code, asset_type, name, description, current_version, approval_status, metadata_json) "
                       "values (gen_random_uuid(), 'dup_x', 'character', 'n', '', 1, 'pending', '{}')"))
    fails("insert into assets (id, asset_code, asset_type, name, description, current_version, approval_status, metadata_json) "
          "values (gen_random_uuid(), 'dup_x', 'character', 'n', '', 1, 'pending', '{}')")
    with db.transaction() as s:
        s.execute(text("delete from assets where asset_code = 'dup_x'"))


def test_api_documentation_loads(client):
    assert client.get("/api/docs").status_code == 200
    spec = client.get("/api/openapi.json").json()
    for path in ("/api/v1/projects", "/api/v1/stories", "/api/v1/stories/{story_id}"):
        assert path in spec["paths"]
    assert client.get("/api/health").json() == {"status": "ok"}


def test_errors_are_structured_and_audited(app, client, auth):
    r = client.get("/api/v1/does-not-exist", headers=auth)
    assert r.status_code == 404 and set(r.json()["error"]) == {"code", "message", "details"}
    with app.state.ctx.db.transaction() as s:
        assert s.execute(text("select count(*) from audit_log where action = 'project.created'")).scalar() >= 1
