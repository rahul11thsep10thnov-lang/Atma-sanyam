"""Text normalisation, language detection and segmentation into paragraphs, sentences and quotes."""
from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass

_QUOTES = dict.fromkeys(map(ord, "“”„‟«»〝〞＂"), '"')
_QUOTES.update(dict.fromkeys(map(ord, "‘’‚‛"), "'"))
_ZERO_WIDTH = dict.fromkeys(map(ord, "​‌‍﻿­"), None)
_SCRIPTS = [("hi", 0x0900, 0x097F), ("bn", 0x0980, 0x09FF), ("pa", 0x0A00, 0x0A7F), ("gu", 0x0A80, 0x0AFF),
            ("ta", 0x0B80, 0x0BFF), ("te", 0x0C00, 0x0C7F), ("kn", 0x0C80, 0x0CFF), ("ml", 0x0D00, 0x0D7F)]
_HINDI_MARKERS = ("है", "था", "थी", "और", "ने", "का", "की", "के", "में", "से", "को")
_MARATHI_MARKERS = ("आहे", "होता", "होती", "आणि", "चा", "ची", "ला", "नाही")
TERMINATORS = "।॥?!."


def normalise(text: str) -> str:
    """Canonical form used everywhere downstream: NFC, plain quotes, single spaces, blank-line paragraphs."""
    text = unicodedata.normalize("NFC", text).translate(_ZERO_WIDTH).translate(_QUOTES)
    text = text.replace("\r\n", "\n").replace("\r", "\n").replace("॥", "।").replace("|", "।") if _is_devanagari(text) else text.replace("\r\n", "\n")
    text = re.sub(r"[ \t ]+", " ", text)
    text = re.sub(r" ?\n ?", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"\s+([,;:।?!])", r"\1", text)
    return text.strip()


def _is_devanagari(text: str) -> bool:
    return sum(0x0900 <= ord(c) <= 0x097F for c in text) > len(text) * 0.2


@dataclass(frozen=True)
class LanguageGuess:
    code: str
    confidence: float
    script: str


def detect_language(text: str) -> LanguageGuess:
    letters = [c for c in text if c.isalpha() or unicodedata.category(c).startswith("M")]
    if not letters:
        return LanguageGuess("und", 0.0, "unknown")
    counts: dict[str, int] = {}
    for c in letters:
        o = ord(c)
        for code, lo, hi in _SCRIPTS:
            if lo <= o <= hi:
                counts[code] = counts.get(code, 0) + 1
                break
        else:
            if c.isascii():
                counts["en"] = counts.get("en", 0) + 1
    if not counts:
        return LanguageGuess("und", 0.0, "unknown")
    code, n = max(counts.items(), key=lambda kv: kv[1])
    confidence = n / len(letters)
    script = "devanagari" if code == "hi" else ("latin" if code == "en" else code)
    if code == "hi":
        words = re.findall(r"[ऀ-ॿ]+", text)
        hi = sum(w in _HINDI_MARKERS for w in words)
        mr = sum(w in _MARATHI_MARKERS for w in words)
        if mr > hi:
            code = "mr"
        elif hi == 0 and len(words) > 12:
            confidence *= 0.6
    region = {"hi": "hi-IN", "mr": "mr-IN", "en": "en-IN", "bn": "bn-IN", "ta": "ta-IN", "te": "te-IN",
              "gu": "gu-IN", "kn": "kn-IN", "ml": "ml-IN", "pa": "pa-IN"}.get(code, code)
    return LanguageGuess(region, round(confidence, 3), script)


@dataclass(frozen=True)
class Segment:
    kind: str          # "narration" | "quote"
    text: str
    terminated: bool   # narration only: ends with a sentence terminator


def split_paragraphs(text: str) -> list[str]:
    return [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]


def segment_paragraph(paragraph: str) -> list[Segment]:
    """Split into narration sentences and quoted speech, in reading order."""
    out: list[Segment] = []
    pieces = re.split(r'"([^"]*)"', paragraph.replace("\n", " "))
    for i, piece in enumerate(pieces):
        if i % 2 == 1:
            if piece.strip():
                out.append(Segment("quote", piece.strip(), True))
            continue
        for sentence in _sentences(piece):
            out.append(sentence)
    return out


def _sentences(text: str) -> list[Segment]:
    out = []
    for m in re.finditer(rf"[^{re.escape(TERMINATORS)}]+[{re.escape(TERMINATORS)}]*", text):
        s = m.group().strip()
        if not s or not re.search(r"\w", s):
            continue
        out.append(Segment("narration", s, s[-1] in TERMINATORS))
    return out


def word_count(text: str) -> int:
    return len(re.findall(r"[^\s,;:।?!.\"'-]+", text))
