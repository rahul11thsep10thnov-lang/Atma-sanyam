"""Confirms separate queues are configured (build spec section 26) so an
expensive video render task is never routed to the same queue as lesson
analysis or voice generation."""
from app.workers.celery_app import celery_app


def test_task_routes_use_separate_queues():
    routes = celery_app.conf.task_routes
    render_queue = routes["app.workers.tasks.render_tasks.*"]["queue"]
    analysis_queue = routes["app.workers.tasks.analysis_tasks.*"]["queue"]
    voice_queue = routes["app.workers.tasks.voice_tasks.*"]["queue"]
    quality_queue = routes["app.workers.tasks.quality_tasks.*"]["queue"]

    assert render_queue == "video_render"
    assert analysis_queue == "lesson_analysis"
    assert voice_queue == "voice_generation"
    assert quality_queue == "quality_check"
    assert len({render_queue, analysis_queue, voice_queue, quality_queue}) == 4


def test_tasks_are_registered():
    task_names = set(celery_app.tasks.keys())
    assert "app.workers.tasks.analysis_tasks.run_lesson_analysis" in task_names
    assert "app.workers.tasks.render_tasks.run_video_render" in task_names
    assert "app.workers.tasks.retention_tasks.run_retention_sweep" in task_names
