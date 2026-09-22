from sqlalchemy import JSON, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import OwnedMixin, TimestampMixin, UUIDMixin


class Lesson(Base, UUIDMixin, TimestampMixin, OwnedMixin):
    __tablename__ = "lessons"

    title: Mapped[str] = mapped_column(default="")
    source_filename: Mapped[str] = mapped_column(default="")
    source_type: Mapped[str] = mapped_column(default="text")  # txt|pdf|docx|text
    source_text: Mapped[str] = mapped_column(Text, default="")
    source_file_asset_id: Mapped[str | None] = mapped_column(default=None)
    language: Mapped[str] = mapped_column(default="en")
    subject: Mapped[str] = mapped_column(default="")
    education_level: Mapped[str] = mapped_column(default="")
    teaching_style: Mapped[str] = mapped_column(default="CLASSROOM")
    video_format: Mapped[str] = mapped_column(default="1920x1080")
    status: Mapped[str] = mapped_column(default="UPLOADED", index=True)
    protected: Mapped[bool] = mapped_column(default=False)

    # Example generation settings (build spec section 40)
    change_examples: Mapped[bool] = mapped_column(default=True)
    change_numbers: Mapped[bool] = mapped_column(default=True)
    change_context: Mapped[bool] = mapped_column(default=True)
    preserve_difficulty: Mapped[bool] = mapped_column(default=True)

    source_hash: Mapped[str] = mapped_column(default="", index=True)

    analyses: Mapped[list["LessonAnalysis"]] = relationship(
        back_populates="lesson", cascade="all, delete-orphan"
    )
    examples: Mapped[list["Example"]] = relationship(
        back_populates="lesson", cascade="all, delete-orphan"
    )
    teaching_plans: Mapped[list["TeachingPlan"]] = relationship(
        back_populates="lesson", cascade="all, delete-orphan"
    )
    quality_reports: Mapped[list["QualityReport"]] = relationship(
        back_populates="lesson", cascade="all, delete-orphan"
    )


class LessonAnalysis(Base, UUIDMixin, TimestampMixin, OwnedMixin):
    __tablename__ = "lesson_analyses"

    lesson_id: Mapped[str] = mapped_column(ForeignKey("lessons.id"), index=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    analysis_json: Mapped[dict] = mapped_column(JSON, default=dict)
    source_hash: Mapped[str] = mapped_column(default="")
    prompt_version: Mapped[str] = mapped_column(default="")

    lesson: Mapped["Lesson"] = relationship(back_populates="analyses")


class Example(Base, UUIDMixin, TimestampMixin, OwnedMixin):
    __tablename__ = "examples"

    lesson_id: Mapped[str] = mapped_column(ForeignKey("lessons.id"), index=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    original_example: Mapped[dict] = mapped_column(JSON, default=dict)
    generated_example: Mapped[dict] = mapped_column(JSON, default=dict)
    verified: Mapped[bool] = mapped_column(default=False)
    verification_detail: Mapped[dict] = mapped_column(JSON, default=dict)
    prompt_version: Mapped[str] = mapped_column(default="")

    lesson: Mapped["Lesson"] = relationship(back_populates="examples")


class TeachingPlan(Base, UUIDMixin, TimestampMixin, OwnedMixin):
    __tablename__ = "teaching_plans"

    lesson_id: Mapped[str] = mapped_column(ForeignKey("lessons.id"), index=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    plan_json: Mapped[dict] = mapped_column(JSON, default=dict)
    script_hash: Mapped[str] = mapped_column(default="", index=True)
    prompt_version: Mapped[str] = mapped_column(default="")

    lesson: Mapped["Lesson"] = relationship(back_populates="teaching_plans")
    scenes: Mapped[list["Scene"]] = relationship(
        back_populates="teaching_plan", cascade="all, delete-orphan", order_by="Scene.order_index"
    )


class Scene(Base, UUIDMixin, TimestampMixin, OwnedMixin):
    __tablename__ = "scenes"

    teaching_plan_id: Mapped[str] = mapped_column(ForeignKey("teaching_plans.id"), index=True)
    scene_key: Mapped[str] = mapped_column(String(64))  # e.g. "scene_001"
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    scene_json: Mapped[dict] = mapped_column(JSON, default=dict)
    narration_text: Mapped[str] = mapped_column(Text, default="")
    text_hash: Mapped[str] = mapped_column(default="", index=True)
    start_ms: Mapped[int] = mapped_column(Integer, default=0)
    duration_ms: Mapped[int] = mapped_column(Integer, default=0)

    teaching_plan: Mapped["TeachingPlan"] = relationship(back_populates="scenes")
