"""Phase 11 acceptance: security, integrity, recovery, backup and an end-to-end story."""
from __future__ import annotations

import os
import re
import shutil
import subprocess
import time
import uuid
from pathlib import Path

import pytest
from sqlalchemy import create_engine, text

from engine.audio.providers import ToneProvider
from engine.audio.speech import AudioCache, DialogueService, NarrationService, produce_speech
from engine.audio.timing import retime_story
from engine.audio.voices import VoiceRegistry
from engine.character_manager.registry import CharacterRegistry
from engine.common.errors import UnsafePath, ValidationFailed
from engine.common.paths import safe_join
from engine.quality_control.checks import QualityControl
from engine.rendering.service import RenderService, RenderSettings
from engine.schema.assets import AssetType
from engine.schema.story import parse_story
from engine.story_intelligence.analyser import RuleBasedAnalyser
from engine.story_intelligence.storyboard import StoryboardBuilder
from tests.support import ROOT, scene, shot, story

SHORT_STORY = """एक नदी के किनारे जामुन का एक बड़ा पेड़ था। उस पेड़ पर एक चतुर बंदर रहता था।

एक दिन एक मगरमच्छ तैरता हुआ पेड़ के नीचे आया। बंदर ने कहा, "मित्र, ये मीठे जामुन खाओ।" मगरमच्छ खुश होकर बोला, "धन्यवाद, मित्र!\""""


# ------------------------------------------------------------------ security
def test_paths_cannot_escape_their_storage(tmp_path, library):
    for bad in ("../x", "a/../../x", "/etc/passwd", "a/b/../../../x"):
        with pytest.raises(UnsafePath):
            safe_join(tmp_path, bad)
    assert safe_join(tmp_path, "a/b.png") == tmp_path / "a" / "b.png"
    for bad_id in ("../monkey_001", "Monkey", "a/b", "", "x" * 80, "monkey 001"):
        with pytest.raises(UnsafePath):
            library.asset_dir(AssetType.character, bad_id)
    with pytest.raises(Exception):
        library.file_path(AssetType.character, "monkey_001", "../../environments/forest_river_001/metadata.json")


def test_story_data_is_never_executable():
    base = story().model_dump(mode="json")
    attempts = [
        ("extra top-level field", lambda d: d.update({"script": "import os; os.system('id')"})),
        ("extra shot field", lambda d: d["scenes"][0]["shots"][0].update({"python": "__import__('os')"})),
        ("animation that is not an identifier", lambda d: d["scenes"][0]["shots"][0]["actions"].append(
            {"action_id": "a", "character_id": "monkey_001", "animation": "idle; rm -rf /"})),
        ("path as an asset id", lambda d: d["scenes"][0].update({"environment_id": "../../etc"})),
        ("path as a prop id", lambda d: d["scenes"][0]["shots"][0]["props"].append({"prop_id": "/etc/passwd", "position": {"x": 0, "y": 0}})),
        ("object where a number is expected", lambda d: d["scenes"][0]["shots"][0].update({"duration_seconds": {"$gt": 0}})),
        ("absurd duration", lambda d: d["scenes"][0]["shots"][0].update({"duration_seconds": 1e9})),
        ("absurd resolution", lambda d: d["output"].update({"width": 10 ** 7})),
    ]
    for name, mutate in attempts:
        data = story().model_dump(mode="json")
        mutate(data)
        with pytest.raises(ValidationFailed):
            parse_story(data)
    assert parse_story(base).story_id == "test_story"
    with pytest.raises(ValidationFailed):
        parse_story("__import__('os').system('id')")


def test_no_secrets_in_the_repository():
    patterns = [r"sk-ant-[A-Za-z0-9_\-]{10,}", r"AKIA[0-9A-Z]{16}", r"-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----",
                r"api[_-]?subscription[_-]?key['\"]?\s*[:=]\s*['\"][A-Za-z0-9]{16,}", r"(?i)password\s*=\s*['\"][^'\"$]{12,}['\"]"]
    offenders = []
    for path in list(ROOT.glob("engine/**/*.py")) + list(ROOT.glob("backend/**/*.py")) + list(ROOT.glob("tools/**/*.py")) + \
            list(ROOT.glob("frontend/src/**/*.ts*")) + [ROOT / "docker-compose.yml", ROOT / "Dockerfile", ROOT / ".env.example"]:
        body = path.read_text(encoding="utf-8")
        offenders += [f"{path.relative_to(ROOT)}: {p}" for p in patterns if re.search(p, body)]
    assert offenders == []
    env = (ROOT / ".env.example").read_text()
    assert re.search(r"^CSAE_JWT_SECRET=$", env, re.M) and re.search(r"^CSAE_SARVAM_API_KEY=$", env, re.M)


def test_production_refuses_to_start_without_a_signing_key():
    from backend.settings import Settings
    with pytest.raises(RuntimeError, match="CSAE_JWT_SECRET"):
        Settings(env="production", jwt_secret="").secret()
    assert Settings(env="production", jwt_secret="x" * 40).secret() == "x" * 40


def test_passwords_are_hashed_and_tokens_expire():
    from backend.security import create_token, decode_token, hash_password, verify_password
    hashed = hash_password("correct-horse-battery")
    assert hashed.startswith("$2") and "correct" not in hashed and verify_password("correct-horse-battery", hashed)
    assert not verify_password("wrong", hashed) and not verify_password("x", None) and not verify_password("x", "not-a-hash")
    assert decode_token("secret", create_token("secret", "u", "admin", 5))["role"] == "admin"
    assert decode_token("secret", create_token("secret", "u", "admin", -1)) is None            # expired
    assert decode_token("other-secret", create_token("secret", "u", "admin", 5)) is None       # forged
    assert decode_token("secret", "garbage") is None


# ----------------------------------------------------------------- integrity
def test_every_shipped_asset_is_intact_and_consistent(library):
    registry = CharacterRegistry(library)
    clips = library.animations()
    templates = library.rig_templates()
    for asset_type in AssetType:
        for asset_id in library.list_ids(asset_type):
            assert library.verify(asset_type, asset_id) == [], (asset_type, asset_id)
            manifest = library.load(asset_type, asset_id)
            assert manifest.licence.name and manifest.description and manifest.version >= 1
    for character in registry.list():
        assert registry.rig_issues(character) == [], character.id
        assert character.default_voice and VoiceRegistry(library.root / "voices").has(character.default_voice)
        usable = 0
        for clip in clips.values():
            if character.rig.template in clip.rig_compatibility and not set(clip.required_parts) - set(character.rig.part_ids()):
                registry.check_animation(character, clip)                  # must not raise
                usable += 1
        assert usable >= 12, character.id
    for clip in clips.values():
        assert set(clip.rig_compatibility) <= set(templates), clip.code
    index = library.index()
    for env in index.environments:
        assert env.default_anchor_by_role and all(a in env.anchors for names in env.default_anchor_by_role.values() for a in names), env.id
        assert any("offstage" in a.features for a in env.anchors.values()), env.id


def test_composing_is_fast_and_deterministic(composer):
    import json
    st = parse_story(json.loads((ROOT / "stories" / "panchatantra" / "monkey_and_crocodile.json").read_text(encoding="utf-8")))
    started = time.time()
    digests = [composer.compose(st, sc.scene_id)[0].digest() for sc in st.scenes]
    elapsed = time.time() - started
    assert elapsed < 30, f"composing 140 s of animation took {elapsed:.1f}s"
    assert digests == [composer.compose(st, sc.scene_id)[0].digest() for sc in st.scenes]


# -------------------------------------------------------- backup and restore
@pytest.mark.db
def test_database_backup_and_restore(app, client, auth, tmp_path, migrated_db):
    if not shutil.which("pg_dump"):
        pytest.skip("pg_dump is not installed")
    name = "Backup " + uuid.uuid4().hex[:8]
    pid = client.post("/api/v1/projects", json={"name": name}, headers=auth).json()["id"]
    sid = client.post("/api/v1/stories", headers=auth, json={"project_id": pid, "title": "कहानी", "original_text": "एक बंदर था।"}).json()["id"]
    env = {**os.environ, "CSAE_DATABASE_URL": migrated_db, "CSAE_ASSET_LIBRARY": str(app.state.ctx.paths.asset_library),
           "CSAE_DATA_ROOT": str(tmp_path / "empty_root")}
    out = subprocess.run([str(ROOT / "scripts" / "backup.sh"), str(tmp_path / "backups")], env=env, capture_output=True, text=True)
    assert out.returncode == 0, out.stderr
    backup = Path(out.stdout.strip().splitlines()[-1])
    if not backup.is_absolute():
        backup = ROOT / backup
    assert (backup / "database.dump").stat().st_size > 10000 and (backup / "asset_library.tar.gz").stat().st_size > 1_000_000

    target = "csae_restore_" + uuid.uuid4().hex[:8]
    admin = create_engine(migrated_db.rsplit("/", 1)[0] + "/postgres", isolation_level="AUTOCOMMIT")
    with admin.connect() as c:
        c.execute(text(f'create database "{target}"'))
    restored_url = migrated_db.rsplit("/", 1)[0] + "/" + target
    try:
        done = subprocess.run([str(ROOT / "scripts" / "restore.sh"), str(backup), "--files-to", str(tmp_path / "restored_files")],
                              env={**os.environ, "CSAE_DATABASE_URL": restored_url}, capture_output=True, text=True)
        assert done.returncode == 0, done.stderr
        eng = create_engine(restored_url)
        with eng.connect() as c:
            assert c.execute(text("select name from projects where id = :i"), {"i": pid}).scalar() == name
            assert c.execute(text("select title from stories where id = :i"), {"i": sid}).scalar() == "कहानी"
            assert c.execute(text("select count(*) from assets")).scalar() > 20
            assert c.execute(text("select version_num from alembic_version")).scalar()
        eng.dispose()
        assert (tmp_path / "restored_files" / "asset_library" / "characters" / "monkey_001" / "metadata.json").is_file()
        (backup / "database.dump").write_bytes(b"corrupted")               # a damaged backup is refused, not half-restored
        bad = subprocess.run([str(ROOT / "scripts" / "restore.sh"), str(backup)], env={**os.environ, "CSAE_DATABASE_URL": restored_url},
                             capture_output=True, text=True)
        assert bad.returncode != 0
    finally:
        with admin.connect() as c:
            c.execute(text(f'drop database if exists "{target}" with (force)'))
        admin.dispose()


# ------------------------------------------------------------------ recovery
@pytest.mark.render
def test_render_time_limit_is_enforced_and_work_is_kept(library, engine_paths):
    long = story([scene("slow", [shot("s1", 12.0)])], story_id="phase11_timeout")
    limited = RenderService(library, engine_paths, timeout=6, retries=1)
    result = limited.render_scene(long, "slow", RenderSettings.preview(long, workers=1))
    assert result.status == "failed" and "time limit" in result.error and result.attempts == 1       # not retried: it would time out again
    work = limited.work_dir(long.story_id, "slow", result.key)
    assert len(list(work.glob("frames/frame_[0-9]*.png"))) > 3                                        # finished frames are still there
    finished = RenderService(library, engine_paths, timeout=600).render_scene(long, "slow", RenderSettings.preview(long, workers=1))
    assert finished.status == "rendered" and not work.exists()


@pytest.mark.render
def test_end_to_end_story_from_text_to_validated_video(library, engine_paths, tmp_path, artifacts):
    """Create story -> analyse -> storyboard -> assets -> audio -> compose -> render -> validate, with nothing mocked but the voice."""
    index = library.index()
    analysis = RuleBasedAnalyser(index).analyse(SHORT_STORY)
    board = StoryboardBuilder(index).build(analysis, story_id="phase11_e2e")
    assert not board.missing_assets and len(board.story.scenes) == 2
    qc = QualityControl(library)
    narration = NarrationService(ToneProvider(), VoiceRegistry(library.root / "voices"), AudioCache(tmp_path / "cache"))
    speech = produce_speech(board.story, DialogueService(narration, library))
    final_story, _ = retime_story(board.story, speech.durations())
    before = qc.check_story(final_story, speech)
    assert before.passed, [i.to_dict() for i in before.errors()]
    service = RenderService(library, engine_paths, timeout=900)
    settings = RenderSettings.preview(final_story)
    result = service.render_story(final_story, settings, speech)
    assert result.ok, (result.error, result.validation)
    after = qc.check_video(final_story, result.final, settings, result.duration, result.audio)
    assert after.passed, [i.to_dict() for i in after.automatic]
    assert not after.ready_to_publish and len(after.human_review) >= 4            # technically sound, but designs still await a human
    (artifacts / "phase11_end_to_end.mp4").write_bytes(result.final.read_bytes())
