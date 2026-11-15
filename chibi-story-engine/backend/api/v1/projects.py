from __future__ import annotations

from fastapi import APIRouter

from ...deps import AnyUser, Db, Producer
from ...models import Project
from ...repositories import ProjectRepo
from ...schemas import ProjectCreate, ProjectOut
from ...services import audit

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("", response_model=ProjectOut, status_code=201)
def create_project(body: ProjectCreate, db: Db, user: Producer) -> Project:
    project = ProjectRepo(db).add(Project(**body.model_dump()))
    audit.record(db, user.id, "project.created", "project", project.id, name=project.name)
    return project


@router.get("", response_model=list[ProjectOut])
def list_projects(db: Db, _: AnyUser) -> list[Project]:
    return ProjectRepo(db).list()
