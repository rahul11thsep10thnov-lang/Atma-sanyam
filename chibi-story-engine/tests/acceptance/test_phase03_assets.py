"""Phase 3 acceptance: a reusable, versioned, checksummed asset library."""
from __future__ import annotations

import json

import pytest
from PIL import Image

from engine.character_manager.registry import CharacterRegistry
from engine.common.errors import AssetIntegrityError, AssetNotFound, IncompatibleAsset, UnsafePath, ValidationFailed
from engine.common.paths import sha256_file
from engine.schema.animation import AnimationClip
from engine.schema.assets import AssetType, FacialPose, PartPose
from tests.support import character_data, make_library, write_part_images


@pytest.fixture()
def lib(tmp_path):
    return make_library(tmp_path / "library")


@pytest.fixture()
def registry(lib, tmp_path):
    reg = CharacterRegistry(lib)
    reg.create(character_data(), write_part_images(tmp_path / "src"))
    return reg


def _png(path, colour, size=(64, 64)):
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.new("RGBA", size, colour).save(path)
    return path


def test_1_create_a_monkey_character(registry, lib):
    m = registry.get("monkey_001")
    assert (m.id, m.version, m.species, m.rig.template) == ("monkey_001", 1, "monkey", "biped_chibi")
    assert m.approval_status.value == "pending"                       # new designs wait for a human
    assert m.licence.name and m.visual_identity["fur"] == "#b5743b"
    entry = m.file_entry("rig/head_base.png")
    assert (entry.width, entry.height, entry.format, entry.role) == (180, 170, "png", "rig_part")
    assert len(entry.checksum) == 64
    assert registry.rig_issues(m) == []
    with pytest.raises(ValidationFailed, match="already exists"):
        registry.create(character_data(), {})


def test_2_3_4_register_references_expressions_and_poses(registry, tmp_path):
    m = registry.add_reference("monkey_001", _png(tmp_path / "ref_front.png", (181, 116, 59, 255), (300, 400)))
    assert m.version == 2 and [f.path for f in m.files_by_role("reference")] == ["references/ref_front.png"]
    m = registry.register_expression("monkey_001", "sleepy", FacialPose(variants={"eyes": "closed", "mouth": "small"}),
                                     _png(tmp_path / "sleepy.png", (1, 2, 3, 255)))
    assert m.version == 3 and "sleepy" in m.expressions and m.file_entry("expressions/sleepy.png").expression == "sleepy"
    m = registry.register_pose("monkey_001", "wave_high", {"arm_r": PartPose(rotation=150)}, _png(tmp_path / "wave.png", (4, 5, 6, 255)))
    assert m.version == 4 and m.poses["wave_high"]["arm_r"].rotation == 150 and m.file_entry("poses/wave_high.png").pose == "wave_high"
    with pytest.raises(ValidationFailed) as err:
        registry.register_expression("monkey_001", "broken", FacialPose(variants={"eyes": "sparkly"}))
    assert "no variant 'sparkly'" in str(err.value.issues)
    assert registry.get("monkey_001").version == 4                    # the failed update left nothing behind


def test_5_retrieve_by_unique_id_then_by_metadata(registry, lib):
    assert lib.character("monkey_001").name == "Monkey"
    assert [m.id for m in lib.search("monkey_001")] == ["monkey_001"]
    assert [m.id for m in lib.search("बंदर")] == ["monkey_001"]         # alias, any language
    assert [m.id for m in lib.search("MONKEY", AssetType.character)] == ["monkey_001"]
    assert lib.search("giraffe") == []
    with pytest.raises(AssetNotFound):
        lib.character("monkey_002")                                   # never silently another character
    with pytest.raises(UnsafePath):
        lib.character("../monkey_001")
    idx = lib.index()
    assert idx.character("monkey_001").habitat == "arboreal" and "happy" in idx.character("monkey_001").expressions


def test_6_update_keeps_the_previous_version(registry, lib, tmp_path):
    before = sha256_file(lib.file_path(AssetType.character, "monkey_001", "rig/head_base.png"))
    new_head = _png(tmp_path / "new_head.png", (200, 140, 80, 255), (180, 170))
    m2 = lib.update(AssetType.character, "monkey_001", {"description": "Lighter fur."}, {"rig/head_base.png": new_head},
                    change_summary="Lighter head")
    assert m2.version == 2 and m2.change_summary == "Lighter head" and lib.versions(AssetType.character, "monkey_001") == [1, 2]
    v1 = lib.character("monkey_001", version=1)
    assert v1.version == 1 and v1.description == "A small brown monkey."
    assert sha256_file(lib.file_path(AssetType.character, "monkey_001", "rig/head_base.png", version=1)) == before
    assert sha256_file(lib.file_path(AssetType.character, "monkey_001", "rig/head_base.png")) == sha256_file(new_head) != before
    assert lib.verify(AssetType.character, "monkey_001", 1) == [] and lib.verify(AssetType.character, "monkey_001", 2) == []
    with pytest.raises(AssetNotFound):
        lib.character("monkey_001", version=7)
    assert lib.set_approval(AssetType.character, "monkey_001", "approved").approval_status.value == "approved"
    assert lib.update(AssetType.character, "monkey_001", {"description": "x"}).approval_status.value == "pending"   # changes need re-approval


def test_7_detect_missing_character_assets(registry, lib, tmp_path):
    missing = registry.missing_assets("monkey_001")
    assert missing == [{"kind": "reference", "path": "references", "message": "no reference image registered"}]
    lib.file_path(AssetType.character, "monkey_001", "rig/tail_base.png").unlink()
    assert {"kind": "file", "path": "rig/tail_base.png", "message": "missing"} in registry.missing_assets("monkey_001")
    with pytest.raises(AssetIntegrityError):
        registry.rig("monkey_001")
    # a rig without a required component is refused at creation, with the component named
    data = character_data(cid="monkey_002", drop=("arm_l", "mouth"))
    with pytest.raises(ValidationFailed) as err:
        registry.create(data, {k: v for k, v in write_part_images(tmp_path / "s2").items() if "arm_l" not in k and "mouth" not in k})
    text = json.dumps(err.value.issues)
    assert "missing rig component 'left_arm'" in text and "missing rig component 'mouth'" in text
    assert not lib.exists(AssetType.character, "monkey_002")
    # a manifest that points at an image that was never supplied
    with pytest.raises(ValidationFailed, match="not registered"):
        registry.create(character_data(cid="monkey_003"), {})
    assert not lib.exists(AssetType.character, "monkey_003")


def test_8_reject_incompatible_rig_assignments(registry):
    monkey = registry.get("monkey_001")
    swim = AnimationClip(code="crocodile_swim", name="Swim", category="animal", rig_compatibility=["quadruped_reptile"], duration=1.0,
                         channels={"tail.rotation": [{"t": 0, "v": -10}, {"t": 1, "v": 10}]})
    with pytest.raises(IncompatibleAsset, match="quadruped_reptile"):
        registry.check_animation(monkey, swim)
    wings = AnimationClip(code="flap", name="Flap", category="locomotion", rig_compatibility=["biped_chibi"], duration=1.0,
                          channels={"wing_l.rotation": [{"t": 0, "v": 0}]})
    with pytest.raises(IncompatibleAsset, match="wing_l"):
        registry.check_animation(monkey, wings)
    nod = AnimationClip(code="nod", name="Nod", category="basic", rig_compatibility=["biped_chibi"], duration=0.6,
                        channels={"head.rotation": [{"t": 0, "v": 0}, {"t": 0.3, "v": -12}, {"t": 0.6, "v": 0}]})
    registry.check_animation(monkey, nod)
    data = character_data(cid="odd_001", template="winged_serpent")
    with pytest.raises(ValidationFailed, match="invalid rig") as err:
        registry.create(data, write_part_images(registry.library.root / "_src"))
    assert "unknown rig template" in str(err.value.issues)


def test_9_verify_asset_checksums(registry, lib):
    assert lib.verify(AssetType.character, "monkey_001") == []
    path = lib.file_path(AssetType.character, "monkey_001", "rig/body_base.png")
    Image.new("RGBA", (100, 110), (0, 255, 0, 255)).save(path)       # someone repainted the body without a new version
    assert lib.verify(AssetType.character, "monkey_001") == [{"file": "rig/body_base.png", "problem": "checksum_mismatch"}]
    with pytest.raises(AssetIntegrityError) as err:
        lib.require_intact(AssetType.character, "monkey_001")
    assert err.value.details["problems"][0]["problem"] == "checksum_mismatch"
    issues = registry.continuity_issues([("scene_01", "monkey_001", 1), ("scene_02", "monkey_001", 2)])
    assert any("version 2 here but version 1" in i["message"] for i in issues)
    assert any("differ from the registered design" in i["message"] for i in issues)


def test_environment_prop_and_audio_registries(lib, tmp_path):
    bg = _png(tmp_path / "sky.png", (120, 180, 240, 255), (2400, 1350))
    env = lib.register({"id": "meadow_001", "asset_type": "environment", "name": "Meadow", "tags": ["field"],
                        "layers": [{"id": "sky", "type": "background", "file": "layers/sky.png", "rect": [-240, -135, 2400, 1350],
                                    "parallax": 0.2, "cover": True}],
                        "anchors": {"centre": {"x": 960, "y": 220, "features": ["ground"]}},
                        "default_anchor_by_role": {"ground": ["centre"]}}, {"layers/sky.png": bg}, {"layers/sky.png": {"role": "layer"}})
    assert env.file_entry("layers/sky.png").width == 2400
    prop = lib.register({"id": "ball_001", "asset_type": "prop", "name": "Ball", "tags": ["toy"], "file": "ball.png", "size": [80, 80]},
                        {"ball.png": _png(tmp_path / "ball.png", (255, 0, 0, 255))}, {"ball.png": {"role": "image"}})
    assert prop.version == 1
    with pytest.raises(ValidationFailed, match="not registered"):
        lib.register({"id": "ball_002", "asset_type": "prop", "name": "Ball", "file": "missing.png", "size": [80, 80]}, {}, {})
    with pytest.raises(UnsafePath):
        lib.register({"id": "ball_003", "asset_type": "prop", "name": "B", "file": "b.png", "size": [8, 8]},
                     {"../../escape.png": _png(tmp_path / "e.png", (0, 0, 0, 255))}, {})
    idx = lib.index()
    assert idx.environment("meadow_001").anchors["centre"].features == ["ground"] and idx.prop("ball_001").tags == ["toy"]
    assert [m.id for m in lib.search("field")] == ["meadow_001"]
