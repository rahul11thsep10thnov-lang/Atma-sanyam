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
