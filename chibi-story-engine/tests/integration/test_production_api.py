"""The production flow through the HTTP API, against PostgreSQL and the real engine."""
from __future__ import annotations

import io
import time
import uuid

import pytest
from PIL import Image
from sqlalchemy import text

from tests.support import MONKEY_STORY, scene, shot

pytestmark = pytest.mark.db
API = "/api/v1"


def _wait(client, auth, job_id, timeout=420):
    deadline = time.time() + timeout
    while time.time() < deadline:
        job = client.get(f"{API}/render-jobs/{job_id}", headers=auth).json()
        if job["status"] not in ("queued", "running"):
            return job
        time.sleep(0.5)
    raise AssertionError("render job did not finish in time")


@pytest.fixture(scope="module")
def monkey(client, auth):
    pid = client.post(f"{API}/projects", json={"name": "Panchatantra " + uuid.uuid4().hex[:6]}, headers=auth).json()["id"]
    r = client.post(f"{API}/stories", headers=auth, json={"project_id": pid, "title": "बंदर और मगरमच्छ", "original_text": MONKEY_STORY,
                                                           "genre": "panchatantra"})
    assert r.status_code == 201, r.text
    return r.json()["id"]


def test_library_is_mirrored_into_the_database(app, client, auth):
    with app.state.ctx.db.transaction() as s:
        rows = dict(s.execute(text("select asset_type, count(*) from assets group by 1")).all())
        assert rows["character"] >= 9 and rows["environment"] >= 3 and rows["prop"] >= 3
        assert s.execute(text("select count(*) from characters where character_code = 'monkey_001'")).scalar() == 1
        assert s.execute(text("select count(*) from character_assets ca join characters c on c.id = ca.character_id "
                              "where c.character_code = 'monkey_001' and ca.asset_type = 'rig_part'")).scalar() > 15
        assert s.execute(text("select count(*) from environment_assets")).scalar() > 20
        assert s.execute(text("select count(*) from animations")).scalar() >= 39
        assert s.execute(text("select count(*) from asset_versions")).scalar() >= rows["character"]
    assert client.post(f"{API}/library/sync", headers=auth).status_code == 200                    # idempotent
    with app.state.ctx.db.transaction() as s:
        assert s.execute(text("select count(*) from characters where character_code = 'monkey_001'")).scalar() == 1


def test_analyse_and_generate_storyboard(client, auth, monkey):
    r = client.post(f"{API}/stories/{monkey}/quality-check", headers=auth)
    assert r.status_code == 409 and r.json()["error"]["code"] == "no_storyboard"
    analysis = client.post(f"{API}/stories/{monkey}/analyse", headers=auth)
    assert analysis.status_code == 200, analysis.text
    body = analysis.json()
    assert [e["key"] for e in body["entities"]] == ["monkey", "crocodile", "crocodile_wife"] and len(body["scenes"]) == 6
    assert {e["matched_asset_id"] for e in body["entities"]} == {"monkey_001", "crocodile_001", "crocodile_wife_001"}
    r = client.post(f"{API}/stories/{monkey}/analyse", headers=auth, json={"use_llm": True})
    assert r.status_code == 503 and r.json()["error"]["code"] == "provider_unavailable"           # no key: said plainly, not faked
    board = client.post(f"{API}/stories/{monkey}/generate-storyboard", headers=auth)
    assert board.status_code == 200, board.text
    data = board.json()
    assert data["missing_assets"] == [] and data["story"]["current_version"] == 1 and data["story"]["status"] == "storyboarded"
    assert len(data["story"]["story_json"]["scenes"]) == 6
    scenes = client.get(f"{API}/stories/{monkey}/scenes", headers=auth).json()
    assert [s["scene_number"] for s in scenes] == [1, 2, 3, 4, 5, 6]
    two = scenes[1]
    assert two["characters"] == ["crocodile_001", "monkey_001"] and two["environment_id"] == "forest_river_001"
    assert two["shot_count"] >= 4 and two["approval_status"] == "pending"
    assert two["dialogue"][0] == {"speaker": "monkey_001", "text": "मित्र, तुम थके लगते हो। लो, ये मीठे जामुन खाओ।", "emotion": "neutral"}
    assert any("मगरमच्छ तैरता हुआ" in n for n in two["narration"])


def test_edit_approve_and_regenerate_a_scene(client, auth, reviewer_auth, viewer_auth, monkey):
    scenes = client.get(f"{API}/stories/{monkey}/scenes", headers=auth).json()
    sid = scenes[0]["id"]
    r = client.patch(f"{API}/scenes/{sid}", headers=auth, json={"time_of_day": "sunset", "title": "नदी किनारे की शाम"})
    assert r.status_code == 200 and r.json()["time_of_day"] == "sunset" and r.json()["title"] == "नदी किनारे की शाम"
    assert r.json()["id"] == sid                                                                  # scene ids survive new versions
    detail = client.get(f"{API}/stories/{monkey}", headers=auth).json()
    assert detail["current_version"] == 2 and detail["versions"][-1]["change_summary"] == "Edit scene scene_01"
    edited = r.json()["scene_json"]
    edited["shots"][0]["dialogue"][0]["text"] = "बहुत समय पहले, एक नदी के किनारे जामुन का एक बड़ा पेड़ था।"
    r = client.patch(f"{API}/scenes/{sid}", headers=auth, json={"scene_json": edited})
    assert r.status_code == 200 and r.json()["narration"][0].startswith("बहुत समय पहले")
    edited["shots"][0]["characters"][0]["character_id"] = "dragon_001"
    r = client.patch(f"{API}/scenes/{sid}", headers=auth, json={"scene_json": edited})
    assert r.status_code == 422 and "dragon_001" in str(r.json()["error"]["details"])
    assert client.patch(f"{API}/scenes/{sid}", headers=auth, json={"approval_status": "approved"}).status_code == 403
    assert client.patch(f"{API}/scenes/{sid}", headers=viewer_auth, json={"title": "x"}).status_code == 403
    r = client.patch(f"{API}/scenes/{sid}", headers=reviewer_auth, json={"approval_status": "approved"})
    assert r.status_code == 200 and r.json()["approval_status"] == "approved"
    r = client.patch(f"{API}/scenes/{sid}", headers=auth, json={"weather": "windy"})
    assert r.json()["approval_status"] == "pending"                                               # an edit needs approval again
    r = client.post(f"{API}/scenes/{sid}/regenerate", headers=auth)
    assert r.status_code == 200 and r.json()["time_of_day"] == "day" and r.json()["narration"][0].startswith("एक नदी के किनारे")
    assert client.patch(f"{API}/scenes/{uuid.uuid4()}", headers=auth, json={"title": "x"}).status_code == 404
    frame = client.get(f"{API}/scenes/{sid}/frame?t=2&width=320", headers=auth)
    assert frame.status_code == 200 and frame.headers["content-type"] == "image/jpeg"
    assert Image.open(io.BytesIO(frame.content)).size == (320, 180)


def test_generate_audio_and_quality_check(client, auth, monkey):
    before = client.get(f"{API}/stories/{monkey}", headers=auth).json()
    r = client.post(f"{API}/stories/{monkey}/generate-audio", headers=auth)
    assert r.status_code == 200, r.text
    audio = r.json()
    assert audio["generated"] == 26 and audio["problems"] == [] and len(audio["retimed_shots"]) > 10
    assert audio["story_version"] == before["current_version"] + 1 and 100 < audio["total_duration"] < 260
    again = client.post(f"{API}/stories/{monkey}/generate-audio", headers=auth).json()
    assert again["generated"] == 0 and again["reused"] == 26 and again["retimed_shots"] == []     # cached, already timed
    clips = client.get(f"{API}/stories/{monkey}/audio", headers=auth).json()
    assert len(clips) == 26 and {c["type"] for c in clips} == {"narration", "dialogue"}
    assert {c["voice_id"] for c in clips} == {"narrator_hi", "monkey_hi", "crocodile_hi", "crocodile_wife_hi"}
    wav = client.get(clips[0]["url"], headers=auth)
    assert wav.status_code == 200 and wav.content[:4] == b"RIFF"
    report = client.post(f"{API}/stories/{monkey}/quality-check", headers=auth).json()
    assert report["passed"] is True and report["summary"]["errors"] == 0 and report["video"] is None
    assert report["ready_to_publish"] is False and report["summary"]["awaiting_approval"] >= 9    # designs and scenes need a human
    assert {"missing_assets", "missing_audio", "timeline_conflicts", "character_continuity", "approvals"} <= set(report["checks_run"])


def test_asset_endpoints(client, auth, reviewer_auth, viewer_auth, app):
    everything = client.get(f"{API}/assets", headers=auth).json()
    assert {a["asset_type"] for a in everything} >= {"character", "environment", "prop", "effect", "music", "sound_effect"}
    assert all("path" not in a and "/home" not in str(a) and "/tmp" not in str(a) for a in everything)       # no filesystem paths leak
    assert [a["id"] for a in client.get(f"{API}/assets?q=monkey_001", headers=auth).json()] == ["monkey_001"]
    assert [a["id"] for a in client.get(f"{API}/assets?q=बंदर", headers=auth).json()] == ["monkey_001"]
    chars = {c["character_code"]: c for c in client.get(f"{API}/characters", headers=auth).json()}
    monkey = chars["monkey_001"]
    assert monkey["rig_template"] == "biped_chibi" and "laughing" in monkey["expressions"] and monkey["problems"] == []
    image = client.get(monkey["thumbnail_url"], headers=auth)
    assert image.status_code == 200 and image.content[:4] == b"\x89PNG"
    assert client.get(monkey["thumbnail_url"]).status_code == 401
    envs = client.get(f"{API}/environments", headers=auth).json()
    river = next(e for e in envs if e["id"] == "forest_river_001")
    assert "tree_branch" in river["anchors"] and len(river["layers"]) == 14 and any(l["animated"] for l in river["layers"])
    reptile = client.get(f"{API}/animations?rig=quadruped_reptile", headers=auth).json()
    assert "crocodile_swim" in [a["code"] for a in reptile] and "walk" not in [a["code"] for a in reptile]
    voices = client.get(f"{API}/voices", headers=auth).json()
    assert voices["provider_available"] and "narrator_hi" in [v["id"] for v in voices["voices"]]
    presets = client.get(f"{API}/library/presets", headers=auth).json()
    assert "slow_push_in" in presets["camera_presets"] and "night" in presets["lighting"] and "splash" in presets["effects"]
    # traversal and unlisted files are refused
    for bad in ("../../../etc/passwd", "metadata.json", "rig/../metadata.json", "rig/nothing.png"):
        assert client.get(f"{API}/media/assets/character/monkey_001/{bad}", headers=auth).status_code in (400, 404)
    assert client.get(f"{API}/media/assets/character/..%2F..%2Fx/rig/a.png", headers=auth).status_code in (400, 404)
    assert client.get(f"{API}/assets/character/monkey_001/verify", headers=auth).json() == {"intact": True, "problems": []}


def test_upload_validation_versions_and_approval(client, auth, reviewer_auth, app):
    def png(colour, size=(300, 200)):
        buf = io.BytesIO()
        Image.new("RGBA", size, colour).save(buf, "PNG")
        return buf.getvalue()

    aid = "kite_" + uuid.uuid4().hex[:6]
    form = {"asset_id": aid, "name": "Kite", "asset_type": "prop", "tags": "toy, sky"}
    r = client.post(f"{API}/assets", headers=auth, data=form, files={"file": ("kite.png", png((255, 0, 0, 255)), "image/png")})
    assert r.status_code == 201, r.text
    assert r.json()["version"] == 1 and r.json()["approval_status"] == "pending" and r.json()["tags"] == ["toy", "sky"]
    r = client.post(f"{API}/assets", headers=auth, data=form, files={"file": ("kite.png", png((0, 0, 255, 255)), "image/png")})
    assert r.json()["version"] == 2 and r.json()["versions"] == [1, 2]                            # a new version, the old one kept
    old = client.get(f"{API}/media/assets/prop/{aid}/prop.png?version=1", headers=auth)
    assert Image.open(io.BytesIO(old.content)).convert("RGBA").getpixel((5, 5)) == (255, 0, 0, 255)
    cases = [
        ({"file": ("evil.png", b"<?php system($_GET['c']); ?>", "image/png")}, form, 415),          # content decides, not the name
        ({"file": ("big.png", b"\x89PNG\r\n\x1a\n" + b"0" * (26 * 1024 * 1024), "image/png")}, form, 413),
        ({"file": ("a.png", png((1, 2, 3, 255)), "image/png")}, {**form, "asset_id": "../escape"}, 422),
        ({"file": ("a.png", png((1, 2, 3, 255)), "image/png")}, {**form, "asset_type": "character"}, 422),
        ({"file": ("a.wav", png((1, 2, 3, 255)), "audio/wav")}, {**form, "asset_id": "boom_001", "asset_type": "sound_effect"}, 415),
    ]
    for files, data, status in cases:
        r = client.post(f"{API}/assets", headers=auth, data=data, files=files)
        assert r.status_code == status, (status, r.status_code, r.text[:200])
        assert set(r.json()["error"]) == {"code", "message", "details"}
    assert client.post(f"{API}/assets/prop/{aid}/approval", headers=auth, json={"status": "approved"}).status_code == 403
    r = client.post(f"{API}/assets/prop/{aid}/approval", headers=reviewer_auth, json={"status": "approved"})
    assert r.status_code == 200 and r.json()["approval_status"] == "approved"
    with app.state.ctx.db.transaction() as s:
        row = s.execute(text("select current_version, approval_status from assets where asset_code = :c"), {"c": aid}).one()
        assert tuple(row) == (2, "approved")
        assert s.execute(text("select count(*) from audit_log where action = 'asset.approved' and entity_id = :e"), {"e": f"prop/{aid}"}).scalar() == 1


def test_register_a_new_character(client, auth):
    code = "monkey_" + uuid.uuid4().hex[:5]
    r = client.post(f"{API}/characters", headers=auth, json={"character_code": code, "display_name": "Monkey cousin", "based_on": "monkey_001",
                                                              "aliases": ["चचेरा बंदर"], "default_voice": "rabbit_hi"})
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["character_code"] == code and body["default_voice"] == "rabbit_hi" and body["approval_status"] == "pending"
    assert body["problems"] == [] and body["version"] == 1
    assert client.get(f"{API}/characters/{code}", headers=auth).json()["display_name"] == "Monkey cousin"
    assert [a["id"] for a in client.get(f"{API}/assets?q=चचेरा बंदर", headers=auth).json()] == [code]
    assert client.post(f"{API}/characters", headers=auth, json={"character_code": code, "display_name": "x", "based_on": "monkey_001"}).status_code == 409
    assert client.post(f"{API}/characters", headers=auth, json={"character_code": "z_1", "display_name": "x", "based_on": "unicorn_001"}).status_code == 404
    assert client.post(f"{API}/characters", headers=auth, json={"character_code": "z_2", "display_name": "x", "based_on": "monkey_001",
                                                                "default_voice": "nobody"}).status_code == 422


def _mini_story(story_id: str) -> dict:
    line = lambda lid, who, text_: {"line_id": lid, "speaker": who, "text": text_}
    return {"story_id": story_id, "output": {"width": 640, "height": 360, "fps": 24},
            "audio": {"narrator_voice": "narrator_hi", "music": {"track_id": "gentle_story_001"}},
            "characters": [{"character_id": "monkey_001"}, {"character_id": "crocodile_001"}],
            "scenes": [scene("scene_a", [shot("a1", 2.0, dialogue=[line("a1_l1", "narrator", "एक बंदर था।")])]),
                       scene("scene_b", [shot("b1", 2.0, dialogue=[line("b1_l1", "crocodile_001", "नमस्ते!")])])]}


@pytest.mark.render
def test_render_jobs_exports_and_publishing(client, auth, reviewer_auth, admin_auth, app):
    pid = client.post(f"{API}/projects", json={"name": "Mini " + uuid.uuid4().hex[:6]}, headers=auth).json()["id"]
    sid = client.post(f"{API}/stories", headers=auth, json={"project_id": pid, "title": "Mini", "original_text": "एक बंदर था।"}).json()["id"]
    assert client.post(f"{API}/stories/{sid}/render", headers=auth).status_code == 409             # nothing to render yet
    assert client.patch(f"{API}/stories/{sid}", headers=auth, json={"story_json": _mini_story("mini_" + uuid.uuid4().hex[:6])}).status_code == 200
    assert client.post(f"{API}/stories/{sid}/generate-audio", headers=auth).json()["generated"] == 2
    assert client.post(f"{API}/stories/{sid}/render", headers=auth, json={"scene_ids": ["scene_z"]}).status_code == 422

    scenes = client.get(f"{API}/stories/{sid}/scenes", headers=auth).json()
    preview = client.post(f"{API}/scenes/{scenes[0]['id']}/preview", headers=auth)
    assert preview.status_code == 202 and preview.json()["status"] in ("queued", "running")
    done = _wait(client, auth, preview.json()["id"])
    assert done["status"] == "completed" and done["progress"] == 1.0 and done["completed_scenes"] == ["scene_a"], done
    clip = next(o for o in done["outputs"] if o["type"] == "preview")
    video = client.get(clip["url"], headers=auth)
    assert video.status_code == 200 and video.content[4:8] == b"ftyp" and "/home" not in str(done) and "/tmp" not in str(done)

    job = client.post(f"{API}/stories/{sid}/render", headers=auth, json={"mode": "final"}).json()
    done = _wait(client, auth, job["id"])
    assert done["status"] == "completed", done
    assert {v["status"] for v in done["scenes"].values()} == {"rendered"}       # final quality is its own render, not the preview's
    assert done["failed_scenes"] == [] and done["render_seconds"] > 0
    exports = client.get(f"{API}/stories/{sid}/exports", headers=auth).json()
    final = next(e for e in exports if e["type"] == "final")
    assert final["resolution"] == "640x360" and final["duration"] > 3 and not final["published"]
    download = client.get(final["download_url"], headers=auth)
    assert download.status_code == 200 and "attachment" in download.headers["content-disposition"] and len(download.content) > 20000
    assert client.get(final["url"].split("?")[0] + f"?access_token={auth['Authorization'][7:]}").status_code == 200   # for <video src>
    assert client.get(f"{API}/stories/{sid}", headers=auth).json()["status"] == "rendered"

    report = client.post(f"{API}/stories/{sid}/quality-check", headers=auth).json()
    assert report["passed"] and report["video"]["passed"] and report["video"]["stale"] is False
    assert {"resolution", "frame_rate", "black_frames", "video_corruption", "audio_clipping"} <= set(report["video"]["checks_run"])
    r = client.post(f"{API}/stories/{sid}/publish", headers=auth, json={"output_id": final["id"]})
    assert r.status_code == 409 and r.json()["error"]["code"] == "approval_required"               # a human has not approved yet
    assert client.post(f"{API}/stories/{sid}/publish", headers=auth, json={"output_id": final["id"], "override_approvals": True}).status_code == 409
    r = client.post(f"{API}/stories/{sid}/publish", headers=admin_auth, json={"output_id": final["id"], "override_approvals": True})
    assert r.status_code == 200 and r.json()["published"] is True
    assert client.get(f"{API}/stories/{sid}", headers=auth).json()["status"] == "published"

    # an edit makes the published render stale; only the changed scene renders again
    b = next(s for s in scenes if s["scene_id"] == "scene_b")
    assert client.patch(f"{API}/scenes/{b['id']}", headers=auth, json={"time_of_day": "night"}).status_code == 200
    assert client.post(f"{API}/stories/{sid}/quality-check", headers=auth).json()["video"]["stale"] is True
    done = _wait(client, auth, client.post(f"{API}/stories/{sid}/render", headers=auth, json={"mode": "final"}).json()["id"])
    assert done["status"] == "completed" and done["scenes"]["scene_a"]["status"] == "cached" and done["scenes"]["scene_b"]["status"] == "rendered"
    jobs = client.get(f"{API}/render-jobs?story_id={sid}", headers=auth).json()
    assert len(jobs) == 3 and jobs[0]["id"] == done["id"]


@pytest.mark.render
def test_cancel_and_restart_recovery(client, auth, app):
    pid = client.post(f"{API}/projects", json={"name": "Cancel " + uuid.uuid4().hex[:6]}, headers=auth).json()["id"]
    sid = client.post(f"{API}/stories", headers=auth, json={"project_id": pid, "title": "Long", "original_text": "लंबी कहानी।"}).json()["id"]
    long_story = _mini_story("long_" + uuid.uuid4().hex[:6])
    long_story["scenes"][1]["shots"][0]["duration_seconds"] = 20.0
    client.patch(f"{API}/stories/{sid}", headers=auth, json={"story_json": long_story})
    job = client.post(f"{API}/stories/{sid}/render", headers=auth, json={"mode": "final", "audio": False}).json()
    deadline = time.time() + 240
    while time.time() < deadline:
        state = client.get(f"{API}/render-jobs/{job['id']}", headers=auth).json()
        if state["current_scene"] == "scene_b" and state["scenes"].get("scene_b", {}).get("progress", 0) > 0.05:
            break
        time.sleep(0.3)
    r = client.post(f"{API}/render-jobs/{job['id']}/cancel", headers=auth)
    assert r.status_code == 200
    done = _wait(client, auth, job["id"], 60)
    assert done["status"] == "cancelled" and done["completed_scenes"] == ["scene_a"]                # the finished scene was kept
    assert any(o["scene_id"] == "scene_a" for o in done["outputs"])
    assert client.post(f"{API}/render-jobs/{job['id']}/cancel", headers=auth).status_code == 409

    # a job that was running when the server died is reported as interrupted on the next start, and can be resumed
    from backend.workers.runner import JobRunner
    with app.state.ctx.db.transaction() as s:
        s.execute(text("update render_jobs set status = 'running' where id = :i"), {"i": job["id"]})
    fresh = JobRunner(app.state.ctx.db, app.state.ctx.services["hub"])
    fresh.start()
    fresh.stop()
    state = client.get(f"{API}/render-jobs/{job['id']}", headers=auth).json()
    assert state["status"] == "interrupted" and "resume" in state["error_message"]
    r = client.post(f"{API}/render-jobs/{job['id']}/resume", headers=auth)
    assert r.status_code == 202
    time.sleep(1.0)
    client.post(f"{API}/render-jobs/{job['id']}/cancel", headers=auth)                              # do not spend a minute on scene b here
    assert _wait(client, auth, job["id"], 60)["status"] == "cancelled"
