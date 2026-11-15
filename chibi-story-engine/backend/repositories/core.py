"""Database access for users, projects and stories. No business rules here."""
from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..models import Project, Scene, Story, StoryVersion, User


class UserRepo:
    def __init__(self, session: Session) -> None:
        self.s = session

    def by_email(self, email: str) -> User | None:
        return self.s.scalar(select(User).where(func.lower(User.email) == email.lower()))

    def add(self, user: User) -> User:
        self.s.add(user)
        self.s.flush()
        return user


class ProjectRepo:
    def __init__(self, session: Session) -> None:
        self.s = session

    def list(self) -> list[Project]:
        return list(self.s.scalars(select(Project).where(Project.deleted_at.is_(None)).order_by(Project.created_at.desc())))

    def get(self, project_id: uuid.UUID) -> Project | None:
        p = self.s.get(Project, project_id)
        return p if p and p.deleted_at is None else None

    def add(self, project: Project) -> Project:
        self.s.add(project)
        self.s.flush()
        return project


class StoryRepo:
    def __init__(self, session: Session) -> None:
        self.s = session

    def get(self, story_id: uuid.UUID, *, lock: bool = False) -> Story | None:
        stmt = select(Story).where(Story.id == story_id, Story.deleted_at.is_(None))
        if lock:
            stmt = stmt.with_for_update()
        return self.s.scalar(stmt)

    def list(self, project_id: uuid.UUID | None = None) -> list[Story]:
        stmt = select(Story).where(Story.deleted_at.is_(None)).order_by(Story.created_at.desc())
        if project_id:
            stmt = stmt.where(Story.project_id == project_id)
        return list(self.s.scalars(stmt))

    def add(self, story: Story) -> Story:
        self.s.add(story)
        self.s.flush()
        return story

    def version(self, story_id: uuid.UUID, number: int) -> StoryVersion | None:
        return self.s.scalar(select(StoryVersion).where(StoryVersion.story_id == story_id, StoryVersion.version_number == number))

    def versions(self, story_id: uuid.UUID) -> list[StoryVersion]:
        return list(self.s.scalars(select(StoryVersion).where(StoryVersion.story_id == story_id).order_by(StoryVersion.version_number)))

    def scenes(self, story_id: uuid.UUID) -> list[Scene]:
        return list(self.s.scalars(select(Scene).where(Scene.story_id == story_id).order_by(Scene.scene_number)))

    def scene(self, scene_id: uuid.UUID) -> Scene | None:
        return self.s.get(Scene, scene_id)
