import logging

from app.core.logging import AllowlistFilter, safe_extra


def test_safe_extra_drops_unlisted_keys():
    extra = safe_extra(lesson_id="abc", source_text="THIS SHOULD NEVER BE LOGGED", stage="render")
    assert extra == {"lesson_id": "abc", "stage": "render"}
    assert "source_text" not in extra


def test_safe_extra_drops_api_keys():
    extra = safe_extra(job_id="1", elevenlabs_api_key="sk-should-not-appear")
    assert "elevenlabs_api_key" not in extra


def test_allowlist_filter_is_attachable_to_a_handler(caplog):
    logger = logging.getLogger("test.privacy.logger")
    logger.addFilter(AllowlistFilter())
    with caplog.at_level(logging.INFO, logger="test.privacy.logger"):
        logger.info("scene processed", extra=safe_extra(scene_id="s1", stage="voice"))
    assert "scene processed" in caplog.text
