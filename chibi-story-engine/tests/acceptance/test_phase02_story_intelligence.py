"""Phase 2 acceptance: the monkey-and-crocodile story becomes a validated storyboard."""
from __future__ import annotations

import json

import pytest

from engine.common.errors import ValidationFailed
from engine.schema.story import NARRATOR, parse_story
from engine.story_intelligence.analyser import RuleBasedAnalyser
from engine.story_intelligence.llm import LLMStoryAnalyser, extract_json
from engine.story_intelligence.storyboard import StoryboardBuilder
from engine.story_intelligence.text import detect_language, normalise
from tests.support import MONKEY_STORY, FakeLLM, sample_index


@pytest.fixture(scope="module")
def analysis():
    return RuleBasedAnalyser(sample_index()).analyse(MONKEY_STORY)


@pytest.fixture(scope="module")
def board(analysis):
    return StoryboardBuilder(sample_index()).build(analysis, story_id="monkey_and_crocodile")


def test_1_story_is_ingested(analysis):
    assert analysis.language == "hi-IN" and analysis.language_confidence > 0.95
    assert analysis.title == "बंदर और मगरमच्छ"
    assert analysis.moral == "संकट के समय बुद्धि से काम लेना चाहिए।"
    assert analysis.coverage > 0.9 and not analysis.warnings


def test_language_detection_and_normalisation():
    assert detect_language("Once upon a time a monkey lived on a tree.").code == "en-IN"
    assert detect_language("एक बंदर पेड़ पर रहता था और जामुन खाता था।").code == "hi-IN"
    assert detect_language("12345 !!!").code == "und"
    assert normalise("“नमस्ते”  ​मित्र ।\r\n\r\n\r\n\r\nअगला") == '"नमस्ते" मित्र।\n\nअगला'


def test_2_all_major_events_are_represented(analysis):
    events = [(a.actor, a.semantic, a.target) for s in analysis.scenes for b in s.beats for a in b.actions]
    for expected in [("monkey", "eat", None), ("crocodile", "arrive", "down"), ("monkey", "throw", "down"), ("crocodile", "eat", None),
                     ("crocodile_wife", "eat", None), ("monkey", "sit", "back"), ("monkey", "climb", "tree"), ("crocodile", "leave", None)]:
        assert expected in events, expected
    all_text = " ".join(b.text for s in analysis.scenes for b in s.beats)
    for phrase in ["जामुन का एक बड़ा पेड़", "पक्के दोस्त", "कलेजा चाहिए", "पीठ पर बैठ", "नदी के बीच", "पेड़ पर ही छोड़ आया", "लौट गया"]:
        assert phrase in all_text, phrase


def test_3_and_4_characters_identified_consistently(analysis):
    entities = {e.key: e for e in analysis.entities}
    assert set(entities) == {"monkey", "crocodile", "crocodile_wife"}
    assert entities["monkey"].matched_asset_id == "monkey_001"
    assert entities["crocodile"].matched_asset_id == "crocodile_001"
    assert entities["crocodile_wife"].matched_asset_id == "crocodile_wife_001"
    assert entities["crocodile_wife"].display_name == "मगरमच्छ की पत्नी"
    assert [s.characters for s in analysis.scenes] == [
        ["monkey"], ["crocodile", "monkey"], ["crocodile", "crocodile_wife"], ["crocodile", "monkey"],
        ["crocodile", "monkey"], ["crocodile", "monkey"]]


def test_5_dialogue_is_separated_from_narration(analysis):
    spoken = [(b.speaker, b.text) for s in analysis.scenes for b in s.beats if b.kind == "dialogue"]
    assert [s for s, _ in spoken] == ["monkey", "crocodile", "crocodile_wife", "crocodile", "crocodile", "crocodile", "monkey", "monkey"]
    assert spoken[0][1].startswith("मित्र, तुम थके लगते हो")
    assert spoken[2][1].endswith("मुझे उस बंदर का कलेजा चाहिए।")
    for s in analysis.scenes:
        for b in s.beats:
            if b.kind == "narration":
                assert b.speaker == NARRATOR and '"' not in b.text
            else:
                assert "ने कहा" not in b.text and "बोला" not in b.text
    emotions = {(b.speaker, b.emotion) for s in analysis.scenes for b in s.beats if b.kind == "dialogue"}
    assert {("crocodile", "happy"), ("crocodile", "sad"), ("monkey", "laughing"), ("monkey", "angry")} <= emotions


def test_6_scene_order_is_preserved(analysis, board):
    assert [s.index for s in analysis.scenes] == [1, 2, 3, 4, 5, 6]
    assert [s.scene_id for s in board.story.scenes] == [f"scene_{i:02d}" for i in range(1, 7)]
    assert [s.time_marker for s in analysis.scenes][1] == "एक दिन" and analysis.scenes[3].time_marker == "अगले दिन"
    first_words = [s.shots[0].dialogue[0].text.split()[0] for s in board.story.scenes]
    assert first_words == ["एक", "एक", "मगरमच्छ", "अगले", "नदी", "मूर्ख"]


def test_7_generated_storyboard_validates(board):
    story = board.story
    assert parse_story(json.loads(story.model_dump_json())) == story          # round-trips through JSON
    assert not board.missing_assets
    assert story.character_ids() == ["monkey_001", "crocodile_001", "crocodile_wife_001"]
    assert board.environment_map == {"scene_01": "forest_river_001", "scene_02": "forest_river_001", "scene_03": "crocodile_home_001",
                                     "scene_04": "forest_river_001", "scene_05": "river_open_001", "scene_06": "forest_river_001"}
    assert 60 < story.total_duration < 240
    # the ride: the monkey jumps onto the crocodile, then stays attached while they cross the river
    ride = [a for sc in story.scenes for sh in sc.shots for a in sh.actions if a.target_character == "crocodile_001" and a.animation == "jump"]
    assert len(ride) == 1 and ride[0].params["attach_part"] == "back"
    mid = story.scene("scene_05").shots[0]
    monkey = next(c for c in mid.characters if c.character_id == "monkey_001")
    assert monkey.attach_to and monkey.attach_to.character_id == "crocodile_001"
    # ...and gets off again at the tree
    final = story.scene("scene_06")
    assert any(a.animation in ("climb", "jump") and a.move_to and a.move_to.anchor == "tree_branch" for sh in final.shots for a in sh.actions)
    assert not next(c for c in final.shots[-1].characters if c.character_id == "monkey_001").attach_to
    # clips fit the rig they are given to
    idx = sample_index()
    for sc in story.scenes:
        for sh in sc.shots:
            for a in sh.actions:
                assert idx.character(a.character_id).rig_template in idx.animation(a.animation).rigs
    assert story.scenes[-1].shots[-1].dialogue[-1].text == "संकट के समय बुद्धि से काम लेना चाहिए।"


def test_missing_assets_are_requested_not_substituted():
    text = "एक जंगल में एक कछुआ रहता था। एक दिन एक बंदर वहाँ आया। कछुआ बोला, \"नमस्ते, मित्र!\""
    idx = sample_index()
    analysis = RuleBasedAnalyser(idx).analyse(text)
    assert analysis.entity("tortoise").matched_asset_id is None
    board = StoryboardBuilder(idx).build(analysis, story_id="tortoise_story")
    kinds = {(m.kind, m.suggested_id) for m in board.missing_assets}
    assert ("character", "tortoise_001") in kinds and ("environment", "forest_001") not in kinds   # the forest matches forest_river_001
    assert "tortoise_001" in board.story.character_ids()                                           # named, not replaced by another character
    assert all(c.character_id != "crocodile_001" for sc in board.story.scenes for sh in sc.shots for c in sh.characters)


@pytest.mark.parametrize("answer, expect", [
    ("I am sorry, I cannot do that.", "no JSON object"),
    ('{"language": "hi-IN", "scenes": [', "not valid JSON"),
    ('{"language": "hi-IN", "scenes": []}', "scenes"),
    (json.dumps({"language": "hi-IN", "entities": [{"key": "monkey", "display_name": "बंदर"}],
                 "scenes": [{"index": 1, "characters": ["monkey"], "beats": [{"kind": "dialogue", "text": "नमस्ते", "speaker": "ghost"}]}]}),
     "speaker 'ghost' is not a known entity"),
    (json.dumps({"language": "hi-IN", "entities": [], "scenes": [{"index": 1, "beats": [{"kind": "narration", "text": "x", "emotion": "ecstatic"}]}]}),
     "emotion"),
    (json.dumps({"language": "hi-IN", "scenes": [{"index": 2, "beats": [{"kind": "narration", "text": "x"}]}], "run": "import os"}), "run"),
])
def test_8_invalid_llm_output_is_rejected_with_useful_errors(answer, expect):
    llm = FakeLLM(answer)
    with pytest.raises(ValidationFailed) as err:
        LLMStoryAnalyser(llm, sample_index(), repair_attempts=1).analyse(MONKEY_STORY)
    assert expect in json.dumps(err.value.to_dict(), ensure_ascii=False)
    assert len(llm.prompts) == 2 and "previous answer was rejected" in llm.prompts[1]   # one repair attempt, with the errors fed back


def test_valid_llm_output_is_accepted_and_matched(analysis):
    good = analysis.model_dump()
    llm = FakeLLM("Here you go:\n```json\n" + json.dumps(good, ensure_ascii=False) + "\n```")
    result = LLMStoryAnalyser(llm, sample_index()).analyse(MONKEY_STORY)
    assert result.analyser == "llm:fake" and len(result.scenes) == 6
    assert result.entity("crocodile_wife").matched_asset_id == "crocodile_wife_001"
    assert "monkey_001" in llm.prompts[0] and "<story>" in llm.prompts[0]
    assert extract_json('noise {"a": 1} trailing') == {"a": 1}


def test_9_storyboard_can_be_edited_manually(board):
    data = json.loads(board.story.model_dump_json())
    shot = data["scenes"][0]["shots"][0]
    shot["dialogue"][0]["text"] = "बहुत समय पहले की बात है।"
    shot["camera"] = {"preset": "horizontal_pan"}
    shot["duration_seconds"] = 9.5
    edited = parse_story(data)
    assert edited.scenes[0].shots[0].dialogue[0].text == "बहुत समय पहले की बात है।"
    assert edited.total_duration != board.story.total_duration
    data["scenes"][0]["shots"][0]["actions"].append({"action_id": "x1", "character_id": "lion_001", "animation": "idle"})
    with pytest.raises(ValidationFailed) as err:
        parse_story(data)
    assert "lion_001" in err.value.issues[0]["message"]


def test_unsupported_language_and_empty_text():
    with pytest.raises(ValidationFailed) as err:
        RuleBasedAnalyser().analyse("একটি বানর গাছে থাকত। সে রোজ ফল খেত।")
    assert "not supported" in err.value.message
    with pytest.raises(ValidationFailed):
        RuleBasedAnalyser().analyse("   ")
