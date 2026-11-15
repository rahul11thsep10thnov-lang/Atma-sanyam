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
        "optional_parts": ["accessory"],
        "has_tail": True,
        "states": ["standing", "in_water"],
    },
}


def write_templates(library_root: Path) -> None:
    out = Path(library_root) / "rig_templates"
    out.mkdir(parents=True, exist_ok=True)
    for tid, data in RIG_TEMPLATES.items():
        (out / f"{tid}.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
