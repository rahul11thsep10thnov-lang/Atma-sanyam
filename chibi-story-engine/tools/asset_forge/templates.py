"""Rig templates shipped with the engine. Written to <library>/rig_templates/ by the forge."""
from __future__ import annotations

import json
from pathlib import Path

RIG_TEMPLATES = {
    "biped_chibi": {
        "id": "biped_chibi",
        "name": "Chibi biped",
        "description": "Upright big-headed character seen three-quarter front: animals that stand, and people.",
        "components": {
            "root": ["root"], "body": ["body"], "head": ["head"], "eyes": ["eyes", "pupils"], "eyebrows": ["brow_l", "brow_r"],
            "mouth": ["mouth"], "left_arm": ["arm_l"], "right_arm": ["arm_r"], "left_leg": ["leg_l"], "right_leg": ["leg_r"],
        },
        "optional_parts": ["tail", "mane", "hat"],
        "has_tail": False,
        "states": ["standing", "sitting", "in_air"],
    },
    "quadruped_reptile": {
        "id": "quadruped_reptile",
        "name": "Low four-legged reptile",
        "description": "Long-bodied animal seen from the side with a hinged jaw: crocodiles, lizards.",
        "components": {
            "root": ["root"], "body": ["body"], "head": ["head"], "eyes": ["eyes", "pupils"], "eyebrows": ["brow"],
            "mouth": ["jaw"], "left_arm": ["leg_fl"], "right_arm": ["leg_fr"], "left_leg": ["leg_bl"], "right_leg": ["leg_br"],
            "tail": ["tail"],
        },
        "optional_parts": ["accessory", "chest", "neck", "tail_mid", "tail_tip"],
        "has_tail": True,
        "states": ["standing", "in_water", "resting"],
    },
    "chelonian": {
        "id": "chelonian",
        "name": "Turtle and tortoise",
        "description": "Shelled animal seen from the side: a domed or flat shell, a neck that extends and retracts, four limbs, a tail and a hinged jaw.",
        "components": {
            "root": ["root"], "body": ["body"], "head": ["head"], "eyes": ["eyes", "pupils"], "eyebrows": ["brow"],
            "mouth": ["jaw"], "left_arm": ["leg_fl"], "right_arm": ["leg_fr"], "left_leg": ["leg_bl"], "right_leg": ["leg_br"],
            "tail": ["tail"],
        },
        "optional_parts": ["neck", "shell_lip"],
        "has_tail": True,
        "states": ["standing", "in_water", "resting", "retracted"],
    },
    "serpentine_reptile": {
        "id": "serpentine_reptile",
        "name": "Snake",
        "description": "Limbless reptile as a chain of body segments from tail to head, with a hinged jaw and a forked tongue.",
        "components": {
            "root": ["root"], "body": ["body"], "head": ["head"], "eyes": ["eyes", "pupils"], "eyebrows": ["brow"], "mouth": ["jaw"],
            "tail": ["tail"],
        },
        "optional_parts": ["seg1", "seg2", "seg3", "seg4", "seg5", "seg6", "seg7", "neck", "tongue"],
        "optional_components": ["left_arm", "right_arm", "left_leg", "right_leg"],
        "has_tail": True,
        "states": ["slithering", "coiled", "raised", "resting"],
    },
}


def write_templates(library_root: Path) -> None:
    out = Path(library_root) / "rig_templates"
    out.mkdir(parents=True, exist_ok=True)
    for tid, data in RIG_TEMPLATES.items():
        (out / f"{tid}.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
