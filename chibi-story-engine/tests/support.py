"""Shared test helpers: a small hand-written library index and fake providers."""
from __future__ import annotations

from pathlib import Path

from engine.asset_manager.index import AnchorEntry, AnimationEntry, CharacterEntry, EnvironmentEntry, LibraryIndex, SimpleEntry

ROOT = Path(__file__).resolve().parents[1]
MONKEY_STORY = (ROOT / "stories" / "panchatantra" / "monkey_and_crocodile.hi.txt").read_text(encoding="utf-8")


def _char(cid, name, species, aliases, rig, habitat, voice):
    return CharacterEntry(id=cid, name=name, species=species, aliases=aliases, rig_template=rig, habitat=habitat,
                          attach_points=["back", "hand", "mouth"], default_voice=voice,
                          expressions=["neutral", "happy", "sad", "surprised", "angry", "worried", "thinking", "laughing", "speaking"])


def sample_index() -> LibraryIndex:
    """What the real library exposes, reduced to the fields story intelligence reads."""
    water = dict(order=120, features=["water"])
    anims = [
        ("idle", "basic", ["biped_chibi", "quadruped_reptile"], []),
        ("walk", "locomotion", ["biped_chibi"], ["walk"]),
        ("jump", "locomotion", ["biped_chibi"], ["jump"]),
        ("climb", "locomotion", ["biped_chibi"], ["climb"]),
        ("eat", "interaction", ["biped_chibi"], ["eat"]),
        ("throw", "interaction", ["biped_chibi"], ["throw", "give"]),
        ("happy_reaction", "emotional", ["biped_chibi", "quadruped_reptile"], ["laugh"]),
        ("crocodile_swim", "animal", ["quadruped_reptile"], ["swim"]),
        ("crocodile_jaw_open", "animal", ["quadruped_reptile"], ["eat"]),
    ]
    return LibraryIndex(
        characters=[
            _char("monkey_001", "Monkey", "monkey", ["बंदर", "वानर", "monkey"], "biped_chibi", "arboreal", "monkey_hi"),
            _char("crocodile_001", "Crocodile", "crocodile", ["मगरमच्छ", "crocodile"], "quadruped_reptile", "aquatic", "crocodile_hi"),
            _char("crocodile_wife_001", "Crocodile's wife", "crocodile", ["मगरमच्छ की पत्नी", "crocodile wife"], "quadruped_reptile", "aquatic", "crocodile_wife_hi"),
        ],
        environments=[
            EnvironmentEntry(id="forest_river_001", name="Riverbank with jamun tree", tags=["river", "tree", "jamun", "forest"],
                             habitats=["arboreal", "aquatic", "ground"],
                             anchors={"tree_branch": AnchorEntry(x=620, y=560, features=["tree", "seat"]),
                                      "river_near": AnchorEntry(x=1250, y=170, **water),
                                      "riverbank": AnchorEntry(x=420, y=250, features=["ground"]),
                                      "offstage_river_right": AnchorEntry(x=2300, y=170, order=120, features=["offstage", "water"])},
                             default_anchor_by_role={"arboreal": ["tree_branch"], "aquatic": ["river_near"], "ground": ["riverbank"]}),
            EnvironmentEntry(id="river_open_001", name="Middle of the river", tags=["river", "river_mid"], habitats=["aquatic"],
                             anchors={"river_mid": AnchorEntry(x=960, y=260, **water),
                                      "offstage_left": AnchorEntry(x=-380, y=260, order=120, features=["offstage", "water"])},
                             default_anchor_by_role={"aquatic": ["river_mid"]}),
            EnvironmentEntry(id="crocodile_home_001", name="Crocodile home", tags=["home", "cave", "river"], habitats=["aquatic"],
                             anchors={"home_left": AnchorEntry(x=640, y=210, **water), "home_right": AnchorEntry(x=1300, y=210, **water),
                                      "offstage_left": AnchorEntry(x=-380, y=210, order=120, features=["offstage", "water"])},
                             default_anchor_by_role={"aquatic": ["home_right", "home_left"]}),
            EnvironmentEntry(id="village_home_001", name="Village house", tags=["home", "village"], habitats=["ground"],
                             anchors={"door": AnchorEntry(x=900, y=220, features=["ground"])}, default_anchor_by_role={"ground": ["door"]}),
        ],
        animations=[AnimationEntry(code=c, category=cat, rigs=r, semantics=s, travels=c in ("walk", "crocodile_swim"),
                                   loop=c in ("idle", "walk", "crocodile_swim")) for c, cat, r, s in anims],
        props=[SimpleEntry(id="jamun_bunch_001", name="Jamun", tags=["jamun", "fruit"])],
        effects=["ripples", "splash", "falling_leaves"],
        music=[SimpleEntry(id="gentle_story_001", tags=["story"])],
        sound_effects=[SimpleEntry(id="river_ambience_001", tags=["ambience", "river"]), SimpleEntry(id="splash_001", tags=["splash"]),
                       SimpleEntry(id="boing_001", tags=["jump"]), SimpleEntry(id="munch_001", tags=["eat"])],
        lighting_presets=["day", "sunset", "night", "morning"],
        camera_presets=["establishing_wide", "slow_push_in", "slow_pull_out", "horizontal_pan", "vertical_pan", "tracking_shot",
                        "character_closeup", "reaction_closeup", "dramatic_reveal", "action_follow", "parallax_drift"],
    )


class FakeLLM:
    """Returns canned answers in order; records the prompts it was sent."""

    name = "fake"

    def __init__(self, *answers: str) -> None:
        self.answers = list(answers)
        self.prompts: list[str] = []

    def complete(self, *, system: str, prompt: str, max_tokens: int = 16000) -> str:
        self.prompts.append(prompt)
        return self.answers.pop(0) if len(self.answers) > 1 else self.answers[0]


# ----------------------------------------------------------------- a tiny synthetic character
BIPED_PARTS = [  # id, component, parent, pivot, order, box (x, y, w, h), variants
    ("root", "root", None, (150, 380), 0, None, []),
    ("body", "body", "root", (150, 300), 0, (100, 220, 100, 110), ["base"]),
    ("tail", "tail", "body", (110, 310), -2, (40, 250, 70, 30), ["base"]),
    ("leg_l", "left_leg", "body", (125, 320), -1, (110, 320, 28, 60), ["base"]),
    ("leg_r", "right_leg", "body", (175, 320), -1, (162, 320, 28, 60), ["base"]),
    ("arm_l", "left_arm", "body", (105, 235), -1, (80, 230, 26, 80), ["base"]),
    ("arm_r", "right_arm", "body", (195, 235), 3, (194, 230, 26, 80), ["base"]),
    ("head", "head", "body", (150, 220), 5, (60, 60, 180, 170), ["base"]),
    ("eyes", "eyes", "head", (150, 140), 6, (95, 115, 110, 50), ["open", "closed", "happy", "wide"]),
    ("pupils", "eyes", "eyes", (150, 140), 7, (110, 128, 80, 24), ["normal"]),
    ("brow_l", "eyebrows", "head", (115, 105), 8, (95, 98, 40, 10), ["base"]),
    ("brow_r", "eyebrows", "head", (185, 105), 8, (165, 98, 40, 10), ["base"]),
    ("mouth", "mouth", "head", (150, 195), 8, (125, 185, 50, 26), ["closed", "small", "open", "sad"]),
]
FACES = {
    "neutral": {"variants": {"eyes": "open", "mouth": "closed"}},
    "happy": {"variants": {"eyes": "happy", "pupils": "none", "mouth": "closed"}},
    "sad": {"variants": {"eyes": "open", "mouth": "sad"}, "parts": {"brow_l": {"rotation": 12}, "brow_r": {"rotation": -12}}},
    "surprised": {"variants": {"eyes": "wide", "mouth": "open"}},
    "angry": {"variants": {"eyes": "open", "mouth": "sad"}, "parts": {"brow_l": {"rotation": -14}, "brow_r": {"rotation": 14}}},
    "worried": {"variants": {"eyes": "wide", "mouth": "sad"}},
    "thinking": {"variants": {"eyes": "open", "mouth": "small"}},
    "laughing": {"variants": {"eyes": "happy", "pupils": "none", "mouth": "open"}},
    "speaking": {"variants": {"eyes": "open", "mouth": "small"}},
}


def write_part_images(directory: Path, colour=(181, 116, 59), parts=BIPED_PARTS) -> dict[str, Path]:
    """Flat-colour part images (enough to exercise the library and renderer without the art forge)."""
    from PIL import Image, ImageDraw
    out: dict[str, Path] = {}
    shades = {"eyes": (255, 255, 255), "pupils": (30, 20, 20), "mouth": (120, 40, 40), "brow_l": (60, 30, 10), "brow_r": (60, 30, 10)}
    for pid, _c, _p, _pivot, _o, box, variants in parts:
        for i, variant in enumerate(variants):
            w, h = box[2], box[3]
            im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
            base = shades.get(pid, colour)
            fill = tuple(max(0, c - 25 * i) for c in base) + (255,)
            ImageDraw.Draw(im).rounded_rectangle((0, 0, w - 1, h - 1), radius=min(w, h) // 3, fill=fill, outline=(40, 25, 15, 255), width=2)
            path = directory / f"rig/{pid}_{variant}.png"
            path.parent.mkdir(parents=True, exist_ok=True)
            im.save(path)
            out[f"rig/{pid}_{variant}.png"] = path
    return out


def character_data(cid="monkey_001", name="Monkey", species="monkey", template="biped_chibi", parts=BIPED_PARTS, drop=()) -> dict:
    rig_parts = []
    for pid, component, parent, pivot, order, box, variants in parts:
        if pid in drop:
            continue
        rig_parts.append({"id": pid, "component": component, "parent": parent, "pivot": list(pivot), "order": order,
                          "variants": {v: {"file": f"rig/{pid}_{v}.png", "origin": [box[0], box[1]], "size": [box[2], box[3]]} for v in variants},
                          "rotation_limits": [-60, 60] if pid == "head" else None})
    return {"id": cid, "name": name, "species": species, "aliases": ["बंदर", "monkey"], "description": "A small brown monkey.",
            "visual_identity": {"fur": "#b5743b", "face": "#f6d9a8", "head_to_body": 1.6},
            "continuity_rules": ["Fur is always warm brown", "Never wears clothes"],
            "compatibility": {"habitat": "arboreal"}, "default_voice": "monkey_hi",
            "rig": {"template": template, "canvas": [300, 400], "ground": [150, 380], "parts": rig_parts,
                    "attach_points": {"hand": {"part": "arm_r", "point": [207, 305]}, "mouth": {"part": "head", "point": [150, 198]}},
                    "talk_variants": ["closed", "small", "open"]},
            "expressions": FACES, "poses": {"arms_up": {"arm_l": {"rotation": -140}, "arm_r": {"rotation": 140}}}}


def make_library(root: Path):
    """An empty library with the shipped rig templates."""
    from engine.asset_manager.library import AssetLibrary
    from tools.asset_forge.templates import write_templates
    write_templates(root)
    return AssetLibrary(root)
