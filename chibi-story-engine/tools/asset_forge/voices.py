"""Voice identities shipped with the library (settings for each supported provider)."""
from __future__ import annotations

import json
from pathlib import Path


def _voice(vid, name, description, variant, pitch, speed, sarvam, tone):
    return {"id": vid, "name": name, "language": "hi-IN", "description": description,
            "providers": {"espeak": {"voice": "hi", "variant": variant, "pitch": pitch, "speed": speed},
                          "sarvam": {"speaker": sarvam}, "tone": {"frequency": tone}}}


VOICES = [
    _voice("narrator_hi", "Narrator (Hindi)", "Calm, warm storyteller", "f2", 48, 138, "meera", 200),
    _voice("monkey_hi", "Monkey", "Bright, quick, playful", "m3", 78, 158, "amol", 320),
    _voice("crocodile_hi", "Crocodile", "Low, slow, gentle", "m7", 22, 128, "arvind", 110),
    _voice("crocodile_wife_hi", "Crocodile's wife", "Sharp and insistent", "f4", 62, 150, "pavithra", 260),
    _voice("lion_hi", "Lion", "Deep and booming", "m6", 12, 122, "amartya", 90),
    _voice("rabbit_hi", "Rabbit", "Small, high and clever", "f5", 88, 162, "maitreyi", 380),
    _voice("jackal_hi", "Jackal", "Sly, nasal", "m4", 58, 152, "amol", 240),
    _voice("farmer_hi", "Farmer", "Plain and kind", "m1", 42, 140, "arvind", 150),
    _voice("rich_man_hi", "Rich man", "Pompous, heavy", "m5", 30, 132, "amartya", 125),
    _voice("king_hi", "King", "Deep, measured, regal", "m6", 18, 126, "amartya", 100),
    _voice("queen_hi", "Queen", "Clear and gracious", "f3", 58, 140, "pavithra", 250),
    _voice("young_m_hi", "Young man", "Light, eager", "m2", 55, 150, "amol", 190),
    _voice("young_f_hi", "Young woman", "Bright, warm", "f2", 70, 150, "maitreyi", 300),
    _voice("child_hi", "Child", "High and quick", "f5", 95, 165, "maitreyi", 420),
    _voice("elder_m_hi", "Elder (man)", "Slow, gravelly", "m7", 25, 126, "arvind", 120),
    _voice("elder_f_hi", "Elder (woman)", "Soft, cracked", "f1", 50, 128, "meera", 220),
    _voice("sage_hi", "Sage", "Calm, resonant", "m1", 30, 120, "arvind", 130),
    _voice("soldier_hi", "Soldier", "Firm and clipped", "m3", 28, 148, "amartya", 115),
    _voice("villain_hi", "Villain / spirit", "Rasping, uneven", "m4", 20, 118, "amartya", 85),
]
PRONUNCIATION = {"hi": {}}


def write_voices(library_root: Path) -> int:
    out = Path(library_root) / "voices"
    out.mkdir(parents=True, exist_ok=True)
    (out / "voices.json").write_text(json.dumps(VOICES, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if not (out / "pronunciation.json").exists():
        (out / "pronunciation.json").write_text(json.dumps(PRONUNCIATION, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return len(VOICES)
