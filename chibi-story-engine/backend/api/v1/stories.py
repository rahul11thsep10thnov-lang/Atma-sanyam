from __future__ import annotations

import uuid

from fastapi import APIRouter

from ...deps import AnyUser, Db, Producer
from ...schemas import StoryCreate, StoryDetail, StoryOut, StoryPatch
from ...services.stories import StoryService

router = APIRouter(prefix="/stories", tags=["stories"])


@router.post("", response_model=StoryOut, status_code=201)
def create_story(body: StoryCreate, db: Db, user: Producer):
    return StoryService(db).create(body, user)


@router.get("", response_model=list[StoryOut])
def list_stories(db: Db, _: AnyUser, project_id: uuid.UUID | None = None):
    return StoryService(db).repo.list(project_id)


@router.get("/{story_id}", response_model=StoryDetail)
def get_story(story_id: uuid.UUID, db: Db, _: AnyUser):
    svc = StoryService(db)
    return svc.detail(svc.require(story_id))


@router.patch("/{story_id}", response_model=StoryDetail, summary="Edit story fields or save an edited Story Definition as a new version")
def patch_story(story_id: uuid.UUID, body: StoryPatch, db: Db, user: Producer):
    svc = StoryService(db)
    return svc.detail(svc.patch(story_id, body, user))
