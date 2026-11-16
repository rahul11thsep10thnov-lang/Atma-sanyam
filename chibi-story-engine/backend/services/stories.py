"""Story lifecycle: creation, edits, and versioned storyboards projected into scenes/shots."""
from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from engine.schema.story import Story as StoryDef
from engine.schema.story import parse_story

from ..errors import ApiError, not_found
from ..models import Environment, Scene, Shot, Story, StoryVersion, User
from ..repositories import ProjectRepo, StoryRepo
from ..schemas import StoryCreate, StoryPatch
from . import audit


class StoryService:
    def __init__(self, session: Session) -> None:
        self.s = session
        self.repo = StoryRepo(session)

    # ------------------------------------------------------------ basic CRUD
    def create(self, data: StoryCreate, user: User) -> Story:
        project = ProjectRepo(self.s).get(data.project_id)
        if project is None:
            raise not_found("Project", data.project_id)
        settings: dict[str, Any] = {"visual_style": data.visual_style or project.visual_style,
                                    "resolution": project.default_resolution, "fps": project.default_fps}
        if data.target_duration_seconds:
            settings["target_duration_seconds"] = data.target_duration_seconds
        story = self.repo.add(Story(project_id=project.id, title=data.title, original_text=data.original_text,
                                    language=data.language, genre=data.genre, moral=data.moral, settings_json=settings))
        audit.record(self.s, user.id, "story.created", "story", story.id, title=story.title)
        return story

    def require(self, story_id: uuid.UUID, *, lock: bool = False) -> Story:
        story = self.repo.get(story_id, lock=lock)
        if story is None:
            raise not_found("Story", story_id)
        return story

    def patch(self, story_id: uuid.UUID, data: StoryPatch, user: User) -> Story:
        story = self.require(story_id, lock=True)
        changed = []
        for field in ("title", "original_text", "language", "genre", "moral"):
            value = getattr(data, field)
            if value is not None and value != getattr(story, field):
                setattr(story, field, value)
                changed.append(field)
        if "original_text" in changed and story.current_version == 0:
            story.analysis_json, story.status = None, "draft"
        if data.story_json is not None:
            definition = parse_story(data.story_json)
            self.save_version(story, definition, data.change_summary or "Manual edit", user)
            changed.append("story_json")
        if changed:
            audit.record(self.s, user.id, "story.updated", "story", story.id, fields=changed)
        self.s.flush()
        return story

    # ------------------------------------------------------------- versions
    def current_definition(self, story: Story) -> StoryDef | None:
        if story.current_version == 0:
            return None
        version = self.repo.version(story.id, story.current_version)
        return parse_story(version.story_json) if version else None

    def require_definition(self, story: Story) -> StoryDef:
        definition = self.current_definition(story)
        if definition is None:
            raise ApiError(409, "no_storyboard", "This story has no storyboard yet; generate one first")
        return definition

    def save_version(self, story: Story, definition: StoryDef, summary: str, user: User | None) -> StoryVersion:
        """Append a new immutable version and re-project scenes and shots (stable scene ids)."""
        number = story.current_version + 1
        version = StoryVersion(story_id=story.id, version_number=number, story_json=definition.model_dump(mode="json"),
                               change_summary=summary, created_by=user.id if user else None)
        self.s.add(version)
        story.current_version = number
        if story.status in ("draft", "analysed"):
            story.status = "storyboarded"
        self._project_scenes(story, definition)
        self.s.flush()
        return version

    def _project_scenes(self, story: Story, definition: StoryDef) -> None:
        existing = {sc.scene_code: sc for sc in self.repo.scenes(story.id)}
        env_ids = {e.environment_code: e.id for e in self.s.scalars(select(Environment).where(Environment.deleted_at.is_(None)))}
        keep = set()
        for number, scene in enumerate(definition.scenes, start=1):
            keep.add(scene.scene_id)
            row = existing.get(scene.scene_id) or Scene(story_id=story.id, scene_code=scene.scene_id)
            row.scene_number, row.title, row.description = number, scene.title, scene.description
            row.duration, row.environment_code = scene.total_duration, scene.environment_id
            row.environment_id = env_ids.get(scene.environment_id)
            row.status = scene.approval_status.value
            row.scene_json = scene.model_dump(mode="json")
            if row.shots:
                row.shots.clear()
                self.s.flush()                 # old shot rows go before the new ones (same shot codes) arrive
            row.shots = [
                Shot(shot_code=shot.shot_id, shot_number=i, duration=shot.duration_seconds,
                     camera_configuration=shot.camera.model_dump(mode="json"),
                     composition_json={"characters": [c.model_dump(mode="json") for c in shot.characters],
                                       "props": [p.model_dump(mode="json") for p in shot.props]},
                     animation_json={"actions": [a.model_dump(mode="json") for a in shot.actions],
                                     "effects": [e.model_dump(mode="json") for e in shot.effects]})
                for i, shot in enumerate(scene.shots, start=1)
            ]
            self.s.add(row)
        for code, row in existing.items():
            if code not in keep:
                self.s.delete(row)

    def detail(self, story: Story) -> dict[str, Any]:
        version = self.repo.version(story.id, story.current_version) if story.current_version else None
        return {
            **{c.name: getattr(story, c.name) for c in Story.__table__.columns if c.name != "deleted_at"},
            "story_json": version.story_json if version else None,
            "versions": [{"version_number": v.version_number, "change_summary": v.change_summary, "created_at": v.created_at.isoformat()}
                         for v in self.repo.versions(story.id)],
        }
