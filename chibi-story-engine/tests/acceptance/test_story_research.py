"""The story research register: every claim traces to a fetched source; nothing is verified because a title is familiar."""
from __future__ import annotations

import json

from tests.support import ROOT

R = ROOT / "stories" / "research"
ALLOWED = {"verified", "cross_verified", "variant", "adaptation", "unverified", "research_pending"}


def _load():
    return (json.loads((R / "records.json").read_text(encoding="utf-8")), json.loads((R / "sources.json").read_text(encoding="utf-8")),
            json.loads((R / "register.json").read_text(encoding="utf-8")))


def test_records_carry_the_required_fields_and_valid_statuses():
    rec, sources, _ = _load()
    consulted = {s["id"] for s in sources if s["status"] == "consulted"}
    need = {"id", "collection", "original_title", "english_title", "hindi_title", "regional_titles", "source_id", "source_locator", "source_url", "author_compiler", "publication",
            "summary", "characters", "environments", "props", "scene_breakdown", "verification_status", "copyright_status", "translation_status"}
    ids = set()
    for r in rec["records"]:
        assert need <= set(r), r["id"]
        assert r["id"] not in ids
        ids.add(r["id"])
        assert r["verification_status"] in ALLOWED
        if r["verification_status"] in ("verified", "cross_verified"):
            assert r["source_id"] in consulted and r["source_locator"], r["id"]
    assert len(rec["records"]) > 1000


def test_counts_match_the_sources_that_were_parsed():
    rec, _, _ = _load()
    by = {}
    for r in rec["records"]:
        by[r["source_id"]] = by.get(r["source_id"], 0) + 1
    assert by["arnold_1861"] == 34          # 6 + 9 + 7 + 12 stories in Arnold's four books
    assert by["jataka_table"] == 547 and by["ryder_1925"] >= 85 and by["frere_1898"] == 24
    assert len({r["id"] for r in rec["records"] if r["source_id"] == "jataka_table"}) == 547


def test_seed_entries_are_only_verified_with_evidence_from_a_title_listing():
    rec, sources, _ = _load()
    tertiary = {s["id"] for s in sources if s["evidence_level"] == "tertiary"}
    for s in rec["seed_entries"]:
        assert s["verification_status"] in ALLOWED
        if s["verification_status"] in ("verified", "cross_verified"):
            assert s["evidence"] and not {e["source"] for e in s["evidence"]} <= tertiary, s["id"]
        if s["verification_status"] == "cross_verified":
            assert len({e["source"] for e in s["evidence"]}) >= 2, s["id"]
        if not s["evidence"]:
            assert s["verification_status"] in ("unverified", "research_pending"), s["id"]
    by = {s["id"]: s["verification_status"] for s in rec["seed_entries"]}
    assert by["seed-mongoose_and_brahmin"] == "unverified"       # a wrong match was found and removed
    assert by["seed-birbal_khichdi"] == "unverified" and by["seed-aladdin"] == "adaptation"
    assert by["seed-blue_jackal"] == "cross_verified" and by["seed-vikram_betal_frame"] == "research_pending"


def test_register_does_not_claim_completeness_and_excludes_copyrighted_franchises():
    rec, _, reg = _load()
    assert all(c["by_status"] is not None for c in reg["collections"])
    assert reg["totals"]["regions_with_a_consulted_source"] < reg["totals"]["regions_total"]
    assert not any("chacha" in r["english_title"].lower() for r in rec["records"] + rec["seed_entries"])
    assert "Chacha" in (ROOT / "docs" / "generated" / "STORY_RESEARCH_REGISTER.md").read_text(encoding="utf-8")


def test_no_synopsis_text_is_copied_from_modern_compilations():
    rec, _, _ = _load()
    assert all(r["summary"] is None for r in rec["records"] if r["source_id"] == "jataka_table")
    assert "In the present" not in (R / "extracts" / "jataka_table.txt").read_text(encoding="utf-8")
